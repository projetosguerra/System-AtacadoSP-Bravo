import React, { useState, useMemo, useEffect } from 'react';
import KpiCard from '../components/KpiCard';
import OrdersHistoryTable from '../components/OrdersHistoryTable';
import { KpiData } from '../types';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import OrderDetailsModal from '../components/OrderDetailsModal';
import { RefreshCw } from 'lucide-react';

const AllOrdersPage: React.FC = () => {
  const { orders, isLoading, setores } = useData() as any;
  const { user } = useAuth();

  const [ordersLocal, setOrdersLocal] = useState(orders || []);
  const [refreshing, setRefreshing] = useState(false);
  useEffect(() => setOrdersLocal(orders || []), [orders]);

  const [days, setDays] = useState<number>(30);

  const userUnitName = useMemo(() => {
    const direct = String(user?.setor ?? '').trim();
    if (direct) return direct;
    const byCode = (setores || []).find((s: any) => Number(s.CODSETOR) === Number(user?.codSetor));
    return String(byCode?.DESCRICAO ?? '').trim();
  }, [user?.setor, user?.codSetor, setores]);

  const pageDataset = useMemo(() => {
    if (!userUnitName) return ordersLocal || []; // fallback: sem nome, não filtra
    return (ordersLocal || []).filter((o: { setor?: string }) => String(o.setor ?? '').trim() === userUnitName);
  }, [ordersLocal, userUnitName]);

  async function refreshOrdersTable() {
    setRefreshing(true);
    try {
      const url = `/api/pedidos/historico?days=${days}&maxrows=400`;
      const resp = await fetch(url, { headers: { 'Cache-Control': 'no-cache' } });
      if (!resp.ok) throw new Error('Falha ao atualizar histórico');
      const data = await resp.json();
      setOrdersLocal(Array.isArray(data) ? data : []);
    } finally {
      setRefreshing(false);
    }
  }

  const kpiData: KpiData[] = [
    { title: 'Total de Pedidos', value: pageDataset.length, subtitle: userUnitName ? `Unidade: ${userUnitName}` : 'Sua unidade' },
    {
      title: 'Valor Aprovado',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        pageDataset.filter((o: any) => o.status === 1).reduce((sum: number, o: any) => sum + (Number(o.valorTotal) || 0), 0)
      ),
      subtitle: 'Soma dos pedidos aprovados',
    },
    {
      title: 'Taxa de Reprovação',
      value: `${
        pageDataset.length > 0
          ? ((pageDataset.filter((o: any) => o.status === 2).length / pageDataset.length) * 100).toFixed(1)
          : 0
      }%`,
      subtitle: 'Pedidos reprovados / total',
    },
    { title: 'Pedidos Pendentes', value: pageDataset.filter((o: any) => o.status === 5).length, subtitle: 'Aguardando análise' },
  ];

  const [selectedOrder, setSelectedOrder] = useState<any | null>(null);
  const [showModal, setShowModal] = useState(false);
  const openDetails = (order: any) => { setSelectedOrder(order); setShowModal(true); };

  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;
  useEffect(() => { setCurrentPage(1); }, [userUnitName]);

  if (isLoading) return <div className="p-8 text-center text-gray-500">Carregando histórico de pedidos...</div>;

  return (
    <div className="space-y-6 p-8 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div className="flex items-center gap-3">
          <h1 className="text-3xl font-bold text-gray-800">Histórico de Pedidos</h1>
          {userUnitName && (
            <span className="text-xs px-2 py-1 rounded bg-gray-100 text-gray-700">
              Escopo: {userUnitName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Período</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={String(days)}
              onChange={(e) => setDays(Number(e.target.value))}
              title="Janela de dias para atualizar histórico"
            >
              <option value="30">Últimos 30 dias (recomendado)</option>
              <option value="45">Últimos 45 dias</option>
            </select>
          </div>

          <button
            onClick={refreshOrdersTable}
            disabled={!!refreshing}
            className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
            title="Atualizar histórico"
          >
            <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (<KpiCard key={index} data={kpi} />))}
      </div>

      {/* Tabela */}
      <OrdersHistoryTable
        orders={pageDataset}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        itemsPerPage={itemsPerPage}
        onRowClick={openDetails}
        showUnitFilter={false}
      />

      <OrderDetailsModal open={showModal} order={selectedOrder} onClose={() => setShowModal(false)} />
    </div>
  );
};

export default AllOrdersPage;