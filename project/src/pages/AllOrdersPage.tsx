import React, { useState, useMemo, useEffect, useCallback } from 'react';
import KpiCard from '../components/KpiCard';
import OrdersHistoryTable from '../components/OrdersHistoryTable';
import { KpiData } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { RefreshCw } from 'lucide-react';
import FiltersButton from '../components/FiltersButton';
import { HistoricalOrder } from '../types/pedidos';

const ITEMS_PER_PAGE = 10;

const AllOrdersPage: React. FC = () => {
  const { orders, isLoading, setores } = useData() as {
    orders: HistoricalOrder[];
    isLoading: boolean;
    setores: any[];
  };
  const { user, token } = useAuth();

  const [ordersLocal, setOrdersLocal] = useState<HistoricalOrder[]>(orders || []);
  useEffect(() => setOrdersLocal(orders || []), [orders]);

  const [days, setDays] = useState<number>(30);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = String(user?.perfil ?? '').toUpperCase() === 'ADMIN';

  const [showFilters, setShowFilters] = useState(false);
  const [selectedSetorId, setSelectedSetorId] = useState<string>('');

  const userUnitName = useMemo(() => {
    if (!user) return '';
    const direct = String(user.setor ?? '').trim();
    if (direct) return direct;
    const byCode = (setores || []).find((s: any) => Number(s.CODSETOR) === Number(user.codSetor));
    return String(byCode?.DESCRICAO ??  '').trim();
  }, [user, setores]);

  const scopedDataset = useMemo(() => {
    if (isAdmin) {
      if (!selectedSetorId) return ordersLocal;
      return ordersLocal. filter(
        (o: HistoricalOrder) => String(o.setor || '').trim() === selectedSetorId
      );
    }
    if (! userUnitName) return ordersLocal;
    return ordersLocal.filter(
      (o: HistoricalOrder) => String(o.setor || '').trim() === userUnitName
    );
  }, [ordersLocal, isAdmin, selectedSetorId, userUnitName]);

  const refreshOrdersTable = useCallback(async () => {
    setRefreshing(true);
    try {
      const url = `/api/pedidos/historico?days=${days}&maxrows=400`;
      const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error('Falha ao atualizar histórico');
      const data = await resp.json();
      setOrdersLocal(Array. isArray(data) ? data : []);
    } catch (e) {
      console.error('[AllOrdersPage] refresh erro:', e);
    } finally {
      setRefreshing(false);
    }
  }, [days, token]);

  const kpiData: KpiData[] = useMemo(() => {
    const total = scopedDataset.length;
    const aprovadosTotal = scopedDataset
      . filter(o => o.status === 1)
      .reduce((sum, o) => sum + (Number(o.valorTotal) || 0), 0);
    const reprovados = scopedDataset.filter(o => o. status === 2).length;
    const pendentes = scopedDataset.filter(o => o. status === 5).length;

    return [
      {
        title: 'Total de Pedidos',
        value: String(total),
        subtitle: isAdmin
          ? (selectedSetorId ? `Filtrados por: ${selectedSetorId}` : 'Global')
          : (userUnitName ? `Unidade: ${userUnitName}` : 'Sua unidade')
      },
      {
        title: 'Valor Aprovado',
        value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(aprovadosTotal),
        subtitle: 'Soma aprovados'
      },
      {
        title: 'Taxa de Reprovação',
        value: `${total > 0 ? ((reprovados / total) * 100).toFixed(1) : 0}%`,
        subtitle: 'Reprovados / total'
      },
      {
        title: 'Pedidos Pendentes',
        value: String(pendentes),
        subtitle: 'Aguardando análise'
      }
    ];
  }, [scopedDataset, isAdmin, selectedSetorId, userUnitName]);

  const [selectedOrderId, setSelectedOrderId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);

  const openDetails = useCallback((order: HistoricalOrder) => {
    const idNum = Number(order.id);
    if (!Number.isFinite(idNum)) {
      console.warn('ID inválido ao abrir modal:', order.id);
      return;
    }
    setSelectedOrderId(idNum);
    setShowModal(true);
  }, []);

  const closeModal = useCallback(() => {
    setShowModal(false);
    setSelectedOrderId(null);
  }, []);

  const [currentPage, setCurrentPage] = useState<number>(1);
  useEffect(() => {
    setCurrentPage(1);
  }, [selectedSetorId, userUnitName, isAdmin]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando histórico de pedidos...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-hidden bg-gray-50">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Histórico de Pedidos</h1>
            {! isAdmin && userUnitName && (
              <span className="text-xs px-2. 5 py-1 rounded-full bg-gray-100 text-gray-700 font-medium">
                Escopo: {userUnitName}
              </span>
            )}
            {isAdmin && selectedSetorId && (
              <span className="text-xs px-2.5 py-1 rounded-full bg-blue-50 text-blue-700 font-medium border border-blue-200">
                Filtro: {selectedSetorId}
              </span>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Período */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 font-medium whitespace-nowrap">Período:</label>
              <select
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
                value={String(days)}
                onChange={(e) => setDays(Number(e.target.value))}
                disabled={refreshing}
              >
                <option value="30">Últimos 30 dias</option>
                <option value="45">Últimos 45 dias</option>
              </select>
            </div>

            {/* Atualizar */}
            <button
              onClick={refreshOrdersTable}
              disabled={refreshing}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
              title="Atualizar histórico"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Atualizar</span>
            </button>

            {/* Filtro global (somente admin) */}
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

        {/* KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          {kpiData.map((kpi, index) => (
            <KpiCard key={index} data={kpi} />
          ))}
        </div>

        {/* Tabela */}
        <OrdersHistoryTable
          orders={scopedDataset}
          currentPage={currentPage}
          onPageChange={setCurrentPage}
          itemsPerPage={ITEMS_PER_PAGE}
          onRowClick={openDetails}
          showUnitFilter={isAdmin}
        />

        {/* Modal Detalhes */}
        <OrderDetailsModal
          open={showModal}
          pedidoId={selectedOrderId}
          onClose={closeModal}
        />
      </div>
    </div>
  );
};

export default AllOrdersPage;