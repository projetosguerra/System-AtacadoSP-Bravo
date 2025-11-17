import React, { useMemo, useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, RefreshCw } from 'lucide-react';
import { HistoricalOrder } from '../types';

interface OrdersHistoryTableProps {
  orders: HistoricalOrder[];
  searchTerm: string;
  onSearchChange: (term: string) => void;
  filterStatus: string;
  onFilterChange: (status: string) => void;
  filterUnit: string;
  onFilterUnitChange: (unit: string) => void;

  currentPage: number;            
  totalPages: number;              
  totalOrders: number;             
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  // novos
  onRefresh?: () => void;
  refreshing?: boolean;

  onRowClick?: (order: HistoricalOrder) => void;
}

type SortKey = 'data' | 'id' | 'setor';
type SortDir = 'asc' | 'desc';

const OrdersHistoryTable: React.FC<OrdersHistoryTableProps> = ({
  orders,
  searchTerm,
  onSearchChange,
  filterStatus,
  onFilterChange,
  filterUnit,
  onFilterUnitChange,
  currentPage,
  onPageChange,
  itemsPerPage,
  onRefresh,
  refreshing,
  onRowClick
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDir, setSortDir] = useState<SortDir>('desc'); // mais recente primeiro

  const statusMap = {
    1: { text: 'Aprovado', color: 'green' },
    2: { text: 'Reprovado', color: 'red' },
    3: { text: 'Em Análise', color: 'blue' },
    5: { text: 'Pendente', color: 'yellow' },
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

  const formatTime = (dateString: string) => {
    if (!dateString) return '-';
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return '-';
    return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };

  const getStatusBadge = (status: number) => {
    const info = statusMap[status as keyof typeof statusMap];
    if (!info) {
      return (
        <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-200 text-gray-800">
          Desconhecido ({status})
        </span>
      );
    }
    const colorClasses: Record<'green' | 'red' | 'blue' | 'yellow', string> = {
      green: 'bg-green-100 text-green-800 border-green-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
    };
    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${colorClasses[info.color]}`}>
        {info.text}
      </span>
    );
  };

  const uniqueOrders = useMemo(() => {
    const map = new Map<number | string, HistoricalOrder>();
    for (const o of orders || []) {
      if (!map.has(o.id)) map.set(o.id, o);
    }
    return Array.from(map.values());
  }, [orders]);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of uniqueOrders) {
      if (o.setor && o.setor.trim()) set.add(o.setor.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [uniqueOrders]);

  const filteredOrders = useMemo(() => {
    const byStatus = (o: HistoricalOrder) => {
      if (filterStatus === 'todos') return true;
      const wanted = Number(filterStatus);
      return o.status === wanted;
    };
    const byUnit = (o: HistoricalOrder) => {
      if (filterUnit === 'todas') return true;
      return (o.setor || '').trim() === filterUnit;
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
    return uniqueOrders.filter(o => byStatus(o) && byUnit(o) && bySearch(o));
  }, [uniqueOrders, filterStatus, filterUnit, searchTerm]);

  const sortedOrders = useMemo(() => {
    const arr = [...filteredOrders];
    arr.sort((a, b) => {
      let comp = 0;
      if (sortKey === 'data') {
        const da = new Date(a.data).getTime();
        const db = new Date(b.data).getTime();
        comp = (da || 0) - (db || 0);
      } else if (sortKey === 'id') {
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

  const totalOrdersLocal = sortedOrders.length;
  const totalPagesLocal = Math.max(1, Math.ceil(totalOrdersLocal / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPagesLocal);

  useEffect(() => {
    if (currentPage !== safeCurrentPage) {
      onPageChange(safeCurrentPage);
    }
  }, [currentPage, safeCurrentPage, onPageChange]);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageOrders = sortedOrders.slice(startIndex, endIndex);

  const startItem = totalOrdersLocal === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(endIndex, totalOrdersLocal);

  const maxButtons = 7;
  const half = Math.floor(maxButtons / 2);
  let startBtn = Math.max(1, safeCurrentPage - half);
  let endBtn = Math.min(totalPagesLocal, startBtn + maxButtons - 1);
  if (endBtn - startBtn + 1 < maxButtons) {
    startBtn = Math.max(1, endBtn - maxButtons + 1);
  }
  const pages = Array.from({ length: endBtn - startBtn + 1 }, (_, i) => startBtn + i);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Histórico de Pedidos</h2>

        <div className="flex items-center gap-4">
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
              <option value="3">Em Análise</option>
              <option value="5">Pendentes</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-gray-400" />
            <select
              value={filterUnit}
              onChange={(e) => onFilterUnitChange(e.target.value)}
              className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              title="Filtrar por Unidade Administrativa (Setor)"
            >
              <option value="todas">Todas as Unidades</option>
              {unitOptions.map((u) => (
                <option key={u} value={u}>{u}</option>
              ))}
            </select>
          </div>

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

          {onRefresh && (
            <button
              onClick={onRefresh}
              disabled={!!refreshing}
              className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
              title="Atualizar apenas a tabela"
            >
              <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
              Atualizar
            </button>
          )}
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N/S</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horário</th>
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
              <tr
                key={order.id}
                className="hover:bg-gray-50 transition-colors cursor-pointer"
                onClick={() => onRowClick?.(order)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => { if (e.key === 'Enter') onRowClick?.(order); }}
              >
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {String(startItem + index).padStart(2, '0')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatDate(order.data)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {formatTime(order.data)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{order.solicitante}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.setor || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{order.qtdItens ?? 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatCurrency(Number(order.valorTotal || 0))}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  {getStatusBadge(order.status)}
                </td>
              </tr>
            ))}
            {pageOrders.length === 0 && (
              <tr>
                <td className="px-6 py-8 text-center text-gray-500" colSpan={9}>
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando {startItem}-{endItem} de {totalOrdersLocal} pedidos
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              safeCurrentPage <= 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {startBtn > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                1
              </button>
              {startBtn > 2 && <span className="px-2 text-gray-400">…</span>}
            </>
          )}

          {pages.map((p) => {
            const active = p === safeCurrentPage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 py-2 text-sm font-medium rounded-md border ${
                  active ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            );
          })}

          {endBtn < totalPagesLocal && (
            <>
              {endBtn < totalPagesLocal - 1 && <span className="px-2 text-gray-400">…</span>}
              <button
                onClick={() => onPageChange(totalPagesLocal)}
                className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                {totalPagesLocal}
              </button>
            </>
          )}

          <button
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPagesLocal}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              safeCurrentPage >= totalPagesLocal
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            aria-label="Próxima página"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrdersHistoryTable;