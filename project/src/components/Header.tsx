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

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (isDropdownOpen && !target.closest('.user-dropdown-container')) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isDropdownOpen]);

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-20 lg:h-24 bg-white border-b border-gray-200 shadow-sm">
      <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
        <div className="w-10 lg:hidden"></div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
          <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 whitespace-nowrap">
            Dashboard
          </h1>

          {loadingData ? (
            <div className="text-xs text-gray-400 animate-pulse">Carregando unidade…</div>
          ) : currentSetor ? (
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 min-w-0 max-w-[460px]">
              <span className="truncate" title={`${currentSetor.CODSETOR} – ${currentSetor.DESCRICAO}`}>
                <span className="text-gray-500">Unidade:</span>{' '}
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
      </div>

      <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
        {/* Carrinho */}
        <Link
          to="/carrinho"
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          aria-label="Carrinho de compras"
        >
          <ShoppingCart size={20} className="sm:w-5 sm:h-5" />
          {totalItems > 0 && (
            <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] font-bold rounded-full h-5 w-5 flex items-center justify-center shadow-md ring-2 ring-white">
              {totalItems > 99 ? '99+' : totalItems}
            </span>
          )}
        </Link>

        {/* Notificações */}
        <button
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          aria-label="Notificações"
        >
          <Bell size={20} className="sm:w-5 sm:h-5" />
        </button>

        {/* Perfil do usuário com dropdown */}
        <div className="relative user-dropdown-container">
          <button
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-all"
            onClick={() => setDropdownOpen(!isDropdownOpen)}
            aria-label="Menu do usuário"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 rounded-full ring-2 ring-white shadow-sm">
              <UserIcon className="text-blue-600" size={16} />
            </div>
            <div className="hidden sm:block text-left leading-tight">
              <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate max-w-[100px] lg:max-w-[140px]">
                {user ? `${user.primeiroNome} ${user.ultimoNome}` : 'Carregando...'}
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-500">{user?.perfil || ''}</p>
            </div>
            <ChevronDown
              className={`text-gray-600 transition-transform duration-200 hidden sm:block ${isDropdownOpen ? 'rotate-180' : ''}`}
              size={16}
            />
          </button>

          {/* Dropdown menu */}
          {isDropdownOpen && allUsers.length > 0 && (
            <div className="absolute right-0 mt-2 w-80 sm:w-[340px] bg-white rounded-xl shadow-2xl z-50 border border-gray-200 overflow-hidden">
              {/* Header do dropdown */}
              <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-gray-50 border-b border-gray-200">
                <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">
                  Trocar Usuário (Teste)
                </p>
              </div>

              {/* Lista de usuários */}
              <div className="py-2 max-h-[60vh] overflow-auto">
                {allUsers.map((testUser: any) => {
                  const setorUser = getSetorForUser(testUser);
                  const isCurrentUser = user?.codUsuario === testUser.codUsuario;

                  return (
                    <button
                      key={testUser.codUsuario}
                      onClick={() => handleUserSwitch(testUser.codUsuario)}
                      className={`w-full text-left px-4 py-3 text-sm transition-colors ${isCurrentUser
                          ? 'bg-blue-50 text-gray-400 cursor-not-allowed'
                          : 'hover:bg-gray-50 text-gray-700'
                        }`}
                      disabled={isCurrentUser}
                      title={
                        setorUser
                          ? `Setor: ${setorUser.CODSETOR} – ${setorUser.DESCRICAO}`
                          : 'Setor não definido'
                      }
                    >
                      <div className="flex items-start gap-3">
                        <div className={`w-8 h-8 flex items-center justify-center rounded-full flex-shrink-0 ${isCurrentUser ? 'bg-blue-100' : 'bg-gray-100'
                          }`}>
                          <UserIcon className={isCurrentUser ? 'text-blue-500' : 'text-gray-500'} size={14} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className={`font-semibold truncate ${isCurrentUser ? 'text-blue-600' : 'text-gray-900'}`}>
                              {testUser.primeiroNome} {testUser.ultimoNome}
                            </span>
                            {isCurrentUser && (
                              <span className="px-2 py-0.5 text-[10px] bg-blue-100 text-blue-700 rounded-full font-medium">
                                Atual
                              </span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {testUser.perfil}
                          </p>
                          <p className="text-[11px] text-gray-400 truncate mt-1">
                            {setorUser
                              ? `Setor: ${setorUser.CODSETOR} – ${setorUser.DESCRICAO}`
                              : 'Setor: Não definido'}
                          </p>
                        </div>
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