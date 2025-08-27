import React, { useState } from 'react';
import { ChevronDown, FileText, TrendingDown, DollarSign, Edit } from 'lucide-react';
import { UnitFinancials } from '../types';
import { mockFinancialData } from '../data/mockFinancials';
import EditLimitModal from '../components/EditLimitModal.tsx';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';

const FinancialControlPage: React.FC = () => {
    const [selectedUnit, setSelectedUnit] = useState<UnitFinancials | null>(null);
    const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
    const [financialData, setFinancialData] = useState<UnitFinancials[]>(mockFinancialData);

    const handleUnitChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const unitId = e.target.value;
        if (unitId === '') {
            setSelectedUnit(null);
        } else {
            const unit = financialData.find(u => u.id === unitId);
            setSelectedUnit(unit || null);
        }
    };

    const handleSaveLimit = (newLimit: number) => {
        if (!selectedUnit) return;

        const updatedData = financialData.map(unit => {
            if (unit.id === selectedUnit.id) {
                const newHistoryEntry = {
                    data: new Date().toLocaleDateString('pt-BR'),
                    valorAnterior: unit.limiteTotal,
                    novoValor: newLimit,
                    alteradoPor: 'Pietro Guerra'
                };

                const updatedUnit = {
                    ...unit,
                    limiteTotal: newLimit,
                    saldoDisponivel: newLimit - unit.valorGasto,
                    historico: [newHistoryEntry, ...unit.historico]
                };

                setSelectedUnit(updatedUnit);
                return updatedUnit;
            }
            return unit;
        });

        setFinancialData(updatedData);
    };

    const formatCurrency = (value: number) => {
        return new Intl.NumberFormat('pt-BR', {
            style: 'currency',
            currency: 'BRL'
        }).format(value);
    };

    return (
        <div className="space-y-6">
            <main className="flex-1 overflow-x-hidden overflow-y-auto p-6">
                {/* Unit Selection */}
                <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                    <h2 className="text-lg font-semibold text-gray-900 mb-4">
                        Selecione uma Unidade Administrativa para começar
                    </h2>

                    <div className="relative max-w-md">
                        <select
                            value={selectedUnit?.id || ''}
                            onChange={handleUnitChange}
                            className="w-full appearance-none bg-white border border-gray-300 rounded-lg px-4 py-3 pr-10 text-gray-900 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        >
                            <option value="">Unidade Administrativa</option>
                            {financialData.map(unit => (
                                <option key={unit.id} value={unit.id}>
                                    {unit.nome}
                                </option>
                            ))}
                        </select>
                        <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5 pointer-events-none" />
                    </div>
                </div>

                {/* Financial Summary Cards */}
                {selectedUnit && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Limite Total Card */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200 relative">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                                    <FileText className="w-6 h-6 text-green-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                                {formatCurrency(selectedUnit.limiteTotal)}
                            </div>
                            <div className="text-sm text-gray-600 mb-4">Limite Total</div>
                            <button
                                onClick={() => setIsModalOpen(true)}
                                className="flex items-center gap-2 text-blue-600 hover:text-blue-800 text-sm font-medium transition-colors"
                            >
                                <Edit className="w-4 h-4" />
                                Editar Limite
                            </button>
                        </div>

                        {/* Valor Gasto Card */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-red-100 rounded-lg flex items-center justify-center">
                                    <TrendingDown className="w-6 h-6 text-red-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                                {formatCurrency(selectedUnit.valorGasto)}
                            </div>
                            <div className="text-sm text-gray-600">Valor Gasto</div>
                        </div>

                        {/* Saldo Disponível Card */}
                        <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                            <div className="flex items-center justify-between mb-4">
                                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <DollarSign className="w-6 h-6 text-blue-600" />
                                </div>
                            </div>
                            <div className="text-3xl font-bold text-gray-900 mb-2">
                                {formatCurrency(selectedUnit.saldoDisponivel)}
                            </div>
                            <div className="text-sm text-gray-600">Saldo Disponível</div>
                        </div>
                    </div>
                )}

                {/* History Table */}
                {selectedUnit && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
                        <div className="px-6 py-4 border-b border-gray-200">
                            <h2 className="text-lg font-semibold text-gray-900">Tabela de Histórico</h2>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full">
                                <thead className="bg-gray-50 border-b border-gray-200">
                                    <tr>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Data da alteração
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Valor Anterior
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Novo valor do limite
                                        </th>
                                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                                            Alterado por
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {selectedUnit.historico.map((entry, index) => (
                                        <tr key={index} className="hover:bg-gray-50 transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                                {entry.data}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                                                {formatCurrency(entry.valorAnterior)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                                                {formatCurrency(entry.novoValor)}
                                            </td>
                                            <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                                                {entry.alteradoPor}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>

                        {selectedUnit.historico.length === 0 && (
                            <div className="px-6 py-8 text-center text-gray-500">
                                Nenhum histórico de alterações encontrado para esta unidade.
                            </div>
                        )}
                    </div>
                )}

                {/* Empty State */}
                {!selectedUnit && (
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
                        <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                            <DollarSign className="w-8 h-8 text-gray-400" />
                        </div>
                        <h3 className="text-lg font-medium text-gray-900 mb-2">
                            Selecione uma Unidade Administrativa
                        </h3>
                        <p className="text-gray-500">
                            Escolha uma unidade no seletor acima para visualizar suas informações financeiras e histórico de alterações.
                        </p>
                    </div>
                )}

                {/* Edit Limit Modal */}
                <EditLimitModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    unit={selectedUnit}
                    onSave={handleSaveLimit}
                />
            </main>
        </div>
    );
};

export default FinancialControlPage;