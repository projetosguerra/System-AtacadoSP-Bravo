import React, { useMemo, useState, useEffect } from 'react';
import { Search, Filter, ChevronLeft, ChevronRight, ArrowUpDown, Info, ChevronDown, Package } from 'lucide-react';
import { HistoricalOrder } from '../types';

interface OrdersHistoryTableProps {
  orders: HistoricalOrder[];
  searchTerm?: string;
  filterStatus?: string;
  filterUnit?: string;
  currentPage: number;
  totalPages?: number;
  totalOrders?: number;
  onPageChange: (page: number) => void;
  itemsPerPage: number;
  onRefresh?: () => void;
  refreshing?: boolean;
  onRowClick?: (order: HistoricalOrder) => void;
  showUnitFilter?: boolean;
}

type SortKey = 'data' | 'id' | 'setor' | 'valor';
type SortDir = 'asc' | 'desc';

const statusMap: Record<number, { text: string; color: string }> = {
  1: { text: 'Aprovado', color: 'green' },
  2: { text: 'Reprovado', color: 'red' },
  3: { text: 'Em Análise', color: 'blue' },
  5: { text: 'Pendente', color: 'yellow' },
  9: { text: 'Arquivado', color: 'gray' },
};

function formatCurrency(value: number) {
  if (typeof value !== 'number' || isNaN(value)) return 'R$ 0,00';
  return new Intl. NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
}
function formatDate(dateString: string) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatTime(dateString: string) {
  if (!dateString) return '-';
  const d = new Date(dateString);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
function statusBadge(status: number) {
  const info = statusMap[status];
  if (!info) {
    return <span className="inline-flex items-center px-2. 5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-800">Desconhecido ({status})</span>;
  }
  const colorClasses: Record<string, string> = {
    green: 'bg-green-100 text-green-800',
    red: 'bg-red-100 text-red-800',
    blue: 'bg-blue-100 text-blue-800',
    yellow: 'bg-yellow-100 text-yellow-800',
    gray: 'bg-gray-200 text-gray-700',
  };
  return <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${colorClasses[info.color]}`}>{info.text}</span>;
}

function addBusinessDays(from: Date, days: number) {
  const d = new Date(from);
  let add = 0;
  while (add < days) {
    d.setDate(d.getDate() + 1);
    const dow = d.getDay();
    if (dow !== 0 && dow !== 6) add++;
  }
  return d;
}

const OrdersHistoryTable: React. FC<OrdersHistoryTableProps> = ({
  orders,
  searchTerm = '',
  filterStatus = 'todos',
  filterUnit = 'todas',
  currentPage,
  onPageChange,
  itemsPerPage,
  onRowClick,
  showUnitFilter = true
}) => {
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDir, setSortDir] = useState<SortDir>('desc');
  const [localSearch, setLocalSearch] = useState(searchTerm);
  const [localStatus, setLocalStatus] = useState(filterStatus);
  const [localUnit, setLocalUnit] = useState(filterUnit);

  // Filtros avançados
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fId] = useState('');
  const [fSolicitante, setFSolicitante] = useState('');
  const [fAprovador, setFAprovador] = useState('');
  const [fSetor] = useState('');
  const [fDataIni, setFDataIni] = useState('');
  const [fDataFim, setFDataFim] = useState('');
  const [fPrevIni, setFPrevIni] = useState('');
  const [fPrevFim, setFPrevFim] = useState('');
  const [fValorMin, setFValorMin] = useState('');
  const [fValorMax, setFValorMax] = useState('');

  useEffect(() => {
    onPageChange(1);
  }, [localSearch, localStatus, localUnit, sortKey, sortDir, orders.length, fId, fSolicitante, fAprovador, fSetor, fDataIni, fDataFim, fPrevIni, fPrevFim, fValorMin, fValorMax]); // eslint-disable-line

  const uniqueOrders = useMemo(() => {
    const map = new Map<number | string, HistoricalOrder>();
    for (const o of orders || []) if (! map.has(o.id)) map.set(o.id, o);
    return Array.from(map.values());
  }, [orders]);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of uniqueOrders) if (o.setor && o.setor. trim()) set.add(o.setor.trim());
    return Array.from(set). sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [uniqueOrders]);

  const effectiveUnit = showUnitFilter ? localUnit : 'todas';

  const filteredOrders = useMemo(() => {
    const term = localSearch. trim().toLowerCase();
    const byStatus = (o: HistoricalOrder) => {
      if (localStatus === 'todos') return true;
      return o. status === Number(localStatus);
    };
    const byUnitSelect = (o: HistoricalOrder) => {
      if (effectiveUnit === 'todas') return true;
      return (o.setor || '').trim() === effectiveUnit;
    };

    function toDate(s?: string | null) {
      if (!s) return null;
      const d = new Date(s); return isNaN(d.getTime()) ? null : d;
    }
    function previsao(o: HistoricalOrder) {
      const dA = toDate(o.dataAprovacao || null);
      if (!dA) return null;
      return addBusinessDays(dA, 15);
    }

    return uniqueOrders.filter(o => {
      if (! byStatus(o) || !byUnitSelect(o)) return false;

      if (fId && ! String(o.id).includes(fId. trim())) return false;
      if (fSolicitante && !(o.solicitante || '').toLowerCase().includes(fSolicitante.toLowerCase())) return false;
      if (fAprovador && !(o.aprovador || '').toLowerCase().includes(fAprovador.toLowerCase())) return false;
      if (fSetor && !(o.setor || '').toLowerCase().includes(fSetor.toLowerCase())) return false;

      const d = toDate(o.data);
      if (fDataIni) { const ini = new Date(fDataIni); if (d && d < ini) return false; }
      if (fDataFim) { const fim = new Date(fDataFim); if (d && d > new Date(fim. getTime() + 86399999)) return false; }

      if (fPrevIni || fPrevFim) {
        const prev = previsao(o);
        if (!prev) return false;
        if (fPrevIni) { const ini = new Date(fPrevIni); if (prev < ini) return false; }
        if (fPrevFim) { const fim = new Date(fPrevFim); if (prev > new Date(fim.getTime() + 86399999)) return false; }
      }

      const v = Number(o.valorTotal || 0);
      const vmin = fValorMin ? Number(fValorMin) : NaN;
      const vmax = fValorMax ? Number(fValorMax) : NaN;
      if (Number.isFinite(vmin) && v < vmin) return false;
      if (Number.isFinite(vmax) && v > vmax) return false;

      if (term) {
        const hit = [
          String(o.id), o.solicitante ??  '', o.setor ?? '', o.aprovador ??  '',
          o.data ??  '', o.dataAprovacao ??  '', String(o.qtdItens ??  ''),
          String(o.valorTotal ??  ''), o.concatRole ?? ''
        ].some(v => String(v).toLowerCase().includes(term));
        if (!hit) return false;
      }

      return true;
    });
  }, [uniqueOrders, localSearch, localStatus, effectiveUnit, fId, fSolicitante, fAprovador, fSetor, fDataIni, fDataFim, fPrevIni, fPrevFim, fValorMin, fValorMax]);

  const sortedOrders = useMemo(() => {
    const arr = [...filteredOrders];
    arr.sort((a, b) => {
      let comp = 0;
      if (sortKey === 'data') comp = new Date(a.data).getTime() - new Date(b.data).getTime();
      else if (sortKey === 'id') comp = String(a.id).localeCompare(String(b.id), 'pt-BR', { numeric: true });
      else if (sortKey === 'setor') comp = (a.setor || '').localeCompare(b.setor || '', 'pt-BR', { sensitivity: 'base' });
      else if (sortKey === 'valor') comp = (a.valorTotal || 0) - (b.valorTotal || 0);
      return sortDir === 'asc' ?  comp : -comp;
    });
    return arr;
  }, [filteredOrders, sortKey, sortDir]);

  const totalOrdersLocal = sortedOrders.length;
  const totalPagesLocal = Math.max(1, Math.ceil(totalOrdersLocal / itemsPerPage));
  const safeCurrentPage = Math.min(Math.max(1, currentPage), totalPagesLocal);
  useEffect(() => { if (currentPage !== safeCurrentPage) onPageChange(safeCurrentPage); }, [currentPage, safeCurrentPage, onPageChange]);

  const startIndex = (safeCurrentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageOrders = sortedOrders.slice(startIndex, endIndex);
  const startItem = totalOrdersLocal === 0 ? 0 : startIndex + 1;
  const endItem = Math.min(endIndex, totalOrdersLocal);

  const renderConcatChip = (o: HistoricalOrder) => {
    const tooltipBase = o.concatRole === 'RESULTADO'
      ? `Resultado de concatenação`
      : o.concatRole === 'ORIGEM'
        ? `Origem de concatenação`
        : '';
    const tt = [tooltipBase, o.concatGroupId ?  `Grupo ${o.concatGroupId}` : ''].filter(Boolean).join(' • ');
    if (o.concatRole === 'RESULTADO') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800" title={tt}>Concatenado</span>;
    if (o.concatRole === 'ORIGEM') return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold bg-gray-200 text-gray-700" title={tt}>Origem</span>;
    return null;
  };

  const maxPageButtons = 7;
  const half = Math.floor(maxPageButtons / 2);
  let startBtn = Math.max(1, safeCurrentPage - half);
  let endBtn = Math.min(totalPagesLocal, startBtn + maxPageButtons - 1);
  if (endBtn - startBtn + 1 < maxPageButtons) startBtn = Math.max(1, endBtn - maxPageButtons + 1);
  const pages = Array.from({ length: endBtn - startBtn + 1 }, (_, i) => startBtn + i);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
      {/* Header */}
      <div className="px-5 lg:px-6 py-4 border-b border-gray-200">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <h2 className="text-base lg:text-lg font-semibold text-gray-900 flex items-center gap-2">
            Histórico de Pedidos
            <span title="Pedidos concatenados exibem chip 'Concatenado'.  Originais arquivados aparecem se backend permitir.">
              <Info className="w-4 h-4 text-gray-400 cursor-help" />
            </span>
          </h2>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
            {/* Busca */}
            <div className="relative flex-1 sm:flex-initial">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
              <input
                type="text"
                placeholder="Procurar..."
                className="w-full sm:w-64 pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm"
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
              />
            </div>

            {/* Filtros Avançados */}
            <button 
              type="button" 
              className="inline-flex items-center justify-center gap-2 px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors bg-white" 
              onClick={() => setShowAdvanced(s => !s)} 
              aria-expanded={showAdvanced ?  'true' : 'false'}
            >
              <Filter className="w-4 h-4 text-gray-500" />
              <span>Filtros Avançados</span>
              <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            </button>

            {/* Ordenação */}
            <div className="flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-gray-400 flex-shrink-0" />
              <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                <option value="data">Por Data</option>
                <option value="id">Por ID</option>
                <option value="setor">Por Unidade</option>
                <option value="valor">Por Valor</option>
              </select>
              <select value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white">
                <option value="desc">Desc</option>
                <option value="asc">Asc</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Filtros Avançados (Colapsável) */}
      {showAdvanced && (
        <div className="px-5 lg:px-6 py-4 border-b border-gray-100 bg-gray-50">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Solicitante" value={fSolicitante} onChange={e => setFSolicitante(e. target.value)} />
            <input className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Aprovador" value={fAprovador} onChange={e => setFAprovador(e.target.value)} />
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 bg-white" value={fDataIni} onChange={e => setFDataIni(e.target.value)} title="Data do pedido (de)" />
              <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 bg-white" value={fDataFim} onChange={e => setFDataFim(e. target.value)} title="Data do pedido (até)" />
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 bg-white" value={fPrevIni} onChange={e => setFPrevIni(e.target.value)} title="Previsão (de)" />
              <input type="date" className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 bg-white" value={fPrevFim} onChange={e => setFPrevFim(e.target.value)} title="Previsão (até)" />
            </div>
            <div className="flex gap-2 sm:col-span-2 lg:col-span-1">
              <input type="number" min={0} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Valor mín." value={fValorMin} onChange={e => setFValorMin(e.target.value)} />
              <input type="number" min={0} className="border border-gray-300 rounded-lg px-3 py-2 text-sm w-full focus:ring-2 focus:ring-blue-500 bg-white" placeholder="Valor máx." value={fValorMax} onChange={e => setFValorMax(e.target.value)} />
            </div>
            <select value={localStatus} onChange={(e) => setLocalStatus(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white" title="Status">
              <option value="todos">Todos os status</option>
              <option value="1">Aprovados</option>
              <option value="2">Reprovados</option>
              <option value="3">Em Análise</option>
              <option value="5">Pendentes</option>
              <option value="9">Arquivados (Concat)</option>
            </select>
            {showUnitFilter && (
              <select value={localUnit} onChange={(e) => setLocalUnit(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 bg-white" title="Unidade Administrativa">
                <option value="todas">Todas as Unidades</option>
                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">#</th>
              <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Data</th>
              <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Horário</th>
              <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">ID</th>
              <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Solicitante</th>
              <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Uni.  Adm.</th>
              <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">QTD Itens</th>
              <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Valor</th>
              <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Status</th>
              <th scope="col" className="px-4 lg:px-6 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Concat. </th>
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
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 font-medium whitespace-nowrap">{String(startItem + index). padStart(2, '0')}</td>
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 whitespace-nowrap">{formatDate(order.data)}</td>
                <td className="px-4 lg:px-6 py-4 text-sm font-mono text-gray-600 whitespace-nowrap">{formatTime(order.data)}</td>
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 font-medium whitespace-nowrap">#{order.id}</td>
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-900 max-w-[200px] truncate" title={order.solicitante}>{order.solicitante}</td>
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={order. setor || 'N/A'}>{order.setor || 'N/A'}</td>
                <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 whitespace-nowrap">{order. qtdItens ??  0}</td>
                <td className="px-4 lg:px-6 py-4 text-sm text-green-600 font-semibold whitespace-nowrap">{formatCurrency(Number(order.valorTotal || 0))}</td>
                <td className="px-4 lg:px-6 py-4 text-sm whitespace-nowrap">{statusBadge(order.status)}</td>
                <td className="px-4 lg:px-6 py-4 text-sm whitespace-nowrap">{renderConcatChip(order)}</td>
              </tr>
            ))}
            {pageOrders.length === 0 && (
              <tr>
                <td className="px-4 lg:px-6 py-12 text-center" colSpan={10}>
                  <div className="flex flex-col items-center gap-2">
                    <Package className="w-12 h-12 text-gray-300" />
                    <p className="font-medium text-gray-900">Nenhum pedido encontrado</p>
                    <p className="text-sm text-gray-500">Tente ajustar os filtros de busca</p>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="px-5 lg:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="text-sm text-gray-700">
          Mostrando {startItem}-{endItem} de {totalOrdersLocal} pedidos
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(safeCurrentPage - 1)}
            disabled={safeCurrentPage <= 1}
            className={`p-2 text-sm font-medium rounded-md transition-colors ${
              safeCurrentPage <= 1
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
            }`}
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          {pages.map((p) => {
            const active = p === safeCurrentPage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  active
                    ? 'bg-red-500 text-white border border-red-500'
                    : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            );
          })}

          <button
            onClick={() => onPageChange(safeCurrentPage + 1)}
            disabled={safeCurrentPage >= totalPagesLocal}
            className={`p-2 text-sm font-medium rounded-md transition-colors ${
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