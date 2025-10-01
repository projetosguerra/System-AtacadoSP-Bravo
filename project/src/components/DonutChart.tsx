import { useMemo } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';
import { useData } from '../context/DataContext';

type Slice = { name: string; value: number; color: string };

const StatusChart = () => {
  const { pedidosPendentes, orders } = useData();

  const slices: Slice[] = useMemo(() => {
    const approved = (orders || []).filter(o => o?.status === 1).length;
    const rejected = (orders || []).filter(o => o?.status === 2).length;
    const inAnalysis = (orders || []).filter(o => o?.status === 3).length;
    const pending = (pedidosPendentes || []).length; // status 5

    const total = approved + rejected + inAnalysis + pending;
    if (total === 0) {
      return [
        { name: 'Aprovados', value: 0, color: '#10b981' },
        { name: 'Pendentes', value: 0, color: '#f59e0b' },
        { name: 'Em Análise', value: 0, color: '#3b82f6' },
        { name: 'Reprovados', value: 0, color: '#dc2626' },
      ];
    }

    const pct = (n: number) => Number(((n / total) * 100).toFixed(1));

    return [
      { name: 'Aprovados', value: pct(approved), color: '#10b981' },
      { name: 'Pendentes', value: pct(pending), color: '#f59e0b' },
      { name: 'Em Análise', value: pct(inAnalysis), color: '#3b82f6' },
      { name: 'Reprovados', value: pct(rejected), color: '#dc2626' },
    ];
  }, [orders, pedidosPendentes]);

  const CustomLegend = ({ payload }: any) => {
    return (
      <ul className="space-y-2">
        {payload.map((entry: any, index: number) => {
          const s = slices.find(d => d.name === entry.value);
          return (
            <li key={index} className="flex items-center space-x-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: s?.color || entry.color }} />
              <span className="text-sm text-gray-600">{entry.value}</span>
              <span className="text-sm font-medium text-gray-900">
                {typeof s?.value === 'number' ? `${s.value}%` : '0%'}
              </span>
            </li>
          );
        })}
      </ul>
    );
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <h3 className="text-lg font-semibold text-gray-900 mb-6">Pedidos por Status</h3>
      <div className="flex items-center justify-between">
        <div className="w-48 h-48">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={slices}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {slices.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 ml-8">
          <CustomLegend payload={slices.map(d => ({ value: d.name, color: d.color }))} />
        </div>
      </div>
    </div>
  );
};

export default StatusChart;