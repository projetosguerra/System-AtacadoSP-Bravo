export interface Satisfacao {
  rating: number;
  comentario?: string | null;
  data?: string;
}

export async function fetchSatisfacao(pedidoId: number, token?: string, signal?: AbortSignal): Promise<Satisfacao | null> {
  const headers: Record<string,string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`/api/pedido/${pedidoId}/satisfacao`, { headers, signal });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || 'Falha ao carregar satisfação.');
  const sat = body?.satisfacao;
  if (!sat) return null;
  return {
    rating: Number(sat.rating || 0),
    comentario: sat.comentario ?? null,
    data: sat.data
  };
}

export async function createSatisfacao(pedidoId: number, rating: number, comentario?: string, token?: string): Promise<Satisfacao> {
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`/api/pedido/${pedidoId}/satisfacao`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ rating, comentario })
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || 'Falha ao registrar satisfação.');
  return body as Satisfacao;
}