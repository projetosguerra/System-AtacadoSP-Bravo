import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchPendingApprovals, PendingOrder } from '../services/orders';
import { useAuth } from '../context/AuthContext';

function getOrderDetailsPath(id: number) {
  return `/pedido/${id}`;
}

export default function ApprovalTable() {
  const { token, user } = useAuth();
  const navigate = useNavigate();

  const [rows, setRows] = useState<PendingOrder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const canSee = useMemo(() => {
    const perfil = user?.perfil;
    return Number(perfil) === 1 || Number(perfil) === 2;
  }, [user]);

  useEffect(() => {
    if (!canSee) return;
    const abort = new AbortController();
    setLoading(true);
    setError(null);

    fetchPendingApprovals({ token, limit: 5, includeInAnalysis: true, signal: abort.signal })
      .then(setRows)
      .catch((e) => setError(e.message || 'Erro ao carregar'))
      .finally(() => setLoading(false));

    return () => abort.abort();
  }, [token, canSee]);

  if (!canSee) return null;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-sm font-medium text-gray-700">Fila de Aprovação Rápida</h3>
      </div>

      {loading ? (
        <div className="py-6 text-sm text-gray-500">Carregando...</div>
      ) : error ? (
        <div className="py-6 text-sm text-red-600">{error}</div>
      ) : rows.length === 0 ? (
        <div className="py-6 text-sm text-gray-500">Sem pedidos pendentes.</div>
      ) : (
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="text-gray-500">
                <th className="px-2 py-2 font-medium">Pedido</th>
                <th className="px-2 py-2 font-medium">Setor</th>
                <th className="px-2 py-2 font-medium">Solicitante</th>
                <th className="px-2 py-2 font-medium">Data</th>
                <th className="px-2 py-2 font-medium">Total</th>
                <th className="px-2 py-2 font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t">
                  <td className="px-2 py-2">
                    <span className="font-medium text-gray-800">#{r.numero || r.id}</span>
                  </td>
                  <td className="px-2 py-2">{r.setor}</td>
                  <td className="px-2 py-2">{r.solicitante}</td>
                  <td className="px-2 py-2">
                    {new Date(r.dataCriacao).toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-2 py-2">
                    {r.total?.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
                  </td>
                  <td className="px-2 py-2 text-right">
                    <button
                      onClick={() => navigate(getOrderDetailsPath(r.id))}
                      className="rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-700"
                    >
                      Analisar
                    </button>
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