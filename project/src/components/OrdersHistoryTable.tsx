import React from 'react';
import { Search, Filter, ChevronLeft, ChevronRight } from 'lucide-react';
import { HistoricalOrder } from '../types';

interface OrdersHistoryTableProps {
  orders: HistoricalOrder[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  currentPage: number;
  totalPages: number;
  totalOrders: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
}

const OrdersHistoryTable: React.FC<OrdersHistoryTableProps> = ({
  orders,
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterChange,
  currentPage,
  totalPages,
  totalOrders,
  onPageChange,
  itemsPerPage
}) => {
  const statusMap = {
    1: { text: 'Aprovado', color: 'green' },
    2: { text: 'Reprovado', color: 'red' },
    5: { text: 'Em Análise', color: 'yellow' }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const getStatusBadge = (status: number) => {
    const statusInfo = statusMap[status as keyof typeof statusMap];
    if (!statusInfo) {
      return <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">Desconhecido ({status})</span>;
    }

    const colorClasses = {
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200'
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[statusInfo.color as keyof typeof colorClasses]}`}>
        {statusInfo.text}
      </span>
    );
  };

  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalOrders);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Histórico de Pedidos</h2>
        
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Procurar"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
          
          {/* Status Filter */}
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterStatus}
              onChange={(e) => onFilterChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="todos">Todos</option>
              <option value="1">Aprovados</option>
              <option value="2">Reprovados</option>
              <option value="5">Em Análise</option>
            </select>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N/S</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uni. Adm.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTD de Itens</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {orders.map((order, index) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {String(startItem + index).padStart(2, '0')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.data}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.solicitante}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.setor}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.qtdItens}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatCurrency(order.valorTotal)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getStatusBadge(order.status)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando {startItem}-{endItem} de {totalOrders} pedidos
        </div>
        
        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage === 1}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          
          <span className="px-3 py-2 text-sm font-medium bg-red-500 text-white rounded-md">
            {currentPage}
          </span>
          
          <button
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              currentPage === totalPages
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrdersHistoryTable;