import { useMemo } from 'react';
import StatsCard from '../components/StatsCard';
import VolumeChart from '../components/LineChart';
import StatusChart from '../components/DonutChart';
import QuickApprovalTable from '../components/QuickApprovalTable';
import SectorOrdersTable from '../components/SectorOrdersTable';
import RecentActivities from '../components/RecentActivities';
import { DollarSign, Package, AlertTriangle, Clock } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { hasAnyRole } from '../utils/roles';
import { useData } from '../context/DataContext';

function dayTs(d: Date | string | number) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x.getTime();
}
function inRangeDayTs(t: number, startTs: number, endTsInclusive: number) {
  return t >= startTs && t <= endTsInclusive;
}
function formatBRL(n: number) {
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n || 0);
}
function buildWeekWindows(base: Date = new Date()) {
  const endCurrent = new Date(base);
  endCurrent. setHours(23, 59, 59, 999);
  const startCurrent = new Date(endCurrent);
  startCurrent.setDate(startCurrent. getDate() - 6);
  startCurrent.setHours(0, 0, 0, 0);
  const endPrev = new Date(startCurrent);
  endPrev.setDate(endPrev. getDate() - 1);
  endPrev.setHours(23, 59, 59, 999);
  const startPrev = new Date(endPrev);
  startPrev. setDate(startPrev.getDate() - 6);
  startPrev.setHours(0, 0, 0, 0);
  return {
    current: { startTs: startCurrent.getTime(), endTs: endCurrent.getTime() },
    previous: { startTs: startPrev.getTime(), endTs: endPrev.getTime() },
  };
}

function buildMonthWindows(base: Date = new Date()) {
  const currStart = new Date(base. getFullYear(), base.getMonth(), 1, 0, 0, 0, 0);
  const currEnd = new Date(base.getFullYear(), base.getMonth() + 1, 0, 23, 59, 59, 999);
  const prevStart = new Date(base.getFullYear(), base.getMonth() - 1, 1, 0, 0, 0, 0);
  const prevEnd = new Date(base.getFullYear(), base.getMonth(), 0, 23, 59, 59, 999);
  return {
    current: { startTs: currStart.getTime(), endTs: currEnd.getTime() },
    previous: { startTs: prevStart.getTime(), endTs: prevEnd.getTime() },
  };
}

const DashboardPage = () => {
  const { user } = useAuth();
  const { pedidosPendentes, orders } = useData();
  const ordersLoaded = Array.isArray(orders);
  const canSeeApprovalTable = useMemo(() => hasAnyRole(user, ['ADMIN', 'APROVADOR']), [user]);

  const week = useMemo(() => buildWeekWindows(), []);
  const month = useMemo(() => buildMonthWindows(), []);

  const pendingTotal = pedidosPendentes. length;
  const pendingWeekCurr = useMemo(
    () => pedidosPendentes.filter(p => {
      const t = p?. data ?  dayTs(p.data as any) : NaN;
      return Number. isFinite(t) && inRangeDayTs(t, week.current.startTs, week.current.endTs);
    }). length,
    [pedidosPendentes, week. current.startTs, week.current.endTs]
  );
  const pendingWeekPrev = useMemo(
    () => pedidosPendentes. filter(p => {
      const t = p?.data ? dayTs(p.data as any) : NaN;
      return Number. isFinite(t) && inRangeDayTs(t, week.previous.startTs, week.previous.endTs);
    }).length,
    [pedidosPendentes, week.previous.startTs, week.previous. endTs]
  );
  const pendingDelta = pendingWeekCurr - pendingWeekPrev;
  const pendingChangeType = pendingDelta > 0 ? 'positive' : pendingDelta < 0 ?  'negative' : 'neutral';
  const pendingSubtitle = pendingDelta === 0
    ? 'igual à semana passada'
    : `${Math.abs(pendingDelta)} ${pendingDelta > 0 ? 'a mais' : 'a menos'} que a semana passada`;

  const approvedMonthCurr = useMemo(() => {
    if (!ordersLoaded) return null;
    return (orders || [])
      .filter(o => o?.status === 1)
      .filter(o => {
        const t = o?.data ? dayTs(o.data as any) : NaN;
        return Number.isFinite(t) && inRangeDayTs(t, month.current.startTs, month.current.endTs);
      })
      .reduce((s, o: any) => s + Number(o?. valorTotal || 0), 0);
  }, [orders, ordersLoaded, month. current.startTs, month.current.endTs]);

  const approvedMonthPrev = useMemo(() => {
    if (! ordersLoaded) return null;
    return (orders || [])
      .filter(o => o?.status === 1)
      .filter(o => {
        const t = o?.data ? dayTs(o.data as any) : NaN;
        return Number.isFinite(t) && inRangeDayTs(t, month.previous.startTs, month.previous.endTs);
      })
      .reduce((s, o: any) => s + Number(o?.valorTotal || 0), 0);
  }, [orders, ordersLoaded, month.previous.startTs, month.previous.endTs]);

  const approvedDelta = (approvedMonthCurr ??  0) - (approvedMonthPrev ?? 0);
  const approvedChangeType = approvedDelta > 0 ?  'positive' : approvedDelta < 0 ? 'negative' : 'neutral';
  const approvedPercent =
    approvedMonthPrev && approvedMonthPrev > 0
      ? ((Number(approvedMonthCurr) - Number(approvedMonthPrev)) / Number(approvedMonthPrev)) * 100
      : 0;
  const approvedSubtitle =
    approvedMonthCurr === null || approvedMonthPrev === null
      ? 'carregando…'
      : approvedDelta === 0
        ? 'igual ao mês passado'
        : `${approvedPercent.toFixed(1)}% ${approvedDelta > 0 ? 'a mais' : 'a menos'} que o mês passado`;

  const newOrdersCurr = useMemo(() => {
    const hist = (orders || []). filter(o => {
      const t = o?.data ? dayTs(o.data as any) : NaN;
      return Number.isFinite(t) && inRangeDayTs(t, week.current.startTs, week.current.endTs);
    }). length;
    const pend = pedidosPendentes.filter(p => {
      const t = p?.data ? dayTs(p.data as any) : NaN;
      return Number.isFinite(t) && inRangeDayTs(t, week. current.startTs, week.current.endTs);
    }).length;
    return hist + pend;
  }, [orders, pedidosPendentes, week.current.startTs, week.current.endTs]);

  const newOrdersPrev = useMemo(() => {
    const hist = (orders || []).filter(o => {
      const t = o?.data ? dayTs(o.data as any) : NaN;
      return Number.isFinite(t) && inRangeDayTs(t, week. previous.startTs, week.previous.endTs);
    }).length;
    const pend = pedidosPendentes.filter(p => {
      const t = p?.data ? dayTs(p.data as any) : NaN;
      return Number.isFinite(t) && inRangeDayTs(t, week. previous.startTs, week.previous.endTs);
    }).length;
    return hist + pend;
  }, [orders, pedidosPendentes, week. previous.startTs, week.previous.endTs]);

  const newOrdersDelta = newOrdersCurr - newOrdersPrev;
  const newOrdersChangeType = newOrdersDelta > 0 ? 'positive' : newOrdersDelta < 0 ? 'negative' : 'neutral';
  const newOrdersSubtitle = newOrdersDelta === 0
    ? 'igual à semana passada'
    : `${Math.abs(newOrdersDelta)} ${newOrdersDelta > 0 ? 'a mais' : 'a menos'} que a semana passada`;

  const openContests = 0;
  const contestsSubtitle = `${openContests} Contestes em Análise`;

  return (
    <main className="flex-1 overflow-x-hidden bg-gray-50">
      <div className="w-full space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
          <StatsCard
            title="Pedidos Pendentes"
            value={String(pendingTotal)}
            subtitle={pendingSubtitle}
            icon={Clock}
            iconBgColor="bg-yellow-500"
            changeType={pendingChangeType as any}
          />
          <StatsCard
            title="Valor total aprovado (mês)"
            value={approvedMonthCurr === null ? '.. .' : formatBRL(Number(approvedMonthCurr))}
            subtitle={approvedSubtitle}
            icon={DollarSign}
            iconBgColor="bg-green-500"
            changeType={approvedMonthCurr === null ? 'neutral' : (approvedChangeType as any)}
          />
          <StatsCard
            title="Novos Pedidos (semana)"
            value={String(newOrdersCurr)}
            subtitle={newOrdersSubtitle}
            icon={Package}
            iconBgColor="bg-pink-500"
            changeType={newOrdersChangeType as any}
          />
          <StatsCard
            title="Conteste Abertos"
            value={String(openContests)}
            subtitle={contestsSubtitle}
            icon={AlertTriangle}
            iconBgColor="bg-blue-500"
            changeType="neutral"
          />
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <VolumeChart />
          <StatusChart />
        </div>

        {/* Tabelas e Atividades */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          <div className="lg:col-span-8">
            {canSeeApprovalTable ?  <QuickApprovalTable /> : <SectorOrdersTable />}
          </div>
          <div className="lg:col-span-4">
            <RecentActivities />
          </div>
        </div>
      </div>
    </main>
  );
};

export default DashboardPage;