import React from 'react';
import { ShoppingCart, AlertCircle } from 'lucide-react';
import { CartItem } from '../types';

interface OrderSummaryProps {
  items: CartItem[];
  onSubmitOrder: () => void;
  onClearCart: () => void;
}

const OrderSummary: React.FC<OrderSummaryProps> = ({ 
  items, 
  onSubmitOrder, 
  onClearCart 
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  const subtotal = items.reduce((sum, item) => sum + (item.preco * item.quantidade), 0);
  const shipping = 0; // Frete gratuito para B2B
  const total = subtotal + shipping;

  // Dados falsos para orçamento da unidade
  const unitBudget = 17250.00;
  const remainingBudget = unitBudget - total;
  const isOverBudget = remainingBudget < 0;

  return (
    <div className="space-y-6">
      {/* Resumo do Pedido */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <ShoppingCart className="w-5 h-5 text-gray-600" />
          <h2 className="text-lg font-semibold text-gray-900">Resumo do Pedido</h2>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Subtotal ({items.length} {items.length === 1 ? 'item' : 'itens'})</span>
            <span className="text-gray-900">{formatCurrency(subtotal)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Frete</span>
            <span className="text-green-600 font-medium">Grátis</span>
          </div>
          
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-lg font-semibold">
              <span className="text-gray-900">Total</span>
              <span className="text-gray-900">{formatCurrency(total)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Controle de Orçamento */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        <div className="flex items-center gap-2 mb-4">
          <AlertCircle className={`w-5 h-5 ${isOverBudget ? 'text-red-500' : 'text-blue-500'}`} />
          <h3 className="text-lg font-semibold text-gray-900">Controle de Orçamento</h3>
        </div>

        <div className="space-y-3">
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Saldo Atual da Unidade</span>
            <span className="text-gray-900 font-medium">{formatCurrency(unitBudget)}</span>
          </div>
          
          <div className="flex justify-between text-sm">
            <span className="text-gray-600">Valor do Pedido</span>
            <span className="text-gray-900">{formatCurrency(total)}</span>
          </div>
          
          <div className="border-t border-gray-200 pt-3">
            <div className="flex justify-between text-sm">
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
                  Este pedido excede o orçamento disponível da unidade. Será necessária aprovação especial.
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
          className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-3 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
        >
          <ShoppingCart className="w-5 h-5" />
          Enviar para Aprovação
        </button>
        
        <button
          onClick={onClearCart}
          className="w-full text-gray-600 hover:text-gray-800 font-medium py-2 px-4 rounded-lg hover:bg-gray-50 transition-colors text-sm"
        >
          Esvaziar Carrinho
        </button>
      </div>
    </div>
  );
};

export default OrderSummary;