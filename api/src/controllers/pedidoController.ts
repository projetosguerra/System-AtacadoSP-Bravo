import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';

type PrecheckIssue =
  | 'CLIENTE_INEXISTENTE'
  | 'COND_PAGAMENTO_INEXISTENTE'
  | 'COBRANCA_INEXISTENTE'
  | 'USUARIO_SEM_PARAMETRO_NUMPED'
  | 'FILIAL_INEXISTENTE'
  | 'FILIAL_SEM_PARAMETRO'
  | 'PEDIDO_SEM_ITENS'
  | 'ITENS_SEM_PRODUTO';

function normalizeFilial(f: string | number | undefined | null): string {
  const s = String(f ?? '').trim();
  if (!s) return '';
  const noZeros = s.replace(/^0+/, '');
  return noZeros || '0';
}

async function precheckAprovacao(connection: oracledb.Connection, {
  codCli,
  codFilial,
  numpedrca,
}: { codCli: number; codFilial: string; numpedrca: number; }) {
  const issues: PrecheckIssue[] = [];

  const cliRes = await connection.execute(
    `SELECT NVL(CODUSUR2, CODUSUR1) CODUSUR, CODPLPAG, CODCOB
       FROM PCCLIENT
      WHERE CODCLI = :codCli`,
    { codCli },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const cli: any = cliRes.rows?.[0];
  if (!cli) {
    issues.push('CLIENTE_INEXISTENTE');
  } else {
    try {
      const pl = await connection.execute(
        `SELECT 1 FROM PCPLPAG WHERE CODPLPAG = :codpl`,
        { codpl: cli.CODPLPAG },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!pl.rows?.length) issues.push('COND_PAGAMENTO_INEXISTENTE');
    } catch { issues.push('COND_PAGAMENTO_INEXISTENTE'); }

    try {
      const cob = await connection.execute(
        `SELECT 1 FROM PCCOB WHERE CODCOB = :cob`,
        { cob: cli.CODCOB },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!cob.rows?.length) issues.push('COBRANCA_INEXISTENTE');
    } catch { issues.push('COBRANCA_INEXISTENTE'); }

    try {
      const usu = await connection.execute(
        `SELECT PROXNUMPEDFORCA FROM PCUSUARI WHERE CODUSUR = :u`,
        { u: cli.CODUSUR },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      if (!usu.rows?.length) issues.push('USUARIO_SEM_PARAMETRO_NUMPED');
    } catch { issues.push('USUARIO_SEM_PARAMETRO_NUMPED'); }
  }

  const filialNum = Number(codFilial);
  try {
    const f = await connection.execute(
      `SELECT 1 FROM PCFILIAL WHERE CODIGO = :cod`,
      { cod: filialNum },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!f.rows?.length) issues.push('FILIAL_INEXISTENTE');
  } catch {
  }

  try {
    const pf = await connection.execute(
      `SELECT 1 FROM SAOPAULO.PCPARAMFILIAL WHERE CODFILIAL IN (:f1,:f2)`,
      { f1: String(filialNum), f2: String(filialNum).padStart(2, '0') },
      { outFormat: oracledb.OUT_FORMAT_OBJECT }
    );
    if (!pf.rows?.length) issues.push('FILIAL_SEM_PARAMETRO');
  } catch {
  }

  const itens = await connection.execute(
    `SELECT COUNT(*) QTD FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :id`,
    { id: numpedrca },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const qtd = Number((itens.rows?.[0] as any)?.QTD ?? 0);
  if (qtd <= 0) issues.push('PEDIDO_SEM_ITENS');

  const faltandoProd = await connection.execute(
    `SELECT COUNT(*) MISSING
       FROM BRAMV_PEDIDOI i
      WHERE i.NUMPEDRCA = :id
        AND NOT EXISTS (SELECT 1 FROM PCPRODUT p WHERE p.CODPROD = i.CODPROD)`,
    { id: numpedrca },
    { outFormat: oracledb.OUT_FORMAT_OBJECT }
  );
  const miss = Number((faltandoProd.rows?.[0] as any)?.MISSING ?? 0);
  if (miss > 0) issues.push('ITENS_SEM_PRODUTO');

  return issues;
}

export const obterPedido = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const pedidoDetails = await withConnection(async (connection) => {
      const headerResult = await connection.execute(
        `SELECT p.NUMPEDRCA, p.DATA, p.STATUS,
                u.PRIMEIRO_NOME || ' ' || u.ULTIMO_NOME AS NOME,
                u.EMAIL,
                s.DESCRICAO AS SETOR
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
           FROM BRAMV_PEDIDOI i
           JOIN PCPRODUT p ON i.CODPROD = p.CODPROD
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

export const obterLogsPedido = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const logs = await withConnection(async (connection) => {
      const r = await connection.execute(
        `SELECT *
           FROM LOG_PROCESSA_PEDIDO
          WHERE NUMPEDRCA = :id
          ORDER BY IDLOG DESC`,
        { id: Number(id) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      return r.rows ?? [];
    });
    res.json({ data: logs });
  } catch (err: any) {
    console.error('[API] ERRO ao obter logs do pedido:', err);
    res.status(500).json({ error: err?.message || 'Falha ao obter logs.' });
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

export const aprovarPedido = async (req: any, res: any) => {
  const { id } = req.params;
  const codCli = Number(process.env.CODCLI ?? 27995);
  const codFilialRaw = String(req.body?.codFilial ?? process.env.CODFILIAL ?? '01');
  const codFilial = normalizeFilial(codFilialRaw); 
  const vlFrete = Number(req.body?.frete ?? 0);

  try {
    const result = await withConnection(async (connection) => {
      const issues = await precheckAprovacao(connection, {
        codCli,
        codFilial,
        numpedrca: Number(id),
      });
      if (issues.length) {
        const e = new Error('Pré-condições não atendidas para aprovação.');
        (e as any).statusCode = 422;
        (e as any).issues = issues;
        throw e;
      }

      const hdr = await connection.execute(
        `SELECT STATUS FROM BRAMV_PEDIDOC WHERE NUMPEDRCA = :id`,
        { id: Number(id) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const row: any = hdr.rows?.[0];
      if (!row) throw new Error('Pedido não encontrado.');
      const statusAtual = Number(row.STATUS);

      if (statusAtual === 1) {
        const logs = await connection.execute(
          `SELECT * FROM LOG_PROCESSA_PEDIDO WHERE NUMPEDRCA = :id ORDER BY IDLOG DESC`,
          { id: Number(id) },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return { alreadyApproved: true, logs: logs.rows ?? [] };
      }

      if (statusAtual === 5) {
        const up = await connection.execute(
          `UPDATE BRAMV_PEDIDOC SET STATUS = 3 WHERE NUMPEDRCA = :id AND STATUS = 5`,
          { id: Number(id) }
        );
        if ((up.rowsAffected ?? 0) === 0) {
          const r2 = await connection.execute(
            `SELECT STATUS FROM BRAMV_PEDIDOC WHERE NUMPEDRCA = :id`,
            { id: Number(id) },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          const s2 = Number((r2.rows?.[0] as any)?.STATUS ?? -1);
          if (s2 !== 3) throw new Error(`Pedido mudou de status (atual=${s2}). Tente novamente.`);
        }
      } else if (statusAtual !== 3) {
        throw new Error(`Pedido não está pendente/em análise (status atual=${statusAtual}).`);
      }

      await connection.execute(
        `BEGIN
           P_PROCESSA_PEDIDO_LOG(:P_CODCLI, :P_CODFILIAL, :P_NUMPEDRCA, NVL(:P_VLFRETE,0));
         END;`,
        {
          P_CODCLI: codCli,
          P_CODFILIAL: codFilial,
          P_NUMPEDRCA: Number(id),
          P_VLFRETE: vlFrete
        },
        { autoCommit: false }
      );

      const logRes = await connection.execute(
        `SELECT * FROM LOG_PROCESSA_PEDIDO WHERE NUMPEDRCA = :id ORDER BY IDLOG DESC`,
        { id: Number(id) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );

      const totRes = await connection.execute(
        `SELECT COUNT(*) AS QTD, SUM(QT * PVENDA) AS TOTAL
           FROM BRAMV_PEDIDOI
          WHERE NUMPEDRCA = :id`,
        { id: Number(id) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const qtd = Number((totRes.rows?.[0] as any)?.QTD ?? 0);
      const total = Number((totRes.rows?.[0] as any)?.TOTAL ?? 0);

      await connection.execute(
        `UPDATE BRAMV_PEDIDOC
            SET STATUS = 1,
                QTD_ITENS = :qtd,
                VALOR_TOTAL = :total
          WHERE NUMPEDRCA = :id`,
        { id: Number(id), qtd, total }
      );

      await connection.commit();
      return { alreadyApproved: false, logs: logRes.rows ?? [], qtd, total };
    });

    return res.status(200).json({
      success: true,
      message: result.alreadyApproved
        ? `Pedido #${id} já estava aprovado.`
        : `Pedido #${id} aprovado e processado no WinThor.`,
      logs: result.logs,
      totals: result.qtd !== undefined ? { qtd: result.qtd, total: result.total } : undefined
    });
  } catch (err: any) {
    if (err?.statusCode === 422) {
      return res.status(422).json({
        error: err.message,
        issues: err.issues as PrecheckIssue[]
      });
    }

    let logs: any[] = [];
    try {
      logs = await withConnection(async (connection) => {
        const r = await connection.execute(
          `SELECT * FROM LOG_PROCESSA_PEDIDO WHERE NUMPEDRCA = :id ORDER BY IDLOG DESC`,
          { id: Number(id) },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        return r.rows ?? [];
      });
    } catch { /* ignore */ }

    console.error('[aprovarPedido] erro:', err);
    return res.status(500).json({
      error: err?.message || 'Falha ao aprovar/processar o pedido.',
      logs
    });
  }
};

export const desbloquearPedido = async (req: any, res: any) => {
  const { id } = req.params;
  try {
    const result = await withConnection(async (connection) => {
      const up = await connection.execute(
        `UPDATE BRAMV_PEDIDOC
            SET STATUS = 5
          WHERE NUMPEDRCA = :id
            AND STATUS = 3`,
        { id: Number(id) }
      );
      await connection.commit();
      return up.rowsAffected ?? 0;
    });
    return res.json({ success: true, reverted: result });
  } catch (err: any) {
    console.error('[API] ERRO ao desbloquear pedido:', err);
    return res.status(500).json({ error: err?.message || 'Falha ao desbloquear pedido.' });
  }
};