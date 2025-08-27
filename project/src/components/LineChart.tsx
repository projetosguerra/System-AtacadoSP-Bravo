import React from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { date: '16/08', thisMonth: 15000, lastMonth: 12000 },
  { date: '17/08', thisMonth: 18000, lastMonth: 13000 },
  { date: '18/08', thisMonth: 12000, lastMonth: 20000 },
  { date: '19/08', thisMonth: 25000, lastMonth: 8000 },
  { date: '20/08', thisMonth: 28000, lastMonth: 15000 },
  { date: '21/08', thisMonth: 20000, lastMonth: 12000 },
  { date: '22/08', thisMonth: 24000, lastMonth: 28000 },
];

const VolumeChart = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Volume de Pedidos</h3>
        <div className="flex items-center space-x-6">
          <span className="text-sm text-gray-500">Últimos dias</span>
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Esse mês</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded-full"></div>
              <span className="text-sm text-gray-600">Mês passado</span>
            </div>
          </div>
        </div>
      </div>
      <div className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis 
              dataKey="date" 
              stroke="#6b7280"
              fontSize={12}
            />
            <YAxis 
              stroke="#6b7280"
              fontSize={12}
              tickFormatter={(value) => `${value/1000}k`}
            />
            <Tooltip 
              formatter={(value) => [`${value.toLocaleString()}`, '']}
              labelStyle={{ color: '#374151' }}
            />
            <Line 
              type="monotone" 
              dataKey="thisMonth" 
              stroke="#dc2626" 
              strokeWidth={2}
              dot={{ fill: '#dc2626', strokeWidth: 2, r: 4 }}
            />
            <Line 
              type="monotone" 
              dataKey="lastMonth" 
              stroke="#10b981" 
              strokeWidth={2}
              strokeDasharray="5 5"
              dot={{ fill: '#10b981', strokeWidth: 2, r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default VolumeChart;