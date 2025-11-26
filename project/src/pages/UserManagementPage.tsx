import { useState, useEffect, useMemo } from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';
import AddUserModal from '../components/AddUserModal';
import UserDetailsModal from '../components/UserDetailsModal';
import { useAuth } from '../context/AuthContext';
import { User } from '../types';

export const UserManagementPage = () => {
  const { allUsers, fetchAllUsers } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('Todos');
  const [unitFilter, setUnitFilter] = useState('Todas');
  const [isAddModalOpen, setAddModalOpen] = useState(false);
  const [isDetailsModalOpen, setDetailsModalOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const [currentPage] = useState(1);
  const [isLoading, setLoading] = useState(true);
  const [error] = useState<string | null>(null);
  const users = allUsers || [];

  const unitOptions = useMemo(() => {
    const map = new Map<string, string>();
    for (const u of users) {
      const code = u?. codSetor;
      if (code == null) continue;
      const value = String(code);
      const label = `${code} - ${u?.setor || 'Sem descrição'}`;
      if (!map.has(value)) map.set(value, label);
    }
    return Array.from(map, ([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b. label, 'pt-BR'));
  }, [users]);

  const filteredUsers = (users || []).filter(user => {
    const searchMatch =
      searchTerm === '' ||
      Object.values(user).some(value =>
        String(value ??  '').toLowerCase().includes(searchTerm.toLowerCase())
      );

    const perfilMatch = filterValue === 'Todos' || String(user.tipoUsuario) === filterValue;

    const unidadeMatch =
      unitFilter === 'Todas' ||
      (user.codSetor != null && String(user.codSetor) === unitFilter);

    return searchMatch && perfilMatch && unidadeMatch;
  });

  useEffect(() => {
    const loadUsers = async () => {
      setLoading(true);
      await fetchAllUsers();
      setLoading(false);
    };
    loadUsers();
  }, [fetchAllUsers]);

  const handleUserAdded = () => {
    setAddModalOpen(false);
    fetchAllUsers();
  };

  const handleUserDeleted = () => {
    setDetailsModalOpen(false);
    setSelectedUser(null);
    fetchAllUsers();
  };

  const handleUserUpdated = () => {
    fetchAllUsers();
    setDetailsModalOpen(false);
    setSelectedUser(null);
  };

  const handleViewDetails = (user: User) => {
    setSelectedUser(user);
    setDetailsModalOpen(true);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-full bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Carregando usuários... </p>
        </div>
      </div>
    );
  };

  const getRoleName = (tipousuario: number) => {
    if (tipousuario === 1) return 'Admin';
    if (tipousuario === 2) return 'Aprovador';
    if (tipousuario === 3) return 'Solicitante';
    return 'Desconhecido';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <main className="flex-1 space-y-6">
        {/* Header da Página */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h1 className="text-2xl lg:text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <button
            onClick={() => setAddModalOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-all text-sm sm:text-base"
          >
            <Plus className="w-5 h-5" />
            <span>Adicionar Usuário</span>
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou unidade..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all text-sm"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target. value)}
            />
          </div>

          {/* Filtro por Perfil */}
          <div className="relative">
            <select
              className="appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm w-full lg:w-auto"
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
            >
              <option value="Todos">Todos os Perfis</option>
              <option value="1">Admin</option>
              <option value="2">Aprovador</option>
              <option value="3">Solicitante</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>

          {/* Filtro por Unidade Administrativa */}
          <div className="relative">
            <select
              className="appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium text-sm w-full lg:w-auto lg:max-w-[280px]"
              value={unitFilter}
              onChange={(e) => setUnitFilter(e. target.value)}
              disabled={unitOptions.length === 0}
              title={unitOptions.length === 0 ? 'Nenhuma unidade disponível' : 'Filtrar por Unidade Administrativa'}
            >
              <option value="Todas">Todas as Unidades</option>
              {unitOptions.map(opt => (
                <option key={opt.value} value={opt. value}>{opt.label}</option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="overflow-x-auto">
            {error && ! isLoading && (
              <div className="text-center p-12 text-red-600 font-medium">Erro ao carregar usuários: {error}</div>
            )}
            {! isLoading && ! error && filteredUsers.length === 0 && (
              <div className="text-center p-12 text-gray-500">Nenhum usuário encontrado. </div>
            )}
            {!isLoading && !error && filteredUsers.length > 0 && (
              <table className="w-full">
                {/* Cabeçalho da Tabela */}
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">N/S</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">PRIMEIRO NOME</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">ÚLTIMO NOME</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">GÊNERO</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">ID DO FUNC. </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">NUM. DE TELEFONE</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">TIPO</th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">UNI.  ADMIN. </th>
                    <th className="px-4 lg:px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider whitespace-nowrap">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Linhas da Tabela */}
                  {filteredUsers.map((user, index) => (
                    <tr key={user.codUsuario} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.primeiroNome}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.ultimoNome}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span
                          className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                            user.genero === 'Masculino' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                          }`}
                        >
                          {user.genero}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {user.idFuncionario}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {user.numeroTelefone || 'N/A'}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span
                          className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${
                            user.tipoUsuario === 1
                              ? 'bg-purple-100 text-purple-800'
                              : user.tipoUsuario === 2
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-green-100 text-green-800'
                          }`}
                        >
                          {getRoleName(user.tipoUsuario)}
                        </span>
                      </td>
                      <td className="px-4 lg:px-6 py-4 text-sm text-gray-600 max-w-[200px] truncate" title={user.codSetor != null ? `${user.codSetor} - ${user.setor || 'Sem descrição'}` : 'N/A'}>
                        {user.codSetor != null
                          ? `${user.codSetor} - ${user.setor || 'Sem descrição'}`
                          : 'N/A'}
                      </td>
                      <td className="px-4 lg:px-6 py-4 whitespace-nowrap text-sm text-right">
                        <button
                          onClick={() => handleViewDetails(user)}
                          className="text-indigo-600 hover:text-indigo-900 font-medium transition-colors"
                        >
                          Ver mais
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {/* Pagination */}
          <div className="px-4 lg:px-6 py-4 border-t border-gray-200 flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <button
                className={`px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                  currentPage === 1 ? 'bg-red-500 text-white' : 'bg-white text-gray-700 border border-gray-300 hover:bg-gray-50'
                }`}
              >
                1
              </button>
              <button className="px-3 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors">
                &gt;&gt;
              </button>
            </div>

            <div className="text-sm text-gray-700">
              Mostrando {filteredUsers.length} de {users.length} usuários
            </div>
          </div>
        </div>
      </main>

      {/* Modals */}
      <AddUserModal
        isOpen={isAddModalOpen}
        onClose={() => setAddModalOpen(false)}
        onUserAdded={handleUserAdded}
      />

      <UserDetailsModal
        user={selectedUser}
        onClose={() => {
          setDetailsModalOpen(false);
          setSelectedUser(null);
        }}
        onUserDeleted={handleUserDeleted}
        onUserUpdated={handleUserUpdated}
      />
    </div>
  );
};

export default UserManagementPage;