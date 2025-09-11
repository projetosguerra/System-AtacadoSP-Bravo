import { RefreshCw } from 'lucide-react';
import KpiCard from '../components/KpiCard';
import PendingOrdersTable from '../components/PendingOrdersTable';
import { KpiData } from '../types';
import { useData } from '../context/DataContext';

const ApprovalPanelPage = () => {
    const { pedidosPendentes, isLoading, refetchAllData } = useData();
    const totalPedidos = pedidosPendentes.length;
    const totalValue = pedidosPendentes.reduce((sum, pedido) => sum + pedido.valor, 0);
    const newOrdersToday = pedidosPendentes.filter(p => new Date(p.data).toDateString() === new Date().toDateString()).length;

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
            value: isLoading ? '...' : newOrdersToday,
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
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold text-gray-800">Painel de Aprovação</h1>
                <button 
                    onClick={() => refetchAllData()}
                    disabled={isLoading}
                    className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors disabled:opacity-50"
                >
                    <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
                    Atualizar
                </button>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                {kpiData.map((kpi, index) => <KpiCard key={index} data={kpi} />)}
            </div>

            <div className="bg-white rounded-lg shadow-md border border-gray-200">
                {isLoading && <div className="p-8 text-center text-gray-600">A carregar pedidos...</div>}
                {!isLoading && <PendingOrdersTable pedidos={pedidosPendentes} />}
            </div>
        </div>
    );
};

export default ApprovalPanelPage;