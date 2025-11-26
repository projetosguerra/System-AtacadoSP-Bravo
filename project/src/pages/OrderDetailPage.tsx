import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, XCircle, CheckCircle, Edit, AlertTriangle } from 'lucide-react';
import { LegacyOrderDetail } from '../types/index';
import RejectModal from '../components/RejectModal';
import { useData } from '../context/DataContext';
import ConcatModal from '../components/ConcatModal';
import { useAuth } from '../context/AuthContext';
import { PEDIDO_MIN_VALUE } from '../config/constants';

const MIN_VALUE_FALLBACK = PEDIDO_MIN_VALUE;

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}

function statusBadge(status: number) {
  const baseClass = "inline-flex items-center px-3 py-1 text-xs font-semibold rounded-full";
  switch (status) {
    case 1: return <span className={`${baseClass} bg-green-100 text-green-800`}>Aprovado</span>;
    case 2: return <span className={`${baseClass} bg-red-100 text-red-800`}>Reprovado</span>;
    case 3: return <span className={`${baseClass} bg-blue-100 text-blue-800`}>Em Análise</span>;
    case 5: return <span className={`${baseClass} bg-yellow-100 text-yellow-800`}>Pendente</span>;
    case 9: return <span className={`${baseClass} bg-gray-200 text-gray-700`}>Arquivado</span>;
    default: return <span className={`${baseClass} bg-gray-100 text-gray-700`}>Status {status}</span>;
  }
}

const isPlaceholder = (u?: string) => !!u && /placehold|placeholder|text=Produto/i.test(u);
const resolveImgUrl = (item: any) => {
  const original = item?.imgUrl as string | undefined;
  if (original && !isPlaceholder(original)) return original;
  const code = item?.codProd ?? item?.codigoAuxiliar ?? item?.id;
  return code ? `/api/media/produtos/${code}.JPG` : (original ?? '');
};

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refetchAllData } = useData();
  const { token } = useAuth();

  function buildHeaders(contentType?: string): Record<string, string> {
    const h: Record<string, string> = {};
    if (contentType) h['Content-Type'] = contentType;
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  const [order, setOrder] = useState<LegacyOrderDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [concatOpen, setConcatOpen] = useState(false);
  const [minValue, setMinValue] = useState<number | null>(null);
  const [baseValue, setBaseValue] = useState<number | null>(null);
  const [contextError, setContextError] = useState<string | null>(null);

  const abortRef = useRef<AbortController | null>(null);
  const committedRef = useRef(false);

  const getQty = (item: any): number => Number(item.quantidade ?? item.qt ?? item.QTD ?? item.qty ?? 0) || 0;
  const getPrice = (item: any): number => Number(item.preco ?? item.precoUnit ?? item.preco_unit ?? item.price ?? 0) || 0;
  const getUnit = (item: any): string => String(item.unit ?? item.unidade ?? item.UNIDADE ?? '').trim();
  const getIdKey = (item: any, idx: number) => item.id ?? item.codProd ?? item.CODPROD ?? `r${idx}`;

  const totalValue = useMemo(() => {
    if (!order?.itens) return 0;
    return order.itens.reduce((sum: number, item: any) => sum + getQty(item) * getPrice(item), 0);
  }, [order]);

  const belowMin = useMemo(() => {
    if (minValue === null || baseValue === null) return false;
    return baseValue < minValue;
  }, [minValue, baseValue]);

  const updateStatusAPI = useCallback(
    async (newStatus: number, conditionStatus?: number, motivo?: string) => {
      return fetch(`/api/pedido/${id}/status`, {
        method: 'PUT',
        headers: buildHeaders('application/json'),
        body: JSON.stringify({ newStatus, conditionStatus, motivo })
      });
    },
    [id, token]
  );

  useEffect(() => {
    let mounted = true;
    const fetchOrder = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        try { abortRef.current?.abort(); } catch { }
        abortRef.current = new AbortController();
        const timeout = setTimeout(() => abortRef.current?.abort(), 12_000);
        const r1 = await fetch(`/api/pedido/${id}`, { signal: abortRef.current.signal });
        clearTimeout(timeout);
        if (!r1.ok) {
          const r2 = await fetch(`/api/pedido/${id}`, { signal: abortRef.current.signal });
          if (!r2.ok) throw new Error('Pedido não encontrado.');
          const data2 = await r2.json();
          if (mounted) setOrder(data2);
          return;
        }
        const data = await r1.json();
        if (data?.status === 5) {
          const lockResp = await updateStatusAPI(3, 5);
          if (!lockResp.ok) {
            if (lockResp.status === 409) {
              const body = await lockResp.json().catch(() => ({}));
              throw new Error(body?.error || 'Pedido já em análise por outro usuário.');
            }
            throw new Error('Falha ao trancar pedido para análise.');
          }
          const after = await fetch(`/api/pedido/${id}`, { headers: buildHeaders() });
          if (!after.ok) throw new Error('Pedido não encontrado após lock.');
          const dataAfter = await after.json();
          if (mounted) setOrder(dataAfter);
        } else {
          if (mounted) setOrder(data);
        }
      } catch (err: any) {
        if (err?.name === 'AbortError') return;
        if (mounted) {
          setError(err.message || 'Falha ao carregar pedido.');
          setTimeout(() => navigate('/painel-aprovacao'), 2500);
        }
      } finally {
        if (mounted) setIsLoading(false);
      }
    };
    fetchOrder();

    return () => {
      mounted = false;
      if (order?.status === 3 && !committedRef.current) {
        updateStatusAPI(5, 3).catch(() => { });
      }
      try { abortRef.current?.abort(); } catch { }
    };
  }, [id, token]);

  useEffect(() => {
    let active = true;
    async function loadContext() {
      if (!id) return;
      setContextError(null);
      try {
        const r = await fetch(`/api/pedido/${id}/concat/context`, { headers: buildHeaders() });
        if (!r.ok) return;
        const data = await r.json();
        if (!active) return;
        setMinValue(Number(data?.minValue ?? MIN_VALUE_FALLBACK));
        setBaseValue(Number(data?.baseValue ?? 0));
      } catch (e: any) {
        if (!active) return;
        setContextError(e?.message || 'Falha ao obter contexto de concatenação.');
        setMinValue(MIN_VALUE_FALLBACK);
        setBaseValue(totalValue);
      }
    }
    loadContext();
    return () => { active = false; };
  }, [id, totalValue, token]);

  useEffect(() => {
    const unlock = () => {
      if (!id || committedRef.current) return;
      try {
        const payload = new Blob([JSON.stringify({})], { type: 'application/json' });
        (navigator as any).sendBeacon?.(`/api/pedido/${id}/unlock`, payload);
      } catch {
        fetch(`/api/pedido/${id}/unlock`, { method: 'POST', keepalive: true }).catch(() => { });
      }
    };
    const onPageHide = () => unlock();
    const onVisibilityChange = () => {
      if (document.visibilityState === 'hidden') unlock();
    };
    window.addEventListener('pagehide', onPageHide);
    document.addEventListener('visibilitychange', onVisibilityChange);
    return () => {
      window.removeEventListener('pagehide', onPageHide);
      document.removeEventListener('visibilitychange', onVisibilityChange);
    };
  }, [id]);

  const handleBack = async () => {
    try { await fetch(`/api/pedido/${id}/unlock`, { method: 'POST' }); } catch { }
    navigate('/painel-aprovacao', { state: { forceRefresh: true } });
  };

  async function handleApprove() {
    if (submitting || !order) return;
    if (belowMin) {
      setError('Pedido abaixo do valor mínimo.  Concatene antes de aprovar.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pedido/${order.id}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...buildHeaders() },
        body: JSON.stringify({ codFilial: '1', frete: 0 })
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (body?.logs?.length) console.warn('[Aprovação] Logs do processamento:', body.logs);
        throw new Error(body?.error || 'Erro ao aprovar/processar o pedido.');
      }
      committedRef.current = true;
      await refetchAllData();
      navigate('/painel-aprovacao', {
        state: { notice: `Pedido #${order.id} aprovado e processado.` }
      });
    } catch (err: any) {
      setError(err?.message || 'Erro ao aprovar.');
    } finally {
      setSubmitting(false);
    }
  }

  const handleReprove = async (motivo: string) => {
    if (!motivo) {
      alert('O motivo da reprovação é obrigatório.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await updateStatusAPI(2, undefined, motivo);
      if (!res.ok) throw new Error('Erro ao reprovar');
      committedRef.current = true;
      await refetchAllData();
      navigate('/painel-aprovacao', {
        state: { notice: `Pedido #${id} reprovado. ` }
      });
    } catch (err: any) {
      setError(`Falha ao reprovar: ${err?.message || 'desconhecido'}`);
    } finally {
      setSubmitting(false);
      setIsRejectModalOpen(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando detalhes do pedido...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center bg-white rounded-lg shadow-sm border border-red-200 p-8 max-w-md">
          <AlertTriangle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Erro ao Carregar Pedido</h2>
          <p className="text-sm text-red-600 mb-4">{error}</p>
          <button
            onClick={handleBack}
            className="px-6 py-3 bg-gray-200 hover:bg-gray-300 rounded-lg font-medium transition-colors"
          >
            Voltar ao Painel
          </button>
        </div>
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Pedido não encontrado.</p>
        </div>
      </div>
    );
  }

  const canConcat =
    (order.status === 5 || order.status === 3) &&
    belowMin &&
    (order as any).concatRole !== 'RESULTADO' &&
    (order as any).concatRole !== 'ORIGEM';

  return (
    <div className="flex-1 overflow-x-hidden bg-gray-50">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <button
            onClick={handleBack}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Voltar ao Painel
          </button>

          {(order as any)?.concatRole && (
            <div>
              {(order as any).concatRole === 'RESULTADO' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800">
                  Pedido Concatenado (Novo) • Grupo {(order as any).concatGroupId}
                </span>
              )}
              {(order as any).concatRole === 'ORIGEM' && (
                <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-200 text-gray-700">
                  Origem de Concatenação • Grupo {(order as any).concatGroupId}
                </span>
              )}
            </div>
          )}
        </div>

        <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
          Análise do Pedido #{order.id}
        </h1>

        {/* Card de Informações do Pedido */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 lg:p-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Solicitante</h3>
              <p className="text-base font-medium text-gray-900">{order.solicitante.nome}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Unidade</h3>
              <p className="text-base font-medium text-gray-900">{order.unidadeAdmin}</p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Data</h3>
              <p className="text-base font-medium text-gray-900">
                {new Date(order.data).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' })}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Status</h3>
              <div>{statusBadge(order.status)}</div>
            </div>
          </div>
        </div>

        {/* Tabela de Itens */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="px-5 lg:px-6 py-4 border-b border-gray-200">
            <h2 className="text-base lg:text-lg font-semibold text-gray-900">Itens do Pedido</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">Produto</th>
                  <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Código</th>
                  <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Qtd. </th>
                  <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Valor Un.</th>
                  <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Subtotal</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {order.itens.map((item: any, idx: number) => {
                  const qty = getQty(item);
                  const price = getPrice(item);
                  const subtotal = +(qty * price);
                  return (
                    <tr key={getIdKey(item, idx)} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 lg:px-6 py-4">
                        <div className="flex items-center gap-3">
                          <img
                            src={resolveImgUrl(item)}
                            alt={item.nome}
                            className="w-12 h-12 lg:w-14 lg:h-14 rounded-lg object-cover border border-gray-200 flex-shrink-0"
                          />
                          <span className="text-sm text-gray-900 line-clamp-2">{item.nome}</span>
                        </div>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">{item.codProd}</td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 whitespace-nowrap">
                        {qty} {getUnit(item)}
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">{formatCurrency(price)}</td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 font-semibold whitespace-nowrap">
                        {formatCurrency(subtotal)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                <tr>
                  <td colSpan={4} className="px-4 lg:px-6 py-4 text-right text-sm font-bold text-gray-900 uppercase">
                    Valor Total:
                  </td>
                  <td className="px-4 lg:px-6 py-4 text-left text-lg font-bold text-gray-900">
                    {formatCurrency(totalValue)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Botão Editar */}
        {(order.status === 5 || order.status === 3) && (
          <div className="flex justify-start">
            <button
              onClick={() => navigate(`/pedido/${order.id}/editar`)}
              className="inline-flex items-center gap-2 px-5 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-sm text-sm"
            >
              <Edit className="w-4 h-4" />
              Editar Pedido
            </button>
          </div>
        )}

        {/* Info sobre Mínimo */}
        {(order.status === 5 || order.status === 3) && (
          <div className={`rounded-lg border-2 p-4 ${belowMin ? 'bg-red-50 border-red-200' : 'bg-green-50 border-green-200'}`}>
            <div className="flex items-start gap-3">
              <AlertTriangle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${belowMin ? 'text-red-600' : 'text-green-600'}`} />
              <div className="text-sm">
                <p className="font-semibold text-gray-900 mb-1">
                  Mínimo exigido: <span className="text-blue-600">{formatCurrency(minValue ?? MIN_VALUE_FALLBACK)}</span> •
                  Valor do pedido: <span className="text-blue-600">{formatCurrency(baseValue ?? totalValue)}</span>
                </p>
                {belowMin ? (
                  <p className="text-red-700">
                    <strong>Abaixo do mínimo</strong> — é necessário concatenar antes de aprovar.
                  </p>
                ) : (
                  <p className="text-green-700">
                    ✓ <strong>Acima do mínimo</strong> — pode aprovar diretamente.
                  </p>
                )}
                {contextError && (
                  <p className="text-xs text-gray-600 mt-2">Contexto parcial: {contextError}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50">
            <div className="flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}

        {/* Ações */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 lg:p-6">
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-end gap-3">
            <button
              onClick={() => setIsRejectModalOpen(true)}
              disabled={submitting}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-sm text-sm"
            >
              <XCircle className="w-5 h-5" />
              Reprovar
            </button>

            {canConcat && (
              <button
                onClick={() => setConcatOpen(true)}
                disabled={submitting}
                className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-sm text-sm"
                title="Concatenar com outros pedidos pendentes da mesma unidade"
              >
                Concatenar Pedidos
              </button>
            )}

            <button
              onClick={handleApprove}
              disabled={submitting || belowMin}
              className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 shadow-sm text-sm"
            >
              <CheckCircle className="w-5 h-5" />
              {submitting ? 'Aprovando...' : 'Aprovar Pedido'}
            </button>
          </div>
        </div>
      </div>

      {/* Modals */}
      <RejectModal
        isOpen={isRejectModalOpen}
        onClose={() => setIsRejectModalOpen(false)}
        orderInfo={{ id: String(order.id), solicitante: order.solicitante.nome }}
        onConfirm={async (motivo: string) => { await handleReprove(motivo); }}
      />

      <ConcatModal
        pedidoId={Number(id)}
        isOpen={concatOpen}
        onClose={() => setConcatOpen(false)}
        onDone={(newId) => {
          committedRef.current = true;
          setConcatOpen(false);
          navigate(`/pedido/${newId}`, {
            state: { notice: `Pedido #${newId} criado por concatenação. ` }
          });
        }}
      />
    </div>
  );
};

export default OrderDetailPage;