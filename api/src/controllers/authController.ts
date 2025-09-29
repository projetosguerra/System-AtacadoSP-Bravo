import oracledb from 'oracledb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { withConnection } from '../db/pool.js';

export const register = async (req: any, res: any) => {
  const { primeiro_nome, ultimo_nome, email, senha, genero, telefone } = req.body;
  const codcli = 27995;

  try {
    const hashedPassword = await bcrypt.hash(senha, 10);

    await withConnection(async (connection) => {
      const userExists = await connection.execute(
        `SELECT CODUSUARIO FROM BRAMV_USUARIOS WHERE EMAIL = :email AND CODCLI = :codcli`,
        { email, codcli }
      );

      if (userExists.rows && userExists.rows.length > 0) {
        throw new Error('Este e-mail já está em uso.');
      }

      const maxCodResult = await connection.execute(
        `SELECT NVL(MAX(CODUSUARIO), 0) + 1 AS NEXT_CODUSUARIO FROM BRAMV_USUARIOS`
      );

      if (!maxCodResult.rows || maxCodResult.rows.length === 0) {
        throw new Error('Não foi possível gerar um novo número de usuário.');
      }
      const nextCodUsuario = (maxCodResult.rows[0] as any)[0];

      await connection.execute(
        `INSERT INTO BRAMV_USUARIOS (CODCLI, CODUSUARIO, PRIMEIRO_NOME, ULTIMO_NOME, EMAIL, SENHA, TIPOUSUARIO, GENERO, TELEFONE) 
         VALUES (:codcli, :codusuario, :primeiro_nome, :ultimo_nome, :email, :senha, 1, :genero, :telefone)`,
        {
          codcli,
          codusuario: nextCodUsuario,
          primeiro_nome,
          ultimo_nome: ultimo_nome || '',
          email,
          senha: hashedPassword,
          genero: genero || null,
          telefone: telefone || null
        },
        { autoCommit: true }
      );

      res.status(201).json({ success: true, message: 'Usuário criado com sucesso!' });
    });
  } catch (err: any) {
    if (err.message?.includes('já está em uso')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('ERRO AO REGISTRAR USUÁRIO:', err);
    res.status(500).json({ error: 'Erro interno ao registrar o usuário.' });
  }
};

export const login = async (req: any, res: any) => {
  const { email, senha } = req.body;
  const codcli = 27995;

  try {
    await withConnection(async (connection) => {
      const query = `
        SELECT 
          u.CODUSUARIO, u.PRIMEIRO_NOME, u.ULTIMO_NOME, u.EMAIL, u.SENHA,
          u.TIPOUSUARIO, u.CODSETOR, u.GENERO, u.TELEFONE, u.ID_FUNCIONARIO,
          s.DESCRICAO AS SETOR_DESCRICAO
        FROM BRAMV_USUARIOS u
        LEFT JOIN BRAMV_SETOR s ON u.CODSETOR = s.CODSETOR AND u.CODCLI = s.CODCLI
        WHERE u.EMAIL = :email AND u.CODCLI = :codcli
      `;
      const result = await connection.execute(query, { email, codcli }, { outFormat: oracledb.OUT_FORMAT_OBJECT });

      if (!result.rows?.length) return res.status(401).json({ error: 'Credenciais inválidas.' });

      const dbUser: any = result.rows[0];
      const isPasswordValid = await bcrypt.compare(senha, dbUser.SENHA);
      if (!isPasswordValid) return res.status(401).json({ error: 'Credenciais inválidas.' });

      const userPayload = {
        codUsuario: dbUser.CODUSUARIO,
        primeiroNome: dbUser.PRIMEIRO_NOME,
        ultimoNome: dbUser.ULTIMO_NOME,
        email: dbUser.EMAIL,
        tipoUsuario: dbUser.TIPOUSUARIO,
        perfil: dbUser.TIPOUSUARIO === 1 ? 'Admin' : dbUser.TIPOUSUARIO === 2 ? 'Aprovador' : 'Solicitante',
        codSetor: dbUser.CODSETOR,
        setor: dbUser.SETOR_DESCRICAO || 'Não definido',
        genero: dbUser.GENERO || '',
        numeroTelefone: dbUser.TELEFONE || '',
        idFuncionario: dbUser.ID_FUNCIONARIO || '',
        numeroSequencia: 0,
        ativo: true,
      };

      const token = jwt.sign(
        { id: userPayload.codUsuario, nome: userPayload.primeiroNome, tipoUsuario: userPayload.tipoUsuario },
        process.env.JWT_SECRET!,
        { expiresIn: '8h' }
      );

      res.status(200).json({ success: true, token, user: userPayload });
    });
  } catch (err: any) {
    console.error('ERRO NO LOGIN:', err);
    res.status(500).json({ error: 'Erro interno ao tentar fazer login.' });
  }
};