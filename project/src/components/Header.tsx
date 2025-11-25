import { Bell, ShoppingCart, ChevronDown, User as UserIcon } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { useData } from '../context/DataContext';

function formatBRL(n?: number) {
  if (n == null || isNaN(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

const Header = () => {
  const { totalItems } = useCart();
  const { user, allUsers, fetchAllUsers, switchUserForTesting, isLoading } = useAuth();
  const { setores, isLoading: loadingData } = useData();
  const [isDropdownOpen, setDropdownOpen] = useState(false);

  useEffect(() => {
    if (!isLoading) fetchAllUsers();
  }, [isLoading, fetchAllUsers]);

  const currentSetor = useMemo(
    () => setores.find(s => Number(s.CODSETOR) === Number(user?.codSetor)),
    [setores, user?.codSetor]
  );

  const getSetorForUser = (u: any) =>
    setores.find(s => Number(s.CODSETOR) === Number(u?.codSetor));

  const handleUserSwitch = (codUsuario: number) => {
    switchUserForTesting(codUsuario);
    setDropdownOpen(false);
  };

  return (
    <header className="flex items-center justify-between px-6 h-20 bg-white border-b border-gray-200">
      <div className="flex items-center gap-4 min-w-0">
        <h1 className="text-lg font-semibold text-gray-900 whitespace-nowrap">Dashboard</h1>
        {loadingData ? (
          <div className="text-xs text-gray-400 animate-pulse">Carregando unidade…</div>
        ) : currentSetor ? (
          <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 min-w-0 max-w-[460px]">
            <span className="truncate" title={`${currentSetor.CODSETOR} – ${currentSetor.DESCRICAO}`}>
              <span className="text-gray-500">Unid:</span>{' '}
              <span className="font-medium text-gray-800">
                {currentSetor.CODSETOR} – {currentSetor.DESCRICAO}
              </span>
            </span>
            {(user?.perfil === 'Admin' || user?.perfil === 'Aprovador') && currentSetor.SALDO != null && (
              <span className="whitespace-nowrap text-[11px] px-2 py-0.5 rounded bg-green-50 border border-green-100 text-green-700 font-medium">
                Saldo: {formatBRL(Number(currentSetor.SALDO))}
              </span>
            )}
          </div>
        ) : (
          <div className="text-xs text-gray-400 italic">Unidade não definida</div>
        )}
      </div>

      <div className="flex items-center space-x-6">
        <Link to="/carrinho" className="relative text-gray-600 hover:text-gray-800 transition-colors">
          <ShoppingCart size={22} />
          {totalItems > 0 && (
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-[10px] rounded-full h-5 w-5 flex items-center justify-center">
              {totalItems}
            </span>
          )}
        </Link>

        <button className="relative text-gray-600 hover:text-gray-800 transition-colors">
          <Bell size={22} />
        </button>

        <div className="relative">
          <div
            className="flex items-center space-x-2 cursor-pointer select-none"
            onClick={() => setDropdownOpen(!isDropdownOpen)}
          >
            <div className="w-9 h-9 flex items-center justify-center bg-gray-200 rounded-full">
              <UserIcon className="text-gray-500" size={18} />
            </div>
            <div className="text-left leading-tight">
              <p className="text-sm font-semibold text-gray-800 truncate max-w-[120px]">
                {user ? `${user.primeiroNome} ${user.ultimoNome}` : 'Carregando...'}
              </p>
              <p className="text-[11px] text-gray-500">{user?.perfil || ''}</p>
            </div>
            <ChevronDown className="text-gray-600" size={18} />
          </div>

          {isDropdownOpen && allUsers.length > 0 && (
            <div className="absolute right-0 mt-2 w-72 bg-white rounded-md shadow-lg z-20 border border-gray-100">
              <div className="py-2 max-h-[60vh] overflow-auto">
                <p className="px-4 pb-2 text-[11px] text-gray-400">Trocar usuário (teste):</p>
                {allUsers.map((testUser: any) => {
                  const setorUser = getSetorForUser(testUser);
                  return (
                    <button
                      key={testUser.codUsuario}
                      onClick={() => handleUserSwitch(testUser.codUsuario)}
                      className={`w-full text-left px-4 py-2 text-sm hover:bg-gray-50 group ${
                        user?.codUsuario === testUser.codUsuario
                          ? 'text-gray-400 cursor-not-allowed'
                          : 'text-gray-700'
                      }`}
                      disabled={user?.codUsuario === testUser.codUsuario}
                      title={
                        setorUser
                          ? `Setor: ${setorUser.CODSETOR} – ${setorUser.DESCRICAO}`
                          : 'Setor não definido'
                      }
                    >
                      <div className="flex flex-col">
                        <span className="font-medium truncate">
                          {testUser.primeiroNome} {testUser.ultimoNome} ({testUser.perfil})
                        </span>
                        <span className="text-[11px] text-gray-500 truncate">
                          {setorUser
                            ? `Setor: ${setorUser.CODSETOR} – ${setorUser.DESCRICAO}`
                            : 'Setor: Não definido'}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;