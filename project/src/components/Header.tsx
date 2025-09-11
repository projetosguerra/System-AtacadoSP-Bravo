import { Bell, ShoppingCart, ChevronDown, User as UserIcon, RefreshCw } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';

const Header = () => {
  const { totalItems } = useCart();
  const { currentUser, users, setCurrentUser: switchUser, refetchUsers, loading } = useAuth();

  const handleUserChange = (event: React.ChangeEvent<HTMLSelectElement>) => {
    const selectedUserId = Number(event.target.value);
    const selectedUser = users.find(u => u.codUsuario === selectedUserId) || null;
    switchUser(selectedUser);
  };

  if (loading || !currentUser) {
    return <div className="bg-white shadow-sm p-4 text-center">Carregando informações do usuário...</div>;
  }

  return (
    <header className="bg-white shadow-sm p-4 flex justify-between items-center">
      <div>
        <h1 className="text-xl font-semibold text-gray-800">Bem-vindo(a), {currentUser.primeiroNome}!</h1>
        <p className="text-sm text-gray-500">{currentUser.perfil} | {currentUser.setor}</p>
      </div>

      <div className="flex items-center space-x-6">
        <div className="relative">
          <UserIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" />
          <select
            className="appearance-none bg-gray-100 border border-gray-300 rounded-md py-2 pl-9 pr-8 text-sm font-medium text-gray-700 hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
            value={currentUser.codUsuario}
            onChange={handleUserChange}
          >
            {users.map(user => (
              <option key={user.codUsuario} value={user.codUsuario}>
                {user.primeiroNome} ({user.perfil})
              </option>
            ))}
          </select>
          <ChevronDown className="w-4 h-4 absolute right-2 top-1/2 -translate-y-1/2 pointer-events-none text-gray-600" />
        </div>

        <button
          onClick={refetchUsers}
          className="p-2 text-gray-600 bg-gray-100 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
          title="Atualizar lista de usuários"
        >
          <RefreshCw size={18} />
        </button>

        <button className="text-gray-600 hover:text-gray-800"><Bell size={24} /></button>
        <Link to="/carrinho" className="relative text-gray-600 hover:text-gray-800">
          <ShoppingCart size={24} />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </Link>
      </div>
    </header>
  );
};

export default Header;

