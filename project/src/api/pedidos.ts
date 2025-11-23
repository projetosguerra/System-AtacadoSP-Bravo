import { PedidoDetalhe } from '../types/pedidos';

export async function fetchPedidoDetalhe(id: number, signal?: AbortSignal): Promise<PedidoDetalhe> {
  const resp = await fetch(`/api/pedido/${id}`, {
    headers: { 'Cache-Control': 'no-cache' },
    signal
  });
  if (!resp.ok) {
    const errData = await resp.json().catch(() => ({}));
    throw new Error(errData?.error || `Falha ao obter pedido ${id}`);
  }
  const json = await resp.json();
  if (typeof json !== 'object' || json === null || typeof json.id !== 'number') {
    throw new Error('Payload inválido recebido do servidor.');
  }
  return json as PedidoDetalhe;
}

export async function fetchPedidoFinanceiro(id: number, signal?: AbortSignal) {
  const resp = await fetch(`/api/pedido/${id}/financeiro`, { headers: { 'Cache-Control': 'no-cache' }, signal });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Falha ao buscar financeiro');
  }
  return resp.json();
}

export async function fetchPedidoTransportadora(id: number, signal?: AbortSignal) {
  const resp = await fetch(`/api/pedido/${id}/transportadora`, { headers: { 'Cache-Control': 'no-cache' }, signal });
  if (!resp.ok) {
    const err = await resp.json().catch(() => ({}));
    throw new Error(err?.error || 'Falha ao buscar transportadora');
  }
  return resp.json();
}