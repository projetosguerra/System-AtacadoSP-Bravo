import oracledb from 'oracledb';
import { withConnection } from '../db/pool.js';
import { toImageUrl } from '../utils/images.js';

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

const statusLabel: Record<number, string> = {
  1: 'Aprovado',
  2: 'Reprovado',
  3: 'Em Análise',
  5: 'Pendente',
  9: 'Arquivado'
};

async function inserirEvento(conn: oracledb.Connection, numped: number, tipo: string, usuarioId: number | null, detalhe: any) {
  const detalheStr = detalhe ? JSON.stringify(detalhe) : null;
  await conn.execute(
    `INSERT INTO BRAMV_PEDIDO_EVENTO (NUMPEDRCA, TIPO, USUARIO_ID, DETALHE_JSON)
     VALUES (:n,:t,:u,:d)`,
    { n: numped, t: tipo, u: usuarioId, d: detalheStr }
  );
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

async function readClobSafe(val: any): Promise<string | null> {
  if (val == null) return null;
  if (typeof val === 'string') return val;
  if (Buffer.isBuffer(val)) return val.toString('utf8');

  if (typeof val === 'object' && typeof val.on === 'function' && typeof val.pipe === 'function') {
    return await new Promise<string>((resolve, reject) => {
      let s = '';
      try {
        if (typeof val.setEncoding === 'function') val.setEncoding('utf8');
        val.on('data', (chunk: any) => { s += chunk; });
        val.on('end', () => resolve(s));
        val.on('error', (err: any) => reject(err));
      } catch (err) {
        reject(err);
      }
    });
  }

  try {
    return JSON.stringify(val);
  } catch {
    return String(val);
  }
}

async function clobToString(val: any): Promise<string | null> {
  if (val == null) return null;
  if (typeof val === 'string') return val;
  if (Buffer.isBuffer(val)) return val.toString('utf8');
  if (typeof val === 'object' && typeof (val as any).on === 'function') {
    return await new Promise((resolve, reject) => {
      let out = '';
      try {
        (val as any).setEncoding?.('utf8');
        (val as any).on('data', (c: any) => out += c);
        (val as any).on('end', () => resolve(out));
        (val as any).on('error', reject);
      } catch (err) { reject(err); }
    });
  }
  return String(val);
}

export const obterPedido = async (req: any, res: any) => {
  const { id } = req.params;
  const num = Number(id);
  if (!Number.isFinite(num)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const payload = await withConnection(async (connection) => {
      const headerSql = `
        SELECT
          p.NUMPEDRCA,
          p.DATA,
          p.STATUS,
          p.CODUSUARIO,
          p.APROVADOR_ID,
          p.CONCAT_PAPEL,
          p.CONCAT_GRUPO_ID,
          p.VALOR_TOTAL,
          p.QTD_ITENS,
          u.PRIMEIRO_NOME || ' ' || NVL(u.ULTIMO_NOME,'') AS SOLICITANTE_NOME,
          u.EMAIL AS SOLICITANTE_EMAIL,
          u.CODSETOR AS SOLICITANTE_SETOR_ID,
          s.DESCRICAO AS SOLICITANTE_SETOR_NOME,
          a.PRIMEIRO_NOME || ' ' || NVL(a.ULTIMO_NOME,'') AS APROVADOR_NOME,
          a.EMAIL AS APROVADOR_EMAIL,
          a.TIPOUSUARIO AS APROVADOR_TIPO
        FROM BRAMV_PEDIDOC p
        LEFT JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
        LEFT JOIN BRAMV_SETOR s    ON s.CODSETOR    = u.CODSETOR
        LEFT JOIN BRAMV_USUARIOS a ON a.CODUSUARIO  = p.APROVADOR_ID
        WHERE p.NUMPEDRCA = :id
      `;
      const headerR = await connection.execute(headerSql, { id: num }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const h: any = headerR.rows?.[0];
      if (!h) throw new Error('Pedido não encontrado');

      const itemsSql = `
        SELECT
          i.CODPROD,
          i.QT,
          i.PVENDA,
          p.CODAUXILIAR,
          NVL(p.NOMEECOMMERCE, p.DESCRICAO) AS NOME,
          p.EMBALAGEM AS UNIDADE,
          p.DIRFOTOPROD AS DIRFOTO
        FROM BRAMV_PEDIDOI i
        JOIN PCPRODUT p ON p.CODPROD = i.CODPROD
        WHERE i.NUMPEDRCA = :id
        ORDER BY p.NOMEECOMMERCE NULLS LAST, p.DESCRICAO
      `;
      const itemsR = await connection.execute(itemsSql, { id: num }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      const itens = (itemsR.rows || []).map((r: any) => {
        const qt = Number(r.QT || 0);
        const preco = Number(r.PVENDA || 0);
        return {
          codProd: r.CODPROD,
          codigoAuxiliar: r.CODAUXILIAR,
          nome: r.NOME,
          unidade: r.UNIDADE,
          qt,
          precoUnit: preco,
          subtotal: +(qt * preco).toFixed(2),
          imgUrl: toImageUrl(r.DIRFOTOPROD, r.CODPROD)
        };
      });

      const qtdItensCalc = itens.length;
      const valorTotalCalc = itens.reduce((sum: number, it: any) => sum + it.subtotal, 0);

      let concatOrigens: any[] = [];
      let concatResultado: any = null;
      const papel = String(h.CONCAT_PAPEL ?? '').toUpperCase();
      const grupoId = h.CONCAT_GRUPO_ID;

      if (papel === 'RESULTADO' && grupoId) {
        const origSql = `
          SELECT NUMPEDRCA, STATUS
            FROM BRAMV_PEDIDOC
           WHERE CONCAT_GRUPO_ID = :gid
             AND CONCAT_PAPEL = 'ORIGEM'
          ORDER BY NUMPEDRCA
        `;
        const origR = await connection.execute(origSql, { gid: grupoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        concatOrigens = (origR.rows || []).map((o: any) => ({
          id: o.NUMPEDRCA,
          status: o.STATUS,
          statusLabel: statusLabel[o.STATUS] || String(o.STATUS)
        }));
      } else if (papel === 'ORIGEM' && grupoId) {
        const resSql = `
          SELECT NUMPEDRCA, STATUS
            FROM BRAMV_PEDIDOC
           WHERE CONCAT_GRUPO_ID = :gid
             AND CONCAT_PAPEL = 'RESULTADO'
        `;
        const resR = await connection.execute(resSql, { gid: grupoId }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
        const rRow: any = resR.rows?.[0];
        if (rRow) {
          concatResultado = {
            id: rRow.NUMPEDRCA,
            status: rRow.STATUS,
            statusLabel: statusLabel[rRow.STATUS] || String(rRow.STATUS)
          };
        }
      }

      const eventosSql = `
        SELECT IDEVENTO, TIPO, USUARIO_ID, DATA_EVENTO, DETALHE_JSON
          FROM BRAMV_PEDIDO_EVENTO
         WHERE NUMPEDRCA = :id
         ORDER BY DATA_EVENTO ASC, IDEVENTO ASC
      `;
      const eventosR = await connection.execute(eventosSql, { id: num }, {
        outFormat: oracledb.OUT_FORMAT_OBJECT,
        fetchArraySize: 50
      });

      const eventosRows = eventosR.rows || [];
      const eventos: any[] = [];
      for (const ev of eventosRows as Array<any>) {
        const detalheRaw = ev.DETALHE_JSON;
        let detalheProcessed: string | null = null;
        try {
          detalheProcessed = await readClobSafe(detalheRaw);
        } catch (readErr) {
          console.warn('[obterPedido] falha ao ler DETALHE_JSON (evento):', readErr);
          detalheProcessed = null;
        }
        eventos.push({
          idEvento: ev.IDEVENTO,
          tipo: ev.TIPO,
          usuarioId: ev.USUARIO_ID,
          data: ev.DATA_EVENTO,
          detalheJson: detalheProcessed
        });
      }

      let reprovacaoMotivo: string | null = null;
      for (let i = eventos.length - 1; i >= 0; i--) {
        const ev = eventos[i];
        if (String(ev.tipo || '').toUpperCase() === 'REPROVACAO') {
          const parsed = JSON.parse(ev.detalheJson || 'null');
          if (parsed && parsed.motivo) {
            reprovacaoMotivo = String(parsed.motivo);
          } else if (ev.detalheJson && typeof ev.detalheJson === 'string') {
            reprovacaoMotivo = ev.detalheJson;
          }
          break;
        }
      }

      // Conteste resumo (converter CLOB)
      let contesteResumo: any = null;
      try {
        const contR = await connection.execute(
          `SELECT ID, STATUS, JUSTIFICATIVA, MOTIVO_REPROVACAO, PARECER, DATA_CRIACAO, DATA_ANALISE
             FROM BRAMV_CONTESTE
            WHERE NUMPEDRCA = :id
            ORDER BY DATA_CRIACAO DESC, ID DESC`,
          { id: num },
          { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 5 }
        );
        const row: any = contR.rows?.[0];
        if (row) {
          contesteResumo = {
            id: row.ID,
            status: row.STATUS,
            justificativa: await clobToString(row.JUSTIFICATIVA),
            motivoReprovacao: row.MOTIVO_REPROVACAO,
            parecer: await clobToString(row.PARECER),
            dataCriacao: row.DATA_CRIACAO,
            dataAnalise: row.DATA_ANALISE
          };
        }
      } catch { /* ignore */ }

      const aprovador = h.APROVADOR_ID ? {
        id: h.APROVADOR_ID,
        nome: h.APROVADOR_NOME,
        email: h.APROVADOR_EMAIL,
        perfil: h.APROVADOR_TIPO
      } : null;

      const status = Number(h.STATUS);
      const editavel = [5, 3].includes(status);

      let contesteStatus: number | null = null;
      try {
        const csR = await connection.execute(
          `SELECT CONTESTE_STATUS FROM BRAMV_PEDIDOC WHERE NUMPEDRCA = :id`,
          { id: num },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        contesteStatus = Number((csR.rows?.[0] as any)?.CONTESTE_STATUS ?? 0);
      } catch { }

      let statusOperacional: string | null = null;
      let posicaoRaw: string | null = null;
      let entregue = false;
      let financeiroPago = false;
      let financeiroEmAberto = false;

      try {
        const opR = await connection.execute(
          `SELECT POSICAO, DTENTREGA
             FROM PCPEDC
            WHERE NUMPEDRCA = :id`,
          { id: num },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const opRow: any = opR.rows?.[0];
        if (opRow) {
          posicaoRaw = opRow.POSICAO;
          const pos = String(opRow.POSICAO || '').toUpperCase();
          if (pos === 'F') statusOperacional = 'FATURADO';
          else if (pos === 'C') statusOperacional = 'CANCELADO';
          else statusOperacional = 'EM_CONFERENCIA';
          if (opRow.DTENTREGA) entregue = true;
        }

        const finR = await connection.execute(
          `SELECT COUNT(*) AS TOTAL,
                  SUM(CASE WHEN R.DTPAG IS NOT NULL THEN 1 ELSE 0 END) AS QUITADAS
             FROM PCPREST R
             JOIN PCPEDC C ON C.NUMPED = R.NUMPED
            WHERE NVL(C.NUMPEDRCA,0) = :id`,
          { id: num },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const finRow: any = finR.rows?.[0];
        if (finRow) {
          const total = Number(finRow.TOTAL || 0);
          const quitadas = Number(finRow.QUITADAS || 0);
          financeiroPago = total > 0 && quitadas === total;
          financeiroEmAberto = total > 0 && quitadas < total;
        }
      } catch { /* schema não disponível */ }

      let atesteResumo: any = null;
      try {
        const atR = await connection.execute(
          `SELECT ID, RECEBIDO_OK, DATA_ATESTE, COMENTARIO
             FROM BRAMV_ATESTE
            WHERE NUMPEDRCA = :id
            ORDER BY DATA_ATESTE DESC, ID DESC`,
          { id: num },
          { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 3 }
        );
        const aRow: any = atR.rows?.[0];
        if (aRow) {
          atesteResumo = {
            id: aRow.ID,
            recebidoOk: Number(aRow.RECEBIDO_OK) === 1,
            dataAteste: aRow.DATA_ATESTE,
            comentario: aRow.COMENTARIO
          };
        }
      } catch { }

      let satisfacaoResumo: any = null;
      try {
        const satR = await connection.execute(
          `SELECT DATA_EVENTO, DETALHE_JSON
            FROM BRAMV_PEDIDO_EVENTO
            WHERE NUMPEDRCA = :id AND UPPER(TIPO) = 'PESQUISA_SATISFACAO'
            ORDER BY DATA_EVENTO DESC, IDEVENTO DESC`,
          { id: num },
          { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 3 }
        );
        const sRow: any = satR.rows?.[0];
        if (sRow) {
          let rating: number | null = null;
          let comentario: string | null = null;
          try {
            const json = typeof sRow.DETALHE_JSON === 'string'
              ? JSON.parse(sRow.DETALHE_JSON)
              : sRow.DETALHE_JSON;
            rating = Number(json?.rating ?? null);
            comentario = json?.comentario ?? null;
          } catch {
            comentario = typeof sRow.DETALHE_JSON === 'string' ? sRow.DETALHE_JSON : null;
          }
          satisfacaoResumo = {
            data: sRow.DATA_EVENTO,
            rating,
            comentario
          };
        }
      } catch { /* ignore */ }

      return {
        id: h.NUMPEDRCA,
        status,
        statusLabel: statusLabel[status] || String(status),
        data: h.DATA,
        solicitante: {
          id: h.CODUSUARIO,
          nome: h.SOLICITANTE_NOME,
          email: h.SOLICITANTE_EMAIL,
          codSetor: h.SOLICITANTE_SETOR_ID,
          setorNome: h.SOLICITANTE_SETOR_NOME
        },
        unidadeAdmin: h.SOLICITANTE_SETOR_NOME,
        qtdItens: h.QTD_ITENS ?? qtdItensCalc,
        valorTotal: h.VALOR_TOTAL ?? valorTotalCalc,
        itens,
        concatRole: papel === 'RESULTADO' ? 'RESULTADO' : papel === 'ORIGEM' ? 'ORIGEM' : null,
        concatGroupId: grupoId ?? null,
        concatOrigens,
        concatResultado,
        aprovador,
        eventos,
        editavel,
        contesteStatus: contesteStatus && [1, 2, 3, 4, 9].includes(contesteStatus) ? contesteStatus : null,
        reprovacaoMotivo,
        contesteResumo,
        statusOperacional,
        posicaoRaw,
        entregue,
        financeiroPago,
        financeiroEmAberto,
        atesteResumo,
        satisfacaoResumo
      };
    });

    res.json(payload);
  } catch (err: any) {
    console.error(`[API] ERRO obterPedido #${id}:`, err);
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
  const { newStatus, conditionStatus, motivo } = req.body;
  if (![0, 1, 2, 3, 5, 9].includes(newStatus)) {
    return res.status(400).json({ error: 'Status inválido.' });
  }

  try {
    await withConnection(async (connection) => {
      const prev = await connection.execute(
        `SELECT STATUS FROM BRAMV_PEDIDOC WHERE NUMPEDRCA = :id`,
        { id: Number(id) },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const prevStatus = Number((prev.rows?.[0] as any)?.STATUS ?? -1);

      let sql = `UPDATE BRAMV_PEDIDOC SET STATUS = :newStatus`;
      const params: any = { newStatus, id: Number(id) };

      const usuarioId = Number(req.user?.codUsuario) || null;
      if ([1, 2].includes(newStatus)) {
        sql += `, APROVADOR_ID = :aprovador, DATA_APROVACAO = SYSDATE`;
        params.aprovador = usuarioId;
      }

      sql += ` WHERE NUMPEDRCA = :id`;
      if (conditionStatus !== undefined) {
        sql += ` AND STATUS = :conditionStatus`;
        params.conditionStatus = conditionStatus;
      }

      const updateResult = await connection.execute(sql, params);
      if (updateResult.rowsAffected === 0 && conditionStatus !== undefined) {
        throw new Error('O status do pedido foi alterado por outro usuário. A página será atualizada.');
      }

      if ((updateResult.rowsAffected ?? 0) > 0 && prevStatus !== newStatus) {
        if (newStatus === 2) {
          await inserirEvento(connection, Number(id), 'REPROVACAO', usuarioId, { motivo: String(motivo ?? '') });
        } else {
          await inserirEvento(connection, Number(id), 'STATUS_CHANGE', usuarioId, { from: prevStatus, to: newStatus });
        }
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
  const usuarioAprovador = Number(req.user?.codUsuario) || null;

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
                VALOR_TOTAL = :total,
                APROVADOR_ID = :aprovador,
                DATA_APROVACAO = SYSDATE
          WHERE NUMPEDRCA = :id`,
        { id: Number(id), qtd, total, aprovador: usuarioAprovador }
      );

      await inserirEvento(connection, Number(id), 'APROVACAO', usuarioAprovador, {
        qtdItens: qtd,
        valorTotal: total,
        frete: vlFrete
      });

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

export const obterFinanceiroPedido = async (req: any, res: any) => {
  const { id } = req.params;
  const num = Number(id);
  if (!Number.isFinite(num)) return res.status(400).json({ error: 'ID inválido.' });

  const tries: string[] = [];
  if (process.env.FINANCE_SCHEMA) tries.push(process.env.FINANCE_SCHEMA);
  if (process.env.DB_SCHEMA) tries.push(process.env.DB_SCHEMA);
  if (process.env.DB_OWNER) tries.push(process.env.DB_OWNER);
  if (process.env.DB_CONNECT_STRING) tries.push(process.env.DB_CONNECT_STRING);
  tries.push('SAOPAULO', 'WINT', 'ALMOXARIFADO');

  const schemasToTry = Array.from(new Set(tries.filter(Boolean).map(s => String(s).toUpperCase())));

  const buildSql = (prefix: string) => `
    SELECT R.PREST AS PARCELA,
           R.DUPLIC AS NOTA_FISCAL,
           R.VALOR,
           R.DTEMISSAO,
           R.DTVENC,
           R.VPAGO AS VALORPAGO,
           R.DTPAG,
           R.CODBARRA,
           CASE WHEN R.DTPAG IS NULL THEN 'VENCE EM ' || TO_CHAR(TRUNC(R.DTVENC) - TRUNC(SYSDATE)) || ' DIAS' ELSE 'QUITADO' END AS STATUS
      FROM ${prefix}PCPREST R
      JOIN ${prefix}PCPEDC C ON C.NUMPED = R.NUMPED
     WHERE NVL(C.NUMPEDRCA, 0) > 0
       AND C.NUMPEDRCA = :id
     ORDER BY R.DTVENC
  `;

  let lastError: any = null;
  try {
    const rows = await withConnection(async (connection) => {
      const tryPrefixes = [''].concat(schemasToTry.map(s => `${s}.`));
      for (const prefix of tryPrefixes) {
        try {
          const sql = buildSql(prefix);
          const r = await connection.execute(sql, { id: num }, { outFormat: oracledb.OUT_FORMAT_OBJECT, fetchArraySize: 100 });
          return r.rows ?? [];
        } catch (err: any) {
          lastError = err;
          const msg = String(err?.message || err || '');
          if (!/ORA-00942/.test(msg)) {
            throw err;
          }
          console.warn(`[obterFinanceiroPedido] ORA-00942 for prefix "${prefix}". Trying next prefix...`);
        }
      }
      throw lastError || new Error('Não foi possível localizar tabelas PCPREST/PCPEDC em nenhum schema tentado.');
    });

    const payload = (rows as any[]).map((r: any) => ({
      parcela: r.PARCELA,
      notaFiscal: r.NOTA_FISCAL,
      valor: Number(r.VALOR ?? 0),
      dtEmissao: r.DTEMISSAO ?? null,
      dtVencimento: r.DTVENC ?? null,
      valorPago: Number(r.VALORPAGO ?? 0),
      dtPagamento: r.DTPAG ?? null,
      codigoBarras: r.CODBARRA ?? null,
      status: r.STATUS ?? null
    }));

    return res.json({ parcelas: payload });
  } catch (err: any) {
    const errMsg = String(err?.message || err || '');
    console.error(`[API] ERRO obterFinanceiroPedido #${id}:`, err);

    if (/ORA-00942/.test(errMsg)) {
      return res.status(500).json({
        error: 'Tabela não encontrada (ORA-00942) ao tentar buscar financeiro.',
        help: 'Verifique se as tabelas PCPREST / PCPEDC existem no banco e se o usuário de conexão tem permissão SELECT.',
        triedSchemas: schemasToTry,
        original: errMsg,
        hint: 'Rode: SELECT OWNER FROM ALL_TABLES WHERE TABLE_NAME = \'PCPREST\' OR TABLE_NAME = \'PCPEDC\'; (DB user com privilégios) ou peça ao DBA para conceder SELECT.'
      });
    }

    return res.status(500).json({ error: errMsg || 'Erro ao buscar financeiro do pedido.' });
  }
};

export const obterTransportadoraPedido = async (req: any, res: any) => {
  const { id } = req.params;
  const num = Number(id);
  if (!Number.isFinite(num)) return res.status(400).json({ error: 'ID inválido.' });

  try {
    const row = await withConnection(async (connection) => {
      const sql = `
        SELECT CASE
                 WHEN POSICAO = 'F' THEN 'FATURADO'
                 WHEN POSICAO = 'C' THEN 'CANCELADO'
                 ELSE 'EM CONFERENCIA/SEPARACAO'
               END AS STATUS_PEDIDO,
               NUMPED,
               NUMPEDRCA,
               NUMNOTA,
               NUMTRANSVENDA,
               DATA,
               VLTOTAL,
               NVL(VLFRETE, 0) AS VLFRETE,
               DTENTREGA,
               CODFILIAL,
               TOTPESO,
               TOTVOLUME,
               NUMITENS,
               (SELECT PCFORNEC.FORNECEDOR
                  FROM PCFORNEC
                 WHERE CODFORNEC = PCPEDC.CODFORNECFRETE) AS TRANSPORTADORA
          FROM PCPEDC
         WHERE NUMPEDRCA = :id
      `;
      const r = await connection.execute(sql, { id: num }, { outFormat: oracledb.OUT_FORMAT_OBJECT });
      return (r.rows && r.rows[0]) || null;
    });

    if (!row) return res.status(404).json({ error: 'Pedido não encontrado.' });

    const typedRow = row as {
      STATUS_PEDIDO?: string;
      NUMPED?: number;
      NUMPEDRCA?: number;
      NUMNOTA?: number;
      NUMTRANSVENDA?: number;
      DATA?: Date;
      VLTOTAL?: number;
      VLFRETE?: number;
      DTENTREGA?: Date;
      CODFILIAL?: string;
      TOTPESO?: number;
      TOTVOLUME?: number;
      NUMITENS?: number;
      TRANSPORTADORA?: string;
    };

    const payload = {
      statusPedido: typedRow.STATUS_PEDIDO ?? null,
      numPed: typedRow.NUMPED ?? null,
      numPedRca: typedRow.NUMPEDRCA ?? null,
      numNota: typedRow.NUMNOTA ?? null,
      numTransVenda: typedRow.NUMTRANSVENDA ?? null,
      data: typedRow.DATA ?? null,
      valorTotal: Number(typedRow.VLTOTAL ?? 0),
      vlFrete: Number(typedRow.VLFRETE ?? 0),
      dtEntrega: typedRow.DTENTREGA ?? null,
      codFilial: typedRow.CODFILIAL ?? null,
      totPeso: typedRow.TOTPESO ?? null,
      totVolume: typedRow.TOTVOLUME ?? null,
      numItens: typedRow.NUMITENS ?? null,
      transportadora: typedRow.TRANSPORTADORA ?? null
    };

    return res.json({ transportadora: payload });
  } catch (err: any) {
    console.error(`[API] ERRO obterTransportadoraPedido #${id}:`, err);
    return res.status(500).json({ error: err.message || 'Erro ao buscar dados da transportadora.' });
  }
};

function safeParseJson(detalheJson: any): any | null {
  if (!detalheJson) return null;
  if (typeof detalheJson === 'object') return detalheJson;
  try {
    return JSON.parse(detalheJson);
  } catch {
    return null;
  }
}

export const editarItensPedido = async (req: any, res: any) => {
  if (!req.user) return res.status(401).json({ error: 'Token ausente ou inválido.' });

  const num = Number(req.params.id);
  if (!Number.isFinite(num)) return res.status(400).json({ error: 'ID inválido.' });

  const motivo = String(req.body?.motivo ?? '').trim();
  const itensPayload = Array.isArray(req.body?.itens) ? req.body.itens : [];

  if (motivo.length < 5) {
    return res.status(400).json({ error: 'Motivo da edição deve ter pelo menos 5 caracteres.' });
  }
  if (itensPayload.length === 0) {
    return res.status(400).json({ error: 'Lista de itens não pode ser vazia.' });
  }

  const normalizados = itensPayload
    .map((it: any) => ({
      codProd: Number(it.codProd),
      qt: Number(it.qt)
    }))
    .filter((it: { codProd: unknown; qt: unknown; }) => Number.isFinite(it.codProd) && Number.isFinite(it.qt) && (it.qt as number) >= 1);

  if (normalizados.length === 0) {
    return res.status(400).json({ error: 'Nenhum item válido após normalização.' });
  }

  function readUserScopeLoose(u: any) {
    const rawPerfil =
      u?.perfil ?? u?.role ?? u?.perfilUsuario ?? u?.tipoPerfil ?? u?.tipo ?? '';
    const perfilUp = String(rawPerfil).trim().toUpperCase();
    const tipoNum = Number(u?.tipoUsuario ?? u?.tipo ?? u?.TIPOUSUARIO ?? NaN);

    let perfil: 'ADMIN' | 'APROVADOR' | 'SOLICITANTE';
    if (['ADMIN', 'APROVADOR', 'SOLICITANTE'].includes(perfilUp)) {
      perfil = perfilUp as any;
    } else if (Number.isFinite(tipoNum)) {
      perfil = (tipoNum === 1 ? 'ADMIN' : tipoNum === 2 ? 'APROVADOR' : 'SOLICITANTE');
    } else {
      perfil = 'APROVADOR'; // fallback seguro
    }

    const codSetorRaw =
      u?.codSetor ?? u?.codsetor ?? u?.CODSETOR ?? u?.setorId ?? u?.COD_SETOR;
    const codSetor = Number(codSetorRaw);
    const codUsuarioCandidates = [
      u?.codUsuario, u?.CODUSUARIO, u?.userId, u?.id, u?.ID, u?.usuarioId
    ].map(v => Number(v)).filter(v => Number.isFinite(v));
    const codUsuario = codUsuarioCandidates.length ? codUsuarioCandidates[0] : undefined;

    return {
      perfil,
      codUsuario,
      codSetor: Number.isFinite(codSetor) ? codSetor : undefined
    };
  }

  const scope = readUserScopeLoose(req.user || {});
  let perfil = scope.perfil;
  let codSetorEditor = scope.codSetor;
  let usuarioEditorId = scope.codUsuario;

  const ignoreSetor = String(process.env.EDIT_PEDIDO_IGNORE_SETOR || '') === '1';
  const debug = String(process.env.DEBUG_EDIT_PEDIDO || '') === '1';

  try {
    const payload = await withConnection(async (connection) => {
      const hdrR = await connection.execute(
        `SELECT p.STATUS,
                u.CODSETOR   AS SETOR_SOLICITANTE,
                u.CODUSUARIO AS SOLICITANTE_ID,
                NVL(p.CONCAT_PAPEL,'') AS CONCAT_PAPEL
           FROM BRAMV_PEDIDOC p
           JOIN BRAMV_USUARIOS u ON u.CODUSUARIO = p.CODUSUARIO
          WHERE p.NUMPEDRCA = :id
          FOR UPDATE`,
        { id: num },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const hdr: any = hdrR.rows?.[0];
      if (!hdr) throw new Error('Pedido não encontrado.');

      const statusAtual = Number(hdr.STATUS);
      const solicitanteSetor = Number(hdr.SETOR_SOLICITANTE);
      const concatPapel = String(hdr.CONCAT_PAPEL).toUpperCase();
      const solicitanteId = Number(hdr.SOLICITANTE_ID);

      if (![5, 3].includes(statusAtual)) {
        const err: any = new Error('Pedido não está em estado editável.');
        err.statusCode = 409;
        throw err;
      }

      if (!Number.isFinite(usuarioEditorId) || !Number.isFinite(codSetorEditor)) {
        if (!Number.isFinite(usuarioEditorId)) {
          const idCandidates = [
            req.user?.codUsuario, req.user?.CODUSUARIO, req.user?.id,
            req.user?.ID, req.user?.userId
          ].map(n => Number(n)).filter(n => Number.isFinite(n));
          if (idCandidates.length) usuarioEditorId = idCandidates[0];
        }

        if (Number.isFinite(usuarioEditorId)) {
          const uRowR = await connection.execute(
            `SELECT CODSETOR, TIPOUSUARIO
               FROM BRAMV_USUARIOS
              WHERE CODUSUARIO = :u`,
            { u: usuarioEditorId },
            { outFormat: oracledb.OUT_FORMAT_OBJECT }
          );
          const uRow: any = uRowR.rows?.[0];
          if (uRow) {
            const fetchedSetor = Number(uRow.CODSETOR);
            if (Number.isFinite(fetchedSetor)) codSetorEditor = fetchedSetor;
            const fetchedTipo = Number(uRow.TIPOUSUARIO);
            perfil = (fetchedTipo === 1 ? 'ADMIN' : fetchedTipo === 2 ? 'APROVADOR' : 'SOLICITANTE');
          }
        }
      }

      if (!ignoreSetor) {
        if (perfil !== 'ADMIN') {
          if (perfil !== 'APROVADOR') {
            const err: any = new Error('Permissão negada: perfil não é aprovador.');
            err.statusCode = 403;
            throw err;
          }
          if (!Number.isFinite(codSetorEditor)) {
            const err: any = new Error('Permissão negada: aprovador sem setor definido.');
            err.statusCode = 403;
            throw err;
          }
          if (codSetorEditor !== solicitanteSetor) {
            const err: any = new Error(`Permissão negada: setor aprovador (${codSetorEditor}) difere do solicitante (${solicitanteSetor}).`);
            err.statusCode = 403;
            throw err;
          }
        }
      }

      if (['RESULTADO', 'ORIGEM'].includes(concatPapel)) {
        const err: any = new Error('Pedido concatenado não pode ser editado.');
        err.statusCode = 403;
        throw err;
      }

      const itensAtuaisR = await connection.execute(
        `SELECT CODPROD, QT, PVENDA
           FROM BRAMV_PEDIDOI
          WHERE NUMPEDRCA = :id
          ORDER BY CODPROD`,
        { id: num },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const itensAtuais = (itensAtuaisR.rows || []).map((r: any) => ({
        codProd: Number(r.CODPROD),
        qt: Number(r.QT),
        pvenda: Number(r.PVENDA)
      }));

      const agg = new Map<number, number>();
      for (const it of normalizados) {
        agg.set(it.codProd, (agg.get(it.codProd) || 0) + it.qt);
      }
      const itensNovos = Array.from(agg.entries()).map(([codProd, qt]) => ({ codProd, qt }));

      async function resolvePreco(codProd: number): Promise<number> {
        const found = itensAtuais.find(i => i.codProd === codProd);
        if (found) return found.pvenda;
        const pr = await connection.execute(
          `SELECT MIN(NVL(I.PTABELA,0)) AS PRECO
             FROM PCCONTRATOI I
             JOIN PCCONTRATO C ON C.CODCONTRATO = I.CODCONTRATO
             JOIN PCCLIENT CLI ON CLI.CODCLI = C.CODCLI
            WHERE CLI.CODCLI = :codcli
              AND I.CODPROD = :prod
              AND TRUNC(C.DTVENCIMENTO) >= TRUNC(SYSDATE)`,
          { codcli: Number(process.env.CODCLI ?? 27995), prod: codProd },
          { outFormat: oracledb.OUT_FORMAT_OBJECT }
        );
        const row: any = pr.rows?.[0];
        return Number(row?.PRECO || 0);
      }

      type Diff = {
        codProd: number;
        acao: 'ADICIONADO' | 'REMOVIDO' | 'ALTERADO';
        quantidadeAnterior?: number;
        quantidadeNova: number;
        precoUnit: number;
      };

      const diffs: Diff[] = [];
      const mapAtuais = new Map(itensAtuais.map(i => [i.codProd, i]));
      const mapNovos = new Map(itensNovos.map(i => [i.codProd, i.qt]));

      for (const old of itensAtuais) {
        if (!mapNovos.has(old.codProd)) {
          diffs.push({
            codProd: old.codProd,
            acao: 'REMOVIDO',
            quantidadeAnterior: old.qt,
            quantidadeNova: 0,
            precoUnit: old.pvenda
          });
        }
      }
      for (const novo of itensNovos) {
        const old = mapAtuais.get(novo.codProd);
        const preco = await resolvePreco(novo.codProd);
        if (!old) {
          diffs.push({
            codProd: novo.codProd,
            acao: 'ADICIONADO',
            quantidadeAnterior: 0,
            quantidadeNova: novo.qt,
            precoUnit: preco
          });
        } else if (old.qt !== novo.qt) {
          diffs.push({
            codProd: novo.codProd,
            acao: 'ALTERADO',
            quantidadeAnterior: old.qt,
            quantidadeNova: novo.qt,
            precoUnit: preco
          });
        }
      }

      await connection.execute(
        `DELETE FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :id`,
        { id: num }
      );

      const rowsInsert = await Promise.all(
        itensNovos.map(async it => ({
          id: num,
          codProd: it.codProd,
          qt: it.qt,
          pvenda: await resolvePreco(it.codProd)
        }))
      );

      if (rowsInsert.length) {
        await connection.executeMany(
          `INSERT INTO BRAMV_PEDIDOI (NUMPEDRCA, CODPROD, QT, PVENDA)
           VALUES (:id, :codProd, :qt, :pvenda)`,
          rowsInsert
        );
      }

      const totalNovoR = await connection.execute(
        `SELECT NVL(SUM(QT * PVENDA),0) AS TOTAL FROM BRAMV_PEDIDOI WHERE NUMPEDRCA = :id`,
        { id: num },
        { outFormat: oracledb.OUT_FORMAT_OBJECT }
      );
      const valorNovo = Number((totalNovoR.rows?.[0] as any)?.TOTAL || 0);
      const valorAnterior = itensAtuais.reduce((s, it) => s + it.qt * it.pvenda, 0);
      const qtdItensNova = itensNovos.length;

      await connection.execute(
        `UPDATE BRAMV_PEDIDOC
            SET VALOR_TOTAL = :vNovo,
                QTD_ITENS   = :qNovo
          WHERE NUMPEDRCA = :id`,
        { vNovo: valorNovo, qNovo: qtdItensNova, id: num }
      );

      const eventoDetalhe = {
        motivo,
        autorCodUsuario: usuarioEditorId,
        solicitanteCodUsuario: solicitanteId,
        totalAnterior: valorAnterior,
        totalNovo: valorNovo,
        alteracoes: diffs
      };
      await connection.execute(
        `INSERT INTO BRAMV_PEDIDO_EVENTO (NUMPEDRCA, TIPO, USUARIO_ID, DETALHE_JSON)
         VALUES (:n, 'EDITACAO_PEDIDO', :u, :det)`,
        { n: num, u: usuarioEditorId, det: JSON.stringify(eventoDetalhe) }
      );

      await connection.commit();

      return {
        id: num,
        status: statusAtual,
        valorAnterior,
        valorNovo,
        qtdItensAnterior: itensAtuais.length,
        qtdItensNova,
        diffs,
        setorSolicitante: solicitanteSetor,
        setorEditor: codSetorEditor,
        perfilEditor: perfil,
        usuarioEditorId
      };
    });

    if (debug) {
      res.setHeader('X-Debug-Edit-Info', JSON.stringify(payload));
    }

    return res.status(200).json({ success: true, ...payload });
  } catch (err: any) {
    const statusCode = err.statusCode || 500;
    if (debug) {
      res.setHeader('X-Debug-Edit-Error', err.message || 'erro');
    }
    console.error('[editarItensPedido] erro:', err);
    return res.status(statusCode).json({ error: err.message || 'Erro ao editar itens do pedido.' });
  }
};