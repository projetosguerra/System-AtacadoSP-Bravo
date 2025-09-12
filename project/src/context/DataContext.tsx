import React, { createContext, useState, useContext, ReactNode, useCallback, useEffect } from 'react';
import { PedidoPendente, HistoricalOrder } from '../types';

interface DataContextType {
  pedidosPendentes: PedidoPendente[];
  pedidosHistorico: HistoricalOrder[];
  isLoading: boolean;
  refetchAllData: () => void; 
}

const DataContext = createContext<DataContextType | undefined>(undefined);

export const useData = () => {
  const context = useContext(DataContext);
  if (!context) throw new Error('useData deve ser usado dentro de um DataProvider');
  return context;
};

export const DataProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [pedidosPendentes, setPedidosPendentes] = useState<PedidoPendente[]>([]);
  const [pedidosHistorico, setPedidosHistorico] = useState<HistoricalOrder[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchAllData = useCallback(async () => {
    setIsLoading(true);
    try {
      return await Promise.all([
        fetch('/api/pedidos/pendentes'),
        fetch('/api/pedidos/historico')
      ]).then(async ([pendentesRes, historicoRes]) => {
        if (!pendentesRes.ok || !historicoRes.ok) {
          throw new Error('Falha ao buscar dados dos pedidos.');
        }
        const pendentesData: PedidoPendente[] = await pendentesRes.json();
        const historicoData: HistoricalOrder[] = await historicoRes.json();
        setPedidosPendentes(pendentesData);
        setPedidosHistorico(historicoData);
      });
    } catch (error) {
      console.error("Erro ao buscar dados dos pedidos:", error);
      setPedidosPendentes([]);
      setPedidosHistorico([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchAllData(); 
  }, [fetchAllData]);

  const value = {
    pedidosPendentes,
    pedidosHistorico,
    isLoading,
    refetchAllData: fetchAllData,
  };

  return <DataContext.Provider value={value}>{children}</DataContext.Provider>;
};

