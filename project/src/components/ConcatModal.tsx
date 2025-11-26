import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { X, AlertTriangle, CheckCircle, Link as LinkIcon } from 'lucide-react';

interface Candidate {
  id: number;
  data: string;
  solicitante: string;
  setor: string;
  total: number;
  hasItems: boolean;
}

interface ConcatContext {
  minValue: number;
  baseValue: number;
  baseHasItems: boolean;
  candidatos: Candidate[];
  codSetor: number;
}

export default function ConcatModal({ 
  pedidoId, 
  isOpen, 
  onClose, 
  onDone 
}: {
  pedidoId: number;
  isOpen: boolean;
  onClose: () => void;
  onDone: (newId: number) => void;
}) {
  const { token } = useAuth();
  
  function buildHeaders(contentType?: string): Record<string, string> {
    const h: Record<string, string> = {};
    if (contentType) h['Content-Type'] = contentType;
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  }

  const [ctx, setCtx] = useState<ConcatContext | null>(null);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!isOpen) return;
    setError(null);
    setCtx(null);
    setSelected([]);
    
    (async () => {
      try {
        const r = await fetch(`/api/pedido/${pedidoId}/concat/context`, { 
          headers: buildHeaders() 
        });
        if (!r.ok) throw new Error('Falha ao carregar candidatos.');
        setCtx(await r.json());
      } catch (e: any) {
        setError(e?.message || 'Erro ao buscar contexto.');
      }
    })();
  }, [isOpen, pedidoId, token]);

  const totals = useMemo(() => {
    if (!ctx) return { base: 0, selectedSum: 0, combined: 0 };
    const selectedSet = new Set(selected);
    const selectedSum = (ctx.candidatos || [])
      .filter(c => selectedSet.has(c.id))
      .reduce((acc, c) => acc + (Number(c.total) || 0), 0);
    const base = Number(ctx.baseValue || 0);
    return { base, selectedSum, combined: base + selectedSum };
  }, [ctx, selected]);

  const invalidSelected = useMemo(() => {
    if (!ctx) return false;
    const byId = new Map(ctx.candidatos.map(c => [c.id, c]));
    return selected. some(id => byId.get(id)?.hasItems === false);
  }, [ctx, selected]);

  const canCreate = useMemo(() => {
    if (!ctx || loading || !ctx.baseHasItems || selected.length === 0 || invalidSelected) {
      return false;
    }
    return totals.combined >= ctx.minValue;
  }, [ctx, loading, selected, invalidSelected, totals]);

  async function handleCreate() {
    if (!canCreate) return;
    setLoading(true);
    setError(null);
    try {
      const r = await fetch(`/api/pedido/${pedidoId}/concat`, {
        method: 'POST',
        headers: buildHeaders('application/json'),
        body: JSON.stringify({ includeIds: selected }),
      });
      const body = await r. json().catch(() => ({}));
      if (!r.ok) throw new Error(body?.error || 'Falha ao concatenar.');
      onDone(body.newId);
    } catch (e: any) {
      setError(e?.message || 'Erro ao concatenar.');
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black bg-opacity-50 backdrop-blur-sm">
      <div className="relative bg-white w-full max-w-4xl rounded-xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                <LinkIcon className="w-5 h-5 text-blue-600" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-gray-900">
                  Concatenar Pedidos
                </h3>
                <p className="text-sm text-gray-600">
                  Pedido Base: #{pedidoId}
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-100 rounded-full transition-colors"
              aria-label="Fechar modal"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-5">
          {/* Error Message */}
          {error && (
            <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50">
              <div className="flex items-start gap-2">
                <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                <p className="text-sm text-red-700 font-medium">{error}</p>
              </div>
            </div>
          )}

          {/* Loading State */}
          {! ctx && !error && (
            <div className="text-center py-12">
              <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
              <p className="text-sm text-gray-600">Carregando candidatos...</p>
            </div>
          )}

          {ctx && (
            <>
              {/* Warning se pedido base não tem itens */}
              {! ctx.baseHasItems && (
                <div className="p-4 rounded-lg border-2 border-red-300 bg-red-50">
                  <div className="flex items-start gap-2">
                    <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-semibold text-red-700 mb-1">
                        Pedido Base Sem Itens
                      </p>
                      <p className="text-sm text-red-600">
                        O pedido base não possui itens registrados. Adicione itens antes de concatenar.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Resumo dos Valores */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <div className="bg-gray-50 rounded-lg p-4 border border-gray-200">
                  <p className="text-xs text-gray-600 uppercase tracking-wider mb-1">Mínimo Exigido</p>
                  <p className="text-lg font-bold text-gray-900">{fmtBRL(ctx.minValue)}</p>
                </div>
                <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                  <p className="text-xs text-blue-600 uppercase tracking-wider mb-1">Valor Base</p>
                  <p className="text-lg font-bold text-blue-900">{fmtBRL(totals.base)}</p>
                </div>
                <div className="bg-indigo-50 rounded-lg p-4 border border-indigo-200">
                  <p className="text-xs text-indigo-600 uppercase tracking-wider mb-1">Selecionados</p>
                  <p className="text-lg font-bold text-indigo-900">{fmtBRL(totals.selectedSum)}</p>
                </div>
                <div className={`rounded-lg p-4 border-2 ${
                  totals.combined >= ctx.minValue 
                    ? 'bg-green-50 border-green-300' 
                    : 'bg-red-50 border-red-300'
                }`}>
                  <p className={`text-xs uppercase tracking-wider mb-1 ${
                    totals.combined >= ctx.minValue ?  'text-green-600' : 'text-red-600'
                  }`}>
                    Total Combinado
                  </p>
                  <p className={`text-lg font-bold ${
                    totals.combined >= ctx.minValue ? 'text-green-900' : 'text-red-900'
                  }`}>
                    {fmtBRL(totals.combined)}
                  </p>
                </div>
              </div>

              {/* Alerta de Valor Insuficiente */}
              {totals.combined < ctx.minValue && selected.length > 0 && (
                <div className="p-3 rounded-lg bg-yellow-50 border border-yellow-200">
                  <div className="flex items-center gap-2 text-sm text-yellow-800">
                    <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                    <span>
                      Faltam <strong>{fmtBRL(ctx.minValue - totals. combined)}</strong> para atingir o valor mínimo
                    </span>
                  </div>
                </div>
              )}

              {/* Tabela de Candidatos */}
              <div className="border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th scope="col" className="px-4 py-3 text-left">
                          <input
                            type="checkbox"
                            className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                            checked={selected.length > 0 && selected.length === ctx.candidatos.filter(c => c.hasItems). length}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setSelected(ctx.candidatos.filter(c => c.hasItems). map(c => c.id));
                              } else {
                                setSelected([]);
                              }
                            }}
                            disabled={ctx.candidatos.every(c => !c.hasItems)}
                          />
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                          ID
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                          Data
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">
                          Solicitante
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                          Valor
                        </th>
                        <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">
                          Status
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {ctx.candidatos.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-4 py-12 text-center">
                            <div className="flex flex-col items-center gap-2">
                              <LinkIcon className="w-12 h-12 text-gray-300" />
                              <p className="font-medium text-gray-900">Nenhum pedido disponível</p>
                              <p className="text-sm text-gray-500">
                                Não há pedidos elegíveis para concatenação nesta unidade.
                              </p>
                            </div>
                          </td>
                        </tr>
                      ) : (
                        ctx.candidatos. map(c => {
                          const disabled = !c.hasItems;
                          const isSelected = selected.includes(c. id);
                          return (
                            <tr 
                              key={c.id} 
                              className={`transition-colors ${
                                disabled ? 'opacity-60 bg-gray-50' : 'hover:bg-gray-50'
                              } ${isSelected ? 'bg-blue-50' : ''}`}
                            >
                              <td className="px-4 py-3">
                                <input
                                  type="checkbox"
                                  className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                                  disabled={disabled}
                                  checked={isSelected}
                                  onChange={(e) => {
                                    setSelected(prev =>
                                      e.target.checked
                                        ? [...prev, c.id]
                                        : prev.filter(x => x !== c.id)
                                    );
                                  }}
                                />
                              </td>
                              <td className="px-4 py-3 text-sm font-medium text-gray-900 whitespace-nowrap">
                                #{c.id}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">
                                {fmtDate(c.data)}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-900 max-w-[200px] truncate" title={c.solicitante}>
                                {c.solicitante}
                              </td>
                              <td className="px-4 py-3 text-sm font-semibold text-gray-900 whitespace-nowrap">
                                {fmtBRL(c.total)}
                              </td>
                              <td className="px-4 py-3 text-xs whitespace-nowrap">
                                {c.hasItems ? (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-green-100 text-green-800 font-medium">
                                    <CheckCircle className="w-3 h-3" />
                                    Disponível
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-red-100 text-red-800 font-medium">
                                    <AlertTriangle className="w-3 h-3" />
                                    Sem itens
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Info sobre Concatenação */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <LinkIcon className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                  <div className="text-sm text-blue-800">
                    <p className="font-semibold mb-1">Como funciona a concatenação</p>
                    <ul className="list-disc list-inside space-y-1 text-xs">
                      <li>Selecione os pedidos que deseja unir ao pedido base</li>
                      <li>O valor total combinado deve atingir o mínimo exigido</li>
                      <li>Um novo pedido será criado com todos os itens combinados</li>
                      <li>Os pedidos originais serão marcados como concatenados</li>
                    </ul>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {ctx && (
          <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
            <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
              <div className="text-sm text-gray-600">
                {selected.length > 0 ?  (
                  <span>
                    <strong>{selected.length}</strong> pedido{selected.length !== 1 ? 's' : ''} selecionado{selected. length !== 1 ? 's' : ''}
                  </span>
                ) : (
                  <span>Nenhum pedido selecionado</span>
                )}
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={onClose}
                  disabled={loading}
                  className="px-5 py-2. 5 bg-white border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors disabled:opacity-50 text-sm"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCreate}
                  disabled={! canCreate}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-semibold transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-sm text-sm"
                >
                  {loading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      Gerando...
                    </>
                  ) : (
                    <>
                      <LinkIcon className="w-4 h-4" />
                      Criar Pedido Concatenado
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

function fmtDate(d: string) {
  const dt = new Date(d);
  return isNaN(dt.getTime()) 
    ? '-' 
    : dt.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}