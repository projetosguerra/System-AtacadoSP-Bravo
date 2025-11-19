import React, { useState, useMemo, useEffect } from 'react';
import KpiCard from '../components/KpiCard';
import OrdersHistoryTable from '../components/OrdersHistoryTable';
import { KpiData } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { RefreshCw } from 'lucide-react';
import FiltersButton from '../components/FiltersButton'; // mesmo usado no painel

const AllOrdersPage: React.FC = () => {
  const { orders, isLoading, setores } = useData() as any;
  const { user, token } = useAuth();

  // Dados carregados do contexto
  const [ordersLocal, setOrdersLocal] = useState(orders || []);
  useEffect(() => setOrdersLocal(orders || []), [orders]);

  // Estado de período (dias)
  const [days, setDays] = useState<number>(30);
  const [refreshing, setRefreshing] = useState(false);

  const isAdmin = String(user?.perfil ?? '').toUpperCase() === 'ADMIN';

  // Popover global de unidade (igual painel)
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSetorId, setSelectedSetorId] = useState<string>(''); // string identificando unidade escolhida

  // Derivação do nome da unidade do usuário (para aprovador/solicitante)
  const userUnitName = useMemo(() => {
    if (!user) return '';
    const direct = String(user?.setor ?? '').trim();
    if (direct) return direct;
    const byCode = (setores || []).find((s: any) => Number(s.CODSETOR) === Number(user?.codSetor));
    return String(byCode?.DESCRICAO ?? '').trim();
  }, [user?.setor, user?.codSetor, setores]);

  // Dataset base para KPIs e tabela, controlado pelo filtro global (somente admin)
  const scopedDataset = useMemo(() => {
    if (isAdmin) {
      if (!selectedSetorId) return ordersLocal || [];
      // FiltersButton te fornece um "selectedSetorId" – dependendo da sua implementação
      // Se for código do setor, converta; se for descrição, compare com ordem.setor
      // Aqui assumimos que é a DESCRICAO (como no painel).
      return (ordersLocal || []).filter(
        (o: { setor?: string }) => String(o.setor || '').trim() === selectedSetorId
      );
    }
    // Aprovador/solicitante: apenas sua unidade
    if (!userUnitName) return ordersLocal || [];
    return (ordersLocal || []).filter(
      (o: { setor?: string }) => String(o.setor || '').trim() === userUnitName
    );
  }, [ordersLocal, isAdmin, selectedSetorId, userUnitName]);

  async function refreshOrdersTable() {
    setRefreshing(true);
    try {
      const url = `/api/pedidos/historico?days=${days}&maxrows=400`;
      const headers: Record<string, string> = { 'Cache-Control': 'no-cache' };
      if (token) headers.Authorization = `Bearer ${token}`;
      const resp = await fetch(url, { headers });
      if (!resp.ok) throw new Error('Falha ao atualizar histórico');
      const data = await resp.json();
      setOrdersLocal(Array.isArray(data) ? data : []);
    } catch (e) {
      console.error('[AllOrdersPage] refresh erro:', e);
    } finally {
      setRefreshing(false);
    }
  }

  // KPIs sobre scopedDataset
  const kpiData: KpiData[] = [
    {
      title: 'Total de Pedidos',
      value: scopedDataset.length,
      subtitle: isAdmin
        ? (selectedSetorId ? `Filtrados por: ${selectedSetorId}` : 'Global')
        : (userUnitName ? `Unidade: ${userUnitName}` : 'Sua unidade')
    },
    {
      title: 'Valor Aprovado',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        scopedDataset
          .filter((o: any) => o.status === 1)
          .reduce((sum: number, o: any) => sum + (Number(o.valorTotal) || 0), 0)
      ),
      subtitle: 'Soma aprovados'
    },
    {
      title: 'Taxa de Reprovação',
      value: `${
        scopedDataset.length > 0
          ? (
              (scopedDataset.filter((o: any) => o.status === 2).length / scopedDataset.length) *
              100
            ).toFixed(1)
          : 0
      }%`,
      subtitle: 'Reprovados / total'
    },
    {
      title: 'Pedidos Pendentes',
      value: scopedDataset.filter((o: any) => o.status === 5).length,
      subtitle: 'Aguardando análise'
    }
  ];

  // Modal de detalhes
  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const openDetails = (order: any) => { setSelectedOrder(order); setShowModal(true); };

  // Paginação da tabela (sobre scopedDataset)
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  useEffect(() => {
    setCurrentPage(1); // reset quando muda o escopo global
  }, [selectedSetorId, userUnitName, isAdmin]);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Carregando histórico de pedidos...</div>;

  return (
    <div className="space-y-6 p-8 bg-gray-50 min-h-screen">
      {/* Header superior */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <h1 className="text-3xl font-bold text-gray-800">Histórico de Pedidos</h1>
          {!isAdmin && userUnitName && (
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
              Escopo: {userUnitName}
            </span>
          )}
          {isAdmin && selectedSetorId && (
            <span className="text-xs px-2 py-1 rounded bg-blue-50 text-blue-700">
              Filtro global: {selectedSetorId}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          {/* Período */}
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Período</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              disabled={refreshing}
            >
              <option value="30">Últimos 30 dias (recomendado)</option>
              <option value="45">Últimos 45 dias</option>
            </select>
          </div>

          {/* Botão Atualizar */}
          <button
            onClick={refreshOrdersTable}
            disabled={!!refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Atualizar histórico"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>

          {/* Popover filtros (unidade global) só para Admin */}
          {isAdmin && (
            <FiltersButton
              showFilters={showFilters}
              setShowFilters={setShowFilters}
              selectedSetorId={selectedSetorId}
              setSelectedSetorId={setSelectedSetorId}
              setores={(setores || []) as any}
              disabled={refreshing}
            />
          )}
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => <KpiCard key={index} data={kpi} />)}
      </div>

      {/* Tabela (com filtro local de unidade para admin) */}
      <OrdersHistoryTable
        orders={scopedDataset}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        onRowClick={openDetails}
        showUnitFilter={isAdmin} // EXACTAMENTE como no painel
      />

      <OrderDetailsModal open={showModal} order={selectedOrder} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default AllOrdersPage;