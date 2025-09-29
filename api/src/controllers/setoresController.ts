import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

function parseCodSetor(param: any) {
  const n = Number(param);
  if (!Number.isFinite(n) || Number.isNaN(n)) {
    throw Object.assign(new Error('Parâmetro codsetor inválido'), { status: 400, code: 'INVALID_PARAM' });
  }
  return n;
}

export const listarSetores = async (_req: any, res: any) => {
  try {
    const setores = await withConnection(async (connection) => {
      const result = await connection.execute(
        `SELECT CODSETOR, DESCRICAO, SALDO 
         FROM BRAMV_SETOR 
         WHERE CODCLI = 27995 
         ORDER BY DESCRICAO`,
        [],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return result.rows || [];
    });
    res.json(setores);
  } catch (err) {
    console.error('ERRO AO BUSCAR SETORES:', err);
    res.status(500).json({ error: 'Erro ao buscar setores.' });
  }
};

export const listarPedidosDoSetor = async (req: any, res: any) => {
  try {
    const codsetor = parseCodSetor(req.params.codsetor);

    const rows = await withConnection(async (connection) => {
      const sql = `
        WITH OrderTotals AS (
          SELECT NUMPEDRCA,
                 COUNT(*) AS QTD_ITENS,
                 SUM(NVL(QT,0) * NVL(PVENDA,0)) AS VALOR_TOTAL
          FROM BRAMV_PEDIDOI
          GROUP BY NUMPEDRCA
        )
        SELECT
          pc.NUMPEDRCA,
          pc.DATA,
          u.PRIMEIRO_NOME || ' ' || u.ULTIMO_NOME AS SOLICITANTE,
          NVL(ot.QTD_ITENS, 0) AS QTD_ITENS,
          NVL(ot.VALOR_TOTAL, 0) AS VALOR_TOTAL
        FROM BRAMV_PEDIDOC pc
        JOIN BRAMV_USUARIOS u ON pc.CODUSUARIO = u.CODUSUARIO
        LEFT JOIN OrderTotals ot ON ot.NUMPEDRCA = pc.NUMPEDRCA
        WHERE u.CODSETOR = :codsetor
          AND pc.STATUS = 1
        ORDER BY pc.DATA DESC
      `;
      const result = await connection.execute(sql, { codsetor }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return result.rows || [];
    });

    if (!Array.isArray(rows)) {
      console.error('[setores/:codsetor/pedidos] Resultado não-array:', rows);
      return res.status(500).json({ error: 'Erro ao buscar pedidos do setor.' });
    }

    res.status(200).json(rows);
  } catch (err: any) {
    const status = err.status || 500;
    console.error(`ERRO AO BUSCAR PEDIDOS DO SETOR ${req.params.codsetor}:`, err?.message || err, { code: err?.code });
    res.status(status).json({ error: 'Erro ao buscar pedidos do setor.', details: process.env.NODE_ENV !== 'production' ? err?.message : undefined });
  }
};

export const listarHistoricoSetor = async (req: any, res: any) => {
  try {
    const codsetor = parseCodSetor(req.params.codsetor);

    const rows = await withConnection(async (connection) => {
      const sql = `
        SELECT 
          h.DATA_ALT, 
          h.VALOR_ANT, 
          h.NOVO_VALOR, 
          u.PRIMEIRO_NOME
        FROM BRAMV_SALDO_HISTORICO h
        LEFT JOIN BRAMV_USUARIOS u ON h.ALT_CODUSUARIO = u.CODUSUARIO
        WHERE h.CODSETOR = :codsetor
        ORDER BY h.DATA_ALT DESC
      `;
      const result = await connection.execute(sql, { codsetor }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return result.rows || [];
    });

    if (!Array.isArray(rows)) {
      console.error('[setores/:codsetor/historico] Resultado não-array:', rows);
      return res.status(500).json({ error: 'Erro ao buscar histórico do setor.' });
    }

    res.status(200).json(rows);
  } catch (err: any) {
    const status = err.status || 500;
    console.error(`ERRO AO BUSCAR HISTÓRICO DO SETOR ${req.params.codsetor}:`, err?.message || err, { code: err?.code });
    res.status(status).json({ error: 'Erro ao buscar histórico do setor.', details: process.env.NODE_ENV !== 'production' ? err?.message : undefined });
  }
};

export const atualizarLimiteSetor = async (req: any, res: any) => {
  const codsetorRaw = req.params.codsetor;
  const { saldo, alteradoPorCodUsuario } = req.body;

  if (saldo === undefined || alteradoPorCodUsuario === undefined) {
    return res.status(400).json({ error: 'O novo limite (saldo) e o ID do utilizador são obrigatórios.' });
  }

  try {
    const codsetor = parseCodSetor(codsetorRaw);

    await withConnection(async (connection) => {
      const oldSaldoResult = await connection.execute(
        `SELECT SALDO FROM BRAMV_SETOR WHERE CODSETOR = :codsetor`,
        { codsetor },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      if (!oldSaldoResult.rows?.length) {
        return res.status(404).json({ error: 'Setor não encontrado.' });
      }
      const valorAnterior = (oldSaldoResult.rows[0] as { SALDO: number }).SALDO;

      await connection.execute(
        `UPDATE BRAMV_SETOR SET SALDO = :saldo WHERE CODSETOR = :codsetor`,
        { saldo: Number(saldo), codsetor }
      );

      await connection.execute(
        `INSERT INTO BRAMV_SALDO_HISTORICO (CODSETOR, VALOR_ANT, NOVO_VALOR, ALT_CODUSUARIO)
         VALUES (:codsetor, :valorAnterior, :novoValor, :alteradoPor)`,
        {
          codsetor,
          valorAnterior,
          novoValor: Number(saldo),
          alteradoPor: alteradoPorCodUsuario
        }
      );

      await connection.commit();
      res.status(200).json({ success: true, message: 'Limite do setor atualizado com sucesso.' });
    });
  } catch (err: any) {
    const status = err.status || 500;
    console.error(`ERRO AO ATUALIZAR LIMITE DO SETOR ${req.params.codsetor}:`, err?.message || err, { code: err?.code });
    res.status(status).json({ error: 'Erro interno ao atualizar o limite do setor.' });
  }
};