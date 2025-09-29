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
  baseDataLoaded: boolean; // setores + financeiro carregados
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

  function uniqueById<T extends { id: number | string }>(arr: T[]): T[] {
    const map = new Map<string | number, T>();
    for (const item of arr || []) {
      if (!map.has(item.id)) map.set(item.id, item);
    }
    return Array.from(map.values());
  }

  const fetchPendingOrders = async () => {
    const response = await fetch('/api/pedidos/pendentes', fetchOptions);
    if (!response.ok) throw new Error('Falha ao buscar pedidos pendentes');
    const data = await response.json();
    console.log('[RAW pendentes ids]', Array.isArray(data) ? data.map((p: any) => p.id) : data);
    setPedidosPendentes(Array.isArray(data) ? uniqueById(data) : []);
  };

  const fetchOrdersHistory = async () => {
    const response = await fetch('/api/pedidos/historico', fetchOptions);
    if (!response.ok) throw new Error('Falha ao buscar histórico de pedidos');
    const data = await response.json();
    console.log('[RAW historico ids]', Array.isArray(data) ? data.map((p: any) => p.id) : data);
    setOrders(Array.isArray(data) ? uniqueById(data) : []);
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
    setSetores(Array.isArray(data) ? data : []);
  };

  const refetchAllData = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      await Promise.all([fetchPendingOrders(), fetchOrdersHistory(), fetchFinancialData(), fetchSetores()]);
    } catch (err: any) {
      console.error('[refetchAllData] erro:', err);
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refetchAllData();
  }, [refetchAllData]);

  // Diagnóstico: mostre o setor do usuário quando base estiver carregada
  useEffect(() => {
    if (!user?.codSetor) return;
    if (setores.length === 0) return;
    const setor = setores.find((s) => Number(s.CODSETOR) === Number(user.codSetor));
    if (setor) {
      console.info('[DATA] Setor do usuário carregado:', setor.DESCRICAO, '| CODSETOR:', setor.CODSETOR, '| SALDO:', setor.SALDO);
    } else {
      console.warn('[DATA] Usuário com CODSETOR', user.codSetor, 'não encontrado em /api/setores');
    }
  }, [user?.codSetor, setores]);

  const updateSetorLimit = useCallback(
    async (codsetor: number, saldo: number) => {
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

      setSetores((prev) =>
        prev.map((s) => (Number(s.CODSETOR) === Number(codsetor) ? ({ ...s, SALDO: saldo } as Setor) : s))
      );

      await fetchFinancialData();
    },
    [user]
  );

  const baseDataLoaded = useMemo(() => setores.length > 0 && !!financialData, [setores.length, financialData]);

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
        baseDataLoaded,
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