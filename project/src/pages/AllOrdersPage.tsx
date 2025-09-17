import React, { useState, useMemo } from 'react';
import KpiCard from '../components/KpiCard';
import OrdersHistoryTable from '../components/OrdersHistoryTable';
import { KpiData } from '../types';
import { useData } from '../context/DataContext';

const AllOrdersPage: React.FC = () => {
    const { orders, isLoading } = useData();
    const [searchTerm, setSearchTerm] = useState<string>('');
    const [filterStatus, setFilterStatus] = useState<string>('todos');
    const [currentPage, setCurrentPage] = useState<number>(1);
    const itemsPerPage = 10;

    const filteredOrders = useMemo(() => {
        return orders
            .filter(order => filterStatus === 'todos' || String(order.status) === filterStatus)
            .filter(order => Object.values(order).some(value => String(value).toLowerCase().includes(searchTerm.toLowerCase())));
    }, [orders, searchTerm, filterStatus]);

    const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
    const paginatedOrders = filteredOrders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);

    const kpiData: KpiData[] = [
        { title: 'Total de Pedidos', value: filteredOrders.length, subtitle: 'Todos os pedidos no histórico' },
        {
            title: 'Valor Aprovado',
            value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(
                filteredOrders
                    .filter(o => o.status === 1) // Status 1 = Aprovado
                    .reduce((sum, o) => sum + o.valorTotal, 0)
            ),
            subtitle: 'Soma dos pedidos aprovados'
        },
        {
            title: 'Taxa de Reprovação',
            value: `${filteredOrders.length > 0 ?
                ((filteredOrders.filter(o => o.status === 2).length / filteredOrders.length) * 100).toFixed(1) : 0}%`, // Status 2 = Rejeitado
            subtitle: 'Percentual de pedidos rejeitados'
        },
        {
            title: 'Pedidos Pendentes',
            value: filteredOrders.filter(o => o.status === 5).length, // Status 5 = Pendente
            subtitle: 'Aguardando análise'
        }
    ];

    if (isLoading) return <div className="p-8 text-center text-gray-500">Carregando histórico de pedidos...</div>;

    return (
        <div className="space-y-6 p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800">Histórico de Pedidos</h1>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiData.map((kpi, index) => <KpiCard key={index} data={kpi} />)}
            </div>
            <OrdersHistoryTable
                orders={paginatedOrders}
                searchTerm={searchTerm}
                onSearchChange={setSearchTerm}
                filterStatus={filterStatus}
                onFilterChange={setFilterStatus}
                currentPage={currentPage}
                totalPages={totalPages}
                onPageChange={setCurrentPage}
                totalOrders={filteredOrders.length}
                itemsPerPage={itemsPerPage}
            />
        </div>
    );
};

export default AllOrdersPage;