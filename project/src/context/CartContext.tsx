import React, { createContext, useState, useContext, ReactNode, useEffect, useCallback, useMemo } from 'react';
import { CartItem, Product } from '../types';
import { useAuth } from './AuthContext';
import { useData } from './DataContext';

interface CartContextType {
  cartItems: CartItem[];
  addToCart: (product: Product, quantity: number) => void;
  updateQuantity: (productId: number, newQuantity: number) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => Promise<void>; // NOVO
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
  if (!context) throw new Error('useCart deve ser usado dentro de um AuthProvider');
  return context;
};

type FinanceData = { gastosPorSetor: { CODSETOR: number; DESCRICAO: string; GASTO_TOTAL: number }[] };

export const CartProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const { user, token } = useAuth();
  const { refetchAllData, setores, financialData } = useData();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [financeLocal, setFinanceLocal] = useState<FinanceData | null>(null);

  const effectiveFinance = (financialData && Array.isArray(financialData.gastosPorSetor) && financialData.gastosPorSetor.length > 0)
    ? financialData
    : financeLocal;

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
  }, [user, error]);

  useEffect(() => {
    if (user) {
      fetchCart();
    } else {
      setCartItems([]);
    }
  }, [user, fetchCart]);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!user?.codSetor) return;

      const hasCtx = !!(financialData && Array.isArray(financialData.gastosPorSetor) && financialData.gastosPorSetor.length);
      const hasSectorInCtx = hasCtx && financialData!.gastosPorSetor.some((g: any) => Number(g.CODSETOR) === Number(user.codSetor));
      if (hasSectorInCtx) return;

      try {
        const aggParams = new URLSearchParams({ days: '90', maxOrders: '600' });
        const headers: Record<string, string> = {};
        if (token) headers.Authorization = `Bearer ${token}`;
        const respAgg = await fetch(`/api/financeiro?${aggParams.toString()}`, { headers });
        const bodyAgg = await respAgg.json().catch(() => ({ gastosPorSetor: [] }));
        const arr = Array.isArray(bodyAgg.gastosPorSetor) ? bodyAgg.gastosPorSetor : [];
        const hit = arr.find((g: any) => Number(g.CODSETOR) === Number(user.codSetor));
        if (hit) {
          setFinanceLocal({ gastosPorSetor: arr });
          console.info('[CartBudget][finance-agg-hit]', hit);
          return;
        }

        const respOne = await fetch(`/api/financeiro/setor/${user.codSetor}?days=90&maxOrders=600`, { headers });
        const one = await respOne.json().catch(() => ({ CODSETOR: user.codSetor, GASTO_TOTAL: 0 }));
        setFinanceLocal({ gastosPorSetor: [{ CODSETOR: Number(one.CODSETOR), DESCRICAO: '', GASTO_TOTAL: Number(one.GASTO_TOTAL || 0) }] });
        console.info('[CartBudget][finance-sector-only]', one);
      } catch (e) {
        setFinanceLocal({ gastosPorSetor: [] });
        console.warn('[CartBudget] financeiro local falhou', e);
      }
    })();
    return () => { abort = true; };
  }, [user?.codSetor, token, financialData]);

  const addToCart = (product: Product, quantity: number) => {
    if (!user) return;

    const { sectorAvailableBalance: saldoDispAtual } = computeSectorBudget(user, setores, effectiveFinance);
    console.info('[CartBudget][beforeAdd]', computeSectorBudget(user, setores, effectiveFinance));

    const newTotalValue = totalValue + (product.preco * quantity);
    if (newTotalValue > saldoDispAtual) {
      alert('Não foi possível adicionar o produto. O valor total do carrinho excederia o saldo disponível para o seu setor.');
      return;
    }

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

    fetch(`/api/carrinho/${user.codUsuario}/items/${productId}`, { method: 'DELETE' })
      .catch(err => {
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
    if (!user || cartItems.length === 0) return;
    if (cartWillExceedLimit) {
      alert('Não é possível submeter o pedido pois o valor excede o saldo disponível do seu setor.');
      return;
    }
    try {
      const idemKey = crypto.randomUUID?.() || `${Date.now()}-${Math.random()}`;
      const response = await fetch(`/api/carrinho/${user.codUsuario}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Idempotency-Key': idemKey,
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({})
      });
      if (response.ok) {
        setCartItems([]);
        await refetchAllData();
        alert('Pedido enviado para aprovação!');
      } else {
        const errorBody = await response.json();
        throw new Error(errorBody.error || 'Erro ao submeter carrinho.');
      }
    } catch (err: any) {
      console.error(err);
      alert(err.message || 'Erro ao submeter carrinho.');
    }
  };

  const clearCart = async () => {
    if (!user) return;
    const confirm = window.confirm('Deseja realmente limpar todo o carrinho? Esta ação não pode ser desfeita.');
    if (!confirm) return;

    const prev = [...cartItems];
    setCartItems([]); // otimista

    try {
      const resp = await fetch(`/api/carrinho/${user.codUsuario}/clear`, { method: 'DELETE' });
      if (!resp.ok) {
        setCartItems(prev);
        const body = await resp.json().catch(() => ({}));
        throw new Error(body?.error || 'Falha ao limpar carrinho.');
      }
    } catch (e: any) {
      alert(e.message || 'Erro ao limpar carrinho.');
    }
  };

  const totalValue = cartItems.reduce((sum, item) => sum + (item.preco || 0) * (item.quantidade || 0), 0);
  const itemCount = cartItems.length;

  function computeSectorBudget(userObj: any, setoresArr: any[], finData: FinanceData | null | undefined) {
    const codSetor = Number(userObj?.codSetor);
    const setorRow = (setoresArr || []).find((s: any) => Number(s.CODSETOR) === codSetor);

    const limRaw = Number(setorRow?.LIMITE || 0);
    const saldoRaw = Number(setorRow?.SALDO || 0);
    const limiteTotal = limRaw > 0 ? limRaw : saldoRaw;

    const gastoRow = finData?.gastosPorSetor?.find((g: any) => Number(g.CODSETOR) === codSetor);
    const valorGasto = Number(gastoRow?.GASTO_TOTAL || 0);

    const saldoDisponivel = Math.max(0, limiteTotal - valorGasto);
    const dbg = { codSetor, limiteTotal, valorGasto, saldoDisponivel, limRaw, saldoRaw, financeLen: finData?.gastosPorSetor?.length || 0 };
    console.info('[CartBudget][compute]', dbg);
    return {
      sectorLimit: limiteTotal,
      sectorSpentValue: valorGasto,
      sectorAvailableBalance: saldoDisponivel
    };
  }

  const { sectorLimit, sectorSpentValue, sectorAvailableBalance } = useMemo(() => {
    return computeSectorBudget(user, setores, effectiveFinance);
  }, [user, setores, effectiveFinance]);

  const cartWillExceedLimit = totalValue > sectorAvailableBalance;

  const value = {
    cartItems,
    isLoading,
    error,
    totalValue,
    totalItems: itemCount,
    addToCart,
    updateQuantity,
    removeFromCart,
    clearCart, // NOVO
    submitCart
  };

  return (
    <CartContext.Provider
      value={{
        ...value,
        sectorLimit,
        sectorSpentValue,
        sectorAvailableBalance,
        cartWillExceedLimit
      }}
    >
      {children}
    </CartContext.Provider>
  );
};