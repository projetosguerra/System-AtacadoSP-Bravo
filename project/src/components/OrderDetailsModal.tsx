import React, { useEffect, useState, useMemo } from 'react';
import { X, AlertTriangle, Package, DollarSign, Calendar, User } from 'lucide-react';
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
    date: d. toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
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
    if (! open || pedidoId == null) {
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
      .catch((e: { message: React.SetStateAction<string | null>; }) => { if (! ac.signal.aborted) setErro(e.message); })
      .finally(() => { if (!ac.signal.aborted) setLoading(false); });
    return () => ac.abort();
  }, [open, pedidoId]);

  useEffect(() => {
    if (! open || pedidoId == null) {
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
        console.warn('[Modal] erro ao carregar financeiro:', e?. message || e);
        setFinanceiro(null);
      }

      try {
        const tr = await fetchPedidoTransportadora(pedidoId, ac2.signal);
        setTransportadora(tr?. transportadora ??  tr ??  null);
      } catch (e: any) {
        console. warn('[Modal] erro ao carregar transportadora:', e?.message || e);
        setTransportadora(null);
      }
    })();

    return () => {
      ac2.abort();
    };
  }, [open, pedidoId]);

  useEffect(() => {
    if (! open || ! data || data.status !== 2) {
      setUltimoConteste(null);
      setContestError(null);
      return;
    }
    const ac3 = new AbortController();
    setContestLoading(true);
    setContestError(null);
    fetchContestes(data.id, token ??  undefined, ac3.signal)
      .then((list: string | any[]) => {
        const first = list && list.length ?  list[0] : null;
        if (first) {
          setUltimoConteste({
            id: first.id,
            status: first.status,
            justificativa: first. justificativa,
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
        if (! ac3.signal.aborted) {
          setContestError(err?. message || 'Falha ao carregar conteste.');
          setUltimoConteste(null);
        }
      })
      .finally(() => { if (!ac3.signal.aborted) setContestLoading(false); });
    return () => ac3.abort();
  }, [open, data, token]);

  const somaLocal = useMemo(() => {
    if (!data?. itens) return 0;
    return (data.itens as any[]).reduce((sum, it) => sum + Number(it.subtotal || 0), 0);
  }, [data?.itens]);

  if (! open) return null;

  const dt = formatDateTime(data?. data);
  const statusText = data?.statusLabel || (data ?  statusLabelFallback[data.status] : '');
  const divergencia = data && Math.abs(Number(data.valorTotal) - somaLocal) > 0.009;

  const solicitanteId = data?.solicitante?.id;
  const usuarioLogadoId =
    (user as any)?.codUsuario ??
    (user as any)?. CODUSUARIO ??
    (user as any)?.id ??
    (user as any)?.ID;

  const contesteStatusPedido = data?.contesteStatus;
  const contesteEmAndamento = contesteStatusPedido === 1 || (ultimoConteste && [1, 2]. includes(ultimoConteste.status));
  const canContest =
    data?.status === 2 &&
    solicitanteId &&
    usuarioLogadoId &&
    solicitanteId === usuarioLogadoId &&
    !contesteEmAndamento &&
    !ultimoConteste;

  const pedidoAprovado = data?.status === 1;
  const semAteste = !(data as any)?. atesteResumo;
  const canAtestar = pedidoAprovado && semAteste && solicitanteId && usuarioLogadoId && solicitanteId === usuarioLogadoId;

  const showContesteBadge = !!ultimoConteste;
  const badgeStatus = ultimoConteste?.status;

  const temAteste = ! !(data as any)?.atesteResumo;
  const temSatisfacao = !!(data as any)?.satisfacaoResumo;
  const podeAvaliar = temAteste && ! temSatisfacao && solicitanteId === usuarioLogadoId;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative bg-white w-full max-w-6xl rounded-xl shadow-2xl flex flex-col max-h-[95vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h3 className="text-lg font-bold text-gray-900">
              {data ?  `Pedido #${data.id}` : (pedidoId !== null ? `Pedido #${pedidoId}` : 'Detalhes do Pedido')}
            </h3>
            {showContesteBadge && badgeStatus && (
              <span
                className={`px-2. 5 py-1 rounded-full text-xs font-semibold ${badgeClassByContesteStatus[badgeStatus] || 'bg-gray-100 text-gray-700'}`}
                title={ultimoConteste?.justificativa}
              >
                {contesteStatusLabel[badgeStatus] || `Conteste (${badgeStatus})`}
              </span>
            )}
            {(data as any)?. atesteResumo && (
              <span
                className={`px-2. 5 py-1 rounded-full text-xs font-semibold ${(data as any). atesteResumo.recebidoOk ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
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
                className="px-3 py-1. 5 rounded-lg bg-green-600 text-white text-sm font-medium hover:bg-green-700 transition-colors"
                title="Confirmar recebimento deste pedido"
              >
                Atestar
              </button>
            )}
            {canContest && (
              <button
                onClick={() => setContestOpen(true)}
                className="px-3 py-1. 5 rounded-lg bg-red-600 text-white text-sm font-medium hover:bg-red-700 transition-colors"
                title="Contestar reprovação deste pedido"
              >
                Contestar
              </button>
            )}
            {podeAvaliar && (
              <button
                onClick={() => setSatisfacaoOpen(true)}
                className="px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors"
                title="Avaliar satisfação do recebimento"
              >
                Avaliar
              </button>
            )}
            <button onClick={onClose} className="p-2 rounded-lg hover:bg-gray-100 transition-colors" aria-label="Fechar">
              <X className="w-5 h-5 text-gray-600" />
            </button>
          </div>
        </div>

        {/* Corpo */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {loading && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Carregando detalhes... </p>
            </div>
          )}
          {erro && ! loading && (
            <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">Erro: {erro}</p>
              </div>
            </div>
          )}

          {temSatisfacao && (
            <div className="p-4 rounded-lg bg-blue-50 border border-blue-200">
              <div className="flex items-start gap-3">
                <DollarSign className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm text-blue-800">
                  <p className="font-semibold mb-1">Satisfação do Recebimento</p>
                  <p>Nota: <strong>{(data as any).satisfacaoResumo?. rating ??  '-'}</strong></p>
                  {(data as any).satisfacaoResumo?.comentario && (
                    <p className="mt-1 text-xs"><strong>Comentário:</strong> {(data as any).satisfacaoResumo?. comentario}</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {data?. status === 2 && contesteEmAndamento && (
            <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200 text-xs text-yellow-800">
              Há uma contestação em andamento para este pedido.
            </div>
          )}

          {! loading && !erro && data && (
            <>
              {/* Cards de Informação */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Calendar className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">Data</span>
                  </div>
                  <div className="font-semibold text-gray-900">{dt. date}</div>
                  <div className="text-xs text-gray-600 font-mono">{dt.time}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Package className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">Status</span>
                  </div>
                  <div className="font-semibold text-gray-900">{statusText}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <User className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">Solicitante</span>
                  </div>
                  <div className="font-semibold text-gray-900 truncate" title={data.solicitante?. nome}>{data.solicitante?.nome || '-'}</div>
                </div>
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <div className="flex items-center gap-2 text-gray-500 mb-1">
                    <Package className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">Unidade</span>
                  </div>
                  <div className="font-semibold text-gray-900 truncate" title={data.unidadeAdmin}>{data.unidadeAdmin || '-'}</div>
                </div>
                <div className="bg-green-50 rounded-lg p-4 border-2 border-green-200 sm:col-span-2">
                  <div className="flex items-center gap-2 text-green-600 mb-1">
                    <DollarSign className="w-4 h-4" />
                    <span className="text-xs uppercase font-medium">Valor Total</span>
                  </div>
                  <div className="font-bold text-xl text-green-700">{formatCurrency(data. valorTotal)}</div>
                </div>
              </div>

              {/* Motivo reprovação */}
              {data. status === 2 && data.reprovacaoMotivo && (
                <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-red-800">
                      <p className="font-semibold mb-1">Motivo da Reprovação</p>
                      <p>{data.reprovacaoMotivo}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resultado do conteste */}
              {ultimoConteste && [3, 4].includes(ultimoConteste.status) && (
                <div
                  className={
                    `p-4 rounded-lg border-2 text-sm ` +
                    (ultimoConteste.status === 3
                      ? 'bg-green-50 border-green-200 text-green-800'
                      : 'bg-red-50 border-red-200 text-red-800')
                  }
                >
                  <p className="font-semibold mb-1">
                    Resultado da Contestação: {ultimoConteste.status === 3 ? 'Deferido' : 'Indeferido'}
                  </p>
                  {ultimoConteste.parecer && (
                    <p className="text-xs mt-1"><strong>Parecer:</strong> {ultimoConteste.parecer}</p>
                  )}
                </div>
              )}

              {/* Painel de análise de conteste (aprovador) */}
              {ultimoConteste && (user?. tipoUsuario === 1 || user?.tipoUsuario === 2 || ['ADMIN', 'APROVADOR'].includes(String(user?.perfil || ''). toUpperCase())) && (
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
                    fetchPedidoDetalhe(data.id). then(setData). catch(() => { });
                    fetchContestes(data.id, token ??  undefined). then((list: string | any[]) => {
                      const first = list && list.length ? list[0] : null;
                      setUltimoConteste(first ?  {
                        id: first. id,
                        status: first.status,
                        justificativa: first.justificativa,
                        dataCriacao: first.dataCriacao,
                        motivoReprovacao: first.motivoReprovacao,
                        parecer: first.parecer,
                        dataAnalise: first. dataAnalise || null
                      } : null);
                    }). catch(() => { });
                  }}
                />
              )}

              {/* Divergência */}
              {divergencia && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex items-start gap-2 text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0 mt-0.5" />
                    <p>
                      Diferença entre valorTotal do servidor ({formatCurrency(data.valorTotal)}) e soma local ({formatCurrency(somaLocal)}).
                      <span className="block text-xs mt-1">Tolerância: ±0,01</span>
                    </p>
                  </div>
                </div>
              )}

              <EdicaoResumo eventos={data.eventos} />

              {/* Itens */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900 flex items-center gap-2">
                  <Package className="w-5 h-5 text-gray-600" />
                  Itens do Pedido ({data.itens.length})
                </h4>

                {/* Desktop */}
                <div className="hidden md:block overflow-x-auto border border-gray-200 rounded-lg">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Produto</th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Unidade</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Qtd</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Preço Unit.</th>
                        <th scope="col" className="px-4 py-3 text-right text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {data.itens.map(it => (
                        <tr key={it.codProd} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <img
                                src={buildPedidoImgUrl(it)}
                                onError={(e) => onImgError(e, it)}
                                alt={it.nome}
                                className="w-16 h-16 object-cover rounded-lg border border-gray-200 bg-white flex-shrink-0"
                                loading="lazy"
                              />
                              <div className="min-w-0">
                                <div className="font-medium text-sm truncate" title={it.nome}>{it.nome}</div>
                                <div className="text-xs text-gray-500">
                                  Cód: {it.codProd} | Aux: {it.codigoAuxiliar ??  '—'}
                                </div>
                              </div>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-700">{it.unidade}</td>
                          <td className="px-4 py-3 text-sm text-right font-medium">{it.qt}</td>
                          <td className="px-4 py-3 text-sm text-right">{formatCurrency(it.precoUnit)}</td>
                          <td className="px-4 py-3 text-sm text-right font-semibold text-green-600">{formatCurrency(it. subtotal)}</td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      <tr>
                        <td colSpan={4} className="px-4 py-3 text-right font-bold text-gray-900">Total Calculado:</td>
                        <td className="px-4 py-3 text-right font-bold text-lg text-green-600">{formatCurrency(somaLocal)}</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Mobile */}
                <div className="md:hidden space-y-3">
                  {data.itens.map(it => (
                    <div key={it. codProd} className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                      <div className="flex gap-3 mb-2">
                        <img
                          src={buildPedidoImgUrl(it)}
                          onError={(e) => onImgError(e, it)}
                          alt={it.nome}
                          className="w-20 h-20 object-cover rounded-lg border border-gray-200 bg-white flex-shrink-0"
                          loading="lazy"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm mb-1" title={it.nome}>{it.nome}</div>
                          <div className="text-xs text-gray-500">
                            Cód {it.codProd} • Aux {it.codigoAuxiliar ?? '—'}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-2 text-xs">
                        <span className="px-2 py-1 bg-white border rounded">{it.unidade}</span>
                        <span className="px-2 py-1 bg-white border rounded">Qtd {it.qt}</span>
                        <span className="px-2 py-1 bg-white border rounded">Unit {formatCurrency(it.precoUnit)}</span>
                        <span className="px-2 py-1 bg-green-100 text-green-700 border border-green-200 rounded font-semibold">
                          {formatCurrency(it.subtotal)}
                        </span>
                      </div>
                    </div>
                  ))}
                  <div className="text-right">
                    <span className="text-sm text-gray-700">Total: </span>
                    <span className="text-lg font-bold text-green-600">{formatCurrency(somaLocal)}</span>
                  </div>
                </div>
              </div>

              {/* Transportadora */}
              {transportadora && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Entrega / Transportadora</h4>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                    {[
                      { label: 'Transportadora', value: transportadora.transportadora ??  '—' },
                      { label: 'Frete', value: formatCurrency(transportadora.vlFrete ??  0) },
                      { label: 'Entrega prevista', value: transportadora.dtEntrega ?  new Date(transportadora.dtEntrega).toLocaleDateString('pt-BR') : '—' },
                      { label: 'Nota / Trans.', value: transportadora.numNota ?? transportadora. NUMNOTA ??  transportadora.numTransVenda ?? transportadora. NUMTRANSVENDA ?? '—' }
                    ].map((item, idx) => (
                      <div key={idx} className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                        <div className="text-xs text-gray-500 uppercase mb-1">{item.label}</div>
                        <div className="font-medium text-sm text-gray-900 truncate" title={String(item.value)}>{item. value}</div>
                      </div>
                    ))}
                  </div>
                  {transportadora._fallback && (
                    <p className="text-xs text-gray-500">
                      Informações operacionais indisponíveis. Exibindo previsão padrão (+15 dias úteis).
                    </p>
                  )}
                </div>
              )}

              {/* Financeiro */}
              {financeiro && Array.isArray(financeiro. parcelas) && financeiro.parcelas.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-semibold text-gray-900">Financeiro</h4>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full divide-y divide-gray-200 text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          {['Parcela', 'Nota Fiscal', 'Emissão', 'Vencimento', 'Valor', 'Pago', 'Status'].map(h => (
                            <th key={h} scope="col" className="px-3 py-2 text-left text-xs font-semibold text-gray-600 uppercase">{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {financeiro.parcelas.map((p: any, idx: number) => (
                          <tr key={p.parcela ??  p.notaFiscal ?? idx} className="hover:bg-gray-50">
                            <td className="px-3 py-2">{p.parcela}</td>
                            <td className="px-3 py-2">{p.notaFiscal ??  p. NOTA_FISCAL ?? '-'}</td>
                            <td className="px-3 py-2">{p.dtEmissao ? new Date(p.dtEmissao).toLocaleDateString('pt-BR') : (p. DTEMISSAO ? new Date(p. DTEMISSAO).toLocaleDateString('pt-BR') : '-')}</td>
                            <td className="px-3 py-2">{p.dtVencimento ? new Date(p.dtVencimento).toLocaleDateString('pt-BR') : (p.DTVENC ? new Date(p.DTVENC).toLocaleDateString('pt-BR') : '-')}</td>
                            <td className="px-3 py-2 font-medium">{formatCurrency(p.valor ??  p.VALOR ??  0)}</td>
                            <td className="px-3 py-2">{p.valorPago ? formatCurrency(p.valorPago ??  p.VALORPAGO ?? 0) : '-'}</td>
                            <td className="px-3 py-2">{p.status ??  p.STATUS ?? '-'}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Concatenação */}
              {(data.concatRole || data.aprovador) && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Concatenação */}
                  <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                    <h4 className="font-semibold text-gray-900 mb-2">Concatenação</h4>
                    {data.concatRole === 'RESULTADO' && (
                      <div className="text-sm text-gray-700 space-y-2">
                        <p>
                          Pedido gerado por concatenação
                          {data.concatGroupId && (
                            <span className="ml-2 text-xs px-2 py-0.5 rounded bg-blue-100 text-blue-800">
                              Grupo {data.concatGroupId}
                            </span>
                          )}
                        </p>
                        {data.concatOrigens. length > 0 && (
                          <ul className="list-disc pl-5 space-y-1 text-xs">
                            {data.concatOrigens.map(o => (
                              <li key={o. id}>
                                Pedido #{o.id} — {o.statusLabel}
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                    {data.concatRole === 'ORIGEM' && (
                      <div className="text-sm text-gray-700">
                        <p>Pedido origem de concatenação</p>
                        {data.concatResultado && (
                          <p className="text-xs mt-1">
                            Resultado: #{data.concatResultado. id} — {data.concatResultado.statusLabel}
                          </p>
                        )}
                      </div>
                    )}
                    {! data.concatRole && (
                      <p className="text-sm text-gray-500">Sem concatenação</p>
                    )}
                  </div>

                  {/* Aprovação */}
                  {data.aprovador && (
                    <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                      <h4 className="font-semibold text-gray-900 mb-2">Análise</h4>
                      <div className="text-sm text-gray-700">
                        <p>Analisado por: <strong>{data.aprovador. nome}</strong></p>
                        <p className="text-xs text-gray-500">{data.aprovador.email}</p>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Eventos */}
              <div className="space-y-3">
                <h4 className="font-semibold text-gray-900">Linha do Tempo</h4>
                <PedidoTimeline eventos={data.eventos} />
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 flex justify-end flex-shrink-0">
          <button 
            onClick={onClose} 
            className="px-6 py-2. 5 rounded-lg bg-gray-200 text-gray-700 hover:bg-gray-300 font-medium transition-colors"
          >
            Fechar
          </button>
        </div>
      </div>

      {/* Modals */}
      <ContestModal
        open={contestOpen}
        onClose={() => setContestOpen(false)}
        pedidoId={data?. id || (pedidoId as number)}
        motivoReprovacao={(data as any)?.reprovacaoMotivo}
        onCreated={() => {
          setContestOpen(false);
          if (pedidoId != null) {
            fetchPedidoDetalhe(pedidoId). then(setData). catch(() => { });
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
            fetchPedidoDetalhe(pedidoId).then(setData). catch(() => { });
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
            fetchPedidoDetalhe(pedidoId).then(setData). catch(() => { });
          }
        }}
      />
    </div>
  );
};

export default OrderDetailsModal;