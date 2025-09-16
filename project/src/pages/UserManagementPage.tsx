import { useState } from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';
import AddUserModal from '../components/AddUserModal';
import { useAuth } from '../context/AuthContext';

const UserManagementPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('Todos');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage] = useState(1);
  const { users, loading, error, refetchUsers } = useAuth();

  const filteredUsers = (users || []).filter(user => {
    const searchMatch = searchTerm === '' ||
      Object.values(user).some(value =>
        String(value).toLowerCase().includes(searchTerm.toLowerCase())
      );
    const filterMatch = filterValue === 'Todos' || String(user.tipoUsuario) === filterValue;
    return searchMatch && filterMatch;
  });

  const handleUserAdded = () => {
    setIsModalOpen(false);
    refetchUsers();
    alert('Usuário adicionado com sucesso!');
  };

  const getRoleName = (tipousuario: number) => {
    if (tipousuario === 1) return 'Admin';
    if (tipousuario === 2) return 'Aprovador';
    if (tipousuario === 3) return 'Solicitante';
    return 'Desconhecido';
  };

  return (
    <div className="flex flex-col h-full bg-gray-50">
      <AddUserModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onUserAdded={handleUserAdded}
      />
      <main className="flex-1 p-8 space-y-6">
        {/* Header da Página */}
        <div className="flex justify-between items-center">
          <h1 className="text-3xl font-bold text-gray-900">Gerenciamento de Usuários</h1>
          <button
            onClick={() => setIsModalOpen(true)}
            className="flex items-center gap-2 px-5 py-3 bg-green-500 hover:bg-green-600 text-white font-semibold rounded-lg shadow-md transition-all duration-200"
          >
            <Plus className="w-5 h-5" />
            Adicionar Usuário
          </button>
        </div>

        {/* Filtros e Busca */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, e-mail ou unidade..."
              className="w-full pl-12 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          <div className="relative">
            <select
              className="appearance-none pl-4 pr-10 py-3 bg-white border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-medium"
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
        </div>

        {/* Tabela de Usuários */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
          <div className="min-w-full overflow-x-auto">
            {loading && (
              <div className="text-center p-12 text-gray-600 font-medium">Carregando usuários...</div>
            )}
            {error && !loading && (
              <div className="text-center p-12 text-red-600 font-medium">Erro ao carregar usuários: {error}</div>
            )}
            {!loading && !error && filteredUsers.length === 0 && (
              <div className="text-center p-12 text-gray-500">Nenhum usuário encontrado.</div>
            )}
            {!loading && !error && filteredUsers.length > 0 && (
              <table className="w-full">
                {/* Cabeçalho da Tabela */}
                <thead>
                  <tr className="bg-gray-50 border-b border-gray-200">
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">N/S</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">PRIMEIRO NOME</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ULTIMO NOME</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">GÊNERO</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">ID DO FUNC.</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">NUM. DE TELEFONE</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">TIPO</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">SECRETARIA</th>
                    <th className="px-6 py-4 text-left text-xs font-semibold text-gray-600 uppercase tracking-wider">AÇÃO</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {/* Linhas da Tabela */}
                  {filteredUsers.map((user, index) => (
                    <tr key={user.codUsuario} className="hover:bg-gray-50 transition-colors duration-150">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                        {index + 1}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.primeiroNome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {user.ultimoNome}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${user.genero === 'Masculino' ? 'bg-blue-100 text-blue-800' : 'bg-pink-100 text-pink-800'
                          }`}>
                          {user.genero}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {user.idFuncionario}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                        {user.numeroTelefone || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        <span className={`inline-flex px-3 py-1 text-xs font-medium rounded-full ${user.tipoUsuario === 1 ? 'bg-purple-100 text-purple-800' :
                            user.tipoUsuario === 2 ? 'bg-orange-100 text-orange-800' :
                              'bg-green-100 text-green-800'
                          }`}>
                          {getRoleName(user.tipoUsuario)}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                        {user.codSetor || 'N/A'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm">
                        <button className="text-blue-600 hover:text-blue-800 font-medium transition-colors duration-150 hover:underline">
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
              Mostrando {filteredUsers.length} de {users.length} usuários
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default UserManagementPage;