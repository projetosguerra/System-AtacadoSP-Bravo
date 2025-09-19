import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDown, DollarSign, Edit, ShoppingCart, History } from 'lucide-react';
import { useData } from '../context/DataContext';
import EditLimitModal from '../components/EditLimitModal';
import { Setor } from '../types';
import { KpiData } from '../types';
import KpiCard from '../components/KpiCard';

interface LimitHistory {
    DATA_ALT: string;
    VALOR_ANT: number;
    NOVO_VALOR: number;
    PRIMEIRO_NOME: string;
}

interface SectorOrder {
    NUMPEDRCA: number;
    DATA: string;
    SOLICITANTE: string;
    QTD_ITENS: number;
    VALOR_TOTAL: number;
}

const FinancialControlPage: React.FC = () => {
    const { setores, financialData, isLoading, updateSetorLimit /*, refreshFinancialData? */ } = useData();
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null);
    // Estados para a tabela
    const [limitHistory, setLimitHistory] = useState<LimitHistory[]>([]);
    const [sectorOrders, setSectorOrders] = useState<SectorOrder[]>([]);
    const [isHistoryLoading, setHistoryLoading] = useState<boolean>(false);

    const fetchDataForSetor = useCallback(async () => {
        if (!selectedSetor) {
            setLimitHistory([]);
            setSectorOrders([]);
            return;
        }
        setHistoryLoading(true);
        try {
            const codsetor = selectedSetor.CODSETOR;
            const [historyRes, ordersRes] = await Promise.all([
                fetch(`/api/setores/${codsetor}/historico`),
                fetch(`/api/setores/${codsetor}/pedidos`)
            ]);

            const historyData = await historyRes.json();
            const ordersData = await ordersRes.json();

            if (Array.isArray(historyData)) {
                setLimitHistory(historyData);
            } else {
                console.error("API de histórico não retornou um array:", historyData);
                setLimitHistory([]);
            }

            if (Array.isArray(ordersData)) {
                setSectorOrders(ordersData);
            } else {
                console.error("API de pedidos do setor não retornou um array:", ordersData);
                setSectorOrders([]);
            }
        } catch (error) {
            console.error("Erro ao buscar dados do setor:", error);
            setLimitHistory([]);
            setSectorOrders([]);
        } finally {
            setHistoryLoading(false);
        }
    }, [selectedSetor]);

    useEffect(() => {
        fetchDataForSetor();
    }, [fetchDataForSetor]);

    const selectedData = useMemo(() => {
        if (!selectedSetor) return null;

        const setor = setores.find(s => String(s.CODSETOR) === String(selectedSetor.CODSETOR));
        if (!setor) return null;

        const gasto = financialData?.gastosPorSetor.find(g => g.CODSETOR === setor.CODSETOR)?.GASTO_TOTAL || 0;
        const limite = setor.SALDO || 0;
        const disponivel = limite - gasto;

        return { setor, gasto, limite, disponivel };
    }, [selectedSetor, setores, financialData]);

    const handleSetorChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const selected = setores.find(s => String(s.CODSETOR) === e.target.value) || null;
        setSelectedSetor(selected);
    };

    const handleEditLimit = (setor: Setor) => {
        setSelectedSetor(setor);
        setIsModalOpen(true);
    };

    const handleSaveLimit = async (newLimit: number) => {
        if (selectedSetor) {
            try {
                await updateSetorLimit(selectedSetor.CODSETOR, newLimit);
                await fetchDataForSetor();
            } catch (error) {
                console.error("Erro ao salvar o limite:", error);
            }
        }
    };

    if (isLoading) {
        return <div className="p-8 text-center text-gray-500">A carregar dados financeiros...</div>;
    }

    const kpiCards: KpiData[] = selectedData ? [
        { title: 'Limite Total', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedData.limite) },
        { title: 'Valor Gasto', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedData.gasto) },
        { title: 'Saldo Disponível', value: new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(selectedData.disponivel) }
    ] : [];

    return (
        <div className="p-8 bg-gray-50 min-h-screen">
            <h1 className="text-3xl font-bold text-gray-800 mb-6">Controle Financeiro por Secretaria</h1>
            <div className="relative mt-4 md:mt-0 w-full md:w-72">
                <select
                    value={selectedSetor ? String(selectedSetor.CODSETOR) : ""}
                    onChange={handleSetorChange}
                    className="w-full pl-4 pr-10 py-3 text-base border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
                >
                    <option value="">Selecione uma Secretaria...</option>
                    {setores.map((setor) => (
                        <option key={setor.CODSETOR} value={setor.CODSETOR}>
                            {setor.DESCRICAO}
                        </option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
            <main>
                {selectedData ? (
                    <div className="space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mt-6">
                            {kpiCards.map((kpi, index) => <KpiCard key={index} data={kpi} />)}
                        </div>

                        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
                            <div className="flex items-center justify-between">
                                <h3 className="text-lg font-medium text-gray-900">
                                    Histórico de Alterações de Limite
                                </h3>
                                <button
                                    onClick={() => handleEditLimit(selectedData.setor)}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200"
                                >
                                    <Edit className="w-4 h-4" />
                                    Editar Limite
                                </button>
                            </div>
                            {isHistoryLoading ? <p>A carregar detalhes...</p> : (
                                <div className="space-y-8">
                                    {/* Tabela de Histórico de Limites */}
                                    <div>
                                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                                            <History className="w-5 h-5" />
                                            <h4 className="font-semibold">Histórico de Alterações de Limite</h4>
                                        </div>
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Data</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Limite Anterior</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Limite Alterado</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Usuário</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {limitHistory.map((entry, index) => (
                                                    <tr key={index}>
                                                        <td className="px-4 py-3">{new Date(entry.DATA_ALT).toLocaleDateString('pt-BR')}</td>
                                                        <td className="px-4 py-3 text-red-600 font-medium">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.VALOR_ANT)}
                                                        </td>
                                                        <td className="px-4 py-3 text-green-600 font-medium">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(entry.NOVO_VALOR)}
                                                        </td>
                                                        <td className="px-4 py-3">{entry.PRIMEIRO_NOME}</td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {limitHistory.length === 0 && <p className="text-center text-gray-500 mt-2 py-4">Nenhum histórico de alterações encontrado.</p>}
                                    </div>

                                    {/* Tabela de Pedidos Aprovados */}
                                    <div>
                                        <div className="flex items-center gap-2 text-gray-600 mb-2">
                                            <ShoppingCart className="w-5 h-5" />
                                            <h4 className="font-semibold">Pedidos Aprovados do Setor</h4>
                                        </div>
                                        <table className="min-w-full text-sm">
                                            <thead className="bg-gray-50">
                                                <tr>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Pedido Nº</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Data</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Solicitante</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Qtd. Itens</th>
                                                    <th className="px-4 py-2 text-left font-medium text-gray-500">Valor Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="bg-white divide-y divide-gray-200">
                                                {sectorOrders.map(order => (
                                                    <tr key={order.NUMPEDRCA}>
                                                        <td className="px-4 py-3 font-medium">#{order.NUMPEDRCA}</td>
                                                        <td className="px-4 py-3">{new Date(order.DATA).toLocaleDateString('pt-BR')}</td>
                                                        <td className="px-4 py-3">{order.SOLICITANTE}</td>
                                                        <td className="px-4 py-3">{order.QTD_ITENS}</td>
                                                        <td className="px-4 py-3 text-green-600 font-medium">
                                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(order.VALOR_TOTAL)}
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                        {sectorOrders.length === 0 && <p className="text-center text-gray-500 mt-2 py-4">Nenhum pedido aprovado encontrado para este setor.</p>}
                                    </div>
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="text-center text-gray-500 py-20">
                        <DollarSign className="mx-auto w-12 h-12 text-gray-400 mb-4" />
                        <h3 className="text-lg font-medium">Selecione uma Unidade Administrativa</h3>
                        <p>Escolha uma unidade no seletor acima para visualizar as suas informações financeiras.</p>
                    </div>
                )}
            </main>

            {isModalOpen && (
                <EditLimitModal
                    isOpen={isModalOpen}
                    setor={selectedSetor}
                    onClose={() => setIsModalOpen(false)}
                    onSave={handleSaveLimit}
                />
            )}
        </div>
    );
};

export default FinancialControlPage;