import { Semaphore } from './semaphore.js';

export const gatePendentes = new Semaphore(Number(process.env.PENDENTES_CONCURRENCY ?? 1));
export const gateHistorico = new Semaphore(Number(process.env.HIST_CONCURRENCY ?? 1));
export const gateProdutos = new Semaphore(Number(process.env.PRODUTOS_CONCURRENCY ?? 2));

export function getGatesSnapshot() {
  return {
    pendentes: { active: gatePendentes.getActive(), queued: gatePendentes.getQueued(), max: Number(process.env.PENDENTES_CONCURRENCY ?? 1) },
    historico: { active: gateHistorico.getActive(), queued: gateHistorico.getQueued(), max: Number(process.env.HIST_CONCURRENCY ?? 1) },
    produtos: { active: gateProdutos.getActive(), queued: gateProdutos.getQueued(), max: Number(process.env.PRODUTOS_CONCURRENCY ?? 2) },
  };
}