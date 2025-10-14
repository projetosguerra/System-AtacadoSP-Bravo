const DEFAULT_TIMEOUT_MS = 12000;
const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api';

function timeoutSignal(ms: number) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), ms);
  return { signal: controller.signal, cancel: () => clearTimeout(id) };
}

async function parseJsonOrThrow(resp: Response) {
  const ct = resp.headers.get('content-type') || '';
  if (!ct.includes('application/json')) {
    const text = await resp.text();
    throw new Error(`Resposta não-JSON do servidor: ${text.slice(0, 200)}`);
  }
  return resp.json();
}

async function doFetch(input: RequestInfo, init: RequestInit = {}, ms = DEFAULT_TIMEOUT_MS) {
  const { signal, cancel } = timeoutSignal(ms);
  try {
    return await fetch(input, { ...init, signal });
  } finally {
    cancel();
  }
}

export const api = {
  async post<T = any>(path: string, body?: any, options?: { timeoutMs?: number; headers?: Record<string, string> }): Promise<T> {
    const resp = await doFetch(`${API_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', ...(options?.headers || {}) },
      body: body ? JSON.stringify(body) : undefined,
    }, options?.timeoutMs);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Falha (${resp.status}): ${text.slice(0, 200)}`);
    }
    return parseJsonOrThrow(resp);
  },
  async get<T = any>(path: string, options?: { timeoutMs?: number; headers?: Record<string, string> }): Promise<T> {
    const resp = await doFetch(`${API_BASE}${path}`, { method: 'GET', headers: { ...(options?.headers || {}) } }, options?.timeoutMs);
    if (!resp.ok) {
      const text = await resp.text();
      throw new Error(`Falha (${resp.status}): ${text.slice(0, 200)}`);
    }
    return parseJsonOrThrow(resp);
  },
};