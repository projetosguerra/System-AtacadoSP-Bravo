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

// Helper para extrair a sigla antes do " - "
function extractSigla(text?: string | null) {
  if (!text) return '';
  const t = String(text).trim();
  const dash = t.indexOf(' - ');
  if (dash > 0) return t.substring(0, dash).trim();
  // fallback: primeira palavra
  return t.split(' ')[0].trim();
}

const ApprovalPanelPage = () => {
  const { pedidosPendentes: ctxPendentes, isLoading: ctxLoading, setores } = useData();
  const { user, token } = useAuth();
  const location = useLocation();

  const isAdmin = String(user?.perfil ?? '').toUpperCase() === 'ADMIN';

  const userUnitName = useMemo(() => {
    const direct = String(user?.setor ?? '').trim();
    if (direct) return direct;
    const byCode = (setores || []).find((s: any) => Number(s.CODSETOR) === Number(user?.codSetor));
    return String(byCode?.DESCRICAO ?? '').trim();
  }, [user?.setor, user?.codSetor, setores]);

  const [refreshing] = useState(false);

  const [showFilters, setShowFilters] = useState(false);
  const [days, setDays] = useState<number>(30);
  // selectedSetorId é CODSETOR (string)
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
      setList(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao carregar pendentes.');
      setList(ctxPendentes || []);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { loadPendentes(days); }, [days]);

  useEffect(() => {
    const onFocus = () => loadPendentes(days);
    const onVisibility = () => { if (document.visibilityState === 'visible') loadPendentes(days); };
    window.addEventListener('focus', onFocus);
    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      window.removeEventListener('focus', onFocus);
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [days]);

  useEffect(() => {
    if ((location.state as any)?.forceRefresh) {
      const t = setTimeout(() => loadPendentes(days), 200);
      return () => clearTimeout(t);
    }
  }, [location.state, days]);

  // Ajuste do filtro para ADMIN: filtra pelo CODSETOR selecionado comparando com a descrição/sigla do pedido.
  const scopedList = useMemo(() => {
    if (isAdmin) {
      if (!selectedSetorId) return list || [];
      const setorObj = (setores || []).find((s: any) => String(s.CODSETOR) === String(selectedSetorId));
      if (!setorObj) return list || [];
      const targetDesc = String(setorObj.DESCRICAO || '').trim();
      const targetSigla = extractSigla(targetDesc);
      return (list || []).filter(p => {
        const ua = (p.unidadeAdmin || '').trim();
        if (!ua) return false;
        if (ua === targetDesc) return true;
        const uaSigla = extractSigla(ua);
        return uaSigla === targetSigla;
      });
    }
    if (!userUnitName) return list || [];
    // Para não-admin, já estava filtrando corretamente
    const userSigla = extractSigla(userUnitName);
    return (list || []).filter(p => {
      const ua = (p.unidadeAdmin || '').trim();
      const uaSigla = extractSigla(ua);
      return ua === userUnitName || uaSigla === userSigla;
    });
  }, [list, isAdmin, selectedSetorId, userUnitName, setores]);

  const totalPedidos = scopedList.length;
  const totalValor = useMemo(
    () => scopedList.reduce((sum, p) => sum + toNumber(p.valor), 0),
    [scopedList]
  );
  const novosHoje = useMemo(() => {
    return scopedList.filter(p => {
      const d = new Date(p.data);
      const t = new Date();
      return d.getFullYear() === t.getFullYear() && d.getMonth() === t.getMonth() && d.getDate() === t.getDate();
    }).length;
  }, [scopedList]);

  const [page, setPage] = useState(1);
  useEffect(() => { setPage(1); }, [selectedSetorId, days, userUnitName, isAdmin]);

  if (ctxLoading && list.length === 0) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando pedidos pendentes...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-hidden bg-gray-50">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            {isAdmin ? 'Painel de Aprovação' : 'Pedidos Pendentes'}
          </h1>

            <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
              <div className="flex items-center gap-2">
                <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Período:</label>
                <select
                  className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                  value={String(days)}
                  onChange={(e) => setDays(Number(e.target.value))}
                  disabled={loading || ctxLoading}
                >
                  <option value="30">Últimos 30 dias</option>
                  <option value="45">Últimos 45 dias</option>
                </select>
              </div>

              <button
                onClick={() => loadPendentes(days)}
                disabled={loading || ctxLoading}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                aria-label="Atualizar lista de pedidos"
              >
                <RefreshCw className={`w-4 h-4 ${(loading || ctxLoading) ? 'animate-spin' : ''}`} />
                <span className="hidden sm:inline">Atualizar</span>
              </button>

              {isAdmin && (
                <FiltersButton
                  showFilters={showFilters}
                  setShowFilters={setShowFilters}
                  selectedSetorId={selectedSetorId}
                  setSelectedSetorId={setSelectedSetorId}
                  setores={setores || []}
                  disabled={refreshing}
                />
              )}
            </div>
        </div>

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {[
            {
              title: 'Pedidos Pendentes',
              value: (loading || ctxLoading) ? '...' : String(totalPedidos),
              subtitle: isAdmin ? 'Global (filtrado)' : 'Da sua unidade'
            },
            {
              title: 'Valor Total Pendente',
              value: (loading || ctxLoading) ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor),
              subtitle: 'Soma dos pedidos'
            },
            {
              title: 'Pedidos Hoje',
              value: (loading || ctxLoading) ? '...' : String(novosHoje),
              subtitle: 'Últimas 24h'
            },
            {
              title: 'Ticket Médio',
              value: (loading || ctxLoading || totalPedidos === 0) ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValor / totalPedidos),
              subtitle: 'Média por pedido'
            },
          ].map((k, i) => <KpiCard key={i} data={k as KpiData} />)}
        </div>

        {/* Tabela de Pedidos */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {(loading || ctxLoading) && list.length === 0 ? (
            <div className="p-12 text-center">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-gray-600 text-sm">Carregando pedidos... </p>
            </div>
          ) : (
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
          <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50">
            <div className="flex items-start gap-2">
              <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h. 01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm text-red-700 font-medium">{error}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ApprovalPanelPage;