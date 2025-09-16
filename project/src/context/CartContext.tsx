import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { CartItem, Product } from '../types';
import { useAuth } from './AuthContext';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => Promise<void>;
  updateQuantity: (productId: number, newQuantity: number) => Promise<void>;
  removeFromCart: (productId: number) => Promise<void>;
  submitCart: () => Promise<void>;
  clearCart: () => void;
  isLoading: boolean;
  error: string | null;
  totalValue: number;
  totalItems: number;

}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { currentUser } = useAuth();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchCart = useCallback(async () => {
    if (!currentUser) return;
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch(`/api/carrinho/${currentUser.codUsuario}`);
      if (!response.ok) throw new Error('Falha ao buscar o carrinho');
      const data = await response.json();
      setCartItems(data.items || []);
    } catch (err: any) {
      setError(err.message);
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      fetchCart();
    } else {
      setCartItems([]);
    }
  }, [currentUser, fetchCart]);

  const addToCart = async (product: Product, quantity: number) => { 
    if (!currentUser) return;

    const existingItem = cartItems.find(item => item.id === product.id);
    const originalCart = [...cartItems];

    if (existingItem) {
      setCartItems(cartItems.map(item =>
        item.id === product.id ? { ...item, quantidade: item.quantidade + quantity } : item
      ));
    } else {
      setCartItems([...cartItems, { ...product, quantidade: quantity }]);
    }

    try {
      await fetch(`/api/carrinho/${currentUser.codUsuario}/items`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ codprod: product.id, qt: quantity, pvenda: product.preco })
      });
    } catch (err) {
      console.error("Falha ao adicionar ao carrinho:", err);
      setCartItems(originalCart);
      setError("Não foi possível adicionar o item.");
    }
  };

  const updateQuantity = async (productId: number, newQuantity: number) => {
    const originalCartItems = [...cartItems];
    setCartItems(prev => prev.map(item => item.id === productId ? { ...item, quantidade: newQuantity } : item).filter(item => item.quantidade > 0));
    try {
      const method = newQuantity > 0 ? 'PUT' : 'DELETE';
      if (!currentUser) return;
      await fetch(`/api/carrinho/${currentUser.codUsuario}/items/${productId}`, {
        method: method,
        headers: { 'Content-Type': 'application/json' },
        body: newQuantity > 0 ? JSON.stringify({ qt: newQuantity }) : undefined,
      });
    } catch (err) { setCartItems(originalCartItems); }
  };

  const removeFromCart = async (productId: number) => {
    const originalCartItems = [...cartItems];
    setCartItems(prev => prev.filter(item => item.id !== productId));
    try {
      if (!currentUser) return;
      await fetch(`/api/carrinho/${currentUser.codUsuario}/items/${productId}`, {
        method: 'DELETE'
      });
    } catch (err) { setCartItems(originalCartItems); }
  };

  const submitCart = async () => {
    if (!currentUser) {
      alert("Nenhum usuário selecionado. Não é possível enviar o pedido.");
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch(`/api/carrinho/${currentUser.codUsuario}/submit`, {
        method: 'POST',
      });

      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Falha ao enviar pedido.');
      }

      alert('Pedido enviado para aprovação com sucesso!');

      setCartItems([]);

    } catch (err: any) {
      console.error("Erro ao submeter carrinho:", err);
      setError(err.message);
      alert(`Erro: ${err.message}`);
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearCart = () => {
    setCartItems([]);
  };

  const totalValue = cartItems.reduce((acc, item) => acc + (item.preco * item.quantidade), 0);
  const itemCount = cartItems.length;

  return (
    <CartContext.Provider value={{
      cartItems, addToCart, updateQuantity, removeFromCart,
      submitCart, clearCart, isLoading, error, totalValue, totalItems: itemCount
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = (): CartContextType => {
  const context = useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
};

