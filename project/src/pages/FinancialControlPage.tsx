import React, { useState, useMemo, useEffect, useCallback } from 'react';
import { ChevronDown, DollarSign, Edit, ShoppingCart, History } from 'lucide-react';
import { useData } from '../context/DataContext';
import EditLimitModal from '../components/EditLimitModal';
import { Setor } from '../types';
import { KpiData } from '../types';
import KpiCard from '../components/KpiCard';
import { useAuth } from '../context/AuthContext';

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

type ViewMode = 'ONE' | 'ALL';

const FinancialControlPage: React.FC = () => {
  const { setores, financialData, isLoading, updateSetorLimit } = useData();
  const { user } = useAuth();

  const isAdmin = user?.perfil === 'Admin';
  const isAprovador = user?.perfil === 'Aprovador';

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedSetor, setSelectedSetor] = useState<Setor | null>(null);
  const [limitHistory, setLimitHistory] = useState<LimitHistory[]>([]);
  const [sectorOrders, setSectorOrders] = useState<SectorOrder[]>([]);
  const [isHistoryLoading, setHistoryLoading] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<ViewMode>('ONE');

  // Utilidades de formatação
  const formatDate = (value: string) => {
    const d = new Date(value);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('pt-BR');
  };
  const formatTime = (value: string) => {
    const d = new Date(value);
    if (isNaN(d. getTime())) return '—';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  const currency = (v: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v || 0);

  // Auto-seleciona setor do aprovador
  useEffect(() => {
    if (setores.length === 0) return;
    if (isAprovador) {
      const s = setores.find(st => Number(st.CODSETOR) === Number(user?.codSetor)) || null;
      setSelectedSetor(s);
      setViewMode('ONE');
    }
  }, [setores, isAprovador, user?.codSetor]);

  const fetchDataForSetor = useCallback(async () => {
    if (viewMode === 'ALL' || ! selectedSetor) {
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

      const historyData = await historyRes. json();
      const ordersData = await ordersRes.json();

      setLimitHistory(Array.isArray(historyData) ? historyData : []);
      setSectorOrders(Array. isArray(ordersData) ?  ordersData : []);
    } catch (error) {
      console.error('Erro ao buscar dados do setor:', error);
      setLimitHistory([]);
      setSectorOrders([]);
    } finally {
      setHistoryLoading(false);
    }
  }, [selectedSetor, viewMode]);

  useEffect(() => {
    fetchDataForSetor();
  }, [fetchDataForSetor]);

  // Visão agregada (usa dados do endpoint financeiro global)
  const allUnitsRows = useMemo(() => {
    return (setores || []).map((s) => {
      const gasto = financialData?. gastosPorSetor. find(g => String(g.CODSETOR) === String(s.CODSETOR))?.GASTO_TOTAL || 0;
      const limite = s.SALDO || 0;
      const disponivel = limite - gasto;
      return {
        codsetor: s. CODSETOR,
        descricao: s.DESCRICAO,
        limite,
        gasto,
        disponivel
      };
    });
  }, [setores, financialData]);

  const allUnitsTotals = useMemo(() => {
    const totalLimite = (setores || []).reduce((acc, s) => acc + (s.SALDO || 0), 0);
    const totalGasto = (financialData?. gastosPorSetor || []).reduce((acc, g: any) => acc + (g. GASTO_TOTAL || 0), 0);
    const totalDisp = totalLimite - totalGasto;
    return { totalLimite, totalGasto, totalDisp };
  }, [setores, financialData]);

  const selectedData = useMemo(() => {
    if (!selectedSetor) return null;
    const setorRef = setores.find(s => String(s.CODSETOR) === String(selectedSetor.CODSETOR));
    if (!setorRef) return null;

    const gastoReal = sectorOrders.reduce(
      (sum, o) => sum + Number(o.VALOR_TOTAL || 0),
      0
    );

    const limite = setorRef.SALDO || 0;
    let disponivel = limite - gastoReal;
    if (disponivel < 0) disponivel = 0;

    return { setor: setorRef, gasto: gastoReal, limite, disponivel };
  }, [selectedSetor, setores, sectorOrders]);

  const handleSetorChange = (e: React. ChangeEvent<HTMLSelectElement>) => {
    const value = e.target.value;
    if (value === 'ALL') {
      setSelectedSetor(null);
      setViewMode('ALL');
      return;
    }
    const selected = setores.find(s => String(s.CODSETOR) === value) || null;
    setSelectedSetor(selected);
    setViewMode('ONE');
  };

  const handleEditLimit = (setor: Setor) => {
    if (!isAdmin) return;
    setSelectedSetor(setor);
    setViewMode('ONE');
    setIsModalOpen(true);
  };

  const handleSaveLimit = async (newLimit: number) => {
    if (selectedSetor) {
      try {
        await updateSetorLimit(selectedSetor.CODSETOR, newLimit);
        await fetchDataForSetor();
      } catch (error) {
        console.error('Erro ao salvar o limite:', error);
      }
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando dados financeiros...</p>
        </div>
      </div>
    );
  }

  const kpiCardsAll: KpiData[] = [
    { title: 'Limite Total (Todas as Unidades)', value: currency(allUnitsTotals.totalLimite) },
    { title: 'Valor Gasto (Todas as Unidades)', value: currency(allUnitsTotals.totalGasto) },
    { title: 'Saldo Disponível (Todas as Unidades)', value: currency(allUnitsTotals.totalDisp) }
  ];

  const kpiCardsSelected: KpiData[] = selectedData ? [
    { title: 'Limite Total', value: currency(selectedData.limite) },
    { title: 'Valor Gasto', value: currency(selectedData. gasto) },
    { title: 'Saldo Disponível', value: currency(selectedData.disponivel) }
  ] : [];

  if (isAprovador && !selectedSetor) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center bg-white rounded-lg shadow-sm border border-gray-200 p-8 max-w-md">
          <DollarSign className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Unidade Não Encontrada</h2>
          <p className="text-sm text-gray-600">
            Sua unidade administrativa não foi localizada. Entre em contato com o administrador do sistema.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 overflow-x-hidden bg-gray-50">
      <div className="w-full space-y-6">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">
            Controle Financeiro por Unidade Administrativa
          </h1>

          {isAdmin && (
            <div className="relative w-full sm:w-auto sm:min-w-[280px] lg:min-w-[320px]">
              <select
                value={viewMode === 'ALL' ? 'ALL' : (selectedSetor ? String(selectedSetor.CODSETOR) : '')}
                onChange={handleSetorChange}
                className="w-full pl-4 pr-10 py-3 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none bg-white"
              >
                <option value="">Selecione uma Unidade... </option>
                <option value="ALL">Todas as Unidades Administrativas</option>
                {setores.map((setor) => (
                  <option key={setor.CODSETOR} value={setor.CODSETOR}>
                    {setor.CODSETOR} - {setor. DESCRICAO}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Content */}
        {viewMode === 'ALL' && isAdmin ?  (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {kpiCardsAll.map((kpi, index) => <KpiCard key={index} data={kpi} />)}
            </div>

            {/* Tabela de Todas as Unidades */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 lg:p-6">
              <h3 className="text-base lg:text-lg font-semibold text-gray-900 mb-5">
                Resumo Financeiro — Todas as Unidades Administrativas
              </h3>
              <div className="overflow-x-auto -mx-5 sm:mx-0">
                <div className="inline-block min-w-full align-middle">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Unidade Administrativa
                        </th>
                        <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                          Limite Total
                        </th>
                        <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                          Valor Gasto
                        </th>
                        <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                          Saldo Disponível
                        </th>
                        <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                          Ações
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {allUnitsRows.map(row => (
                        <tr key={row.codsetor} className="hover:bg-gray-50 transition-colors">
                          <td className="px-4 lg:px-6 py-4 text-sm text-gray-900">
                            <span className="font-medium">{row.codsetor}</span> - {row.descricao}
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-gray-900 whitespace-nowrap">
                            {currency(row.limite)}
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-orange-600 whitespace-nowrap">
                            {currency(row.gasto)}
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm font-semibold text-green-600 whitespace-nowrap">
                            {currency(row.disponivel)}
                          </td>
                          <td className="px-4 lg:px-6 py-4 text-sm whitespace-nowrap">
                            <button
                              className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
                              onClick={() => {
                                const s = setores.find(ss => ss.CODSETOR === row. codsetor) || null;
                                setSelectedSetor(s);
                                setViewMode('ONE');
                              }}
                            >
                              Ver detalhes
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50 border-t-2 border-gray-300">
                      <tr>
                        <td className="px-4 lg:px-6 py-4 text-sm font-bold text-gray-900">Totais</td>
                        <td className="px-4 lg:px-6 py-4 text-sm font-bold text-gray-900 whitespace-nowrap">
                          {currency(allUnitsTotals.totalLimite)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm font-bold text-orange-600 whitespace-nowrap">
                          {currency(allUnitsTotals.totalGasto)}
                        </td>
                        <td className="px-4 lg:px-6 py-4 text-sm font-bold text-green-600 whitespace-nowrap">
                          {currency(allUnitsTotals. totalDisp)}
                        </td>
                        <td />
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>
            </div>
          </div>
        ) : selectedData ?  (
          <div className="space-y-6">
            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {kpiCardsSelected.map((kpi, index) => <KpiCard key={index} data={kpi} />)}
            </div>

            {/* Detalhes do Setor */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 lg:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-6">
                <h3 className="text-base lg:text-lg font-semibold text-gray-900">
                  Detalhes Financeiros da Unidade
                </h3>
                {isAdmin && (
                  <button
                    onClick={() => handleEditLimit(selectedData.setor)}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-medium text-blue-600 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors"
                  >
                    <Edit className="w-4 h-4" />
                    Editar Limite
                  </button>
                )}
              </div>

              {isHistoryLoading ? (
                <div className="text-center py-12">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
                  <p className="text-gray-600 text-sm">Carregando detalhes... </p>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Histórico de Alterações */}
                  <div>
                    <div className="flex items-center gap-2 text-gray-700 mb-4">
                      <History className="w-5 h-5" />
                      <h4 className="font-semibold text-base">Histórico de Alterações de Limite</h4>
                    </div>
                    <div className="overflow-x-auto -mx-5 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Data</th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Horário</th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Limite Anterior</th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Limite Alterado</th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Usuário</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {limitHistory.map((entry, index) => (
                              <tr key={index} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(entry.DATA_ALT)}</td>
                                <td className="px-4 py-3 text-sm font-mono text-gray-600 whitespace-nowrap">{formatTime(entry.DATA_ALT)}</td>
                                <td className="px-4 py-3 text-sm text-red-600 font-semibold whitespace-nowrap">
                                  {currency(entry.VALOR_ANT)}
                                </td>
                                <td className="px-4 py-3 text-sm text-green-600 font-semibold whitespace-nowrap">
                                  {currency(entry.NOVO_VALOR)}
                                </td>
                                <td className="px-4 py-3 text-sm text-gray-900">{entry.PRIMEIRO_NOME}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {limitHistory.length === 0 && (
                      <p className="text-center text-gray-500 text-sm py-8 bg-gray-50 rounded-lg mt-4">
                        Nenhum histórico de alterações encontrado.
                      </p>
                    )}
                  </div>

                  {/* Pedidos Aprovados */}
                  <div>
                    <div className="flex items-center gap-2 text-gray-700 mb-4">
                      <ShoppingCart className="w-5 h-5" />
                      <h4 className="font-semibold text-base">Pedidos Aprovados da Unidade Administrativa</h4>
                    </div>
                    <div className="overflow-x-auto -mx-5 sm:mx-0">
                      <div className="inline-block min-w-full align-middle">
                        <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                            <tr>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Pedido Nº</th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Data</th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Horário</th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Solicitante</th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Qtd. Itens</th>
                              <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Valor Total</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                            {sectorOrders.map(order => (
                              <tr key={order. NUMPEDRCA} className="hover:bg-gray-50 transition-colors">
                                <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">#{order.NUMPEDRCA}</td>
                                <td className="px-4 py-3 text-sm text-gray-900 whitespace-nowrap">{formatDate(order.DATA)}</td>
                                <td className="px-4 py-3 text-sm font-mono text-gray-600 whitespace-nowrap">{formatTime(order.DATA)}</td>
                                <td className="px-4 py-3 text-sm text-gray-900">{order.SOLICITANTE}</td>
                                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{order.QTD_ITENS}</td>
                                <td className="px-4 py-3 text-sm text-green-600 font-semibold whitespace-nowrap">
                                  {currency(order. VALOR_TOTAL)}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                    {sectorOrders.length === 0 && (
                      <p className="text-center text-gray-500 text-sm py-8 bg-gray-50 rounded-lg mt-4">
                        Nenhum pedido aprovado encontrado para esta unidade.
                      </p>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <DollarSign className="mx-auto w-16 h-16 text-gray-300 mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Selecione uma Unidade Administrativa</h3>
            <p className="text-gray-600 text-sm">Escolha uma unidade no seletor acima para visualizar as suas informações financeiras.</p>
          </div>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && selectedSetor && isAdmin && (
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