import React, { useState, useMemo, useEffect } from 'react';
import KpiCard from '../components/KpiCard';
import OrdersHistoryTable from '../components/OrdersHistoryTable';
import { KpiData } from '../types';
import { useData } from '../context/DataContext';

const AllOrdersPage: React.FC = () => {
  const { orders, isLoading } = useData();

  const [ordersLocal, setOrdersLocal] = useState(orders || []);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => setOrdersLocal(orders || []), [orders]);

  const [searchTerm, setSearchTerm] = useState<string>('');
  const [filterStatus, setFilterStatus] = useState<string>('todos');
  const [currentPage, setCurrentPage] = useState<number>(1);
  const itemsPerPage = 10;

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus]);

  const filteredOrders = useMemo(() => {
    const term = searchTerm.toLowerCase().trim();
    return (ordersLocal || [])
      .filter(o => filterStatus === 'todos' || String(o.status) === filterStatus)
      .filter(o =>
        term
          ? Object.values(o).some(v => String(v ?? '').toLowerCase().includes(term))
          : true
      );
  }, [ordersLocal, searchTerm, filterStatus]);

  async function refreshOrdersTable() {
    setRefreshing(true);
    try {
      const resp = await fetch('/api/pedidos/historico?days=45&maxrows=400', { headers: { 'Cache-Control': 'no-cache' } });
      if (!resp.ok) throw new Error('Falha ao atualizar histórico');
      const data = await resp.json();
      setOrdersLocal(Array.isArray(data) ? data : []);
    } catch (e) {
    } finally {
      setRefreshing(false);
    }
  }

  const kpiData: KpiData[] = [
    {
      title: 'Total de Pedidos',
      value: filteredOrders.length,
      subtitle: 'Todos os pedidos no histórico',
    },
    {
      title: 'Valor Aprovado',
      value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
        filteredOrders
          .filter(o => o.status === 1)
          .reduce((sum, o) => sum + (Number(o.valorTotal) || 0), 0)
      ),
      subtitle: 'Soma dos pedidos aprovados',
    },
    {
      title: 'Taxa de Reprovação',
      value: `${
        filteredOrders.length > 0
          ? ((filteredOrders.filter(o => o.status === 2).length / filteredOrders.length) * 100).toFixed(1)
          : 0
      }%`,
      subtitle: 'Percentual de pedidos rejeitados',
    },
    {
      title: 'Pedidos Pendentes',
      value: filteredOrders.filter(o => o.status === 5).length,
      subtitle: 'Aguardando análise',
    },
  ];

  if (isLoading) {
    return <div className="p-8 text-center text-gray-500">Carregando histórico de pedidos...</div>;
  }

  return (
    <div className="space-y-6 p-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800">Histórico de Pedidos</h1>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {kpiData.map((kpi, index) => (
          <KpiCard key={index} data={kpi} />
        ))}
      </div>

      <OrdersHistoryTable
        orders={filteredOrders}
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        filterStatus={filterStatus}
        onFilterChange={setFilterStatus}
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        totalPages={Math.ceil(filteredOrders.length / itemsPerPage)}
        totalOrders={filteredOrders.length}
        itemsPerPage={itemsPerPage}
        refreshing={refreshing}
        onRefresh={refreshOrdersTable}
      />
    </div>
  );
};

export default AllOrdersPage;