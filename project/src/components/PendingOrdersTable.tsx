import React, { useMemo, useState, useEffect } from 'react';
import { Search, Filter, ArrowUpDown, ChevronLeft, ChevronRight, Pencil, ChevronDown } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { PedidoPendente } from '../types';

type SortKey = 'data' | 'id' | 'unidade' | 'valor';
type SortDir = 'asc' | 'desc';
const toNumber = (x: any) => Number.isFinite(Number(x)) ? Number(x) : 0;

interface PendingOrdersTableProps {
  pedidos: PedidoPendente[];
  currentPage: number;
  itemsPerPage: number;
  onPageChange: (page: number) => void;
  showUnitFilter?: boolean;
}

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
  const navigate = useNavigate();

  // Filtros Avançados
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [fId, setFId] = useState('');
  const [fSolicitante, setFSolicitante] = useState('');
  const [fAprovador, setFAprovador] = useState('');
  const [fSetor, setFSetor] = useState('');
  const [fDataIni, setFDataIni] = useState('');
  const [fDataFim, setFDataFim] = useState('');
  const [fValorMin, setFValorMin] = useState('');
  const [fValorMax, setFValorMax] = useState('');

  useEffect(() => { onPageChange(1); }, [search, statusFilter, unitFilter, sortKey, sortDir, pedidos.length, fId, fSolicitante, fAprovador, fSetor, fDataIni, fDataFim, fValorMin, fValorMax]); // eslint-disable-line

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

    function toDate(s?: string) {
      if (!s) return null;
      const d = new Date(s); return isNaN(d.getTime()) ? null : d;
    }

    return unique.filter(p => {
      const unidade = ((p as any).unidadeAdmin || '').trim();
      if (effectiveUnitFilter !== 'todas' && unidade !== effectiveUnitFilter) return false;

      if (fId && !String(p.id).includes(fId.trim())) return false;
      if (fSolicitante && !(p.solicitante || '').toLowerCase().includes(fSolicitante.toLowerCase())) return false;
      if (fAprovador && !(p.aprovador || '').toLowerCase().includes(fAprovador.toLowerCase())) return false;
      if (fSetor && !unidade.toLowerCase().includes(fSetor.toLowerCase())) return false;

      const d = toDate((p as any).data);
      if (fDataIni) { const ini = new Date(fDataIni); if (d && d < ini) return false; }
      if (fDataFim) { const fim = new Date(fDataFim); if (d && d > new Date(fim.getTime() + 86399999)) return false; }

      const v = toNumber((p as any).valor);
      const vmin = fValorMin ? Number(fValorMin) : NaN;
      const vmax = fValorMax ? Number(fValorMax) : NaN;
      if (Number.isFinite(vmin) && v < vmin) return false;
      if (Number.isFinite(vmax) && v > vmax) return false;

      if (!term) return true;
      return [
        String(p.id),
        p.solicitante ?? '',
        unidade,
        (p as any).data ?? '',
        String((p as any).qtdItens ?? ''),
        String((p as any).valor ?? ''),
        p.aprovador ?? ''
      ].some(v => String(v).toLowerCase().includes(term));
    });
  }, [unique, search, effectiveUnitFilter, statusFilter, fId, fSolicitante, fAprovador, fSetor, fDataIni, fDataFim, fValorMin, fValorMax]);

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
      {/* Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        <h2 className="text-lg font-semibold text-gray-900">Pedidos Pendentes</h2>
        <div className="flex items-center gap-4 flex-wrap">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input type="text" placeholder="Procurar" className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>

          <button type="button" className="inline-flex items-center gap-1 px-3 py-2 border rounded-lg text-sm hover:bg-gray-50" onClick={() => setShowAdvanced(s => !s)} aria-expanded={showAdvanced ? 'true' : 'false'}>
            <Filter className="w-4 h-4 text-gray-500" />
            Filtros Avançados
            <ChevronDown className={`w-4 h-4 text-gray-500 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
          </button>

          <div className="flex items-center gap-2">
            <ArrowUpDown className="w-4 h-4 text-gray-400" />
            <select value={sortKey} onChange={(e) => setSortKey(e.target.value as SortKey)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="data">Ordenar por Data</option>
              <option value="id">Ordenar por ID</option>
              <option value="valor">Ordenar por Valor</option>
            </select>
            <select value={sortDir} onChange={(e) => setSortDir(e.target.value as SortDir)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent">
              <option value="desc">Descendente</option>
              <option value="asc">Ascendente</option>
            </select>
          </div>
        </div>
      </div>

      {showAdvanced && (
        <div className="px-6 py-4 border-b border-gray-100 bg-gray-50/60">
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-4 gap-3">
            <input className="border rounded px-3 py-2 text-sm" placeholder="Nº Identificador" value={fId} onChange={e => setFId(e.target.value)} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Unidade (nome/sigla)" value={fSetor} onChange={e => setFSetor(e.target.value)} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Solicitante" value={fSolicitante} onChange={e => setFSolicitante(e.target.value)} />
            <input className="border rounded px-3 py-2 text-sm" placeholder="Aprovador" value={fAprovador} onChange={e => setFAprovador(e.target.value)} />
            <div className="flex gap-2">
              <input type="date" className="border rounded px-3 py-2 text-sm w-full" value={fDataIni} onChange={e => setFDataIni(e.target.value)} title="Data do pedido (de)" />
              <input type="date" className="border rounded px-3 py-2 text-sm w-full" value={fDataFim} onChange={e => setFDataFim(e.target.value)} title="Data do pedido (até)" />
            </div>
            <div className="flex gap-2">
              <input type="number" min={0} className="border rounded px-3 py-2 text-sm w-full" placeholder="Valor mín." value={fValorMin} onChange={e => setFValorMin(e.target.value)} />
              <input type="number" min={0} className="border rounded px-3 py-2 text-sm w-full" placeholder="Valor máx." value={fValorMax} onChange={e => setFValorMax(e.target.value)} />
            </div>
            {showUnitFilter && (
              <select value={unitFilter} onChange={(e) => setUnitFilter(e.target.value)} className="border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent w-full" title="Unidade Administrativa">
                <option value="todas">Todas as Unidades</option>
                {unitOptions.map(u => <option key={u} value={u}>{u}</option>)}
              </select>
            )}
          </div>
        </div>
      )}

      {/* Tabela */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">{/* sem título */}</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Horário</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uni. Adm.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTD Itens</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {pageItems.map((p, index) => {
              const ns = String(startIndex + index + 1).padStart(2, '0');
              return (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{ns}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatDate((p as any).data)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{formatTime((p as any).data)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 flex items-center gap-2" title={(p.concatRole === 'RESULTADO' || p.concatRole === 'ORIGEM') ? `Grupo ${p.concatGroupId ?? '—'}` : undefined}>
                    {p.id}
                    {p.concatRole === 'RESULTADO' && (<span className="px-2 py-0.5 text-[10px] rounded-full bg-blue-100 text-blue-700" title={`Pedido resultado da concatenação (Grupo ${p.concatGroupId ?? '—'})`}>Concatenado</span>)}
                    {p.concatRole === 'ORIGEM' && (<span className="px-2 py-0.5 text-[10px] rounded-full bg-gray-100 text-gray-700" title={`Pedido origem (Grupo ${p.concatGroupId ?? '—'})`}>ORIGEM</span>)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{p.solicitante}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{(p as any).unidadeAdmin || 'N/A'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{(p as any).qtdItens}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">{formatCurrency(toNumber((p as any).valor))}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm flex gap-2">
                    <Link to={`/pedido/${p.id}`} className="inline-flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors">Analisar</Link>
                    {([5, 3].includes(Number((p as any).status ?? 5)) && (p.concatRole !== 'RESULTADO' && p.concatRole !== 'ORIGEM')) && (
                      <button onClick={() => navigate(`/pedido/${p.id}/editar`)} className="inline-flex items-center px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg transition-colors" title="Editar itens do pedido">
                        <Pencil className="w-4 h-4 mr-1" /> Editar
                      </button>
                    )}
                  </td>
                </tr>
              );
            })}
            {pageItems.length === 0 && (
              <tr><td className="px-6 py-8 text-center text-gray-500" colSpan={9}>Nenhum pedido encontrado.</td></tr>
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
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${safePage <= 1
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
              }`}
            aria-label="Página anterior"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          {/* Botões dinâmicos */}
          {pages.map(p => {
            const active = p === safePage;
            return (
              <button
                key={p}
                onClick={() => onPageChange(p)}
                className={`px-3 py-2 text-sm font-medium rounded-md border ${active
                  ? 'bg-red-500 text-white border-red-500'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                {p}
              </button>
            );
          })}
          <button
            onClick={() => onPageChange(safePage + 1)}
            disabled={safePage >= totalPages}
            className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${safePage >= totalPages
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