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
function formatTime(d: any) {
  const x = new Date(d);
  if (isNaN(x.getTime())) return '-';
  return x.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
}
const brl = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function StatusBadge({ s }: { s?: number }) {
  const base = 'px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap';
  if (s === 1) return <span className={`${base} bg-green-100 text-green-700`}>Aprovado</span>;
  if (s === 2) return <span className={`${base} bg-red-100 text-red-700`}>Reprovado</span>;
  if (s === 3) return <span className={`${base} bg-blue-100 text-blue-700`}>Em Análise</span>;
  if (s === 5) return <span className={`${base} bg-yellow-100 text-yellow-800`}>Pendente</span>;
  return <span className={`${base} bg-gray-100 text-gray-700`}>N/A</span>;
}

function extractSigla(text?: string | null) {
  if (!text) return 'N/A';
  const t = String(text).trim();
  const dash = t.indexOf(' - ');
  if (dash > 0) return t.substring(0, dash). trim();
  const m = t.match(/^[A-Z]{2,}\b/);
  return m ? m[0] : t;
}

export default function SectorOrdersTable() {
  const { user, token } = useAuth();
  const { orders, isLoading } = useData();

  const [loading, setLoading] = useState(false);
  const [ordersLocal, setOrdersLocal] = useState<any[]>(orders || []);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => setOrdersLocal(orders || []), [orders]);

  const userSectorSigla = useMemo(() => extractSigla(user?.setor || ''), [user?.setor]);

  const rows = useMemo(() => {
    const base = Array.isArray(ordersLocal) ? ordersLocal : [];
    let filtered: Row[] = base as any;

    if (userSectorSigla && user?.perfil !== 'Admin') {
      filtered = filtered. filter(o => extractSigla(o.setor) === userSectorSigla);
    }

    filtered = filtered.slice(). sort((a, b) => {
      const da = new Date(a.data as any). getTime() || 0;
      const db = new Date(b.data as any).getTime() || 0;
      return db - da;
    });

    return filtered.slice(0, 5);
  }, [ordersLocal, userSectorSigla, user?.perfil]);

  async function refresh() {
    if (!user?. codSetor) return;
    setLoading(true);
    setError(null);
    try {
      const resp = await fetch('/api/pedidos/historico? days=45&maxrows=400', {
        headers: {
          'Cache-Control': 'no-cache',
          ...(token ? { Authorization: `Bearer ${token}` } : {})
        }
      });
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
    <div className="bg-white rounded-lg border border-gray-200 p-5 lg:p-6 shadow-sm h-full">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-5">
        <h3 className="text-base lg:text-lg font-semibold text-gray-900">Pedidos do meu Setor</h3>
        <div className="flex items-center gap-2">
          {error && <span className="text-xs text-red-600 truncate max-w-[150px]" title={error}>{error}</span>}
          <button
            onClick={refresh}
            disabled={loading}
            className="inline-flex items-center gap-2 px-3 py-2 bg-white border border-gray-300 rounded-lg text-xs sm:text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors"
            title="Atualizar lista do setor"
            aria-label="Atualizar pedidos"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Atualizar</span>
          </button>
          <Link
            to="/pedidos"
            className="text-xs sm:text-sm text-blue-600 hover:text-blue-700 hover:underline font-medium whitespace-nowrap"
            title="Ver todos os pedidos"
          >
            Ver todos
          </Link>
        </div>
      </div>

      {! user?.codSetor && (
        <div className="text-sm text-gray-500 text-center py-8">
          Seu usuário não está vinculado a um setor. 
        </div>
      )}

      {user?.codSetor && isLoading && (
        <div className="text-sm text-gray-500 text-center py-8">Carregando…</div>
      )}

      {user?.codSetor && !isLoading && rows.length === 0 && (
        <div className="text-sm text-gray-500 text-center py-8">
          Nenhum pedido do seu setor encontrado no período. 
        </div>
      )}

      {user?.codSetor && rows.length > 0 && (
        <div className="overflow-x-auto -mx-5 sm:mx-0">
          <div className="inline-block min-w-full align-middle">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Data</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Horário</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">ID</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Solicitante</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Qtd</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Valor</th>
                  <th scope="col" className="px-4 py-3 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">Status</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {rows.map((o) => (
                  <tr key={`my-sector-${o.id}`} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{formatDate(o.data)}</td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-gray-900 whitespace-nowrap">{formatTime(o.data)}</td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap font-medium">{o.id}</td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-gray-900 max-w-[150px] truncate" title={o.solicitante}>{o.solicitante}</td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-gray-600 whitespace-nowrap">{o.qtdItens ??  0}</td>
                    <td className="px-4 py-3 text-xs sm:text-sm text-gray-900 font-semibold whitespace-nowrap">
                      {brl.format(Number((o as any).valorTotal || 0))}
                    </td>
                    <td className="px-4 py-3 text-xs sm:text-sm whitespace-nowrap">
                      <StatusBadge s={o.status} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}