import React from 'react';
import { ExternalLink } from 'lucide-react';

const activities = [
  'Usuário [Nome] aprovou o pedido #645BJ-2',
  'Usuário [Nome] aprovou o pedido #645BJ-2',
  'Usuário [Nome] aprovou o pedido #645BJ-2',
  'Usuário [Nome] aprovou o pedido #645BJ-2',
];

const RecentActivities = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6 shadow-sm">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-semibold text-gray-900">Atividades Recentes no Sistema</h3>
        <button className="text-gray-400 hover:text-gray-600">
          <ExternalLink className="w-4 h-4" />
        </button>
      </div>
      
      <div className="space-y-4">
        {activities.map((activity, index) => (
          <div key={index} className="text-sm text-gray-600 py-2 border-b border-gray-100 last:border-b-0">
            {activity}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecentActivities;