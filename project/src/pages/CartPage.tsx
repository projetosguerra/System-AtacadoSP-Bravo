import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, ShoppingBag } from 'lucide-react';
import CartItemsTable from '../components/CartItemsTable';
import OrderSummary from '../components/OrderSummary';
import { CartItem } from '../types';
import { mockCartItems } from '../data/mockCart';

const CartPage: React.FC = () => {
  const [cartItems, setCartItems] = useState<CartItem[]>(mockCartItems);

  const handleUpdateQuantity = (productId: string, newQuantity: number) => {
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, quantity: newQuantity } : item
      )
    );
  };

  const handleRemoveItem = (productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  };

  const handleSubmitOrder = () => {
    // Por enquanto, apenas um console.log
    console.log('Pedido enviado para aprovação:', cartItems);
    alert('Pedido enviado para aprovação com sucesso!');
  };

  const handleClearCart = () => {
    if (window.confirm('Tem certeza que deseja esvaziar o carrinho?')) {
      setCartItems([]);
    }
  };

  // Estado vazio
  if (cartItems.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900">Carrinho de Compras</h1>
          <Link
            to="/catalogo"
            className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Continuar Comprando
          </Link>
        </div>

        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
          <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <ShoppingBag className="w-8 h-8 text-gray-400" />
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            Seu carrinho está vazio
          </h3>
          <p className="text-gray-500 mb-6">
            Adicione alguns produtos do catálogo para começar suas compras.
          </p>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-2 bg-green-600 hover:bg-green-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <ShoppingBag className="w-4 h-4" />
            Voltar ao Catálogo
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Carrinho de Compras</h1>
        <Link
          to="/catalogo"
          className="flex items-center gap-2 text-blue-600 hover:text-blue-800 font-medium transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Continuar Comprando
        </Link>
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Cart Items - 2/3 width on large screens */}
        <div className="lg:col-span-2">
          <CartItemsTable
            items={cartItems}
            onUpdateQuantity={handleUpdateQuantity}
            onRemoveItem={handleRemoveItem}
          />
        </div>

        {/* Order Summary - 1/3 width on large screens */}
        <div className="lg:col-span-1">
          <OrderSummary
            items={cartItems}
            onSubmitOrder={handleSubmitOrder}
            onClearCart={handleClearCart}
          />
        </div>
      </div>
    </div>
  );
};

export default CartPage;