const API_BASE = import.meta.env.VITE_API_URL ?? '/api';

export type PendingOrder = {
  id: number;
  numero: string;
  status: number;
  total: number;
  dataCriacao: string;
  setor: string;
  solicitante: string;
};

export async function fetchPendingApprovals(params: {
  token?: string;
  limit?: number;
  includeInAnalysis?: boolean;
  signal?: AbortSignal;
} = {}): Promise<PendingOrder[]> {
  const { token, signal, limit = 5, includeInAnalysis = true } = params;
  const q = new URLSearchParams();
  q.set('limit', String(limit));
  if (includeInAnalysis) q.set('includeInAnalysis', 'true');

  const res = await fetch(`${API_BASE}/orders/pending?${q.toString()}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    signal,
  });

  if (!res.ok) throw new Error('Erro ao carregar fila de aprovação');
  const data = await res.json();
  return data.items ?? [];
}