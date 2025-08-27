import React, { useState } from 'react';
import Sidebar from '../components/Sidebar';
import Header from '../components/Header';
import { Search, Plus, ChevronDown } from 'lucide-react';
import { mockUsers } from '../data/mockUsers';

const UserManagementPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);

  const filteredUsers = mockUsers.filter(user => {
    const searchMatch = searchTerm === '' ||
      Object.values(user).some(value =>
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );

    const filterMatch = filterValue === 'Todos' || user.cargo === filterValue;

    return searchMatch && filterMatch;
  });

  return (
    <div className="space-y-6">
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        <div className="flex items-center justify-between gap-6">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Insira uma informação do usuário"
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>

          {/* Stats Card */}
          <div className="p-6 text-center min-w-[200px]">
            <div className="text-3xl font-bold text-gray-900 mb-1">{filteredUsers.length}</div>
            <div className="text-sm text-gray-600">Número Total de Usuários</div>
          </div>

          {/* Add User Button */}
          <button className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors">
            <Plus className="w-5 h-5" />
            Adicionar Usuário
          </button>
        </div>

        {/* Table Section */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Table Header */}
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">Lista de Usuários</h2>

            {/* Filter Dropdown */}
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600">Filtrar Usuários</label>
              <div className="relative">
                <select
                  value={filterValue}
                  onChange={(e) => setFilterValue(e.target.value)}
                  className="appearance-none bg-white border border-gray-300 rounded-lg px-4 py-2 pr-8 text-sm focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Todos">Todos</option>
                  <option value="Gestor">Gestor</option>
                  <option value="Aprovador">Aprovador</option>
                  <option value="Solicitante">Solicitante</option>
                </select>
                <ChevronDown className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 pointer-events-none" />
              </div>
            </div>
          </div>

          {/* Table */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-50 border-b border-gray-200">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">N/S</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Primeiro Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Último Nome</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Gênero</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID do Func.</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Número de Telefone</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Cargo</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Designação</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Ação</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredUsers.map((user) => (
                  <tr key={user.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.numeroSequencia}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.primeiroNome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{user.ultimoNome}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.genero}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.idFuncionario}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.numeroTelefone}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.cargo}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{user.designacao}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors">
                        Ver mais
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="px-6 py-4 border-t border-gray-200 flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <button
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${currentPage === 1
                  ? 'bg-red-500 text-white'
                  : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                  }`}
              >
                1
              </button>
              <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                &gt;&gt;
              </button>
            </div>

            <div className="text-sm text-gray-700">
              Mostrando {filteredUsers.length} de {mockUsers.length} usuários
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserManagementPage;