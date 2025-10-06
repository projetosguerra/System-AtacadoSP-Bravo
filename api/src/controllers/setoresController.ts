import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';
import { getCache, setCache } from '../utils/cache.js';

export const listarSetores = async (_req: any, res: any) => {
  const cacheKey = 'setores:v2';
  const cached = getCache<any[]>(cacheKey);
  if (cached) return res.json(cached);

  try {
    const setores = await withConnection(async (connection) => {
      const result = await connection.execute(
        `SELECT CODSETOR, DESCRICAO, SALDO FROM BRAMV_SETOR WHERE CODCLI = 27995 ORDER BY DESCRICAO`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 100 }
      );
      return result.rows || [];
    });
    setCache(cacheKey, setores, 30_000);
    res.json(setores);
  } catch (err) {
    console.error('ERRO AO BUSCAR SETORES:', err);
    res.status(500).json({ error: 'Erro ao buscar setores.' });
  }
};

export const listarPedidosDoSetor = async (req: any, res: any) => {
  const codsetor = req.params.codsetor;
  try {
    await withConnection(async (connection) => {
      const query = `
        SELECT
          p.NUMPEDRCA      AS NUMPEDRCA,
          p.DATA           AS DATA,
          u.PRIMEIRO_NOME || ' ' || u.ULTIMO_NOME AS SOLICITANTE,
          NVL(p.QTD_ITENS, 0)   AS QTD_ITENS,
          NVL(p.VALOR_TOTAL, 0) AS VALOR_TOTAL
        FROM BRAMV_PEDIDOC p
        JOIN BRAMV_USUARIOS u ON p.CODUSUARIO = u.CODUSUARIO
        WHERE u.CODSETOR = :codsetor
          AND p.STATUS = 1
        ORDER BY p.DATA DESC
      `;
      const result = await connection.execute(query, { codsetor: Number(codsetor) }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      res.status(200).json(result.rows || []);
    });
  } catch (err: any) {
    console.error(`ERRO AO BUSCAR PEDIDOS DO SETOR ${codsetor}:`, err);
    res.status(500).json({ error: 'Erro ao buscar pedidos do setor.' });
  }
};

export const listarHistoricoSetor = async (req: any, res: any) => {
  const codsetor = req.params.codsetor;
  try {
    await withConnection(async (connection) => {
      const result = await connection.execute(
        `SELECT h.DATA_ALT, h.VALOR_ANT, h.NOVO_VALOR, u.PRIMEIRO_NOME
         FROM BRAMV_SALDO_HISTORICO h
         LEFT JOIN BRAMV_USUARIOS u ON h.ALT_CODUSUARIO = u.CODUSUARIO
         WHERE h.CODSETOR = :codsetor ORDER BY h.DATA_ALT DESC`,
        { codsetor: Number(codsetor) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      res.status(200).json(result.rows || []);
    });
  } catch (err: any) {
    console.error(`ERRO AO BUSCAR HISTÓRICO DO SETOR ${codsetor}:`, err);
    res.status(500).json({ error: 'Erro ao buscar histórico do setor.' });
  }
};

export const atualizarLimiteSetor = async (req: any, res: any) => {
  const codsetor = req.params.codsetor;
  const { saldo, alteradoPorCodUsuario } = req.body;

  if (saldo === undefined || alteradoPorCodUsuario === undefined) {
    return res.status(400).json({ error: 'O novo limite (saldo) e o ID do utilizador são obrigatórios.' });
  }

  try {
    await withConnection(async (connection) => {
      const oldSaldoResult = await connection.execute(
        `SELECT SALDO FROM BRAMV_SETOR WHERE CODSETOR = :codsetor`,
        { codsetor: Number(codsetor) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!oldSaldoResult.rows?.length) {
        return res.status(404).json({ error: 'Setor não encontrado.' });
      }
      const valorAnterior = (oldSaldoResult.rows[0] as { SALDO: number }).SALDO;

      await connection.execute(
        `UPDATE BRAMV_SETOR SET SALDO = :saldo WHERE CODSETOR = :codsetor`,
        { saldo: Number(saldo), codsetor: Number(codsetor) }
      );

      await connection.execute(
        `INSERT INTO BRAMV_SALDO_HISTORICO (CODSETOR, VALOR_ANT, NOVO_VALOR, ALT_CODUSUARIO)
         VALUES (:codsetor, :valorAnterior, :novoValor, :alteradoPor)`,
        {
          codsetor: Number(codsetor),
          valorAnterior,
          novoValor: Number(saldo),
          alteradoPor: alteradoPorCodUsuario
        }
      );

      await connection.commit();
      res.status(200).json({ success: true, message: 'Limite do setor atualizado com sucesso.' });
    });
  } catch (err: any) {
    console.error(`ERRO AO ATUALIZAR LIMITE DO SETOR ${codsetor}:`, err);
    res.status(500).json({ error: 'Erro interno ao atualizar o limite do setor.' });
  }
};