import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import PendingOrdersTable from '../components/PendingOrdersTable';
import FiltersButton from '../components/FiltersButton';
import { KpiData, PedidoPendente } from '../types';
import { useData } from '../context/DataContext';

const toNumber = (x: any) => Number.isFinite(Number(x)) ? Number(x) : 0;

const ApprovalPanelPage = () => {
  const { pedidosPendentes: ctxPendentes, isLoading: ctxLoading, setores } = useData();

  const [days, setDays] = useState<number>(30);
  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedSetorId, setSelectedSetorId] = useState<string>('');

  const [loading, setLoading] = useState(false);
  const [list, setList] = useState<PedidoPendente[]>(ctxPendentes || []);
  const [error, setError] = useState<string | null>(null);

  async function loadPendentes(windowDays = days) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({ days: String(windowDays), maxrows: '200' });
      const resp = await fetch(`/api/pedidos/pendentes?${params.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' }
      });
      if (!resp.ok) throw new Error('Falha ao buscar pedidos pendentes');
      const data = await resp.json();
      const map = new Map<string | number, PedidoPendente>();
      for (const p of Array.isArray(data) ? data : []) {
        if (!map.has((p as any)?.id)) map.set((p as any)?.id, p);
      }
      setList(Array.from(map.values()));
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar pendentes.');
      setList(ctxPendentes || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPendentes(days);
  }, [days]); 

  const displayList = useMemo(() => {
    return (list || []).filter(p => {
      if (!selectedSetorId) return true;
      const setorId = String(
        (p as any)?.codSetor ?? (p as any)?.CODSETOR ?? (p as any)?.codsetor ?? (p as any)?.setorId ?? (p as any)?.COD_SETOR ?? ''
      );
      return setorId === selectedSetorId;
    });
  }, [list, selectedSetorId]);

  const totalPedidos = displayList.length;
  const totalValor = useMemo(
    () => displayList.reduce((sum, p) => sum + toNumber((p as any)?.valor), 0),
    [displayList]
  );
  const novosHoje = useMemo(
    () => displayList.filter(p => {
      const d = new Date((p as any).data); const t = new Date();
      return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    }).length,
    [displayList]
  );

  // Paginação da tabela
  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [selectedSetorId, days]); 

  return (
    <div className="space-y-6 p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Painel de Aprovação</h1>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Período</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              disabled={loading || ctxLoading}
            >
              <option value="30">Últimos 30 dias (recomendado)</option>
              <option value="45">Últimos 45 dias</option>
            </select>
          </div>

          <button
            onClick={() => loadPendentes(days)}
            disabled={loading || ctxLoading}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Atualizar lista"
          >
            <RefreshCw className={`w-4 h-4 ${(loading || ctxLoading) ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <FiltersButton
            showFilters={showFilters}
            setShowFilters={setShowFilters}
            selectedSetorId={selectedSetorId}
            setSelectedSetorId={setSelectedSetorId}
            setores={(setores || []) as any}
            disabled={loading || ctxLoading}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Pedidos Pendentes', value: (loading || ctxLoading) ? '...' : totalPedidos, subtitle: 'Aguardando sua análise' },
          { title: 'Valor Total Pendente', value: (loading || ctxLoading) ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor), subtitle: 'Soma (após filtro de unidade)' },
          { title: 'Pedidos Hoje', value: (loading || ctxLoading) ? '...' : novosHoje, subtitle: 'Recebidos nas últimas 24h' },
          { title: 'Ticket Médio', value: (loading || ctxLoading || totalPedidos === 0) ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor / totalPedidos), subtitle: 'Média por pedido' },
        ].map((k, i) => <KpiCard key={i} data={k as KpiData} />)}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {(loading || ctxLoading) && <div className="p-8 text-center text-gray-600">Carregando pedidos...</div>}
        {!(loading || ctxLoading) && (
          <PendingOrdersTable
            pedidos={displayList}
            currentPage={page}
            itemsPerPage={10}
            onPageChange={setPage}
          />
        )}
      </div>

      {error && !loading && !ctxLoading && (
        <div className="p-3 rounded border border-red-300 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}
    </div>
  );
};

export default ApprovalPanelPage;