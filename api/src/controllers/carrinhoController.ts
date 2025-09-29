import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

// Helper: cria/obtém cabeçalho do carrinho (STATUS = 0)
async function findOrCreateCartHeader(connection: oracledb.Connection, codUsuario: number): Promise<number> {
  const result = await connection.execute<{ NUMPEDRCA: number }>(
    `SELECT NUMPEDRCA FROM BRAMV_PEDIDOC WHERE CODUSUARIO = :codUsuario AND STATUS = 0`,
    [codUsuario],
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );

  if (result.rows && result.rows.length > 0 && result.rows[0]) {
    return result.rows[0].NUMPEDRCA;
  } else {
    const maxPedResult = await connection.execute(
      `SELECT NVL(MAX(NUMPEDRCA), 0) + 1 AS NEXT_ID FROM BRAMV_PEDIDOC`
    );

    if (!maxPedResult.rows || maxPedResult.rows.length === 0) {
      throw new Error('Não foi possível gerar um novo número de pedido.');
    }
    const newNumpedrca = (maxPedResult.rows[0] as any[])[0];

    await connection.execute(
      `INSERT INTO BRAMV_PEDIDOC (NUMPEDRCA, CODUSUARIO, STATUS, DATA) VALUES (:numpedrca, :codUsuario, 0, SYSDATE)`,
      { numpedrca: newNumpedrca, codUsuario },
    );
    return newNumpedrca;
  }
}

// Helper: pega setor e saldo do usuário
async function getUserSetorAndSaldo(connection: oracledb.Connection, codUsuario: number) {
  const sql = `
    SELECT u.CODSETOR, s.SALDO
    FROM BRAMV_USUARIOS u
    LEFT JOIN BRAMV_SETOR s ON s.CODSETOR = u.CODSETOR
    WHERE u.CODUSUARIO = :codUsuario
  `;
  const r = await connection.execute(sql, { codUsuario }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  const row = r.rows?.[0] as any;
  return {
    codSetor: row?.CODSETOR ?? null,
    saldo: Number(row?.SALDO ?? 0),
  };
}

// Helper: total do carrinho aberto
async function getOpenCartTotal(connection: oracledb.Connection, codUsuario: number) {
  const sql = `
    SELECT NVL(SUM(i.QT * i.PVENDA), 0) AS TOTAL
    FROM BRAMV_PEDIDOC c
    JOIN BRAMV_PEDIDOI i ON i.NUMPEDRCA = c.NUMPEDRCA
    WHERE c.CODUSUARIO = :codUsuario AND c.STATUS = 0
  `;
  const r = await connection.execute(sql, { codUsuario }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
  return Number((r.rows?.[0] as any)?.TOTAL ?? 0);
}

// GET /api/carrinho/:codusuario
export const listarCarrinho = async (req: any, res: any) => {
  const { codusuario } = req.params;
  try {
    const items = await withConnection(async (connection) => {
      const result = await connection.execute(
        `SELECT i.CODPROD, i.QT, i.PVENDA, p.DESCRICAO, p.UNIDADE
         FROM BRAMV_PEDIDOI i
         JOIN BRAMV_PEDIDOC c ON i.NUMPEDRCA = c.NUMPEDRCA
         JOIN PCPRODUT p ON i.CODPROD = p.CODPROD
         WHERE c.CODUSUARIO = :codusuario AND c.STATUS = 0`,
        [codusuario], { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return (result.rows || []).map((item: any) => ({
        id: item.CODPROD,
        nome: item.DESCRICAO,
        quantidade: item.QT,
        preco: item.PVENDA,
        unit: item.UNIDADE,
        imgUrl: `https://placehold.co/100x100?text=${item.CODPROD}`
      }));
    });
    res.json(items);
  } catch (err) {
    console.error('Erro ao buscar carrinho:', err);
    res.status(500).json({ error: 'Erro ao buscar carrinho.' });
  }
};

// POST /api/carrinho/:codusuario/items
export const adicionarItem = async (req: any, res: any) => {
  const { codusuario } = req.params;
  const { codprod, qt, pvenda } = req.body;
  try {
    await withConnection(async (connection) => {
      const numpedrca = await findOrCreateCartHeader(connection, Number(codusuario));
      const existingItem = await connection.execute(
        `SELECT QT FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :1 AND CODPROD = :2`,
        [numpedrca, codprod]
      );
      if (existingItem.rows && existingItem.rows.length > 0) {
        await connection.execute(
          `UPDATE BRAMV_PEDIDOI SET QT = QT + :1 WHERE NUMPEDRCA = :2 AND CODPROD = :3`,
          [qt, numpedrca, codprod]
        );
      } else {
        await connection.execute(
          `INSERT INTO BRAMV_PEDIDOI (NUMPEDRCA, CODPROD, QT, PVENDA) VALUES (:1, :2, :3, :4)`,
          [numpedrca, codprod, qt, pvenda]
        );
      }
      await connection.commit();
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao adicionar item:', err);
    res.status(500).json({ error: 'Erro ao adicionar item ao carrinho.' });
  }
};

// PUT /api/carrinho/:codusuario/items/:codprod
export const atualizarItem = async (req: any, res: any) => {
  const { codusuario, codprod } = req.params;
  const { qt } = req.body;
  try {
    await withConnection(async (connection) => {
      const numpedrca = await findOrCreateCartHeader(connection, Number(codusuario));
      await connection.execute(
        `UPDATE BRAMV_PEDIDOI SET QT = :qt WHERE NUMPEDRCA = :numpedrca AND CODPROD = :codprod`,
        { qt, numpedrca, codprod }, { autoCommit: true }
      );
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao atualizar item:', err);
    res.status(500).json({ error: 'Erro ao atualizar item.' });
  }
};

// DELETE /api/carrinho/:codusuario/items/:codprod
export const removerItem = async (req: any, res: any) => {
  const { codusuario, codprod } = req.params;
  try {
    await withConnection(async (connection) => {
      const numpedrca = await findOrCreateCartHeader(connection, Number(codusuario));
      await connection.execute(
        `DELETE FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :numpedrca AND CODPROD = :codprod`,
        { numpedrca, codprod }, { autoCommit: true }
      );
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error('Erro ao remover item:', err);
    res.status(500).json({ error: 'Erro ao remover item.' });
  }
};

// POST /api/carrinho/:codusuario/submit
export const submeterCarrinho = async (req: any, res: any) => {
  const { codusuario } = req.params;

  try {
    await withConnection(async (connection) => {
      const codUsuarioNum = Number(codusuario);
      if (!Number.isFinite(codUsuarioNum)) {
        return res.status(400).json({ error: 'Parâmetro codusuario inválido.' });
      }

      // Validação de saldo apenas na submissão
      const { codSetor, saldo } = await getUserSetorAndSaldo(connection, codUsuarioNum);
      if (!codSetor) {
        return res.status(400).json({ error: 'Usuário sem setor configurado. Associe um setor ao usuário.' });
      }

      const totalCarrinho = await getOpenCartTotal(connection, codUsuarioNum);

      if (totalCarrinho > saldo) {
        return res.status(400).json({
          error: 'Saldo insuficiente para enviar o pedido para aprovação.',
          detalhes: {
            saldoDisponivel: saldo,
            totalPedido: totalCarrinho,
            excedente: totalCarrinho - saldo,
          },
        });
      }

      const result = await connection.execute(
        `UPDATE BRAMV_PEDIDOC SET STATUS = 5 WHERE CODUSUARIO = :1 AND STATUS = 0`,
        [codUsuarioNum]
      );

      if (result.rowsAffected === 0) {
        throw new Error('Nenhum carrinho ativo para submeter.');
      }

      await connection.commit();
      res.status(200).json({ success: true, message: `Pedido enviado para aprovação.` });
    });
  } catch (err: any) {
    console.error('Erro ao submeter carrinho:', { message: err?.message, errorNum: err?.errorNum });
    res.status(500).json({ error: err.message || 'Erro ao submeter o pedido.' });
  }
};