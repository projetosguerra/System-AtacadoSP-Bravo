import { useEffect, useMemo, useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { Link } from 'react-router-dom';
import type { PedidoPendente } from '../types';

function formatDate(d: any) {
  const x = new Date(d);
  return isNaN(x.getTime())
    ? '-'
    : x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
function formatTime(d: any) {
  const x = new Date(d);
  return isNaN(x.getTime())
    ? '-'
    : x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}

const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function extractSigla(text?: string | null) {
  if (!text) return 'N/A';
  const t = String(text).trim();
  const dash = t.indexOf(' - ');
  if (dash > 0) return t.substring(0, dash).trim();
  const m = t.match(/^[A-Z]{2,}\b/);
  return m ? m[0] : t;
}

export default function QuickApprovalTable() {
  const { pedidosPendentes: ctxPendentes } = useData();
  const { user, token } = useAuth();

  const [list, setList] = useState<PedidoPendente[]>(ctxPendentes || []);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  function filterByUserUnit(arr: PedidoPendente[]) {
    if (!user) return arr;
    if (user.perfil === 'Admin') return arr;
    const userSigla = extractSigla(user.setor);
    return (arr || []).filter(p => extractSigla((p as any).unidadeAdmin) === userSigla);
  }

  useEffect(() => {
    const base = Array.isArray(ctxPendentes) ? ctxPendentes : [];
    setList(filterByUserUnit(base));
  }, [ctxPendentes]); 

  async function refresh() {
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/pedidos/pendentes?days=45&maxrows=200', {
        headers: {
          'Cache-Control': 'no-cache',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
      if (!resp.ok) throw new Error('Falha ao buscar pedidos pendentes');
      const data = await resp.json();
      const map = new Map<string | number, PedidoPendente>();
      for (const p of Array.isArray(data) ? data : []) {
        if (!map.has(p.id)) map.set(p.id, p);
      }
      const arr = Array.from(map.values())
        .sort((a, b) => {
          const da = new Date(a.data as any).getTime() || 0;
          const db = new Date(b.data as any).getTime() || 0;
          return db - da;
        });
      setList(filterByUserUnit(arr));
    } catch (e: any) {
      setError(e?.message || 'Erro ao atualizar.');
    } finally {
      setLoading(false);
    }
  }

  const top5 = useMemo(() => {
    return (list || []).slice(0, 5);
  }, [list]);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Aprovação Rápida</h3>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title="Atualizar a lista"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
        </div>
      </div>

      {top5.length === 0 ? (
        <div className="text-sm text-gray-500">Não há pedidos pendentes para aprovar.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Horário</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Solicitante</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Sigla</th>
                <th className="px-4 py-2 text-right text-xs font-semibold text-gray-600 uppercase">Valor</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Ação</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {top5.map((p) => (
                <tr key={`qa-${p.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm">{formatDate(p.data as any)}</td>
                  <td className="px-4 py-2 text-sm">{formatTime(p.data as any)}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{p.id}</td>
                  <td className="px-4 py-2 text-sm">{p.solicitante}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{extractSigla((p as any).unidadeAdmin)}</td>
                  <td className="px-4 py-2 text-sm text-right font-medium">{brl.format(Number((p as any).valor || 0))}</td>
                  <td className="px-4 py-2 text-sm">
                    <Link
                      to={`/pedido/${p.id}`}
                      className="inline-flex items-center px-3 py-1.5 bg-yellow-500 hover:bg-yellow-600 text-white text-xs font-medium rounded-lg transition-colors"
                    >
                      Analisar
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}