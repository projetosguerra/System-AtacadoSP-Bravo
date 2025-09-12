import { Bell, ShoppingCart, ChevronDown, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState } from 'react';

const Header = () => {
  const { totalItems } = useCart();
  const { user, allUsers, fetchAllUsers, switchUserForTesting, isLoading } = useAuth();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) {
      fetchAllUsers();
    }
  }, [isLoading, fetchAllUsers]);

  const handleUserSwitch = (codUsuario: number) => {
    switchUserForTesting(codUsuario);
    setDropdownOpen(false); 
  };

  return (
    <header className="flex items-center justify-between p-4 bg-white border-b">
      <div>
        <h1 className="text-xl font-semibold">Dashboard</h1>
      </div>
      <div className="flex items-center space-x-6">
        <Link to="/carrinho" className="relative text-gray-600 hover:text-gray-800">
          <ShoppingCart size={24} />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-5 w-5 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </Link>
        <button className="relative">
          <Bell className="text-gray-600" />
        </button>
        <div className="relative">
          <div 
            className="flex items-center space-x-2 cursor-pointer"
            onClick={() => setDropdownOpen(!isDropdownOpen)}
          >
            <div className="w-10 h-10 flex items-center justify-center bg-gray-200 rounded-full">
              <UserIcon className="text-gray-500" />
            </div>
            <div>
              <p className="font-semibold">
                {user ? `${user.primeiroNome} ${user.ultimoNome}` : 'Carregando...'}
              </p>
              <p className="text-sm text-gray-500">
                {user ? user.perfil : ''}
              </p>
            </div>
            <ChevronDown className="text-gray-600" />
          </div>

          {/* Dropdown para troca de usuário */}
          {isDropdownOpen && allUsers.length > 0 && (
            <div className="absolute right-0 mt-2 w-56 bg-white rounded-md shadow-lg z-10">
              <div className="py-1">
                <p className="px-4 py-2 text-xs text-gray-400">Trocar para (teste):</p>
                {allUsers.map((testUser) => (
                  <button
                    key={testUser.codUsuario}
                    onClick={() => handleUserSwitch(testUser.codUsuario)}
                    className="w-full text-left block px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                    disabled={user?.codUsuario === testUser.codUsuario} // Desabilita o usuário atual
                  >
                    {testUser.primeiroNome} ({testUser.perfil})
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;