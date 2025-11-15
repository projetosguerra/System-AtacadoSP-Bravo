import { useEffect, useMemo, useRef, useState } from 'react';
import { RefreshCw, SlidersHorizontal, X } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import PendingOrdersTable from '../components/PendingOrdersTable';
import { KpiData, PedidoPendente } from '../types';
import { useData } from '../context/DataContext';

const toNumber = (x: any) => Number.isFinite(Number(x)) ? Number(x) : 0;

const ApprovalPanelPage = () => {
  const { pedidosPendentes: ctxPendentes, isLoading: ctxLoading, setores } = useData();

  const [days, setDays] = useState<number>(30);
  const [loading, setLoading] = useState<boolean>(false);
  const [list, setList] = useState<PedidoPendente[]>(ctxPendentes || []);
  const [error, setError] = useState<string | null>(null);

  const [showFilters, setShowFilters] = useState<boolean>(false);
  const [selectedSetorId, setSelectedSetorId] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const getPedidoSetorId = (p: any): string => {
    return String(
      p?.codSetor ??
      p?.CODSETOR ??
      p?.codsetor ??
      p?.setorId ??
      p?.COD_SETOR ??
      ''
    );
  };

  const matchesSearch = (p: any, term: string) => {
    if (!term) return true;
    const t = term.toLowerCase();
    try {
      const fields = [
        p?.id,
        p?.solicitante ?? p?.SOLICITANTE,
        p?.status ?? p?.STATUS,
        p?.descricao ?? p?.DESCRICAO,
        p?.numero ?? p?.NUMPEDRCA ?? p?.NUMPEDIDO,
      ];
      if (fields.some(v => String(v ?? '').toLowerCase().includes(t))) return true;
      return JSON.stringify(p).toLowerCase().includes(t);
    } catch {
      return false;
    }
  };

  const abortRef = useRef<AbortController | null>(null);
  function cancelInFlight() {
    try { abortRef.current?.abort(); } catch {}
    abortRef.current = new AbortController();
    return abortRef.current.signal;
  }

  async function loadPendentes(windowDays = days, totals = 0) {
    setLoading(true);
    setError(null);
    try {
      const signal = cancelInFlight();
      const params = new URLSearchParams({
        days: String(windowDays),
        maxrows: '200',
        totals: String(totals),
      });
      if (selectedSetorId) params.set('codsetor', selectedSetorId);

      const resp = await fetch(`/api/pedidos/pendentes?${params.toString()}`, {
        headers: { 'Cache-Control': 'no-cache' },
        signal
      });
      if (!resp.ok) throw new Error('Falha ao buscar pedidos pendentes');
      const data = await resp.json();
      const map = new Map<string | number, PedidoPendente>();
      for (const p of Array.isArray(data) ? data : []) {
        if (!map.has((p as any)?.id)) map.set((p as any)?.id, p);
      }
      setList(Array.from(map.values()));
    } catch (e: any) {
      if (e?.name === 'AbortError') return;
      setError(e?.message || 'Erro ao carregar pendentes.');
      setList(ctxPendentes || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    setList(ctxPendentes || []);
    loadPendentes(days, 0);
  }, [days, selectedSetorId]);

  const displayList = useMemo(() => {
    let arr = list;
    if (selectedSetorId) {
      arr = arr.filter(p => getPedidoSetorId(p) === selectedSetorId);
    }
    if (searchTerm.trim()) {
      arr = arr.filter(p => matchesSearch(p, searchTerm.trim()));
    }
    return arr;
  }, [list, selectedSetorId, searchTerm]);

  const totalPedidos = displayList.length;
  const totalValue = useMemo(
    () => displayList.reduce((sum, p) => sum + toNumber((p as any)?.valor), 0),
    [displayList]
  );
  const newOrdersToday = useMemo(
    () => displayList.filter(p => {
      const d = new Date((p as any).data);
      const t = new Date();
      return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    }).length,
    [displayList]
  );

  const kpiData: KpiData[] = [
    { title: 'Pedidos Pendentes', value: (loading || ctxLoading) ? '...' : totalPedidos, subtitle: 'Aguardando sua análise' },
    { title: 'Valor Total Pendente', value: (loading || ctxLoading) ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue), subtitle: 'Soma de todos os pedidos filtrados' },
    { title: 'Pedidos Hoje', value: (loading || ctxLoading) ? '...' : newOrdersToday, subtitle: 'Recebidos nas últimas 24h' },
    { title: 'Ticket Médio', value: (loading || ctxLoading || totalPedidos === 0) ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue / totalPedidos), subtitle: 'Valor médio por pedido' },
  ];

  const isBusy = loading || ctxLoading;

  const clearFilters = () => {
    setSelectedSetorId('');
    setSearchTerm('');
  };

  return (
    <div className="space-y-8 p-8 bg-gray-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Painel de Aprovação</h1>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Período</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              disabled={isBusy}
              title="Janela de dias para buscar pendentes"
            >
              <option value="30">Últimos 30 dias (recomendado)</option>
              <option value="45">Últimos 45 dias</option>
            </select>
          </div>

          <button
            onClick={() => loadPendentes(days, 1)}
            disabled={isBusy}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Atualizar lista (tenta preencher totais)"
          >
            <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          <button
            onClick={() => setShowFilters(v => !v)}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
            title="Mostrar/ocultar filtros"
          >
            <SlidersHorizontal className="w-4 h-4" />
            Filtros
          </button>
        </div>
      </div>

      {showFilters && (
        <div className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Unidade Administrativa</label>
              <select
                className="w-full border rounded px-3 py-2"
                value={selectedSetorId}
                onChange={(e) => setSelectedSetorId(e.target.value)}
                disabled={isBusy}
              >
                <option value="">Todas</option>
                {(setores || []).map(s => (
                  <option key={String(s.CODSETOR)} value={String(s.CODSETOR)}>
                    {s.DESCRICAO}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1">
              <label className="block text-sm font-medium text-gray-700 mb-1">Buscar</label>
              <input
                type="text"
                className="w-full border rounded px-3 py-2"
                placeholder="Nº do pedido, solicitante, status..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                disabled={isBusy}
              />
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={clearFilters}
                disabled={isBusy || (!selectedSetorId && !searchTerm)}
                className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                title="Limpar filtros"
              >
                <X className="inline w-4 h-4 mr-1" />
                Limpar
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => <KpiCard key={index} data={kpi} />)}
      </div>

      {(!isBusy && error) && (
        <div className="p-3 rounded border border-red-300 bg-red-50 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {isBusy && <div className="p-8 text-center text-gray-600">Carregando pedidos...</div>}
        {!isBusy && <PendingOrdersTable pedidos={displayList} />}
      </div>
    </div>
  );
};

export default ApprovalPanelPage;