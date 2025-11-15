import React, { useMemo, useState, useEffect } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PedidoPendente } from '../types';

interface PendingOrdersTableProps {
  pedidos: PedidoPendente[];
}

const toNumber = (x: any) => Number.isFinite(Number(x)) ? Number(x) : 0;

type SortBy = 'data' | 'valor' | 'id';
type SortDir = 'asc' | 'desc';

const PendingOrdersTable: React.FC<PendingOrdersTableProps> = ({ pedidos }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [uaFilter, setUaFilter] = useState<string>(''); 
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const [sortBy, setSortBy] = useState<SortBy>('data');
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  useEffect(() => { setPage(1); }, [searchTerm, uaFilter, pageSize, sortBy, sortDir, pedidos]);

  const unique = useMemo(() => {
    const map = new Map<string | number, PedidoPendente>();
    for (const p of pedidos || []) {
      if (!map.has(p.id)) map.set(p.id, p);
    }
    return Array.from(map.values());
  }, [pedidos]);

  const uaOptions = useMemo(() => {
    const set = new Set<string>();
    for (const p of unique) {
      const name = (p as any)?.unidadeAdmin ? String((p as any).unidadeAdmin) : 'N/A';
      set.add(name);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, 'pt-BR'));
  }, [unique]);

  const filtered = useMemo(() => {
    const term = searchTerm.trim().toLowerCase();

    return unique.filter((p) => {
      const uaName = (p as any)?.unidadeAdmin ? String((p as any).unidadeAdmin) : 'N/A';
      if (uaFilter && uaName !== uaFilter) return false;

      if (!term) return true;

      return [
        String(p.id),
        p.solicitante ?? '',
        uaName,
        p.data ?? '',
        String(p.qtdItens ?? ''),
        String((p as any)?.valor ?? ''),
      ].some((v) => String(v).toLowerCase().includes(term));
    });
  }, [unique, uaFilter, searchTerm]);

  const sorted = useMemo(() => {
    const arr = [...filtered];
    arr.sort((a, b) => {
      let av = 0;
      let bv = 0;

      if (sortBy === 'data') {
        av = new Date((a as any).data).getTime() || 0;
        bv = new Date((b as any).data).getTime() || 0;
      } else if (sortBy === 'valor') {
        av = toNumber((a as any)?.valor);
        bv = toNumber((b as any)?.valor);
      } else if (sortBy === 'id') {
        const an = Number((a as any)?.id);
        const bn = Number((b as any)?.id);
        if (Number.isFinite(an) && Number.isFinite(bn)) {
          av = an; bv = bn;
        } else {
          return sortDir === 'asc'
            ? String((a as any)?.id).localeCompare(String((b as any)?.id), 'pt-BR')
            : String((b as any)?.id).localeCompare(String((a as any)?.id), 'pt-BR');
        }
      }

      const diff = av - bv;
      return sortDir === 'asc' ? diff : -diff;
    });
    return arr;
  }, [filtered, sortBy, sortDir]);

  const total = sorted.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  useEffect(() => {
    if (page !== safePage) setPage(safePage);
  }, [totalPages]);

  const startIndex = (safePage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, total);
  const pageItems = sorted.slice(startIndex, endIndex);

  const formatCurrency = (value: number) =>
    new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(toNumber(value));

  const formatDate = (dateString: string) => {
    if (!dateString) return 'Data inválida';
    const d = new Date(dateString);
    return isNaN(d.getTime())
      ? 'Data inválida'
      : d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
  };

  const maxButtons = 7;
  const half = Math.floor(maxButtons / 2);
  let startBtn = Math.max(1, safePage - half);
  let endBtn = Math.min(totalPages, startBtn + maxButtons - 1);
  if (endBtn - startBtn + 1 < maxButtons) startBtn = Math.max(1, endBtn - maxButtons + 1);
  const pages = Array.from({ length: endBtn - startBtn + 1 }, (_, i) => startBtn + i);

  return (
    <div className="bg-white rounded-lg">
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Tabela de Pedidos Pendentes</h2>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Procurar"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Unidade Adm.</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={uaFilter}
              onChange={(e) => setUaFilter(e.target.value)}
              title="Filtrar por Unidade Administrativa"
            >
              <option value="">Todas</option>
              {uaOptions.map((ua) => (
                <option key={ua} value={ua}>{ua}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Mostrar</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={String(pageSize)}
              onChange={(e) => setPageSize(Number(e.target.value))}
            >
              {[10, 20, 50, 100].map(s => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Ordenar por</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortBy)}
              title="Campo de ordenação"
            >
              <option value="data">Data</option>
              <option value="valor">Valor</option>
              <option value="id">ID</option>
            </select>
          </div>
          <div className="flex items-center gap-2">
            <label className="text-sm text-gray-600">Direção</label>
            <select
              className="border rounded px-2 py-2 text-sm"
              value={sortDir}
              onChange={(e) => setSortDir(e.target.value as SortDir)}
              title="Direção de ordenação"
            >
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </div>
        </div>
      </div>

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
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pageItems.map((pedido, index) => (
              <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {String(startIndex + index + 1).padStart(2, '0')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate(pedido.data as any)}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{pedido.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pedido.solicitante}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{(pedido as any)?.unidadeAdmin || 'N/A'}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{(pedido as any)?.qtdItens ?? 0}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatCurrency((pedido as any)?.valor)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    to={`/pedido/${pedido.id}`}
                    className="inline-flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Analisar
                  </Link>
                </td>
              </tr>
            ))}
            {pageItems.length === 0 && (
              <tr>
                <td className="px-6 py-8 text-center text-gray-500" colSpan={8}>
                  Nenhum pedido encontrado.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando {total === 0 ? 0 : startIndex + 1}-{endIndex} de {total} pedidos
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={() => setPage(safePage - 1)}
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
                onClick={() => setPage(1)}
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
                onClick={() => setPage(p)}
                className={`px-3 py-2 text-sm font-medium rounded-md border ${
                  active ? 'bg-red-500 text-white border-red-500' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
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
                onClick={() => setPage(totalPages)}
                className="px-3 py-2 text-sm font-medium rounded-md bg-white text-gray-700 border border-gray-300 hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            onClick={() => setPage(safePage + 1)}
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