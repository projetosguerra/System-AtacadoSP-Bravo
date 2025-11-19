import { createContext, useState, useContext, ReactNode, useCallback, useEffect, useMemo } from 'react';
import { PedidoPendente, FinancialData, Setor, HistoricalOrder } from '../types';
import { useAuth } from './AuthContext';

interface DataContextType {
  pedidosPendentes: PedidoPendente[];
  orders: HistoricalOrder[];
  financialData: FinancialData | null;
  setores: Setor[];
  isLoading: boolean;
  error: string | null;
  refetchAllData: () => Promise<void>;
  updateSetorLimit: (codsetor: number, newLimit: number) => Promise<void>;
  refreshFinancial?: () => Promise<void>;
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user, fetchAllUsers, token } = useAuth();
  const [pedidosPendentes, setPedidosPendentes] = useState<PedidoPendente[]>([]);
  const [orders, setOrders] = useState<HistoricalOrder[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Cabeçalhos dinâmicos com Authorization
  const fetchOptions = useMemo(() => {
    const h: Record<string, string> = { 'Cache-Control': 'no-cache' };
    if (token) h.Authorization = `Bearer ${token}`;
    return { headers: h };
  }, [token]);

  function uniqueById<T extends { id: number | string }>(arr: T[]): T[] {
    const map = new Map<string | number, T>();
    for (const item of arr || []) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return Array.from(map.values());
  }

  const PENDENTES_QS = '?days=30&maxrows=200';
  const HIST_QS      = '?days=30&maxrows=300';
  const FIN_QS       = '?days=14&maxOrders=300';

  const fetchPendingOrders = async () => {
    const response = await fetch(`/api/pedidos/pendentes${PENDENTES_QS}`, fetchOptions);
    if (!response.ok) throw new Error('Falha ao buscar pedidos pendentes');
    const data = await response.json();
    setPedidosPendentes(Array.isArray(data) ? uniqueById(data) : []);
  };

  const fetchOrdersHistory = async () => {
    const response = await fetch(`/api/pedidos/historico${HIST_QS}`, fetchOptions);
    if (!response.ok) throw new Error('Falha ao buscar histórico de pedidos');
    const data = await response.json();
    setOrders(Array.isArray(data) ? uniqueById(data) : []);
  };

  const fetchFinancialData = async () => {
    const response = await fetch(`/api/financeiro${FIN_QS}`, fetchOptions);
    if (!response.ok) throw new Error('Falha ao buscar dados financeiros');
    const data = await response.json();
    setFinancialData(data);
  };

  const refreshFinancial = useCallback(async () => {
    try {
      await fetchFinancialData();
    } catch { /* mantém valor atual */ }
  }, [fetchOptions]);

  const fetchSetores = async () => {
    const response = await fetch('/api/setores', fetchOptions);
    if (!response.ok) throw new Error('Falha ao buscar setores');
    const data = await response.json();
    setSetores(Array.isArray(data) ? data : []);
  };

  const refetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await fetchSetores();
      await fetchPendingOrders();

      setTimeout(() => { fetchAllUsers?.().catch(() => {}); }, 500);
      setTimeout(() => { fetchOrdersHistory().catch(err => console.error('[Data] historico bg erro:', err)); }, 800);
      setTimeout(() => { fetchFinancialData().catch(err => console.error('[Data] financeiro bg erro:', err)); }, 2000);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar dados iniciais.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllUsers, fetchOptions]);

  useEffect(() => {
    refetchAllData();
  }, [refetchAllData]);

  const updateSetorLimit = useCallback(async (codsetor: number, saldo: number) => {
    if (!user?.codUsuario) throw new Error('Usuário não autenticado para alterar limite.');

    const res = await fetch(`/api/setores/${codsetor}/limite`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: JSON.stringify({ saldo, alteradoPorCodUsuario: user.codUsuario }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Falha ao atualizar limite do setor.');
    }

    setSetores(prev => prev.map(s => (Number(s.CODSETOR) === Number(codsetor) ? ({ ...s, SALDO: saldo } as Setor) : s)));
    await fetchFinancialData().catch(() => {});
  }, [user, token, fetchFinancialData]);

  return (
    <DataContext.Provider
      value={{
        pedidosPendentes,
        orders,
        financialData,
        setores,
        isLoading,
        error,
        refetchAllData,
        updateSetorLimit,
        refreshFinancial,
      }}
    >
      {children}
    </DataContext.Provider>
  );
};

export const useData = () => {
  const context = useContext(DataContext);
  if (context === undefined) throw new Error('useData must be used within a DataProvider');
  return context;
};