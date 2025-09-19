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
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const { user } = useAuth();
  const [pedidosPendentes, setPedidosPendentes] = useState<PedidoPendente[]>([]);
  const [orders, setOrders] = useState<HistoricalOrder[]>([]);
  const [financialData, setFinancialData] = useState<FinancialData | null>(null);
  const [setores, setSetores] = useState<Setor[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchOptions = {
    headers: {
      'Cache-Control': 'no-cache',
    },
  };

  const fetchPendingOrders = async () => {
    const response = await fetch('/api/pedidos/pendentes', fetchOptions);
    if (!response.ok) throw new Error('Falha ao buscar pedidos pendentes');
    const data = await response.json();
    setPedidosPendentes(data);
  };

  const fetchOrdersHistory = async () => {
    const response = await fetch('/api/pedidos/historico', fetchOptions);
    if (!response.ok) throw new Error('Falha ao buscar histórico de pedidos');
    const data = await response.json();
    setOrders(data);
  };

  const fetchFinancialData = async () => {
    const response = await fetch('/api/financeiro', fetchOptions);
    if (!response.ok) throw new Error('Falha ao buscar dados financeiros');
    const data = await response.json();
    setFinancialData(data);
  };

  const fetchSetores = async () => {
    const response = await fetch('/api/setores', fetchOptions);
    if (!response.ok) throw new Error('Falha ao buscar setores');
    const data = await response.json();
    setSetores(data);
  };
  
  const refetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([
        fetchPendingOrders(),
        fetchOrdersHistory(),
        fetchFinancialData(),
        fetchSetores(),
      ]);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

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
      body: JSON.stringify({
        saldo,
        alteradoPorCodUsuario: user.codUsuario,
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err?.error || 'Falha ao atualizar limite do setor.');
    }

    setSetores(prev =>
      prev.map(s => (Number(s.CODSETOR) === Number(codsetor) ? { ...s, SALDO: saldo } as Setor : s))
    );

    await fetchFinancialData?.();
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