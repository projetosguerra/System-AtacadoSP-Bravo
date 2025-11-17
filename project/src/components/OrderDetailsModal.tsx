import React, { useEffect } from 'react';
import { X } from 'lucide-react';

interface OrderDetailsModalProps {
  open: boolean;
  order: any | null;
  onClose: () => void;
}

const statusLabel: Record<number, string> = {
  1: 'Aprovado',
  2: 'Reprovado',
  3: 'Em Análise',
  5: 'Pendente',
};

function formatDateTime(dt?: string) {
  if (!dt) return { date: '-', time: '-' };
  const d = new Date(dt);
  if (isNaN(d.getTime())) return { date: '-', time: '-' };
  return {
    date: d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' }),
    time: d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
  };
}

function formatCurrency(v?: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(Number(v || 0));
}

const OrderDetailsModal: React.FC<OrderDetailsModalProps> = ({ open, order, onClose }) => {
  useEffect(() => {
    function onEsc(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose();
    }
    if (open) document.addEventListener('keydown', onEsc);
    return () => document.removeEventListener('keydown', onEsc);
  }, [open, onClose]);

  if (!open || !order) return null;

  const dt = formatDateTime(order.data);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />

      {/* modal */}
      <div className="relative bg-white w-full max-w-3xl rounded-lg shadow-xl z-10">
        <div className="flex items-center justify-between px-6 py-4 border-b">
          <h3 className="text-lg font-semibold">Detalhes do Pedido #{order.id}</h3>
          <button
            onClick={onClose}
            className="p-2 rounded hover:bg-gray-100"
            aria-label="Fechar"
          >
            <X className="w-5 h-5 text-gray-600" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <div className="text-xs text-gray-500">Data</div>
              <div className="font-medium">{dt.date}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Horário</div>
              <div className="font-medium">{dt.time}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Status</div>
              <div className="font-medium">{statusLabel[order.status] || `Desconhecido (${order.status})`}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Solicitante</div>
              <div className="font-medium">{order.solicitante || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Unidade Administrativa</div>
              <div className="font-medium">{order.setor || '-'}</div>
            </div>
            <div>
              <div className="text-xs text-gray-500">Valor Total</div>
              <div className="font-medium">{formatCurrency(order.valorTotal)}</div>
            </div>
          </div>

          {/* seções para evoluir depois com backend de detalhes */}
          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Itens</h4>
            <div className="text-sm text-gray-500">
              Em breve: listagem de itens, quantidades e subtotais.
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Logística</h4>
            <div className="text-sm text-gray-500">
              Em breve: transportadora, previsão e código de rastreio.
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Financeiro</h4>
            <div className="text-sm text-gray-500">
              Em breve: dados de faturamento e NF.
            </div>
          </div>

          <div className="space-y-3">
            <h4 className="font-semibold text-gray-800">Histórico</h4>
            <div className="text-sm text-gray-500">
              Em breve: linha do tempo de status e ações.
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md bg-gray-100 text-gray-700 hover:bg-gray-200"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};

export default OrderDetailsModal;