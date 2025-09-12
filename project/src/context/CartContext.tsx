import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback } from 'react';
import { CartItem, Product } from '../types';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  updateQuantity: (productId: number, newQuantity: number) => void;
  removeFromCart: (productId: number) => void; 
  submitCart: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
  totalValue: number;
  totalItems: number;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de um AuthProvider');
  return context;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const { refetchAllData } = useData();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchCart = useCallback(async () => {
    if (!user) return;
    setIsLoading(true);
    error && setError(null);
    try {
      const response = await fetch(`/api/carrinho/${user.codUsuario}`);
      if (!response.ok) throw new Error('Falha ao carregar carrinho da API.');
      const data: CartItem[] = await response.json();
      setCartItems(data);
    } catch (err: any) {
      console.error(err);
      setCartItems([]);
    } finally {
      setIsLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCartItems([]);
    }
  }, [user, fetchCart]);

  const addToCart = (product: Product, quantity: number) => {
    if (!user) return;

    const originalCart = [...cartItems];
    const existingItem = originalCart.find(item => item.id === product.id);

    if (existingItem) {
      setCartItems(originalCart.map(item =>
        item.id === product.id ? { ...item, quantidade: item.quantidade + quantity } : item
      ));
    } else {
      setCartItems([...originalCart, { ...product, quantidade: quantity }]);
    }

    fetch(`/api/carrinho/${user.codUsuario}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codprod: product.id, qt: quantity, pvenda: product.preco }),
    }).catch(err => {
      console.error("Falha otimista ao adicionar ao carrinho:", err);
      setCartItems(originalCart);
      alert("Não foi possível adicionar o item ao carrinho.");
    });
  };

  const removeFromCart = (productId: number) => {
    if (!user) return;

    const originalCart = [...cartItems];
   
    setCartItems(originalCart.filter(item => item.id !== productId));

    fetch(`/api/carrinho/${user.codUsuario}/items/${productId}`, {
      method: 'DELETE',
    }).catch(err => {
      console.error("Falha otimista ao remover item:", err);
      setCartItems(originalCart);
      alert("Não foi possível remover o item do carrinho.");
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (!user || newQuantity < 1) return;

    const originalCart = [...cartItems];

    setCartItems(originalCart.map(item =>
      item.id === productId ? { ...item, quantidade: newQuantity } : item
    ));

    fetch(`/api/carrinho/${user.codUsuario}/items/${productId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ qt: newQuantity }),
    }).catch(err => {
      console.error("Falha otimista ao atualizar quantidade:", err);
      setCartItems(originalCart);
      alert("Não foi possível atualizar a quantidade do item.");
    });
  };

  const submitCart = async () => {
    if (!user) return;
    try {
      const response = await fetch(`/api/carrinho/${user.codUsuario}/submit`, { method: 'POST' });
      if (!response.ok) throw new Error('Falha ao submeter pedido.');
      setCartItems([]);
      await refetchAllData();
      alert('Pedido enviado para aprovação!');
    } catch (error) {
      console.error("Erro ao submeter carrinho:", error);
      alert('Ocorreu um erro ao enviar o pedido.');
    }
  };

  const totalValue = cartItems.reduce((sum, item) => sum + (item.preco || 0) * (item.quantidade || 0), 0);
  const itemCount = cartItems.length;

  const value = { cartItems, isLoading, error, totalValue, totalItems: itemCount, addToCart, updateQuantity, removeFromCart, submitCart };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
};

