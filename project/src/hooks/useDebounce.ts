import { useState, useCallback, useRef } from 'react';

export function useDebounce(callback: (...args: any[]) => void, delay: number) {
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const debouncedCallback = useCallback(
    (...args: any[]) => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        callback(...args);
      }, delay);
    },
    [callback, delay]
  );

  const cancel = useCallback(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  return [debouncedCallback, cancel] as const;
}

export function usePedidoStatus() {
  const [isUpdating, setIsUpdating] = useState(false);
  const [lastStatus, setLastStatus] = useState<number | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const updateStatus = useCallback(async (
    pedidoId: number, 
    newStatus: number, 
    expectedCurrentStatus?: number
  ) => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    if (isUpdating) {
      console.log('Já existe uma atualização em andamento, aguarde...');
      return { success: false, error: 'Atualização já em andamento' };
    }

    setIsUpdating(true);
    abortControllerRef.current = new AbortController();

    try {
      const body: any = { newStatus };
      
      if (expectedCurrentStatus !== undefined) {
        body.conditionStatus = expectedCurrentStatus;
      }

      const response = await fetch(`/api/pedido/${pedidoId}/status`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
        signal: abortControllerRef.current.signal
      });

      const data = await response.json();

      if (response.status === 409) {
        console.warn('Conflito de status detectado:', data);
        setLastStatus(data.statusAtual);
        return { 
          success: false, 
          error: data.error, 
          statusAtual: data.statusAtual 
        };
      }

      if (!response.ok) {
        throw new Error(data.error || 'Erro ao atualizar status');
      }

      setLastStatus(newStatus);
      return { success: true, data };

    } catch (error: any) {
      if (error.name === 'AbortError') {
        console.log('Requisição cancelada');
        return { success: false, error: 'Requisição cancelada' };
      }
      
      console.error('Erro ao atualizar status:', error);
      return { success: false, error: error.message };
      
    } finally {
      setIsUpdating(false);
      abortControllerRef.current = null;
    }
  }, [isUpdating]);

  return {
    updateStatus,
    isUpdating,
    lastStatus
  };
}