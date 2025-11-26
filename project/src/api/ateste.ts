export interface Ateste {
  id: number;
  numpedrca: number;
  recebidoOk: boolean;
  comentario?: string | null;
  dataAteste: string;
}

export async function fetchAteste(pedidoId: number, token?: string, signal?: AbortSignal): Promise<Ateste | null> {
  const headers: Record<string,string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`/api/pedido/${pedidoId}/ateste`, { headers, signal });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || 'Falha ao carregar ateste.');
  return (body.ateste ?? null) as Ateste | null;
}

export async function createAteste(pedidoId: number, recebidoOk: boolean, comentario: string | undefined, token?: string): Promise<Ateste> {
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`/api/pedido/${pedidoId}/ateste`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ recebidoOk, comentario })
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || 'Falha ao registrar ateste.');
  return body as Ateste;
}