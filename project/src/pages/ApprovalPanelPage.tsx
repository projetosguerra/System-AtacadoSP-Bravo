import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import PendingOrdersTable from '../components/PendingOrdersTable';
import { KpiData, PedidoPendente } from '../types';
import { useData } from '../context/DataContext';

// Utilitário para garantir número
const toNumber = (x: any) => Number.isFinite(Number(x)) ? Number(x) : 0;

const ApprovalPanelPage = () => {
  const { pedidosPendentes: ctxPendentes, isLoading: ctxLoading } = useData();

  // Estado local para poder pedir uma janela maior (inclui mês passado)
  const [days, setDays] = useState<number>(60); // 30 | 60 | 90
  const [loading, setLoading] = useState<boolean>(false);
  const [list, setList] = useState<PedidoPendente[]>(ctxPendentes || []);
  const [error, setError] = useState<string | null>(null);

  // Carrega pendentes com janela configurável só para esta página
  async function loadPendentes(windowDays = days) {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch(`/api/pedidos/pendentes?days=${windowDays}`, { headers: { 'Cache-Control': 'no-cache' } });
      if (!resp.ok) throw new Error('Falha ao buscar pedidos pendentes');
      const data = await resp.json();
      // Dedupe por id (defensivo)
      const map = new Map<string | number, PedidoPendente>();
      for (const p of Array.isArray(data) ? data : []) {
        if (!map.has(p.id)) map.set(p.id, p);
      }
      setList(Array.from(map.values()));
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar pendentes.');
      // fallback: usa o que veio do contexto
      setList(ctxPendentes || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    // Usa contexto como primeiro paint (se houver), depois busca janela maior
    setList(ctxPendentes || []);
    // dispara busca estendida
    loadPendentes(days);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days]);

  const totalPedidos = list.length;
  const totalValue = useMemo(
    () => list.reduce((sum, p) => sum + toNumber((p as any)?.valor), 0),
    [list]
  );
  const newOrdersToday = useMemo(
    () => list.filter(p => {
      const d = new Date(p.data as any);
      const t = new Date();
      return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    }).length,
    [list]
  );

  const kpiData: KpiData[] = [
    {
      title: 'Pedidos Pendentes',
      value: (loading || ctxLoading) ? '...' : totalPedidos,
      subtitle: 'Aguardando sua análise',
    },
    {
      title: 'Valor Total Pendente',
      value: (loading || ctxLoading) ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue),
      subtitle: 'Soma de todos os pedidos',
    },
    {
      title: 'Pedidos Hoje',
      value: (loading || ctxLoading) ? '...' : newOrdersToday,
      subtitle: 'Recebidos nas últimas 24h',
    },
    {
      title: 'Ticket Médio',
      value: (loading || ctxLoading || totalPedidos === 0) ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue / totalPedidos),
      subtitle: 'Valor médio por pedido',
    }
  ];

  const isBusy = loading || ctxLoading;

  return (
    <div className="space-y-8 p-8 bg-gray-50 min-h-full">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800">Painel de Aprovação</h1>

        <div className="flex items-center gap-3">
          {/* Seletor de período para trazer pendentes mais antigos (inclui mês passado) */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Período</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              disabled={isBusy}
              title="Janela de dias para buscar pendentes"
            >
              <option value="30">Últimos 30 dias</option>
              <option value="60">Últimos 60 dias</option>
              <option value="90">Últimos 90 dias</option>
            </select>
          </div>

          <button
            onClick={() => loadPendentes(days)}
            disabled={isBusy}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Atualizar lista de pendentes"
          >
            <RefreshCw className={`w-4 h-4 ${isBusy ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => <KpiCard key={index} data={kpi} />)}
      </div>

      <div className="bg-white rounded-lg shadow-md border border-gray-200">
        {isBusy && <div className="p-8 text-center text-gray-600">Carregando pedidos...</div>}
        {!isBusy && !!error && (
          <div className="p-4 text-sm text-red-700 bg-red-50 border-t border-b border-red-200">
            {error}
          </div>
        )}
        {!isBusy && <PendingOrdersTable pedidos={list} />}
      </div>
    </div>
  );
};

export default ApprovalPanelPage;