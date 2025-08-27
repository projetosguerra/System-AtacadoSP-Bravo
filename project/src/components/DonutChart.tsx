import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from 'recharts';

const data = [
  { name: 'Aprovados', value: 52.1, color: '#10b981' },
  { name: 'Pendentes', value: 22.8, color: '#f59e0b' },
  { name: 'Entregues', value: 13.9, color: '#3b82f6' },
  { name: 'Reprovados', value: 11.2, color: '#dc2626' },
];

const StatusChart = () => {
  const CustomLegend = ({ payload }: any) => {
    return (
      <ul className="space-y-2">
        {payload.map((entry: any, index: number) => (
          <li key={index} className="flex items-center space-x-2">
            <div 
              className="w-3 h-3 rounded-full" 
              style={{ backgroundColor: entry.color }}
            ></div>
            <span className="text-sm text-gray-600">{entry.value}</span>
            <span className="text-sm font-medium text-gray-900">
              {data.find(d => d.name === entry.value)?.value}%
            </span>
          </li>
        ))}
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
                data={data}
                cx="50%"
                cy="50%"
                innerRadius={60}
                outerRadius={90}
                paddingAngle={2}
                dataKey="value"
              >
                {data.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="flex-1 ml-8">
          <CustomLegend payload={data.map(d => ({ value: d.name, color: d.color }))} />
        </div>
      </div>
    </div>
  );
};

export default StatusChart;