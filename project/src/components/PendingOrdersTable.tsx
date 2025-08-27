import React, { useState } from 'react';
import { Search, Filter } from 'lucide-react';
import { Link } from 'react-router-dom';
import { PedidoPendente } from '../types';

interface PendingOrdersTableProps {
  pedidos: PedidoPendente[];
}

const PendingOrdersTable: React.FC<PendingOrdersTableProps> = ({ pedidos }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredPedidos = pedidos.filter(pedido =>
    Object.values(pedido).some(value =>
      value.toString().toLowerCase().includes(searchTerm.toLowerCase())
    )
  );

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(value);
  };

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200">
      {/* Table Header */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h2 className="text-lg font-semibold text-gray-900">Tabela de Pedidos Pendentes</h2>
        
        <div className="flex items-center gap-4">
          {/* Search Bar */}
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4" />
            <input
              type="text"
              placeholder="Procurar"
              className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm w-64"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Filter Button */}
          <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors text-sm">
            <Filter className="w-4 h-4" />
            Filtro
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N/S</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Data</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Solicitante</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Uni. Adm.</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QTD de Itens</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Valor</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {filteredPedidos.map((pedido, index) => (
              <tr key={pedido.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                  {String(index + 1).padStart(2, '0')}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pedido.data}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{pedido.id}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{pedido.solicitante}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{pedido.unidadeAdmin}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{pedido.qtdItens}</td>
                <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                  {formatCurrency(pedido.valor)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm">
                  <Link
                    to={`/analise-pedido/${pedido.id}`}
                    className="inline-flex items-center px-4 py-2 bg-yellow-500 hover:bg-yellow-600 text-white text-sm font-medium rounded-lg transition-colors"
                  >
                    Analisar
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Table Footer */}
      <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
        <div className="text-sm text-gray-700">
          Mostrando {filteredPedidos.length} de {pedidos.length} pedidos
        </div>
        
        <div className="flex items-center space-x-2">
          <button className="px-3 py-2 text-sm font-medium bg-red-500 text-white rounded-md">
            1
          </button>
          <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
            {'>>'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default PendingOrdersTable;