import React, { useEffect, useState, useMemo } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { fetchPedidoDetalhe, fetchPedidoFinanceiro, fetchPedidoTransportadora } from '../api/pedidos';
import { PedidoDetalhe } from '../types/pedidos';
import PedidoTimeline from './PedidoTimeline';
import { EdicaoResumo } from './EdicaoResumo';
import ContestModal from './ContestModal';
import ContestReviewPanel from './ContestReviewPanel';
import AtesteModal from './AtesteModal';
import SatisfacaoModal from './SatisfacaoModal';
import { fetchContestes } from '../api/conteste';
import { useAuth } from '../context/AuthContext';

interface OrderDetailsModalProps {
  open: boolean;
  pedidoId: number | null;
  onClose: () => void;
}

const statusLabelFallback: Record<number, string> = {
  1: 'Aprovado',
  2: 'Reprovado',
  3: 'Em Análise',
  5: 'Pendente',
  9: 'Arquivado'
};

function formatDateTime(dt?: string) {
  if (!dt) return { date: '-', time: '-' };
  const d = new Date(dt);
  if (isNaN(d.getTime())) return { date: '-', time: '-' };
  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  };
}
function formatCurrency(v?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

const isPlaceholder = (u?: string) => !!u && /placehold|placeholder|text=Produto/i.test(u);
const buildPedidoImgUrl = (item: any) => {
  const original = item?.imgUrl as string | undefined;
  if (original && !isPlaceholder(original)) return original;
  const code = item?.codProd ?? item?.codigoAuxiliar ?? item?.id;
  return code ? `/api/media/produtos/${code}.JPG` : (original ?? '');
};
const onImgError = (e: React.SyntheticEvent<HTMLImageElement, Event>, item: any) => {
  const el = e.currentTarget;
  if (el.dataset.fallbackDone === '1') return;
  el.dataset.fallbackDone = '1';
  const altCode = item?.codigoAuxiliar ?? item?.codProd;
  el.src = altCode ? `/api/media/produtos/${altCode}.JPG` : `https://placehold.co/56x56?text=${encodeURIComponent('Produto')}`;
};

type ContesteResumo = {
  id: number;
  status: number;
  justificativa: string;
  dataCriacao: string;
  motivoReprovacao?: string | null;
  parecer?: string | null;
  dataAnalise?: string | null;
};

const contesteStatusLabel: Record<number, string> = {
  1: 'Conteste Aberto',
  2: 'Conteste em Análise',
  3: 'Conteste Deferido',
  4: 'Conteste Indeferido',
  9: 'Conteste Cancelado'
};

const badgeClassByContesteStatus: Record<number, string> = {
  1: 'bg-yellow-100 text-yellow-800',
  2: 'bg-blue-100 text-blue-800',
  3: 'bg-green-100 text-green-800',
  4: 'bg-red-100 text-red-800',
  9: 'bg-gray-200 text-gray-700'
};

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ open, pedidoId, onClose }) => {
  const { user, token } = useAuth();
  const [loading, setLoading] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [data, setData] = useState<PedidoDetalhe | null>(null);
  const [financeiro, setFinanceiro] = useState<any | null>(null);
  const [transportadora, setTransportadora] = useState<any | null>(null);
  const [satisfacaoOpen, setSatisfacaoOpen] = useState(false);

  const [contestOpen, setContestOpen] = useState(false);
  const [atesteOpen, setAtesteOpen] = useState(false);

  const [, setContestLoading] = useState(false);
  const [, setContestError] = useState<string | null>(null);
  const [ultimoConteste, setUltimoConteste] = useState<ContesteResumo | null>(null);

  useEffect(() => {
    if (!open || pedidoId == null) {
      setData(null);
      setErro(null);
      setLoading(false);
      return;
    }
    const ac = new AbortController();
    setLoading(true);
    setErro(null);
    fetchPedidoDetalhe(pedidoId, ac.signal)
      .then((d: React.SetStateAction<PedidoDetalhe | null>) => setData(d))
      .catch((e: { message: React.SetStateAction<string | null>; }) => { if (!ac.signal.aborted) setErro(e.message); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [open, pedidoId]);

  useEffect(() => {
    if (!open || pedidoId == null) {
      setFinanceiro(null);
      setTransportadora(null);
      return;
    }
    const ac2 = new AbortController();
    setFinanceiro(null);
    setTransportadora(null);

    (async () => {
      try {
        const fin = await fetchPedidoFinanceiro(pedidoId, ac2.signal);
        setFinanceiro(fin);
      } catch (e: any) {
        console.warn('[Modal] erro ao carregar financeiro:', e?.message || e);
        setFinanceiro(null);
      }

      try {
        const tr = await fetchPedidoTransportadora(pedidoId, ac2.signal);
        setTransportadora(tr?.transportadora ?? tr ?? null);
      } catch (e: any) {
        console.warn('[Modal] erro ao carregar transportadora:', e?.message || e);
        setTransportadora(null);
      }
    })();

    return () => {
      ac2.abort();
    };
  }, [open, pedidoId]);

  useEffect(() => {
    if (!open || !data || data.status !== 2) {
      setUltimoConteste(null);
      setContestError(null);
      return;
    }
    const ac3 = new AbortController();
    setContestLoading(true);
    setContestError(null);
    fetchContestes(data.id, token ?? undefined, ac3.signal)
      .then((list: string | any[]) => {
        const first = list && list.length ? list[0] : null;
        if (first) {
          setUltimoConteste({
            id: first.id,
            status: first.status,
            justificativa: first.justificativa,
            dataCriacao: first.dataCriacao,
            motivoReprovacao: first.motivoReprovacao,
            parecer: first.parecer,
            dataAnalise: first.dataAnalise || null
          });
        } else {
          setUltimoConteste(null);
        }
      })
      .catch((err: { message: any; }) => {
        if (!ac3.signal.aborted) {
          setContestError(err?.message || 'Falha ao carregar conteste.');
          setUltimoConteste(null);
        }
      })
      .finally(() => { if (!ac3.signal.aborted) setContestLoading(false); });
    return () => ac3.abort();
  }, [open, data, token]);

  const somaLocal = useMemo(() => {
    if (!data?.itens) return 0;
    return (data.itens as any[]).reduce((sum, it) => sum + Number(it.subtotal || 0), 0);
  }, [data?.itens]);

  if (!open) return null;

  const dt = formatDateTime(data?.data);
  const statusText = data?.statusLabel || (data ? statusLabelFallback[data.status] : '');
  const divergencia = data && Math.abs(Number(data.valorTotal) - somaLocal) > 0.009;

  const solicitanteId = data?.solicitante?.id;
  const usuarioLogadoId =
    (user as any)?.codUsuario ??
    (user as any)?.CODUSUARIO ??
    (user as any)?.id ??
    (user as any)?.ID;

  const contesteStatusPedido = data?.contesteStatus;
  const contesteEmAndamento = contesteStatusPedido === 1 || (ultimoConteste && [1, 2].includes(ultimoConteste.status));
  const canContest =
    data?.status === 2 &&
    solicitanteId &&
    usuarioLogadoId &&
    solicitanteId === usuarioLogadoId &&
    !contesteEmAndamento &&
    !ultimoConteste;

  const pedidoAprovado = data?.status === 1;
  const semAteste = !(data as any)?.atesteResumo;
  const canAtestar = pedidoAprovado && semAteste && solicitanteId && usuarioLogadoId && solicitanteId === usuarioLogadoId;

  const showContesteBadge = !!ultimoConteste;
  const badgeStatus = ultimoConteste?.status;

  const temAteste = !!(data as any)?.atesteResumo;
  const temSatisfacao = !!(data as any)?.satisfacaoResumo;
  const podeAvaliar = temAteste && !temSatisfacao && solicitanteId === usuarioLogadoId;

  const previsaoPadrao = (data as any)?.previsaoEntregaPadrao
    ? new Date((data as any).previsaoEntregaPadrao)
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-5xl rounded-lg shadow-xl z-10 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <div className="flex items-center gap-3">
            <h3 className="text-lg font-semibold">
              {data ? `Detalhes do Pedido #${data.id}` : (pedidoId !== null ? `Pedido #${pedidoId}` : 'Detalhes do Pedido')}
            </h3>
            {showContesteBadge && badgeStatus && (
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${badgeClassByContesteStatus[badgeStatus] || 'bg-gray-100 text-gray-700'}`}
                title={ultimoConteste?.justificativa}
              >
                {contesteStatusLabel[badgeStatus] || `Conteste (${badgeStatus})`}
              </span>
            )}
            {(data as any)?.atesteResumo && (
              <span
                className={`px-2 py-1 rounded text-xs font-medium ${(data as any).atesteResumo.recebidoOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                  }`}
                title={(data as any).atesteResumo.comentario || undefined}
              >
                Ateste: {(data as any).atesteResumo.recebidoOk ? 'Recebido OK' : 'Com divergências'}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {canAtestar && (
              <button
                onClick={() => setAtesteOpen(true)}
                className="px-3 py-1.5 rounded bg-green-600 text-white text-sm hover:bg-green-700"
                title="Confirmar recebimento deste pedido"
              >
                Atestar recebimento
              </button>
            )}
            {canContest && (
              <button
                onClick={() => setContestOpen(true)}
                className="px-3 py-1.5 rounded bg-red-600 text-white text-sm hover:bg-red-700"
                title="Contestar reprovação deste pedido"
              >
                Contestar
              </button>
            )}
            {podeAvaliar && (
              <button
                onClick={() => setSatisfacaoOpen(true)}
                className="px-3 py-1.5 rounded bg-blue-600 text-white text-sm hover:bg-blue-700"
                title="Avaliar satisfação do recebimento"
              >
                Avaliar recebimento
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded hover:bg-gray-100" aria-label="Fechar">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="p-6 space-y-6 overflow-y-auto">
          {loading && (
            <div className="text-sm text-gray-600 animate-pulse">Carregando detalhes...</div>
          )}
          {erro && !loading && (
            <div className="text-sm text-red-600">Erro: {erro}</div>
          )}

          {temSatisfacao && (
            <div className="p-3 rounded-md bg-blue-50 border border-blue-200 text-sm text-blue-800">
              <strong>Satisfação do recebimento:</strong> Nota {(data as any).satisfacaoResumo?.rating ?? '-'}
              {(data as any).satisfacaoResumo?.comentario && (
                <div className="mt-1 text-xs"><strong>Comentário:</strong> {(data as any).satisfacaoResumo?.comentario}</div>
              )}
            </div>
          )}

          {/* Aviso de conteste em andamento */}
          {data?.status === 2 && contesteEmAndamento && (
            <div className="p-3 rounded-md bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
              Há uma contestação em andamento para este pedido.
            </div>
          )}

          {!loading && !erro && data && (
            <>
              {/* Header informativo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <div className="text-xs text-gray-500">Data</div>
                  <div className="font-medium">{dt.date}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Horário</div>
                  <div className="font-medium">{dt.time}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Status</div>
                  <div className="font-medium">{statusText}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Solicitante</div>
                  <div className="font-medium truncate" title={data.solicitante?.nome}>{data.solicitante?.nome || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Unidade Administrativa</div>
                  <div className="font-medium truncate" title={data.unidadeAdmin}>{data.unidadeAdmin || '-'}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-500">Valor Total (servidor)</div>
                  <div className="font-medium">{formatCurrency(data.valorTotal)}</div>
                </div>
              </div>

              {/* Motivo reprovação */}
              {data.status === 2 && data.reprovacaoMotivo && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
                  <strong>Motivo da reprovação:</strong> {data.reprovacaoMotivo}
                </div>
              )}

              {/* Último conteste finalizado */}
              {ultimoConteste && [3, 4].includes(ultimoConteste.status) && (
                <div
                  className={
                    `p-3 rounded-md border text-sm ` +
                    (ultimoConteste.status === 3
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800')
                  }
                >
                  <strong>Resultado da contestação:</strong>{' '}
                  {ultimoConteste.status === 3 ? 'Deferido' : 'Indeferido'}
                  {ultimoConteste.parecer && (
                    <div className="mt-1 text-xs">
                      <strong>Parecer:</strong> {ultimoConteste.parecer}
                    </div>
                  )}
                </div>
              )}

              {/* Painel para aprovador analisar quando pendente */}
              {ultimoConteste && (user?.tipoUsuario === 1 || user?.tipoUsuario === 2 || ['ADMIN', 'APROVADOR'].includes(String(user?.perfil || '').toUpperCase())) && (
                <ContestReviewPanel
                  conteste={{
                    id: ultimoConteste.id,
                    status: ultimoConteste.status,
                    justificativa: ultimoConteste.justificativa,
                    motivoReprovacao: ultimoConteste.motivoReprovacao,
                    parecer: ultimoConteste.parecer
                  }}
                  pedidoId={data.id}
                  onDone={() => {
                    fetchPedidoDetalhe(data.id).then(setData).catch(() => { });
                    fetchContestes(data.id, token ?? undefined).then((list: string | any[]) => {
                      const first = list && list.length ? list[0] : null;
                      setUltimoConteste(first ? {
                        id: first.id,
                        status: first.status,
                        justificativa: first.justificativa,
                        dataCriacao: first.dataCriacao,
                        motivoReprovacao: first.motivoReprovacao,
                        parecer: first.parecer,
                        dataAnalise: first.dataAnalise || null
                      } : null);
                    }).catch(() => { });
                  }}
                />
              )}

              {/* Divergência */}
              {divergencia && (
                <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-50 border border-yellow-200 text-sm text-yellow-800">
                  <AlertTriangle className="w-4 h-4 mt-0.5" />
                  <div>
                    Diferença entre valorTotal do servidor ({formatCurrency(data.valorTotal)}) e soma local ({formatCurrency(somaLocal)}).
                    Recalcular será necessário ao editar itens. (Tolerância ±0,01)
                  </div>
                </div>
              )}

              <EdicaoResumo eventos={data.eventos} />

              {/* Itens */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Itens ({data.itens.length})</h4>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto">
                  <table className="w-full text-sm border border-gray-200 rounded-lg">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Produto</th>
                        <th className="px-3 py-2 text-left font-medium text-gray-600">Unidade</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Qtd</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Preço Unit.</th>
                        <th className="px-3 py-2 text-right font-medium text-gray-600">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {data.itens.map(it => (
                        <tr key={it.codProd} className="border-t last:border-b">
                          <td className="px-3 py-2">
                            <div className="flex items-center gap-3">
                              <img
                                src={buildPedidoImgUrl(it)}
                                onError={(e) => onImgError(e, it)}
                                alt={it.nome}
                                className="w-14 h-14 object-cover rounded border border-gray-200 bg-white"
                                loading="lazy"
                              />
                              <div className="min-w-0">
                                <div className="font-medium truncate" title={it.nome}>{it.nome}</div>
                                <div className="text-xs text-gray-500">
                                  Código: {it.codProd} | Aux: {it.codigoAuxiliar ?? '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-3 py-2 text-gray-700">{it.unidade}</td>
                          <td className="px-3 py-2 text-right">{it.qt}</td>
                          <td className="px-3 py-2 text-right">{formatCurrency(it.precoUnit)}</td>
                          <td className="px-3 py-2 text-right font-medium">{formatCurrency(it.subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot>
                      <tr className="bg-gray-50">
                        <td colSpan={4} className="px-3 py-2 text-right font-medium">Total (calculado)</td>
                        <td className="px-3 py-2 text-right font-semibold">{formatCurrency(somaLocal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  {data.itens.map(it => (
                    <div key={it.codProd} className="border border-gray-200 rounded-lg p-3 flex gap-3">
                      <img
                        src={buildPedidoImgUrl(it)}
                        onError={(e) => onImgError(e, it)}
                        alt={it.nome}
                        className="w-16 h-16 object-cover rounded border border-gray-200 bg-white"
                        loading="lazy"
                      />
                      <div className="flex-1 min-w-0">
                        <div className="font-medium text-sm truncate" title={it.nome}>{it.nome}</div>
                        <div className="text-xs text-gray-500 truncate">
                          Código {it.codProd} • Aux {it.codigoAuxiliar ?? '—'}
                        </div>
                        <div className="mt-1 flex flex-wrap gap-2 text-xs">
                          <span className="px-2 py-0.5 bg-gray-100 rounded">{it.unidade}</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded">Qtd {it.qt}</span>
                          <span className="px-2 py-0.5 bg-gray-100 rounded">Unit {formatCurrency(it.precoUnit)}</span>
                          <span className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded font-medium">
                            {formatCurrency(it.subtotal)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))}
                  <div className="text-right text-sm font-semibold">
                    Total (calculado): {formatCurrency(somaLocal)}
                  </div>
                </div>
              </div>

              {/* Transportadora */}
              {transportadora && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800">Entrega / Transportadora</h4>
                  <div className="text-sm text-gray-700 grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <div className="text-xs text-gray-500">Transportadora</div>
                      <div className="font-medium">
                        {transportadora.transportadora ?? '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Frete</div>
                      <div className="font-medium">
                        {formatCurrency(transportadora.vlFrete ?? 0)}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Entrega prevista</div>
                      <div className="font-medium">
                        {transportadora.dtEntrega
                          ? new Date(transportadora.dtEntrega).toLocaleDateString('pt-BR')
                          : '—'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-gray-500">Nota / Trans. Venda</div>
                      <div className="font-medium">
                        {transportadora.numNota ?? transportadora.NUMNOTA ?? transportadora.numTransVenda ?? transportadora.NUMTRANSVENDA ?? '—'}
                      </div>
                    </div>
                  </div>
                  {transportadora._fallback && (
                    <div className="text-xs text-gray-500">
                      Informações operacionais indisponíveis. Exibindo previsão padrão de entrega (+15 dias úteis após aprovação).
                    </div>
                  )}
                </div>
              )}

              {/* Financeiro */}
              {financeiro && Array.isArray(financeiro.parcelas) && financeiro.parcelas.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-800">Financeiro</h4>
                  <div className="overflow-x-auto border rounded">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left">Parcela</th>
                          <th className="px-3 py-2 text-left">Nota Fiscal</th>
                          <th className="px-3 py-2 text-left">Emissão</th>
                          <th className="px-3 py-2 text-left">Vencimento</th>
                          <th className="px-3 py-2 text-right">Valor</th>
                          <th className="px-3 py-2 text-right">Pago</th>
                          <th className="px-3 py-2 text-left">Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {financeiro.parcelas.map((p: any, idx: number) => (
                          <tr key={p.parcela ?? p.notaFiscal ?? idx} className="border-t">
                            <td className="px-3 py-2 text-left">{p.parcela}</td>
                            <td className="px-3 py-2 text-left">{p.notaFiscal ?? p.NOTA_FISCAL ?? '-'}</td>
                            <td className="px-3 py-2 text-left">{p.dtEmissao ? new Date(p.dtEmissao).toLocaleDateString('pt-BR') : (p.DTEMISSAO ? new Date(p.DTEMISSAO).toLocaleDateString('pt-BR') : '-')}</td>
                            <td className="px-3 py-2 text-left">{p.dtVencimento ? new Date(p.dtVencimento).toLocaleDateString('pt-BR') : (p.DTVENC ? new Date(p.DTVENC).toLocaleDateString('pt-BR') : '-')}</td>
                            <td className="px-3 py-2 text-right">{formatCurrency(p.valor ?? p.VALOR ?? 0)}</td>
                            <td className="px-3 py-2 text-right">{p.valorPago ? formatCurrency(p.valorPago ?? p.VALORPAGO ?? 0) : '-'}</td>
                            <td className="px-3 py-2 text-left">{p.status ?? p.STATUS ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Concatenação */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Concatenação</h4>

                {data.concatRole === 'RESULTADO' && (
                  <div className="text-sm text-gray-700">
                    <div className="mb-1">
                      Pedido gerado por concatenação.
                      {data.concatGroupId && (
                        <span className="ml-1 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                          Grupo {data.concatGroupId}
                        </span>
                      )}
                    </div>
                    {data.concatOrigens.length > 0 ? (
                      <ul className="list-disc pl-5 mt-1 space-y-0.5">
                        {data.concatOrigens.map(o => (
                          <li key={o.id}>
                            Pedido #{o.id} — {o.statusLabel}{' '}
                            <button
                              type="button"
                              className="text-xs text-blue-600 hover:underline ml-1"
                              onClick={() => {
                                fetchPedidoDetalhe(o.id).then(setData).catch(() => { });
                              }}
                              title={`Abrir detalhes do pedido #${o.id}`}
                            >
                              ver
                            </button>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <div className="text-xs text-gray-500">Sem origens listadas.</div>
                    )}
                  </div>
                )}

                {data.concatRole === 'ORIGEM' && (
                  <div className="text-sm text-gray-700">
                    Pedido marcado como origem de concatenação.
                    {data.concatGroupId && (
                      <span className="ml-1 text-xs px-2 py-0.5 rounded bg-gray-100 text-gray-700">
                        Grupo {data.concatGroupId}
                      </span>
                    )}
                    {data.concatResultado ? (
                      <div className="mt-1">
                        Resultado: #{data.concatResultado.id} — {data.concatResultado.statusLabel}{' '}
                        <button
                          type="button"
                          className="text-xs text-blue-600 hover:underline"
                          onClick={() => {
                            fetchPedidoDetalhe(data.concatResultado!.id).then(setData).catch(() => { });
                          }}
                          title={`Abrir detalhes do pedido #${data.concatResultado.id}`}
                        >
                          ver
                        </button>
                      </div>
                    ) : (
                      <div className="text-xs text-gray-500">Resultado não localizado.</div>
                    )}
                  </div>
                )}

                {!data.concatRole && (
                  <div className="text-sm text-gray-500">Sem concatenação.</div>
                )}
              </div>

              {/* Aprovação */}
              {data.aprovador && (
                <div className="space-y-2">
                  <h4 className="font-semibold text-gray-800">Análise</h4>
                  <div className="text-sm text-gray-700">
                    Analisado por: <span className="font-medium">{data.aprovador.nome}</span> ({data.aprovador.email})
                  </div>
                </div>
              )}
              {data.status === 2 && data.reprovacaoMotivo && (
                <div className="p-3 rounded-md bg-red-50 border border-red-200 text-sm text-red-800">
                  <strong>Reprovado</strong> por {data.aprovador?.nome ? data.aprovador.nome : '—'} • Motivo: {data.reprovacaoMotivo}
                </div>
              )}

              {data.concatRole && (
                <div className="text-sm text-gray-700">
                  {data.concatRole === 'RESULTADO'
                    ? 'Pedido gerado por concatenação.'
                    : data.concatRole === 'ORIGEM'
                      ? 'Pedido marcado como origem de concatenação.'
                      : null}
                </div>
              )}

              <div className="flex flex-wrap gap-2 text-xs">
                {data.statusOperacional && (
                  <span className="px-2 py-1 rounded bg-gray-100 text-gray-800 border">
                    Operacional: {data.statusOperacional}
                  </span>
                )}
                {data.entregue && (
                  <span className="px-2 py-1 rounded bg-green-100 text-green-800 border border-green-200">
                    Entregue (operacional)
                  </span>
                )}
              </div>

              {/* Eventos */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-800">Eventos</h4>
                <PedidoTimeline eventos={data.eventos} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t flex justify-end">
          <button onClick={onClose} className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200">
            Fechar
          </button>
        </div>
      </div>

      <ContestModal
        open={contestOpen}
        onClose={() => setContestOpen(false)}
        pedidoId={data?.id || (pedidoId as number)}
        motivoReprovacao={(data as any)?.reprovacaoMotivo}
        onCreated={() => {
          setContestOpen(false);
          if (pedidoId != null) {
            fetchPedidoDetalhe(pedidoId).then(setData).catch(() => { });
          }
        }}
      />

      <AtesteModal
        open={atesteOpen}
        onClose={() => setAtesteOpen(false)}
        pedidoId={data?.id || (pedidoId as number)}
        onCreated={() => {
          setAtesteOpen(false);
          if (pedidoId != null) {
            fetchPedidoDetalhe(pedidoId).then(setData).catch(() => { });
          }
        }}
      />

      <SatisfacaoModal
        open={satisfacaoOpen}
        onClose={() => setSatisfacaoOpen(false)}
        pedidoId={data?.id || (pedidoId as number)}
        onCreated={() => {
          setSatisfacaoOpen(false);
          if (pedidoId != null) {
            fetchPedidoDetalhe(pedidoId).then(setData).catch(() => { });
          }
        }}
      />
    </div>
  );
};

export default OrderDetailsModal;