import React, { useMemo, useState } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown } from 'lucide-react';
import { HistoricalOrder } from '../types';

interface OrdersHistoryTableProps {
  orders: HistoricalOrder[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  currentPage: number;
  totalPages: number; // não será usado; calcularemos localmente para consistência
  totalOrders: number; // não será usado; calcularemos localmente para consistência
  onPageChange: (page: number) => void;
  itemsPerPage: number;
}

type SortKey = 'data' | 'id' | 'setor';
type SortDir = 'asc' | 'desc';

const OrdersHistoryTable: React.FC<OrdersHistoryTableProps> = ({
  orders,
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterChange,
  currentPage,
  onPageChange,
  itemsPerPage
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDir, setSortDir] = useState<SortDir>('desc'); // mais recente primeiro

  const statusMap = {
    1: { text: 'Aprovado', color: 'green' },
    2: { text: 'Reprovado', color: 'red' },
  } as const;

  const formatCurrency = (value: number) => {
    if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  };

  const formatDate = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const getStatusBadge = (status: number) => {
    const statusInfo = statusMap[status as keyof typeof statusMap];
    if (!statusInfo) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">
          Desconhecido ({status})
        </span>
      );
    }

    const colorClasses: Record<'green' | 'red', string> = {
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
    };

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[statusInfo.color]}`}>
        {statusInfo.text}
      </span>
    );
  };

  // 1) Deduplicação por id
  const uniqueOrders = useMemo(() => {
    const map = new Map<number | string, HistoricalOrder>();
    for (const o of orders || []) {
      if (!map.has(o.id)) map.set(o.id, o);
    }
    return Array.from(map.values());
  }, [orders]);

  // 2) Filtro por busca e status
  const filteredOrders = useMemo(() => {
    const byStatus = (o: HistoricalOrder) => {
      if (filterStatus === 'todos') return true;
      const wanted = Number(filterStatus);
      return o.status === wanted;
    };
    const term = searchTerm.trim().toLowerCase();
    const bySearch = (o: HistoricalOrder) => {
      if (!term) return true;
      return [
        String(o.id),
        o.solicitante ?? '',
        o.setor ?? '',
        o.data ?? '',
        String(o.qtdItens ?? ''),
        String(o.valorTotal ?? '')
      ].some(v => String(v).toLowerCase().includes(term));
    };
    return uniqueOrders.filter(o => byStatus(o) && bySearch(o));
  }, [uniqueOrders, filterStatus, searchTerm]);

  // 3) Ordenação
  const sortedOrders = useMemo(() => {
    const arr = [...filteredOrders];
    arr.sort((a, b) => {
      let comp = 0;
      if (sortKey === 'data') {
        const da = new Date(a.data).getTime();
        const db = new Date(b.data).getTime();
        comp = (da || 0) - (db || 0);
      } else if (sortKey === 'id') {
        // se id for numérico, compare numericamente; se string, compare lexicograficamente
        const na = typeof a.id === 'number' ? a.id : Number(a.id);
        const nb = typeof b.id === 'number' ? b.id : Number(b.id);
        comp = (isNaN(na) || isNaN(nb)) ? String(a.id).localeCompare(String(b.id)) : na - nb;
      } else if (sortKey === 'setor') {
        comp = (a.setor || '').localeCompare(b.setor || '', 'pt-BR', { sensitivity: 'base' });
      }
      return sortDir === 'asc' ? comp : -comp;
    });
    return arr;
  }, [filteredOrders, sortKey, sortDir]);

  // 4) Paginação baseada no resultado processado
  const totalOrdersLocal = sortedOrders.length;
  const totalPagesLocal = Math.max(1, Math.ceil(totalOrdersLocal / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPagesLocal);
  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageOrders = sortedOrders.slice(startIndex, endIndex);

  const startItem = totalOrdersLocal === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(endIndex, totalOrdersLocal);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Histórico de Pedidos</h2>

        <div className="flex items-center gap-4">
          {/* Busca */}
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

          {/* Filtro de status */}
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
            </select>
          </div>

          {/* Ordenação */}
          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="data">Ordenar por Data</option>
              <option value="id">Ordenar por ID</option>
              <option value="setor">Ordenar por Uni. Adm.</option>
            </select>
            <select
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as SortDir)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabela */}
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
            {pageOrders.map((order, index) => (
              <tr key={order.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {String(startItem + index).padStart(2, '0')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(order.data)}
                </td>
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

      {/* Rodapé de paginação */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando {startItem}-{endItem} de {totalOrdersLocal} pedidos
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage === 1}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              safeCurrentPage === 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="px-3 py-2 text-sm font-medium bg-red-500 text-white rounded-md">
            {safeCurrentPage}
          </span>

          <button
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage === totalPagesLocal}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              safeCurrentPage === totalPagesLocal
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