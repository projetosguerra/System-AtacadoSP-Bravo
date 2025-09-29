import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
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
  sectorLimit: number;
  sectorSpentValue: number;
  sectorAvailableBalance: number;
  cartWillExceedLimit: boolean;
}

const CartContext = createContext<CartContextType | undefined>(undefined);

export const useCart = () => {
  const context = useContext(CartContext);
  if (!context) throw new Error('useCart deve ser usado dentro de um CartProvider');
  return context;
};

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { refetchAllData, setores, financialData } = useData();
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
      console.error('[fetchCart] erro:', err);
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

  const totalValue = useMemo(
    () => cartItems.reduce((sum, item) => sum + (item.preco || 0) * (item.quantidade || 0), 0),
    [cartItems]
  );
  const itemCount = cartItems.length;

  const { sectorLimit, sectorSpentValue, sectorAvailableBalance, isBudgetReady } = useMemo(() => {
    const ready = !!user?.codSetor && Array.isArray(setores) && setores.length > 0 && !!financialData;
    if (!ready) {
      return {
        sectorLimit: 0,
        sectorSpentValue: 0,
        sectorAvailableBalance: 0,
        isBudgetReady: false,
      };
    }
    const currentUserSector = setores.find((s) => Number(s.CODSETOR) === Number(user!.codSetor));
    const limit = Number(currentUserSector?.SALDO || 0);
    const spent = Number(
      financialData?.gastosPorSetor?.find((g) => Number(g.CODSETOR) === Number(user!.codSetor))?.GASTO_TOTAL || 0
    );
    const available = limit - spent;

    return {
      sectorLimit: limit,
      sectorSpentValue: spent,
      sectorAvailableBalance: available,
      isBudgetReady: true,
    };
  }, [user, setores, financialData]);

  const addToCart = (product: Product, quantity: number) => {
    if (!user) return;

    const projected = totalValue + product.preco * quantity;

    if (isBudgetReady && projected > sectorAvailableBalance) {
      console.warn(
        `[BUDGET] Projeção excede saldo. Total projetado: ${projected} > saldo disponível: ${sectorAvailableBalance}. A validação forte ocorrerá na submissão.`
      );
    }

    const originalCart = [...cartItems];
    const existingItem = originalCart.find((item) => item.id === product.id);

    if (existingItem) {
      setCartItems(
        originalCart.map((item) =>
          item.id === product.id ? { ...item, quantidade: item.quantidade + quantity } : item
        )
      );
    } else {
      setCartItems([...originalCart, { ...product, quantidade: quantity }]);
    }

    fetch(`/api/carrinho/${user.codUsuario}/items`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ codprod: product.id, qt: quantity, pvenda: product.preco }),
    }).catch((err) => {
      console.error('Falha otimista ao adicionar ao carrinho:', err);
      setCartItems(originalCart);
      alert('Não foi possível adicionar o item ao carrinho.');
    });
  };

  const removeFromCart = (productId: number) => {
    if (!user) return;

    const originalCart = [...cartItems];

    setCartItems(originalCart.filter((item) => item.id !== productId));

    fetch(`/api/carrinho/${user.codUsuario}/items/${productId}`, {
      method: 'DELETE',
    }).catch((err) => {
      console.error('Falha otimista ao remover item:', err);
      setCartItems(originalCart);
      alert('Não foi possível remover o item do carrinho.');
    });
  };

  const updateQuantity = (productId: number, newQuantity: number) => {
    if (!user || newQuantity < 1) return;

    const originalCart = [...cartItems];

    setCartItems(
      originalCart.map((item) => (item.id === productId ? { ...item, quantidade: newQuantity } : item))
    );

    fetch(`/api/carrinho/${user.codUsuario}/items/${productId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ qt: newQuantity }),
    }).catch((err) => {
      console.error('Falha otimista ao atualizar quantidade:', err);
      setCartItems(originalCart);
      alert('Não foi possível atualizar a quantidade do item.');
    });
  };

  const submitCart = async () => {
    if (!user || cartItems.length === 0) return;

    try {
      const idemKey = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const response = await fetch(`/api/carrinho/${user.codUsuario}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idemKey,
          Authorization: `Bearer ${token || ''}`,
        },
        body: JSON.stringify({}),
      });
      if (response.ok) {
        setCartItems([]);
        await refetchAllData();
        alert('Pedido enviado para aprovação!');
      } else {
        const errorBody = await response.json().catch(() => ({}));
        throw new Error(errorBody.error || 'Erro ao submeter carrinho.');
      }
    } catch (err: any) {
      console.error('[submitCart] erro:', err);
      alert(err.message || 'Erro ao submeter carrinho.');
    }
  };

  const cartWillExceedLimit = isBudgetReady && totalValue > sectorAvailableBalance;

  const value = {
    cartItems,
    isLoading,
    error,
    totalValue,
    totalItems: itemCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    submitCart,
  };

  return (
    <CartContext.Provider
      value={{
        ...value,
        sectorLimit,
        sectorSpentValue,
        sectorAvailableBalance,
        cartWillExceedLimit,
      }}
    >
      {children}
    </CartContext.Provider>
  );
};