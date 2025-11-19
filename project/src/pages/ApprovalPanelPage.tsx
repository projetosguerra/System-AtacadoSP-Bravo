import { useEffect, useMemo, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import PendingOrdersTable from '../components/PendingOrdersTable';
import FiltersButton from '../components/FiltersButton';
import { KpiData, PedidoPendente } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';

const toNumber = (x: any) => (Number.isFinite(Number(x)) ? Number(x) : 0);

const ApprovalPanelPage = () => {
  const { pedidosPendentes: ctxPendentes, isLoading: ctxLoading, setores } = useData();
  const { user, token } = useAuth();
  const location = useLocation();

  const isAdmin = String(user?.perfil ?? '').toUpperCase() === 'ADMIN';

  // Nome da unidade do usuário para fallback local (aprovador/solicitante)
  const userUnitName = useMemo(() => {
    const direct = String(user?.setor ?? '').trim();
    if (direct) return direct;
    const byCode = (setores || []).find((s: any) => Number(s.CODSETOR) === Number(user?.codSetor));
    return String(byCode?.DESCRICAO ?? '').trim();
  }, [user?.setor, user?.codSetor, setores]);

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
      const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(`/api/pedidos/pendentes?${params.toString()}`, { headers });
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

  useEffect(() => { loadPendentes(days); }, [days]); // eslint-disable-line

  useEffect(() => {
    const onFocus = () => loadPendentes(days);
    const onVisibility = () => { if (document.visibilityState === 'visible') loadPendentes(days); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [days]); // eslint-disable-line

  useEffect(() => {
    if ((location.state as any)?.forceRefresh) {
      const t = setTimeout(() => loadPendentes(days), 200);
      return () => clearTimeout(t);
    }
  }, [location.state, days]); // eslint-disable-line

  // Escopo para ADMIN (filtro global de unidade) OU fallback para não-admin (filtrar por unidade do usuário)
  const scopedList = useMemo(() => {
    if (isAdmin) {
      if (!selectedSetorId) return list || [];
      const setorLabel = (o: any) => String(o?.unidadeAdmin || '').trim();
      return (list || []).filter(p => setorLabel(p) === selectedSetorId);
    }
    // Não-admin: defesa em profundidade (mesmo se backend falhar)
    if (!userUnitName) return list || [];
    return (list || []).filter(p => String((p as any)?.unidadeAdmin || '').trim() === userUnitName);
  }, [list, isAdmin, selectedSetorId, userUnitName]);

  const totalPedidos = scopedList.length;
  const totalValor = useMemo(
    () => scopedList.reduce((sum, p) => sum + toNumber((p as any)?.valor), 0),
    [scopedList]
  );
  const novosHoje = useMemo(() => {
    return scopedList.filter(p => {
      const d = new Date((p as any).data); const t = new Date();
      return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    }).length;
  }, [scopedList]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [selectedSetorId, days, userUnitName, isAdmin]);

  return (
    <div className="space-y-6 p-8 bg-gray-50 min-h-screen">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <h1 className="text-3xl font-bold text-gray-800">
          {isAdmin ? 'Painel de Aprovação' : 'Meus Pedidos Pendentes'}
        </h1>

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

          {isAdmin && (
            <FiltersButton
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              selectedSetorId={selectedSetorId}
              setSelectedSetorId={setSelectedSetorId}
              setores={(setores || []) as any}
              disabled={loading || ctxLoading}
            />
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[
          { title: 'Pedidos Pendentes', value: (loading || ctxLoading) ? '...' : totalPedidos, subtitle: isAdmin ? 'Global (com filtro opcional)' : 'Da sua unidade' },
          { title: 'Valor Total Pendente', value: (loading || ctxLoading) ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor), subtitle: 'Soma' },
          { title: 'Pedidos Hoje', value: (loading || ctxLoading) ? '...' : novosHoje, subtitle: 'Últimas 24h' },
          { title: 'Ticket Médio', value: (loading || ctxLoading || totalPedidos === 0) ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor / totalPedidos), subtitle: 'Média por pedido' },
        ].map((k, i) => <KpiCard key={i} data={k as KpiData} />)}
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200">
        {(loading || ctxLoading) && <div className="p-8 text-center text-gray-600">Carregando pedidos...</div>}
        {!(loading || ctxLoading) && (
          <PendingOrdersTable
            pedidos={scopedList}
            currentPage={page}
            itemsPerPage={10}
            onPageChange={setPage}
            showUnitFilter={isAdmin} 
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