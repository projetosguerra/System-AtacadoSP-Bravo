import {
  useState,
  useEffect,
  useCallback,
  useRef,
  useMemo
} from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, XCircle, CheckCircle } from 'lucide-react';
import { OrderDetail } from '../types';
import RejectModal from '../components/RejectModal';
import { useData } from '../context/DataContext';
import ConcatModal from '../components/ConcatModal';

const MIN_VALUE_FALLBACK = 200;

function formatCurrency(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);
}
function statusBadge(status: number) {
  switch (status) {
    case 1: return <span className="px-3 py-1 text-sm font-semibold rounded-full bg-green-100 text-green-800">Aprovado</span>;
    case 2: return <span className="px-3 py-1 text-sm font-semibold rounded-full bg-red-100 text-red-800">Reprovado</span>;
    case 3: return <span className="px-3 py-1 text-sm font-semibold rounded-full bg-blue-100 text-blue-800">Em Análise</span>;
    case 5: return <span className="px-3 py-1 text-sm font-semibold rounded-full bg-yellow-100 text-yellow-800">Pendente</span>;
    case 9: return <span className="px-3 py-1 text-sm font-semibold rounded-full bg-gray-200 text-gray-700">Arquivado</span>;
    default: return <span className="px-3 py-1 text-sm font-semibold rounded-full bg-gray-100 text-gray-700">Status {status}</span>;
  }
}

const OrderDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { refetchAllData } = useData();

  const [order, setOrder] = useState<OrderDetail | null>(null);
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

  const totalValue = useMemo(() => {
    if (!order) return 0;
    return order.itens.reduce((sum, item) => sum + item.preco * item.quantidade, 0);
  }, [order]);

  const belowMin = useMemo(() => {
    if (minValue === null || baseValue === null) return false;
    return baseValue < minValue;
  }, [minValue, baseValue]);

  const updateStatusAPI = useCallback(
    async (newStatus: number, conditionStatus?: number, motivo?: string) => {
      const resp = await fetch(`/api/pedido/${id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newStatus, conditionStatus, motivo }),
      });
      return resp;
    },
    [id]
  );

  // Lock 5->3 ao entrar
  useEffect(() => {
    let mounted = true;
    const fetchOrder = async () => {
      if (!id) return;
      setIsLoading(true);
      setError(null);
      try {
        await updateStatusAPI(3, 5);
        try { abortRef.current?.abort(); } catch {}
        abortRef.current = new AbortController();
        const timeout = setTimeout(() => abortRef.current?.abort(), 12_000);

        const response = await fetch(`/api/pedido/${id}`, { signal: abortRef.current.signal });
        clearTimeout(timeout);
        if (!response.ok) throw new Error('Pedido não encontrado ou já está em análise por outro usuário.');

        const data: OrderDetail = await response.json();
        if (mounted) setOrder(data);
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
      // fallback se desmontar sem concluir ação
      if (order?.status === 3 && !committedRef.current) {
        updateStatusAPI(5, 3).catch(() => {});
      }
      try { abortRef.current?.abort(); } catch {}
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  // Contexto de concat sempre (5 ou 3)
  useEffect(() => {
    let active = true;
    async function loadContext() {
      if (!id) return;
      setContextError(null);
      try {
        const r = await fetch(`/api/pedido/${id}/concat/context`, { headers: { 'Cache-Control': 'no-cache' } });
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
  }, [id, totalValue]);

  // Desbloqueio garantido ao sair da página/aba (casos abruptos)
  useEffect(() => {
    const unlock = () => {
      if (!id) return;
      if (committedRef.current) return;
      try {
        const payload = new Blob([JSON.stringify({})], { type: 'application/json' });
        (navigator as any).sendBeacon?.(`/api/pedido/${id}/unlock`, payload);
      } catch {
        fetch(`/api/pedido/${id}/unlock`, { method: 'POST', keepalive: true }).catch(() => {});
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

  // Navegar de volta com unlock síncrono para evitar race no Painel
  const handleBack = async () => {
    try {
      await fetch(`/api/pedido/${id}/unlock`, { method: 'POST' });
    } catch {}
    navigate('/painel-aprovacao', { state: { forceRefresh: true } });
  };

  async function handleApprove() {
    if (submitting || !order) return;
    if (belowMin) {
      setError('Pedido abaixo do valor mínimo. Concatene antes de aprovar.');
      return;
    }
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/pedido/${order.id}/aprovar`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
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
        state: { notice: `Pedido #${id} reprovado.` }
      });
    } catch (err: any) {
      setError(`Falha ao reprovar: ${err?.message || 'desconhecido'}`);
    } finally {
      setSubmitting(false);
      setIsRejectModalOpen(false);
    }
  };

  if (isLoading) return <div className="p-8 text-center">Carregando detalhes do pedido...</div>;
  if (error) return <div className="p-8 text-center text-red-500">Erro: {error}</div>;
  if (!order) return <div className="p-8 text-center">Pedido não encontrado.</div>;

  const canConcat =
    (order.status === 5 || order.status === 3) &&
    belowMin &&
    (order as any).concatRole !== 'RESULT' &&
    (order as any).concatRole !== 'SOURCE';

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm text-gray-600">
          <button onClick={handleBack} className="inline-flex items-center hover:text-gray-900">
            <ArrowLeft size={16} /> Voltar ao Painel
          </button>
        </div>
        {(order as any)?.concatRole && (
          <div>
            {(order as any).concatRole === 'RESULT' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                Pedido Concatenado (Novo) • Grupo {(order as any).concatGroupId}
              </span>
            )}
            {(order as any).concatRole === 'SOURCE' && (
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-gray-200 text-gray-700">
                Origem de Concatenação • Grupo {(order as any).concatGroupId}
              </span>
            )}
          </div>
        )}
      </div>

      <h1 className="text-3xl font-bold text-gray-900">Análise do Pedido #{order.id}</h1>

      <div className="bg-white p-6 rounded-lg shadow-sm border grid grid-cols-4 gap-6">
        <div>
          <h3 className="text-sm font-medium text-gray-500">Solicitante</h3>
          <p className="mt-1 text-lg">{order.solicitante.nome}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Unidade</h3>
          <p className="mt-1 text-lg">{order.unidadeAdmin}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Data</h3>
          <p className="mt-1 text-lg">{new Date(order.data).toLocaleDateString('pt-BR')}</p>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">Status</h3>
          <div className="mt-1">{statusBadge(order.status)}</div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Produto</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Qtd.</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Valor Un.</th>
              <th className="px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase">Subtotal</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {order.itens.map(item => (
              <tr key={item.id}>
                <td className="px-6 py-4">{item.nome}</td>
                <td className="px-6 py-4">{item.quantidade} {item.unit}</td>
                <td className="px-6 py-4">{formatCurrency(item.preco)}</td>
                <td className="px-6 py-4 font-semibold">
                  {formatCurrency(item.preco * item.quantidade)}
                </td>
              </tr>
            ))}
          </tbody>
          <tfoot className="bg-gray-100 font-bold">
            <tr>
              <td colSpan={3} className="px-6 py-4 text-right">VALOR TOTAL:</td>
              <td className="px-6 py-4 text-left text-xl">{formatCurrency(totalValue)}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {(order.status === 5 || order.status === 3) && (
        <div className="bg-white p-4 rounded-lg border text-sm text-gray-700 flex flex-col gap-1">
          <div>
            Mínimo exigido: <strong>{formatCurrency(minValue ?? MIN_VALUE_FALLBACK)}</strong> • Valor do pedido: <strong>{formatCurrency(baseValue ?? totalValue)}</strong> •
            {belowMin
              ? <span className="text-red-600 ml-1">Abaixo do mínimo — é necessário concatenar.</span>
              : <span className="text-green-600 ml-1">Acima do mínimo — pode aprovar.</span>}
          </div>
          {contextError && <div className="text-xs text-red-600">Contexto parcial: {contextError}</div>}
        </div>
      )}

      <div className="bg-white p-4 rounded-lg shadow-sm border flex flex-wrap justify-end gap-4">
        <button
          onClick={() => setIsRejectModalOpen(true)}
          disabled={submitting}
          className="flex items-center gap-2 px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
        >
          <XCircle size={20} /> Reprovar
        </button>

        {canConcat && (
          <button
            onClick={() => setConcatOpen(true)}
            disabled={submitting}
            className="flex items-center gap-2 px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors disabled:opacity-50"
            title="Concatenar com outros pedidos pendentes da mesma unidade"
          >
            Concatenar
          </button>
        )}

        <button
          onClick={handleApprove}
          disabled={submitting || belowMin}
          className="flex items-center gap-2 px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50"
        >
          <CheckCircle size={20} /> {submitting ? 'Aprovando...' : 'Aprovar'}
        </button>
      </div>

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
            state: { notice: `Pedido #${newId} criado por concatenação.` }
          });
        }}
      />
    </div>
  );
};

export default OrderDetailPage;