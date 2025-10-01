import { useMemo } from 'react';
import {
  LineChart as RLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { useData } from '../context/DataContext';

type Row = {
  dayLabel: string;    
  currentCount: number; 
  prevCount: number;    
  currentValue: number; 
  prevValue: number;    
};

const currency = new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' });

function daysInMonth(year: number, month0: number) {
  return new Date(year, month0 + 1, 0).getDate();
}
function isSameMonthYear(d: Date, year: number, month0: number) {
  return d.getFullYear() === year && d.getMonth() === month0;
}
function safeDate(x: unknown): Date | null {
  if (!x) return null;
  const d = new Date(x as any);
  return isNaN(d.getTime()) ? null : d;
}

const VolumeChart = () => {
  const { pedidosPendentes, orders } = useData();

  const data: Row[] = useMemo(() => {
    const today = new Date();
    const curYear = today.getFullYear();
    const curMonth0 = today.getMonth();

    const prevMonthAnchor = new Date(curYear, curMonth0 - 1, 1);
    const prevYear = prevMonthAnchor.getFullYear();
    const prevMonth0 = prevMonthAnchor.getMonth();

    const currDays = daysInMonth(curYear, curMonth0);
    const prevDays = daysInMonth(prevYear, prevMonth0);
    const maxDays = Math.max(currDays, prevDays); 

    const currCount = Array(maxDays + 1).fill(0);
    const currValue = Array(maxDays + 1).fill(0);
    const prevCount = Array(maxDays + 1).fill(0);
    const prevValue = Array(maxDays + 1).fill(0);

    for (const o of orders || []) {
      const d = safeDate((o as any)?.data);
      if (!d) continue;
      const day = d.getDate(); // 1..31
      if (isSameMonthYear(d, curYear, curMonth0) && day <= maxDays) {
        currCount[day] += 1;
        currValue[day] += Number((o as any)?.valorTotal || 0);
      } else if (isSameMonthYear(d, prevYear, prevMonth0) && day <= maxDays) {
        prevCount[day] += 1;
        prevValue[day] += Number((o as any)?.valorTotal || 0);
      }
    }

    for (const p of pedidosPendentes || []) {
      const d = safeDate((p as any)?.data);
      if (!d) continue;
      const day = d.getDate();
      if (isSameMonthYear(d, curYear, curMonth0) && day <= maxDays) {
        currCount[day] += 1;
      } else if (isSameMonthYear(d, prevYear, prevMonth0) && day <= maxDays) {
        prevCount[day] += 1;
      }
    }

    const rows: Row[] = [];
    for (let day = 1; day <= maxDays; day++) {
      rows.push({
        dayLabel: String(day).padStart(2, '0'),
        currentCount: currCount[day] || 0,
        prevCount: prevCount[day] || 0,
        currentValue: currValue[day] || 0,
        prevValue: prevValue[day] || 0,
      });
    }
    return rows;
  }, [orders, pedidosPendentes]);

  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload?.length) return null;
    const row = payload[0]?.payload as Row;
    return (
      <div className="bg-white border border-gray-200 rounded-md shadow-sm px-3 py-2 text-sm">
        <div className="font-semibold mb-1">Dia {label}</div>
        <div className="text-gray-700 space-y-1">
          <div>Esse mês: {row.currentCount} pedidos ({currency.format(row.currentValue)})</div>
          <div>Mês passado: {row.prevCount} pedidos ({currency.format(row.prevValue)})</div>
        </div>
      </div>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Volume de Pedidos</h3>
        <div className="text-sm text-gray-500">Comparativo por dia • Esse mês × Mês passado</div>
      </div>

      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <RLineChart data={data} margin={{ top: 8, right: 16, left: 0, bottom: 8 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="dayLabel" tick={{ fontSize: 12 }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 12 }} />
            <Tooltip content={<CustomTooltip />} />
            <Line
              type="monotone"
              dataKey="prevCount"
              name="Mês passado"
              stroke="#ef4444" 
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
            <Line
              type="monotone"
              dataKey="currentCount"
              name="Esse mês"
              stroke="#10b981" 
              strokeWidth={2}
              dot={{ r: 2 }}
              activeDot={{ r: 4 }}
            />
          </RLineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VolumeChart;