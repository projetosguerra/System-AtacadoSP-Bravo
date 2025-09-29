import oracledb from 'oracledb';
import bcrypt from 'bcrypt';
import { withConnection } from '../db/pool.js';

export const listarUsuarios = async (_req: any, res: any) => {
  const codcli = 27995;
  try {
    const users = await withConnection(async (connection) => {
      const result = await connection.execute(
        `SELECT 
          U.CODUSUARIO, U.PRIMEIRO_NOME, U.ULTIMO_NOME, U.EMAIL, U.CODSETOR, U.TIPOUSUARIO, U.GENERO, U.TELEFONE, U.ID_FUNCIONARIO,
          S.DESCRICAO AS SETOR
         FROM BRAMV_USUARIOS U 
         LEFT JOIN BRAMV_SETOR S ON U.CODSETOR = S.CODSETOR
         WHERE U.CODCLI = :codcli`,
        { codcli }, { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      return (result.rows || []).map((user: any) => ({
        codUsuario: user.CODUSUARIO,
        primeiroNome: user.PRIMEIRO_NOME,
        ultimoNome: user.ULTIMO_NOME,
        email: user.EMAIL,
        codSetor: user.CODSETOR,
        tipoUsuario: user.TIPOUSUARIO,
        genero: user.GENERO,
        numeroTelefone: user.TELEFONE,
        idFuncionario: user.ID_FUNCIONARIO,
        setor: user.SETOR,
        perfil: user.TIPOUSUARIO === 1 ? 'Admin' : (user.TIPOUSUARIO === 2 ? 'Aprovador' : 'Solicitante')
      }));
    });
    res.json(users);
  } catch (err) {
    console.error('ERRO AO BUSCAR USUÁRIOS:', err);
    res.status(500).json({ error: 'Erro ao buscar usuários.' });
  }
};

export const criarUsuario = async (req: any, res: any) => {
  const { primeiroNome, ultimoNome, email, senha, tipoUsuario, codSetor, genero, telefone, idFuncionario } = req.body;
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
      if (!maxCodResult.rows?.length) {
        throw new Error('Não foi possível gerar um novo número de usuário.');
      }
      const nextCodUsuario = (maxCodResult.rows as any[])[0][0];

      await connection.execute(
        `INSERT INTO BRAMV_USUARIOS (
          CODCLI, CODUSUARIO, PRIMEIRO_NOME, ULTIMO_NOME, EMAIL, SENHA, 
          TIPOUSUARIO, CODSETOR, GENERO, TELEFONE, ID_FUNCIONARIO
        ) VALUES (
          :codcli, :codusuario, :primeiro_nome, :ultimo_nome, :email, :senha, 
          :tipoUsuario, :codSetor, :genero, :telefone, :idFuncionario
        )`,
        {
          codcli,
          codusuario: nextCodUsuario,
          primeiro_nome: primeiroNome,
          ultimo_nome: ultimoNome || '',
          email,
          senha: hashedPassword,
          tipoUsuario,
          codSetor: codSetor || null,
          genero: genero || null,
          telefone: telefone || null,
          idFuncionario: idFuncionario || null
        },
        { autoCommit: true }
      );

      res.status(201).json({ success: true, message: 'Usuário criado com sucesso!' });
    });
  } catch (err: any) {
    if (err.message?.includes('já está em uso')) {
      return res.status(409).json({ error: err.message });
    }
    console.error('ERRO AO CRIAR USUÁRIO:', err);
    res.status(500).json({ error: 'Erro interno ao criar o usuário.' });
  }
};

export const atualizarUsuario = async (req: any, res: any) => {
  const { codUsuario } = req.params;
  const { primeiroNome, ultimoNome, email, tipoUsuario, codSetor, genero, telefone, idFuncionario } = req.body;
  const codcli = 27995;

  try {
    await withConnection(async (connection) => {
      const result = await connection.execute(
        `UPDATE BRAMV_USUARIOS SET
          PRIMEIRO_NOME = :primeiroNome,
          ULTIMO_NOME = :ultimoNome,
          EMAIL = :email,
          TIPOUSUARIO = :tipoUsuario,
          CODSETOR = :codSetor,
          GENERO = :genero,
          TELEFONE = :telefone,
          ID_FUNCIONARIO = :idFuncionario
         WHERE CODUSUARIO = :codUsuario AND CODCLI = :codcli`,
        {
          primeiroNome,
          ultimoNome: ultimoNome || '',
          email,
          tipoUsuario,
          codSetor: codSetor || null,
          genero: genero || null,
          telefone: telefone || null,
          idFuncionario: idFuncionario || null,
          codUsuario: Number(codUsuario),
          codcli
        },
        { autoCommit: true }
      );

      if (result.rowsAffected === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado.' });
      }

      res.status(200).json({ success: true, message: 'Usuário atualizado com sucesso.' });
    });
  } catch (err: any) {
    console.error(`ERRO AO ATUALIZAR USUÁRIO ${codUsuario}:`, err);
    if (err.errorNum === 1) {
      return res.status(409).json({ error: 'O e-mail fornecido já está em uso por outro usuário.' });
    }
    res.status(500).json({ error: 'Erro interno ao atualizar o usuário.' });
  }
};

export const excluirUsuario = async (req: any, res: any) => {
  const { codUsuario } = req.params;
  const codcli = 27995;

  try {
    await withConnection(async (connection) => {
      const result = await connection.execute(
        `DELETE FROM BRAMV_USUARIOS WHERE CODUSUARIO = :codUsuario AND CODCLI = :codcli`,
        { codUsuario: Number(codUsuario), codcli },
        { autoCommit: true }
      );

      if (result.rowsAffected === 0) {
        return res.status(404).json({ error: 'Usuário não encontrado ou já foi excluído.' });
      }

      res.status(200).json({ success: true, message: 'Usuário excluído com sucesso.' });
    });
  } catch (err: any) {
    console.error(`ERRO AO EXCLUIR USUÁRIO ${codUsuario}:`, err);
    res.status(500).json({ error: 'Erro interno ao excluir o usuário.' });
  }
};