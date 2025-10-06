import { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
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
  const { user, fetchAllUsers } = useAuth();
  const [pedidosPendentes, setPedidosPendentes] = useState<PedidoPendente[]>([]);
  const [orders, setOrders] = useState<HistoricalOrder[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = { headers: { 'Cache-Control': 'no-cache' } };

  function uniqueById<T extends { id: number | string }>(arr: T[]): T[] {
    const map = new Map<string | number, T>();
    for (const item of arr || []) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return Array.from(map.values());
  }

  // Janelas mais leves
  const PENDENTES_QS = '?days=45&maxrows=200';
  const HIST_QS      = '?days=45&maxrows=400';
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
    } catch (e) {
      // mantém último valor ou null
    }
  }, []);

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
      // 1) Essencial primeiro
      await fetchSetores();
      await fetchPendingOrders();

      // 2) Background controlado: usuários e histórico
      fetchAllUsers?.().catch(() => {});
      fetchOrdersHistory().catch(err => console.error('[Data] historico bg erro:', err));

      // 3) Financeiro com mais atraso e janela pequena
      setTimeout(() => {
        fetchFinancialData().catch(err => console.error('[Data] financeiro bg erro:', err));
      }, 2000);
    } catch (err: any) {
      setError(err.message || 'Falha ao carregar dados iniciais.');
    } finally {
      setIsLoading(false);
    }
  }, [fetchAllUsers]);

  useEffect(() => {
    refetchAllData();
  }, [refetchAllData]);

  const updateSetorLimit = useCallback(async (codsetor: number, saldo: number) => {
    if (!user?.codUsuario) {
      throw new Error('Usuário não autenticado para alterar limite.');
    }

    const res = await fetch(`/api/setores/${codsetor}/limite`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ saldo, alteradoPorCodUsuario: user.codUsuario }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Falha ao atualizar limite do setor.');
    }

    setSetores(prev =>
      prev.map(s => (Number(s.CODSETOR) === Number(codsetor) ? ({ ...s, SALDO: saldo } as Setor) : s))
    );

    await fetchFinancialData().catch(() => {});
  }, [user]);

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
  if (context === undefined) {
    throw new Error('useData must be used within a DataProvider');
  }
  return context;
};