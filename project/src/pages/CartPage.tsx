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
    totalValue,
    sectorLimit,
    sectorSpentValue,
    sectorAvailableBalance,
    cartWillExceedLimit
  } = useCart();

  const handleClearCart = () => {
    if (window.confirm('Tem certeza que deseja esvaziar o carrinho?')) {
      cartItems.forEach(item => removeFromCart(Number(item.id)));
    }
  };

  const formatCurrency = (value: number) => new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

  if (isLoading) return <div className="text-center p-12">A carregar carrinho...</div>;
  if (error) return <div className="text-center p-12 text-red-600">Erro ao carregar carrinho: {error}</div>;

  if (cartItems.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Carrinho de Compras</h1>
          <Link to="/catalogo-produtos" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors">
            <ArrowLeft className="w-4 h-4" />
            Continuar Comprando
          </Link>
        </div>
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Seu carrinho está vazio</h3>
          <p className="text-gray-500 mb-6">Adicione alguns produtos do catálogo para começar suas compras.</p>
          <Link to="/catalogo-produtos" className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors">
            <ShoppingBag className="w-4 h-4" />
            Voltar ao Catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 bg-gray-50 min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-3xl font-bold text-gray-800">Carrinho de Compras</h1>
        <Link to="/catalogo-produtos" className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Continuar Comprando
        </Link>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        <div className="lg:col-span-2">
          <CartItemsTable
            items={cartItems}
            onUpdateQuantity={updateQuantity}
            onRemoveItem={removeFromCart}
          />
        </div>
        
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-200">
                <h2 className="text-lg font-semibold mb-4 text-gray-800">Resumo do Orçamento do Setor</h2>
                <div className="space-y-3 text-sm">
                    <div className="flex justify-between">
                        <span className="text-gray-600">Limite Total:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(sectorLimit)}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-gray-600">Valor Já Gasto:</span>
                        <span className="font-medium text-gray-900">{formatCurrency(sectorSpentValue)}</span>
                    </div>
                    <hr/>
                    <div className="flex justify-between font-bold">
                        <span className="text-gray-600">Saldo Disponível:</span>
                        <span className="text-green-600">{formatCurrency(sectorAvailableBalance)}</span>
                    </div>
                </div>
            </div>

            <OrderSummary
              total={totalValue}
              availableBalance={sectorAvailableBalance}
              willExceedLimit={cartWillExceedLimit}
              onSubmitOrder={submitCart}
              onClearCart={handleClearCart}
            />
        </div>
      </div>
    </div>
  );
};

export default CartPage;