import { useState, useMemo } from 'react';
import { CheckIcon, XIcon } from 'lucide-react';
import { useData } from '../context/DataContext';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole } from '../utils/roles';

const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

type PedidoPendenteLocal = {
  id: number;
  data: string;
  solicitante: string;
  unidadeAdmin?: string;
  qtdItens?: number;
  valor?: number;
  [key: string]: any;
};

export default function QuickApprovalTable() {
  const { pedidosPendentes, refetchAllData } = useData();
  const { token, user } = useAuth();
  const [loadingActions, setLoadingActions] = useState<Record<number, 'approve' | 'reject' | null>>({});

  const canSee = useMemo(() => hasAnyRole(user, ['ADMIN', 'APROVADOR']), [user]);
  if (!canSee) return null;

  const recentOrders = (pedidosPendentes || [])
    .slice(0, 5)
    .map((pedido: PedidoPendenteLocal) => ({
      id: pedido.id,
      numero: pedido.id,
      solicitante: pedido.solicitante,
      dataCriacao: pedido.data,
      valorTotal: pedido.valor,
    }));

  const handleStatusUpdate = async (orderId: number, newStatus: number, actionType: 'approve' | 'reject') => {
    if (!token) {
      console.warn('Sem token, não é possível atualizar status.');
      return;
    }

    setLoadingActions(prev => ({ ...prev, [orderId]: actionType }));

    try {
      const response = await fetch(`${API_BASE}/pedido/${orderId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!response.ok) {
        throw new Error('Erro ao atualizar status do pedido');
      }

      await refetchAllData();
    } catch (error) {
      console.error('Erro ao atualizar pedido:', error);
    } finally {
      setLoadingActions(prev => ({ ...prev, [orderId]: null }));
    }
  };

  const handleApprove = (orderId: number) => handleStatusUpdate(orderId, 1, 'approve');
  const handleReject = (orderId: number) => handleStatusUpdate(orderId, 2, 'reject');

  if (!recentOrders.length) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-6">
        <h3 className="mb-4 text-lg font-medium text-gray-900">Aprovação Rápida</h3>
        <div className="py-8 text-center text-sm text-gray-500">
          Não há pedidos pendentes para aprovação.
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6">
      <h3 className="mb-4 text-lg font-medium text-gray-900">Aprovação Rápida</h3>

      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Nº do Pedido
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Solicitante
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Data
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Valor
              </th>
              <th className="px-4 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
                Ações
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {recentOrders.map((order) => {
              const isLoading = loadingActions[order.id];
              return (
                <tr key={order.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-4 py-4 text-sm font-medium text-gray-900">
                    #{order.numero || order.id}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                    {order.solicitante}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                    {order.dataCriacao
                      ? new Date(order.dataCriacao).toLocaleDateString('pt-BR')
                      : '-'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-sm text-gray-900">
                    {order.valorTotal?.toLocaleString('pt-BR', {
                      style: 'currency',
                      currency: 'BRL',
                    }) || 'R$ 0,00'}
                  </td>
                  <td className="whitespace-nowrap px-4 py-4 text-center text-sm">
                    <div className="flex justify-center space-x-2">
                      <button
                        onClick={() => handleApprove(order.id)}
                        disabled={!!isLoading}
                        className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          isLoading === 'approve'
                            ? 'bg-green-100 text-green-600 cursor-not-allowed'
                            : 'bg-green-600 text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2'
                        }`}
                      >
                        {isLoading === 'approve' ? (
                          <div className="h-3 w-3 animate-spin rounded-full border border-green-600 border-t-transparent" />
                        ) : (
                          <CheckIcon className="h-3 w-3" />
                        )}
                        <span className="ml-1">Aprovar</span>
                      </button>

                      <button
                        onClick={() => handleReject(order.id)}
                        disabled={!!isLoading}
                        className={`inline-flex items-center rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                          isLoading === 'reject'
                            ? 'bg-red-100 text-red-600 cursor-not-allowed'
                            : 'bg-red-600 text-white hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2'
                        }`}
                      >
                        {isLoading === 'reject' ? (
                          <div className="h-3 w-3 animate-spin rounded-full border border-red-600 border-t-transparent" />
                        ) : (
                          <XIcon className="h-3 w-3" />
                        )}
                        <span className="ml-1">Reprovar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}