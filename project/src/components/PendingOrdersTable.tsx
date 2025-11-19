import React, { useMemo, useState, useEffect } from 'react';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PedidoPendente } from '../types';

interface PendingOrdersTableProps {
  pedidos: PedidoPendente[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  onApprove?: (pedido: PedidoPendente) => void;
  showUnitFilter?: boolean;
}

type SortKey = 'data' | 'id' | 'unidade' | 'valor';
type SortDir = 'asc' | 'desc';

const toNumber = (x: any) => Number.isFinite(Number(x)) ? Number(x) : 0;

const PendingOrdersTable: React.FC<PendingOrdersTableProps> = ({
  pedidos,
  currentPage,
  itemsPerPage,
  onPageChange,
  showUnitFilter = true
}) => {
  const [search, setSearch] = useState('');
  const [statusFilter] = useState('todos');
  const [unitFilter, setUnitFilter] = useState('todas');
  const [sortKey, setSortKey] = useState<SortKey>('data');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => { onPageChange(1); }, [search, statusFilter, unitFilter, sortKey, sortDir, pedidos.length]); // eslint-disable-line

  const unique = useMemo(() => {
    const map = new Map<string | number, PedidoPendente>();
    for (const p of pedidos || []) {
      if (!map.has(p.id)) map.set(p.id, p);
    }
    return Array.from(map.values());
  }, [pedidos]);

  const unitOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of unique) {
      const name = (p as any)?.unidadeAdmin ? String((p as any).unidadeAdmin) : '';
      if (name.trim()) set.add(name.trim());
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));
  }, [unique]);

  const effectiveUnitFilter = showUnitFilter ? unitFilter : 'todas';

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return unique.filter(p => {
      const unidade = ((p as any).unidadeAdmin || '').trim();
      if (effectiveUnitFilter !== 'todas' && unidade !== effectiveUnitFilter) return false;
      if (statusFilter !== 'todos') {
        // reservado
      }
      if (!term) return true;
      return [
        String(p.id),
        p.solicitante ?? '',
        unidade,
        (p as any).data ?? '',
        String((p as any).qtdItens ?? ''),
        String((p as any).valor ?? ''),
      ].some(v => String(v).toLowerCase().includes(term));
    });
  }, [unique, search, effectiveUnitFilter, statusFilter]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let comp = 0;
      if (sortKey === 'data') comp = new Date((a as any).data).getTime() - new Date((b as any).data).getTime();
      else if (sortKey === 'id') comp = String(a.id).localeCompare(String(b.id), 'pt-BR', { numeric: true });
      else if (sortKey === 'unidade') comp = String((a as any).unidadeAdmin || '').localeCompare(String((b as any).unidadeAdmin || ''), 'pt-BR', { sensitivity: 'base' });
      else if (sortKey === 'valor') comp = toNumber((a as any).valor) - toNumber((b as any).valor);
      return sortDir === 'asc' ? comp : -comp;
    });
    return arr;
  }, [filtered, sortKey, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / itemsPerPage));
  const safePage = Math.min(Math.max(1, currentPage), totalPages);
  useEffect(() => { if (safePage !== currentPage) onPageChange(safePage); }, [safePage, currentPage, onPageChange]); // eslint-disable-line

  const startIndex = (safePage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const pageItems = sorted.slice(startIndex, endIndex);

  const formatDate = (d: string) => {
    const x = new Date(d);
    return isNaN(x.getTime()) ? '-' : x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };
  const formatTime = (d: string) => {
    const x = new Date(d);
    return isNaN(x.getTime()) ? '-' : x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
  };
  const formatCurrency = (v: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNumber(v));

  const maxButtons = 7;
  const half = Math.floor(maxButtons / 2);
  let startBtn = Math.max(1, safePage - half);
  let endBtn = Math.min(totalPages, startBtn + maxButtons - 1);
  if (endBtn - startBtn + 1 < maxButtons) startBtn = Math.max(1, endBtn - maxButtons + 1);
  const pages = Array.from({ length: endBtn - startBtn + 1 }, (_, i) => startBtn + i);

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Pedidos Pendentes</h2>

        <div className="flex items-center gap-4 flex-wrap">
          {/* Busca */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Procurar"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {/* Filtro por Unidade Adm. (apenas admin) */}
          {showUnitFilter && (
            <div className="flex items-center gap-2">
              <Filter className="w-4 h-4 text-gray-400" />
              <select
                value={unitFilter}
                onChange={(e) => setUnitFilter(e.target.value)}
                className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                title="Filtrar por Unidade Administrativa"
              >
                <option value="todas">Todas as Unidades</option>
                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            </div>
          )}

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
              <option value="unidade">Ordenar por Uni. Adm.</option>
              <option value="valor">Ordenar por Valor</option>
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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uni. Adm.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTD de Itens</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pageItems.map((p, index) => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {String(startIndex + index + 1).padStart(2, '0')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate((p as any).data)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime((p as any).data)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{p.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.solicitante}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{(p as any)?.unidadeAdmin || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{(p as any)?.qtdItens ?? 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatCurrency((p as any)?.valor)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    to={`/pedido/${p.id}`}
                    className="inline-flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Analisar
                  </Link>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td className="px-6 py-8 text-center text-gray-500" colSpan={9}>
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Paginação */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando {total === 0 ? 0 : startIndex + 1}-{Math.min(endIndex, total)} de {total} pedidos
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => onPageChange(safePage - 1)}
            disabled={safePage <= 1}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              safePage <= 1
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
            const active = p === safePage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 py-2 text-sm font-medium rounded-md border ${
                  active ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                {p}
              </button>
            );
          })}

          {endBtn < totalPages && (
            <>
              {endBtn < totalPages - 1 && <span className="px-2 text-gray-400">…</span>}
              <button
                onClick={() => onPageChange(totalPages)}
                className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              safePage >= totalPages
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

export default PendingOrdersTable;