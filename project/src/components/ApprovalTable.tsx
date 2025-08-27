import React from 'react';
import { Search, Filter, MoreHorizontal } from 'lucide-react';

const tableData = [
  {
    id: '#6458J-2',
    category: 'Escritório',
    date: '22/08/25',
    product: 'Grampeador',
    status: 'Aprovado',
    statusColor: 'bg-green-100 text-green-800'
  },
  {
    id: '#5343P-2',
    category: 'Escritório',
    date: '22/08/25',
    product: 'Grampeador',
    status: 'Pendente',
    statusColor: 'bg-yellow-100 text-yellow-800'
  },
  {
    id: '#2343L-6',
    category: 'Escritório',
    date: '22/08/25',
    product: 'Grampeador',
    status: 'Reprovado',
    statusColor: 'bg-red-100 text-red-800'
  }
];

const ApprovalTable = () => {
  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
      <div className="p-6 border-b border-gray-200">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Fila de Aprovação Rápida</h3>
        <div className="flex items-center space-x-4">
          <div className="flex-1 relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Procurar"
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
            />
          </div>
          <button className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
            <Filter className="w-4 h-4" />
            <span>Filtro</span>
          </button>
        </div>
      </div>
      
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50">
            <tr>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">
                <input type="checkbox" className="rounded border-gray-300" />
              </th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Id</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Categoria</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Produto</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="text-left py-3 px-6 text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {tableData.map((row, index) => (
              <tr key={index} className={index % 2 === 1 ? 'bg-gray-50' : 'bg-white'}>
                <td className="py-4 px-6">
                  <input type="checkbox" className="rounded border-gray-300" />
                </td>
                <td className="py-4 px-6 text-sm font-medium text-gray-900">{row.id}</td>
                <td className="py-4 px-6 text-sm text-gray-600">{row.category}</td>
                <td className="py-4 px-6 text-sm text-gray-600">{row.date}</td>
                <td className="py-4 px-6 text-sm text-gray-600">{row.product}</td>
                <td className="py-4 px-6">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${row.statusColor}`}>
                    {row.status}
                  </span>
                </td>
                <td className="py-4 px-6">
                  <button className="text-gray-400 hover:text-gray-600">
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default ApprovalTable;