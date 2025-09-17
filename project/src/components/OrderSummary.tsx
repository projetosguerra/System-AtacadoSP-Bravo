import React from 'react';
import { ShoppingCart, AlertCircle } from 'lucide-react';

export interface OrderSummaryProps {
  total: number;
  availableBalance: number;
  willExceedLimit: boolean; 
  onSubmitOrder: () => Promise<void>;
  onClearCart: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ 
  total,
  availableBalance,
  willExceedLimit,
  onSubmitOrder, 
  onClearCart 
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const remainingBudget = availableBalance - total;
  const isOverBudget = willExceedLimit;

  return (
    <div className="space-y-6">
      {/* Resumo do Pedido */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-800">Resumo do Pedido</h2>
        </div>
        
        <div className="space-y-3 text-sm">
          {/* Subtotal e Frete */}
          <div className="flex justify-between">
            <span className="text-gray-600">Subtotal</span>
            <span className="text-gray-900">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-gray-600">Frete</span>
            <span className="text-gray-900">Grátis</span>
          </div>
          <hr />
          {/* Total */}
          <div className="flex justify-between font-bold text-base">
            <span className="text-gray-800">Total do Pedido</span>
            <span className="text-gray-900">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">
          Controle de Orçamento
        </h2>
        <div>
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Saldo Disponível do Setor</span>
              <span className="font-medium text-green-600">{formatCurrency(availableBalance)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">Saldo Restante Após Pedido</span>
              <span className={`font-medium ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
                {formatCurrency(remainingBudget)}
              </span>
            </div>
          </div>

          {isOverBudget && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 mt-3">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
                <p className="text-sm text-red-700">
                  Este pedido excede o orçamento disponível da unidade.
                </p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Ações */}
      <div className="space-y-3">
        <button
          onClick={onSubmitOrder}
          disabled={isOverBudget}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          <ShoppingCart className="w-5 h-5" />
          Enviar para Aprovação
        </button>
        
        <button
          onClick={onClearCart}
          className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 font-medium py-3 px-4 rounded-lg transition-colors"
        >
          Limpar Carrinho
        </button>
      </div>
    </div>
  );
};

export default OrderSummary;