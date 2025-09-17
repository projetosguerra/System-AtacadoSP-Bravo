import React, { useState, useMemo } from 'react';
import { ChevronDown, DollarSign, Edit } from 'lucide-react';
import { useData } from '../context/DataContext';
import EditLimitModal from '../components/EditLimitModal';
import { Setor } from '../types';
import { KpiData } from '../types';
import KpiCard from '../components/KpiCard';

const FinancialControlPage: React.FC = () => {
    const { setores, financialData, isLoading, updateSetorLimit } = useData();

    const [isModalOpen, setIsModalOpen] = useState(false);

    const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null);

    const selectedData = useMemo(() => {
        if (!selectedSetor) return null;

        // 1. CORREÇÃO: Usar 'CODSETOR' (maiúsculo) para a comparação
        const setor = setores.find(s => String(s.CODSETOR) === String(selectedSetor.CODSETOR));
        if (!setor) return null;

        const gasto = financialData?.gastosPorSetor.find(g => g.CODSETOR === setor.CODSETOR)?.GASTO_TOTAL || 0;
        // 2. CORREÇÃO: Usar 'SALDO' (maiúsculo) para o limite
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
                setIsModalOpen(false);
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
                                    onClick={() => { setIsModalOpen(true); handleEditLimit(selectedData.setor); }}
                                    className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-100 rounded-lg hover:bg-blue-200"
                                >
                                    <Edit className="w-4 h-4" />
                                    Editar Limite
                                </button>
                            </div>
                            {/* Aqui pode ser implementada a tabela de histórico no futuro */}
                            <div className="mt-4 text-center text-gray-500">
                                (A tabela com o histórico de alterações será implementada aqui)
                            </div>
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