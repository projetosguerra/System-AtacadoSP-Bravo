import React from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import KpiCard from '../components/KpiCard';
import PendingOrdersTable from '../components/PendingOrdersTable';
import { mockPedidos } from '../data/mockPedidos';
import { KpiData } from '../types';

const ApprovalPanelPage = () => {
    const totalPedidos = mockPedidos.length;
    const totalValue = mockPedidos.reduce((sum, pedido) => sum + pedido.valor, 0);
    const newOrdersToday = mockPedidos.filter(pedido => pedido.data === '21/08/2025').length;

    const kpiData: KpiData[] = [
        {
            title: 'Pedidos Pendentes',
            value: totalPedidos,
            subtitle: 'Aguardando aprovação',
            trend: 'up',
            trendValue: '+12%'
        },
        {
            title: 'Valor Total Aprovado',
            value: new Intl.NumberFormat('pt-BR', {
                style: 'currency',
                currency: 'BRL',
                minimumFractionDigits: 0,
                maximumFractionDigits: 0
            }).format(totalValue),
            subtitle: 'Este mês',
            trend: 'up',
            trendValue: '+8%'
        },
        {
            title: 'Novos Pedidos',
            value: newOrdersToday,
            subtitle: 'Hoje',
            trend: 'neutral',
            trendValue: '0%'
        },
        {
            title: 'Contestações Abertas',
            value: 3,
            subtitle: 'Requer atenção',
            trend: 'down',
            trendValue: '-25%'
        }
    ];

    return (
        <div className="space-y-6">
            <main className="flex-1 overflow-x-hidden overflow-y-auto">
                {/* KPI Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                    {kpiData.map((kpi, index) => (
                        <KpiCard key={index} data={kpi} />
                    ))}
                </div>

                {/* Pending Orders Table */}
                <PendingOrdersTable pedidos={mockPedidos} />
            </main>
        </div>
    );
};

export default ApprovalPanelPage;