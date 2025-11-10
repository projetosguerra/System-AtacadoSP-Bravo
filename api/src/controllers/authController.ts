import oracledb from 'oracledb';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { withConnection } from '../db/pool.js';

function pick<T = any>(obj: any, ...keys: string[]): T | undefined {
  for (const k of keys) {
    if (obj?.[k] !== undefined && obj?.[k] !== null) return obj[k] as T;
  }
  return undefined;
}

export const register = async (req: any, res: any) => {
  const primeiroNome = pick<string>(req.body, 'primeiroNome', 'primeiro_nome')?.trim();
  const ultimoNome   = pick<string>(req.body, 'ultimoNome', 'ultimo_nome')?.trim() || '';
  const email        = String(pick<string>(req.body, 'email') || '').trim().toLowerCase();
  const senha        = pick<string>(req.body, 'senha');
  const genero       = pick<string>(req.body, 'genero') || null;
  const telefone     = pick<string>(req.body, 'telefone') || null;
  const idFuncionario= pick<string>(req.body, 'idFuncionario', 'id_funcionario') || null;

  const codSetorRaw  = pick<any>(req.body, 'codSetor', 'codsetor');
  const codSetor     = codSetorRaw != null && codSetorRaw !== '' ? Number(codSetorRaw) : NaN;

  const tipoUsuario  = 1;

  const cnpjRaw      = pick<string>(req.body, 'cnpj') || '';
  const cnpj         = cnpjRaw.replace(/\D/g, ''); 

  const codcli = Number(process.env.CODCLI ?? 27995);

  try {
    if (!primeiroNome || !email || !senha) {
      return res.status(400).json({ error: 'Primeiro nome, e-mail e senha são obrigatórios.' });
    }
    if (!codSetor || Number.isNaN(codSetor)) {
      return res.status(400).json({ error: 'Setor é obrigatório.' });
    }

    const hashedPassword = await bcrypt.hash(senha, 10);

    await withConnection(async (connection) => {
      const userExists = await connection.execute(
        `SELECT CODUSUARIO FROM BRAMV_USUARIOS WHERE EMAIL = :email AND CODCLI = :codcli`,
        { email, codcli }
      );
      if (userExists.rows && userExists.rows.length > 0) {
        return res.status(409).json({ error: 'Este e-mail já está em uso.' });
      }

      const maxCodResult = await connection.execute(
        `SELECT NVL(MAX(CODUSUARIO), 0) + 1 AS NEXT_CODUSUARIO FROM BRAMV_USUARIOS`
      );
      if (!maxCodResult.rows || maxCodResult.rows.length === 0) {
        throw new Error('Não foi possível gerar um novo número de usuário.');
      }
      const row = maxCodResult.rows[0] as any;
      const nextCodUsuario =
        (row.NEXT_CODUSUARIO ?? row[0]) as number;

      await connection.execute(
        `INSERT INTO BRAMV_USUARIOS (
           CODCLI, CODUSUARIO, PRIMEIRO_NOME, ULTIMO_NOME, EMAIL, SENHA,
           TIPOUSUARIO, CODSETOR, GENERO, TELEFONE, ID_FUNCIONARIO
         ) VALUES (
           :codcli, :codusuario, :primeiro_nome, :ultimo_nome, :email, :senha,
           :tipo_usuario, :cod_setor, :genero, :telefone, :id_func
         )`,
        {
          codcli,
          codusuario: nextCodUsuario,
          primeiro_nome: primeiroNome,
          ultimo_nome: ultimoNome,
          email,
          senha: hashedPassword,
          tipo_usuario: tipoUsuario,
          cod_setor: codSetor,
          genero,
          telefone,
          id_func: idFuncionario,
        },
        { autoCommit: true }
      );

      return res.status(201).json({
        success: true,
        message: 'Usuário criado com sucesso!',
        received: { cnpj },
      });
    });
  } catch (err: any) {
    if (typeof err?.message === 'string' && err.message.includes('já está em uso')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('ERRO AO REGISTRAR USUÁRIO:', err);
    return res.status(500).json({ error: 'Erro interno ao registrar o usuário.' });
  }
};

export const login = async (req: any, res: any) => {
  const { email, senha } = req.body;
  const codcli = Number(process.env.CODCLI ?? 27995);

  try {
    await withConnection(async (connection) => {
      const query = `
        SELECT 
          u.CODUSUARIO, u.PRIMEIRO_NOME, u.ULTIMO_NOME, u.EMAIL, u.SENHA,
          u.TIPOUSUARIO, u.CODSETOR, u.GENERO, u.TELEFONE, u.ID_FUNCIONARIO,
          s.DESCRICAO AS SETOR_DESCRICAO
        FROM BRAMV_USUARIOS u
        LEFT JOIN BRAMV_SETOR s
          ON u.CODSETOR = s.CODSETOR AND u.CODCLI = s.CODCLI
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

      return res.status(200).json({ success: true, token, user: userPayload });
    });
  } catch (err: any) {
    console.error('ERRO NO LOGIN:', err);
    return res.status(500).json({ error: 'Erro interno ao tentar fazer login.' });
  }
};