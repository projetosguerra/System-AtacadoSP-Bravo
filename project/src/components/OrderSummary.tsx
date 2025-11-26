import React from 'react';
import { ShoppingCart, AlertCircle, DollarSign, TrendingUp } from 'lucide-react';

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
  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);
  const remainingBudget = availableBalance - total;
  const isOverBudget = willExceedLimit;

  return (
    <div className="space-y-5">
      {/* Card de resumo do pedido */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-5 h-5 text-blue-600" />
          <h2 className="text-base font-semibold text-gray-800">Resumo do Pedido</h2>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600 text-sm">Subtotal</span>
            <span className="font-semibold text-gray-900 text-sm">{formatCurrency(total)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-600 text-sm">Frete</span>
            <span className="font-medium text-green-600 text-sm">Grátis</span>
          </div>
          <hr className="border-gray-200" />
          <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
            <span className="text-gray-800 font-semibold text-sm">Total do Pedido</span>
            <span className="text-blue-600 font-bold text-base">{formatCurrency(total)}</span>
          </div>
        </div>
      </div>

      {/* Card de controle de orçamento */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-5 h-5 text-green-600" />
          <h2 className="text-base font-semibold text-gray-800">Controle de Orçamento</h2>
        </div>
        <div className="space-y-3">
          <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
            <span className="text-gray-700 text-sm">Saldo Disponível do Setor</span>
            <span className="font-bold text-green-600 text-sm">{formatCurrency(availableBalance)}</span>
          </div>
          <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
            <span className="text-gray-700 text-sm">Saldo Restante Após Pedido</span>
            <span className={`font-bold text-sm ${isOverBudget ? 'text-red-600' : 'text-green-600'}`}>
              {formatCurrency(remainingBudget)}
            </span>
          </div>

          {/* Alerta de excesso de orçamento */}
          {isOverBudget && (
            <div className="bg-red-50 border-2 border-red-200 rounded-lg p-3 mt-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-red-700 mb-1">
                    Orçamento Excedido
                  </p>
                  <p className="text-xs text-red-600">
                    Este pedido excede o saldo disponível da unidade (limite total – valor gasto aprovado e pago). 
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Botões de ação */}
      <div className="space-y-3">
        <button
          onClick={onSubmitOrder}
          disabled={isOverBudget}
          className="w-full bg-green-600 hover:bg-green-700 text-white font-semibold py-3 px-4 rounded-lg transition-all duration-200 flex items-center justify-center gap-2 disabled:bg-gray-400 disabled:cursor-not-allowed disabled:opacity-60 shadow-md hover:shadow-lg text-sm"
        >
          <ShoppingCart className="w-5 h-5" />
          Enviar para Aprovação
        </button>

        <button
          onClick={onClearCart}
          className="w-full text-gray-600 hover:text-gray-800 hover:bg-gray-100 font-medium py-3 px-4 rounded-lg transition-all duration-200 border border-gray-300 text-sm"
        >
          Limpar Carrinho
        </button>
      </div>

      {/* Informação adicional */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
        <p className="flex items-start gap-2">
          <DollarSign className="w-4 h-4 flex-shrink-0 mt-0.5" />
          <span>
            Seu pedido será enviado para aprovação antes da finalização da compra.
          </span>
        </p>
      </div>
    </div>
  );
};

export default OrderSummary;