
export interface Conteste {
  id: number;
  numpedrca: number;
  codUsuarioSolicitante: number;
  dataCriacao: string;
  motivoReprovacao?: string | null;
  justificativa: string;
  status: 1 | 2 | 3 | 4 | 9;
  dataAnalise?: string;
  analisadoPor?: number;
  parecer?: string | null;
}

export interface ContestePendentesItem {
  id: number;
  numpedrca: number;
  status: number;
  justificativa: string;
  motivoReprovacao?: string | null;
  dataCriacao: string;
  dataAnalise?: string;
  solicitante: string;
  setor: string;
}

export async function fetchContestes(pedidoId: number, token?: string, signal?: AbortSignal): Promise<Conteste[]> {
  const headers: Record<string,string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`/api/pedido/${pedidoId}/conteste`, { headers, signal });
  if (!r.ok) throw new Error('Falha ao carregar conteste.');
  return r.json();
}

export async function createConteste(pedidoId: number, justificativa: string, token?: string): Promise<Conteste> {
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`/api/pedido/${pedidoId}/conteste`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ justificativa })
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || 'Falha ao enviar conteste.');
  return body as Conteste;
}

export async function fetchContestesPendentes(token?: string, limit = 100): Promise<ContestePendentesItem[]> {
  const headers: Record<string,string> = {};
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`/api/conteste/pendentes?limit=${limit}`, { headers });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || 'Falha ao listar contestes pendentes');
  return (body.contestes || []) as ContestePendentesItem[];
}

export async function analyzeConteste(contesteId: number, decisao: 'DEFERIDO'|'INDEFERIDO', parecer: string, reenviar?: boolean, token?: string) {
  const headers: Record<string,string> = { 'Content-Type': 'application/json' };
  if (token) headers.Authorization = `Bearer ${token}`;
  const r = await fetch(`/api/conteste/${contesteId}/analisar`, {
    method: 'PUT',
    headers,
    body: JSON.stringify({ decisao, parecer, reenviarParaAnalise: reenviar === true })
  });
  const body = await r.json().catch(() => ({}));
  if (!r.ok) throw new Error(body?.error || 'Falha ao analisar conteste');
  return body;
}