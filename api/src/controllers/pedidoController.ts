import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

export const obterPedido = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const pedidoDetails = await withConnection(async (connection) => {
      const headerResult = await connection.execute(
        `SELECT p.NUMPEDRCA, p.DATA, p.STATUS, u.PRIMEIRO_NOME || ' ' || u.ULTIMO_NOME AS NOME, u.EMAIL, s.DESCRICAO AS SETOR 
         FROM BRAMV_PEDIDOC p 
         LEFT JOIN BRAMV_USUARIOS u ON p.CODUSUARIO = u.CODUSUARIO 
         LEFT JOIN BRAMV_SETOR s ON u.CODSETOR = s.CODSETOR 
         WHERE p.NUMPEDRCA = :id`,
        [id],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!headerResult.rows?.length) throw new Error('Pedido não encontrado');
      const header: any = headerResult.rows[0];
      const itemsResult = await connection.execute(
        `SELECT i.CODPROD, i.QT, i.PVENDA, p.DESCRICAO, p.UNIDADE 
         FROM BRAMV_PEDIDOI i JOIN PCPRODUT p ON i.CODPROD = p.CODPROD 
         WHERE i.NUMPEDRCA = :id`,
        [id],
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return {
        id: header.NUMPEDRCA,
        data: header.DATA,
        status: header.STATUS,
        solicitante: { nome: header.NOME, email: header.EMAIL },
        unidadeAdmin: header.SETOR,
        itens: (itemsResult.rows || []).map((item: any) => ({
          id: item.CODPROD,
          nome: item.DESCRICAO,
          quantidade: item.QT,
          preco: item.PVENDA,
          unit: item.UNIDADE,
          imgUrl: `https://placehold.co/100x100?text=${item.CODPROD}`
        }))
      };
    });
    res.json(pedidoDetails);
  } catch (err: any) {
    console.error(`[API] ERRO ao buscar pedido #${id}:`, err);
    res.status(404).json({ error: err.message || 'Pedido não encontrado.' });
  }
};

export const atualizarStatusPedido = async (req: any, res: any) => {
  const { id } = req.params;
  const { newStatus, conditionStatus } = req.body;

  if (![0, 1, 2, 3, 5].includes(newStatus)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  try {
    await withConnection(async (connection) => {
      let sql = `UPDATE BRAMV_PEDIDOC SET STATUS = :newStatus WHERE NUMPEDRCA = :id`;
      const params: any = { newStatus, id };

      if (conditionStatus !== undefined) {
        sql += ` AND STATUS = :conditionStatus`;
        params.conditionStatus = conditionStatus;
      }

      const updateResult = await connection.execute(sql, params);
      if (updateResult.rowsAffected === 0 && conditionStatus !== undefined) {
        throw new Error('O status do pedido foi alterado por outro usuário. A página será atualizada.');
      }
      await connection.commit();
    });
    res.status(200).json({ success: true, message: `Status do Pedido #${id} atualizado.` });
  } catch (err: any) {
    if (err.message === 'O status do pedido foi alterado por outro usuário. A página será atualizada.') {
      const atual = await withConnection(async (connection) => {
        const r = await connection.execute<{ STATUS: number }>(
          `SELECT STATUS FROM BRAMV_PEDIDOC WHERE NUMPEDRCA = :id`,
          { id: Number(id) },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return (r.rows?.[0] as { STATUS: number } | undefined)?.STATUS ?? null;
      });
      return res.status(409).json({ error: err.message, statusAtual: atual });
    }
    res.status(500).json({ error: err.message || 'Erro ao atualizar o status do pedido.' });
  }
};