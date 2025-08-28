import { useState } from 'react';
import { Search, Plus, ChevronDown } from 'lucide-react';
import { mockUsers } from '../data/mockUsers';
import AddUserModal from '../components/AddUserModal';
import { User } from '../types';

const UserManagementPage = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('Todos');
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);

  const filteredUsers = mockUsers.filter(user => {
    const searchMatch = searchTerm === '' ||
      Object.values(user).some(value =>
        value.toString().toLowerCase().includes(searchTerm.toLowerCase())
      );
    const filterMatch = filterValue === 'Todos' || user.cargo === filterValue;
    return searchMatch && filterMatch;
  });

  const handleAddUser = (newUser: Omit<User, 'id'>) => {
    // Adicionar lógica para salvar o novo usuário
    console.log('Novo usuário:', newUser);
    // Atualizar a lista de usuários ou fazer uma chamada à API aqui
  };

  return (
    <div className="space-y-6">
      <main className="flex-1 overflow-x-hidden overflow-y-auto">
        {/* ... (código existente) ... */}
        <div className="flex items-center justify-between gap-6">
          {/* Search Bar */}
          <div className="flex-1 max-w-md">
            {/* ... (código existente) ... */}
          </div>
          {/* Stats Card */}
          <div className="p-6 text-center min-w-[200px]">
            {/* ... (código existente) ... */}
          </div>
          {/* Add User Button */}
          <button
            onClick={() => setIsModalOpen(true)}
            className="bg-green-500 hover:bg-green-600 text-white px-6 py-2 rounded-lg flex items-center gap-2 font-medium transition-colors"
          >
            <Plus className="w-5 h-5" />
            Adicionar Usuário
          </button>
        </div>
        {/* Modal */}
        <AddUserModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onAddUser={handleAddUser}
        />
        {/* ... (resto do código existente) ... */}
      </main>
    </div>
  );
};

export default UserManagementPage;
