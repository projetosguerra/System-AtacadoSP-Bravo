import { useState, useEffect } from 'react';
import KpiCard from '../components/KpiCard';
import PendingOrdersTable from '../components/PendingOrdersTable';
import { KpiData, PedidoPendente } from '../types';

const ApprovalPanelPage = () => {
    const [pedidos, setPedidos] = useState<PedidoPendente[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchPedidos = async () => {
            setIsLoading(true);
            try {
                const response = await fetch('/api/pedidos/pendentes');
                if (!response.ok) {
                    throw new Error('Falha ao buscar os pedidos pendentes da API.');
                }
                const data: PedidoPendente[] = await response.json();
                setPedidos(data);
            } catch (err: any) {
                setError(err.message);
            } finally {
                setIsLoading(false);
            }
        };

        fetchPedidos();
    }, []);

    const totalPedidos = pedidos.length;
    const totalValue = pedidos.reduce((sum, pedido) => sum + pedido.valor, 0);
    
    const kpiData: KpiData[] = [
        {
            title: 'Pedidos Pendentes',
            value: isLoading ? '...' : totalPedidos,
            subtitle: 'Aguardando sua análise',
        },
        {
            title: 'Valor Total Pendente',
            value: isLoading ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue),
            subtitle: 'Soma de todos os pedidos',
        },
        {
            title: 'Pedidos Hoje',
            value: isLoading ? '...' : pedidos.filter(p => new Date(p.data).toDateString() === new Date().toDateString()).length,
            subtitle: 'Recebidos nas últimas 24h',
        },
        {
            title: 'Ticket Médio',
            value: isLoading || totalPedidos === 0 ? '...' : new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalValue / totalPedidos),
            subtitle: 'Valor médio por pedido',
        }
    ];

    return (
        <div className="space-y-8 p-8 bg-gray-50 min-h-full">
            <h1 className="text-3xl font-bold text-gray-800">Painel de Aprovação</h1>
            
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiData.map((kpi, index) => (
                    <KpiCard key={index} data={kpi} />
                ))}
            </div>

            {/* Tabela de Pedidos */}
            <div className="bg-white rounded-lg shadow-md border border-gray-200">
                {isLoading && <div className="p-8 text-center text-gray-600">Carregando pedidos...</div>}
                {error && <div className="p-8 text-center text-red-600">Erro: {error}</div>}
                {!isLoading && !error && (
                    <PendingOrdersTable pedidos={pedidos} />
                )}
            </div>
        </div>
    );
};

export default ApprovalPanelPage;
