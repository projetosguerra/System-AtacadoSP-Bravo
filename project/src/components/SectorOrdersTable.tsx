import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useData } from '../context/DataContext';
import { Link } from 'react-router-dom';
import { RefreshCw } from 'lucide-react';

type Row = {
  id: number | string;
  data: any;
  solicitante: string;
  setor: string;
  qtdItens: number;
  valorTotal: number;
  status: number;
};

function formatDate(d: any) {
  const x = new Date(d);
  if (isNaN(x.getTime())) return '-';
  return x.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
}
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function StatusBadge({ s }: { s?: number }) {
  const base = 'px-2 py-1 rounded-full text-xs font-medium';
  if (s === 1) return <span className={`${base} bg-green-100 text-green-700`}>Aprovado</span>;
  if (s === 2) return <span className={`${base} bg-red-100 text-red-700`}>Reprovado</span>;
  if (s === 3) return <span className={`${base} bg-blue-100 text-blue-700`}>Em Análise</span>;
  if (s === 5) return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pendente</span>;
  return <span className={`${base} bg-gray-100 text-gray-700`}>N/A</span>;
}

export default function SectorOrdersTable() {
  const { user } = useAuth();
  const { orders, setores, isLoading } = useData();

  const [loading, setLoading] = useState(false);
  const [ordersLocal, setOrdersLocal] = useState<any[]>(orders || []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setOrdersLocal(orders || []), [orders]);

  const sectorDesc = useMemo(() => {
    if (!user?.codSetor) return null;
    const s = setores?.find(x => Number(x.CODSETOR) === Number(user.codSetor));
    return s?.DESCRICAO || null;
  }, [user, setores]);

  const rows = useMemo(() => {
    const base = Array.isArray(ordersLocal) ? ordersLocal : [];
    let filtered: Row[] = base as any;

    if (sectorDesc) {
      filtered = filtered.filter(o => (o.setor || '').toLowerCase() === sectorDesc.toLowerCase());
    }

    filtered = filtered.slice().sort((a, b) => {
      const da = new Date(a.data as any).getTime() || 0;
      const db = new Date(b.data as any).getTime() || 0;
      return db - da;
    });

    return filtered.slice(0, 5);
  }, [ordersLocal, sectorDesc]);

  async function refresh() {
    if (!user?.codSetor) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/pedidos/historico?days=45&maxrows=400', { headers: { 'Cache-Control': 'no-cache' } });
      if (!resp.ok) throw new Error('Falha ao buscar histórico');
      const data = await resp.json();
      setOrdersLocal(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setError(e?.message || 'Erro ao atualizar.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Pedidos do meu Setor</h3>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600">{error}</span>}
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
            title="Atualizar lista do setor"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            Atualizar
          </button>
          <Link
            to="/pedidos"
            className="text-sm text-blue-600 hover:text-blue-700 hover:underline"
            title="Ver todos os pedidos"
          >
            Ver todos
          </Link>
        </div>
      </div>

      {!user?.codSetor && (
        <div className="text-sm text-gray-500">Seu usuário não está vinculado a um setor.</div>
      )}

      {user?.codSetor && isLoading && (
        <div className="text-sm text-gray-500">Carregando…</div>
      )}

      {user?.codSetor && !isLoading && rows.length === 0 && (
        <div className="text-sm text-gray-500">Nenhum pedido do seu setor encontrado no período.</div>
      )}

      {user?.codSetor && rows.length > 0 && (
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Data</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">ID</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Solicitante</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Qtd</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Valor</th>
                <th className="px-4 py-2 text-left text-xs font-semibold text-gray-600 uppercase">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y">
              {rows.map((o) => (
                <tr key={`my-sector-${o.id}`} className="hover:bg-gray-50">
                  <td className="px-4 py-2 text-sm text-gray-900">{formatDate(o.data)}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{o.id}</td>
                  <td className="px-4 py-2 text-sm text-gray-900">{o.solicitante}</td>
                  <td className="px-4 py-2 text-sm text-gray-600">{o.qtdItens ?? 0}</td>
                  <td className="px-4 py-2 text-sm text-gray-900 font-medium">
                    {brl.format(Number((o as any).valorTotal || 0))}
                  </td>
                  <td className="px-4 py-2 text-sm">
                    <StatusBadge s={o.status} />
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