import { useEffect, useMemo } from 'react';
import { ExternalLink, CheckCircle2, XCircle, Clock3 } from 'lucide-react';
import { useData } from '../context/DataContext';

function pickWhen(o: any): Date | null {
  const candidates = [o?. aprovadoEm, o?.reprovadoEm, o?. analisadoEm, o?. atualizadoEm, o?.data];
  for (const c of candidates) {
    if (! c) continue;
    const d = new Date(c);
    if (! isNaN(d.getTime())) return d;
  }
  return null;
}

function timeAgoPT(date: Date) {
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const sec = Math.floor(diff / 1000);
  if (sec < 60) return `há ${sec}s`;
  const min = Math.floor(sec / 60);
  if (min < 60) return `há ${min}min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `há ${hr}h`;
  const day = Math.floor(hr / 24);
  if (day < 30) return `há ${day}d`;
  const mon = Math.floor(day / 30);
  return `há ${mon}m`;
}

type ActivityType = 'approved' | 'rejected' | 'analysis' | 'pending';
type Activity = {
  id: number | string;
  when: Date;
  type: ActivityType;
  title: string;
  detail?: string;
};

function statusToType(status?: number): ActivityType | null {
  if (status === 1) return 'approved';
  if (status === 2) return 'rejected';
  if (status === 3) return 'analysis';
  if (status === 5) return 'pending';
  return null;
}

const colorByType: Record<ActivityType, { dot: string; text: string; Icon: any }> = {
  approved: { dot: 'bg-green-500', text: 'text-green-700', Icon: CheckCircle2 },
  rejected: { dot: 'bg-red-500', text: 'text-red-700', Icon: XCircle },
  analysis: { dot: 'bg-blue-500', text: 'text-blue-700', Icon: Clock3 },
  pending:  { dot: 'bg-yellow-500', text: 'text-yellow-700', Icon: Clock3 },
};

const AUTO_REFRESH_MS = 30000;

const RecentActivities = () => {
  const { orders, pedidosPendentes, refetchAllData } = useData();

  useEffect(() => {
    refetchAllData(). catch(() => {});
    const id = setInterval(() => refetchAllData(). catch(() => {}), AUTO_REFRESH_MS);
    return () => clearInterval(id);
  }, [refetchAllData]);

  const activities = useMemo<Activity[]>(() => {
    const out: Activity[] = [];
    const seenPendingIdsFromOrders = new Set<number | string>();

    for (const o of orders || []) {
      const type = statusToType((o as any)?.status);
      const when = pickWhen(o as any);
      if (! type || !when) continue;

      const id = (o as any)?.id;
      const solicitante = (o as any)?.solicitante || '';
      const setor = (o as any)?. setor || 'N/A';

      const title =
        type === 'approved' ? `Pedido #${id} aprovado`
      : type === 'rejected' ?  `Pedido #${id} reprovado`
      : type === 'analysis' ? `Pedido #${id} em análise`
      : `Pedido #${id} pendente`;

      if (type === 'pending') {
        seenPendingIdsFromOrders.add(id);
      }

      const details: string[] = [];
      if (solicitante) details.push(`Solicitante: ${solicitante}`);
      if (setor) details.push(`Uni.  Adm.: ${setor}`);

      out.push({ id, when, type, title, detail: details.join(' • ') });
    }

    for (const p of pedidosPendentes || []) {
      const id = (p as any)?.id;
      if (seenPendingIdsFromOrders.has(id)) continue;

      const when = pickWhen(p as any);
      if (! when) continue;

      const solicitante = (p as any)?.solicitante || '';
      const unidadeAdmin = (p as any)?.unidadeAdmin || 'N/A';

      out.push({
        id,
        when,
        type: 'pending',
        title: `Pedido #${id} aguardando análise`,
        detail: [`Solicitante: ${solicitante}`, `Uni.  Adm.: ${unidadeAdmin}`].join(' • ')
      });
    }

    const unique: Activity[] = [];
    const keySet = new Set<string>();
    for (const a of out) {
      const key = `${a.type}|${a.id}|${a.when. getTime()}`;
      if (keySet.has(key)) continue;
      keySet.add(key);
      unique.push(a);
    }

    unique.sort((a, b) => b.when.getTime() - a.when.getTime());
    return unique. slice(0, 5);
  }, [orders, pedidosPendentes]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-5 lg:p-6 shadow-sm h-full flex flex-col">
      <div className="flex items-center justify-between mb-5 flex-shrink-0">
        <h3 className="text-base lg:text-lg font-semibold text-gray-900">Atividades Recentes</h3>
        <a 
          href="/pedidos" 
          className="text-gray-400 hover:text-gray-600 transition-colors" 
          title="Ver histórico completo"
          aria-label="Ver histórico completo de pedidos"
        >
          <ExternalLink className="w-4 h-4" />
        </a>
      </div>

      {activities.length === 0 ?  (
        <div className="flex-1 flex items-center justify-center">
          <div className="text-sm text-gray-500 text-center py-8">
            Sem atividades recentes.
          </div>
        </div>
      ) : (
        <ul className="space-y-4 flex-1" role="list">
          {activities.map((act) => {
            const style = colorByType[act.type];
            const key = `${act.type}-${act.id}-${act.when.getTime()}`;
            return (
              <li
                key={key}
                className="flex items-start gap-3 pb-4 border-b border-gray-100 last:border-b-0 last:pb-0"
              >
                <div className={`mt-1 w-2 h-2 rounded-full ${style.dot} flex-shrink-0`} aria-hidden="true" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-start gap-2">
                    <style.Icon className={`w-4 h-4 ${style.text} flex-shrink-0 mt-0.5`} />
                    <span className="text-sm text-gray-900 line-clamp-2">{act.title}</span>
                  </div>
                  {act.detail && (
                    <div className="text-xs text-gray-500 mt-1 line-clamp-2" title={act.detail}>
                      {act.detail}
                    </div>
                  )}
                </div>
                <div className="text-xs text-gray-400 whitespace-nowrap flex-shrink-0">
                  {timeAgoPT(act.when)}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
};

export default RecentActivities;