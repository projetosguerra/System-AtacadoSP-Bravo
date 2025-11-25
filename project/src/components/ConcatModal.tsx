import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';

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

export default function ConcatModal({ pedidoId, isOpen, onClose, onDone }: {
  pedidoId: number;
  isOpen: boolean;
  onClose: () => void;
  onDone: (newId: number) => void;
}) {
  const { token } = useAuth();
  function buildHeaders(contentType?: string): Record<string,string> {
    const h: Record<string,string> = {};
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
        const r = await fetch(`/api/pedido/${pedidoId}/concat/context`, { headers: buildHeaders() });
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
    return selected.some(id => byId.get(id)?.hasItems === false);
  }, [ctx, selected]);

  const canCreate = useMemo(() => {
    if (!ctx) return false;
    if (loading) return false;
    if (!ctx.baseHasItems) return false;
    if (selected.length === 0) return false;
    if (invalidSelected) return false;
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
      const body = await r.json().catch(() => ({}));
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
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-24">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative bg-white w-full max-w-3xl rounded-lg shadow-xl z-10">
        <div className="px-6 py-4 border-b flex items-center justify-between">
          <h3 className="text-lg font-semibold">Concatenar Pedido #{pedidoId}</h3>
          <button className="text-sm text-gray-600 hover:underline" onClick={onClose}>Fechar</button>
        </div>

        <div className="p-6 space-y-4">
          {error && <div className="text-sm text-red-600">{error}</div>}
          {!ctx && !error && <div className="text-sm text-gray-600">Carregando...</div>}

          {ctx && (
            <>
              {!ctx.baseHasItems && (
                <div className="text-sm text-red-600">
                  O pedido base não possui itens registrados. Adicione itens antes de concatenar.
                </div>
              )}

              <div className="text-sm text-gray-700 flex flex-wrap gap-4">
                <span>Mínimo exigido: <strong>{fmtBRL(ctx.minValue)}</strong></span>
                <span>Valor base: <strong>{fmtBRL(totals.base)}</strong></span>
                <span>Selecionados: <strong>{fmtBRL(totals.selectedSum)}</strong></span>
                <span>Total combinado: <strong className={totals.combined >= ctx.minValue ? 'text-green-700' : 'text-red-700'}>
                  {fmtBRL(totals.combined)}
                </strong></span>
                {totals.combined < ctx.minValue && (
                  <span className="text-red-600">Faltam {fmtBRL(ctx.minValue - totals.combined)}</span>
                )}
              </div>

              <div className="border rounded-lg overflow-hidden">
                <table className="w-full">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs text-gray-600 uppercase">Sel.</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-600 uppercase">ID</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-600 uppercase">Data</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-600 uppercase">Solicitante</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-600 uppercase">Valor</th>
                      <th className="px-4 py-2 text-left text-xs text-gray-600 uppercase">Itens</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y">
                    {ctx.candidatos.length === 0 && (
                      <tr><td colSpan={6} className="px-4 py-6 text-center text-gray-500 text-sm">Não há pedidos elegíveis para concatenação.</td></tr>
                    )}
                    {ctx.candidatos.map(c => {
                      const disabled = !c.hasItems;
                      return (
                        <tr key={c.id} className={disabled ? 'opacity-60' : ''}>
                          <td className="px-4 py-2">
                            <input
                              type="checkbox"
                              disabled={disabled}
                              checked={selected.includes(c.id)}
                              onChange={(e) => {
                                setSelected(prev =>
                                  e.target.checked
                                    ? [...prev, c.id]
                                    : prev.filter(x => x !== c.id)
                                );
                              }}
                            />
                          </td>
                          <td className="px-4 py-2 text-sm">{c.id}</td>
                          <td className="px-4 py-2 text-sm">{fmtDate(c.data)}</td>
                          <td className="px-4 py-2 text-sm">{c.solicitante}</td>
                          <td className="px-4 py-2 text-sm font-medium">{fmtBRL(c.total)}</td>
                          <td className="px-4 py-2 text-xs">
                            {c.hasItems ? <span className="px-2 py-0.5 rounded bg-green-100 text-green-800">ok</span>
                                         : <span className="px-2 py-0.5 rounded bg-red-100 text-red-800">sem itens</span>}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-end gap-3 pt-2">
                <button className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200" onClick={onClose} disabled={loading}>
                  Cancelar
                </button>
                <button
                  className="px-4 py-2 rounded bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={!canCreate}
                  onClick={handleCreate}
                >
                  {loading ? 'Gerando...' : 'Criar pedido concatenado'}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function fmtBRL(v: number) {
  return new Intl.NumberFormat('pt-BR',{ style:'currency', currency:'BRL'}).format(Number(v||0));
}
function fmtDate(d: string) {
  const dt = new Date(d);
  return isNaN(dt.getTime()) ? '-' : dt.toLocaleDateString('pt-BR',{ day:'2-digit', month:'2-digit', year:'numeric'});
}