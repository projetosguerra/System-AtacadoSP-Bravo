// Versão totalmente responsiva com melhor visualização em todos os dispositivos
import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import CartItemsTable from '../components/CartItemsTable';
import OrderSummary from '../components/OrderSummary';
import { useCart } from '../context/CartContext';

const CartPage: React.FC = () => {
  const {
    cartItems,
    isLoading,
    error,
    updateQuantity,
    removeFromCart,
    submitCart,
    clearCart,
    totalValue,
    sectorLimit,
    sectorSpentValue,
    sectorAvailableBalance,
    cartWillExceedLimit
  } = useCart();

  const handleClearCart = () => {
    clearCart();
  };


  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (isLoading) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600 mx-auto mb-3"></div>
        <p className="text-gray-600 text-sm">A carregar carrinho...</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="flex items-center justify-center min-h-screen bg-gray-50">
      <div className="text-center p-8 text-red-600 bg-white rounded-lg shadow-md max-w-md">
        <p className="font-semibold mb-2 text-sm">Erro ao carregar carrinho</p>
        <p className="text-xs">{error}</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header compacto */}
      <div className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-[1600px] mx-auto px-4 py-4 sm:px-6 lg:px-8">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <h1 className="text-xl lg:text-2xl font-bold text-gray-800 flex items-center gap-2">
              <ShoppingBag className="w-5 h-5 lg:w-6 lg:h-6 text-blue-600" />
              Carrinho de Compras
            </h1>
            <Link
              to="/catalogo-produtos"
              className="inline-flex items-center justify-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors text-sm hover:bg-blue-50 rounded-lg px-3 py-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Continuar Comprando
            </Link>
          </div>
        </div>
      </div>

      {/* Container principal */}
      <div className="max-w-[1600px] mx-auto px-4 py-6 sm:px-6 lg:px-8">
        {cartItems.length === 0 ? (
          <div className="text-center py-12 bg-white rounded-lg shadow-sm">
            <ShoppingBag className="w-16 h-16 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-600 text-base mb-4">Seu carrinho está vazio</p>
            <Link
              to="/catalogo-produtos"
              className="inline-flex items-center gap-2 bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
            >
              Ver Produtos
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* Área principal da tabela - 8 colunas */}
            <div className="lg:col-span-8">
              <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-800">
                    Itens no Carrinho ({cartItems.length})
                  </h2>
                </div>
                <div className="overflow-x-auto">
                  <CartItemsTable
                    items={cartItems}
                    onUpdateQuantity={updateQuantity}
                    onRemoveItem={removeFromCart}
                  />
                </div>
              </div>
            </div>

            {/* Sidebar - 4 colunas */}
            <div className="lg:col-span-4 space-y-5">
              {/* Card de resumo do orçamento do setor */}
              <div className="bg-white p-5 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-base font-semibold mb-4 text-gray-800 flex items-center gap-2">
                  <span className="w-2 h-2 bg-blue-600 rounded-full"></span>
                  Resumo do Orçamento do Setor
                </h2>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 text-sm">Limite Total</span>
                    <span className="font-semibold text-gray-900 text-sm">{formatCurrency(sectorLimit)}</span>
                  </div>
                  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <span className="text-gray-600 text-sm">Valor Gasto</span>
                    <span className="font-semibold text-gray-900 text-sm">{formatCurrency(sectorSpentValue)}</span>
                  </div>
                  <hr className="my-2" />
                  <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200">
                    <span className="text-gray-700 font-medium text-sm">Saldo Disponível</span>
                    <span className="font-bold text-green-600 text-base">{formatCurrency(sectorAvailableBalance)}</span>
                  </div>
                </div>
              </div>

              {/* Componente OrderSummary */}
              <OrderSummary
                total={totalValue}
                availableBalance={sectorAvailableBalance}
                willExceedLimit={cartWillExceedLimit}
                onSubmitOrder={submitCart}
                onClearCart={handleClearCart}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CartPage;