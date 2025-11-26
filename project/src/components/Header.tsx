import { Bell, ShoppingCart, ChevronDown, User as UserIcon, LogOut, KeyRound, Settings, Building2 } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useAuth } from '../context/AuthContext';
import { useEffect, useState, useMemo } from 'react';
import { useData } from '../context/DataContext';

function formatBRL(n?: number) {
  if (n == null || isNaN(n)) return 'R$ 0,00';
  return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(n);
}

function initials(first?: string, last?: string) {
  const f = (first || '').trim()[0] || '';
  const l = (last || '').trim()[0] || '';
  const combo = (f + l).toUpperCase();
  return combo || 'U';
}

const Header = () => {
  const { totalItems } = useCart();
  const { user, logout } = useAuth();
  const { setores, isLoading: loadingData } = useData();
  const navigate = useNavigate();

  const [profileOpen, setProfileOpen] = useState(false);

  const currentSetor = useMemo(
    () => setores.find(s => Number(s.CODSETOR) === Number(user?.codSetor)),
    [setores, user?.codSetor]
  );

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (profileOpen && !t.closest('.profile-dropdown')) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [profileOpen]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <header className="sticky top-0 z-30 flex items-center justify-between px-4 sm:px-6 lg:px-8 h-20 lg:h-24 bg-white border-b border-gray-200 shadow-sm">
      {/* Left block */}
      <div className="flex items-center gap-3 lg:gap-4 min-w-0 flex-1">
        <div className="flex flex-col sm:flex-row sm:items-center gap-1 sm:gap-3 min-w-0">
          <h1 className="text-base sm:text-lg lg:text-xl font-semibold text-gray-900 whitespace-nowrap">
            Dashboard
          </h1>

          {loadingData ? (
            <div className="text-xs text-gray-400 animate-pulse">Carregando unidade…</div>
          ) : currentSetor ? (
            <div className="flex items-center gap-2 text-xs md:text-sm text-gray-600 min-w-0 max-w-[480px]">
              <span className="truncate" title={`${currentSetor.CODSETOR} – ${currentSetor.DESCRICAO}`}>
                <span className="text-gray-500">Unidade:</span>{' '}
                <span className="font-medium text-gray-800">
                  {currentSetor.CODSETOR} – {currentSetor.DESCRICAO}
                </span>
              </span>
              {(user?.perfil === 'Admin' || user?.perfil === 'Aprovador') && currentSetor.SALDO != null && (
                <span className="hidden sm:inline-flex whitespace-nowrap text-[11px] px-2 py-0.5 rounded bg-green-50 border border-green-100 text-green-700 font-medium">
                  Saldo: {formatBRL(Number(currentSetor.SALDO))}
                </span>
              )}
            </div>
          ) : (
            <div className="text-xs text-gray-400 italic">Unidade não definida</div>
          )}
        </div>
      </div>

      {/* Right actions */}
      <div className="flex items-center gap-3 sm:gap-4 lg:gap-6">
        {/* Carrinho */}
        <Link
          to="/carrinho"
          className="relative p-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-all"
          aria-label="Carrinho de compras"
        >
          <ShoppingCart size={24} className="sm:w-6 sm:h-6" />
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
          <Bell size={24} className="sm:w-6 sm:h-6" />
          {/* TODO: badge de novas notificações */}
        </button>

        {/* Perfil */}
        <div className="relative profile-dropdown">
          <button
            className="flex items-center gap-2 p-2 hover:bg-gray-100 rounded-lg transition-all"
            onClick={() => setProfileOpen(o => !o)}
            aria-haspopup="true"
            aria-expanded={profileOpen ? 'true' : 'false'}
            aria-label="Menu de perfil do usuário"
          >
            <div className="w-8 h-8 sm:w-12 sm:h-12 flex items-center justify-center bg-gradient-to-br from-blue-100 to-blue-200 rounded-full ring-2 ring-white shadow-sm">
              <span className="text-lg sm:text-lg font-semibold text-blue-700">
                {initials(user?.primeiroNome ?? undefined, user?.ultimoNome ?? undefined)}
              </span>
            </div>
            <div className="hidden sm:block text-left leading-tight max-w-[140px]">
              <p className="text-xs sm:text-sm font-semibold text-gray-800 truncate">
                {user ? `${user.primeiroNome} ${user.ultimoNome}` : 'Carregando'}
              </p>
              <p className="text-[10px] sm:text-[11px] text-gray-500 truncate">
                {user?.perfil || ''}
              </p>
            </div>
            <ChevronDown
              className={`text-gray-600 transition-transform duration-200 hidden sm:block ${profileOpen ? 'rotate-180' : ''}`}
              size={16}
            />
          </button>

            {profileOpen && (
              <div
                className="absolute right-0 mt-2 w-72 bg-white rounded-xl shadow-2xl border border-gray-200 z-50 overflow-hidden"
                role="menu"
                aria-label="Opções de Perfil"
              >
                {/* Top summary */}
                <div className="px-4 py-3 bg-gradient-to-r from-blue-50 to-gray-50 border-b border-gray-200">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 flex items-center justify-center rounded-full bg-blue-100">
                      <UserIcon size={18} className="text-blue-600" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {user?.primeiroNome} {user?.ultimoNome}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{user?.email}</p>
                    </div>
                  </div>
                </div>

                <div className="py-2">
                  {/* Minha Unidade */}
                  <button
                    onClick={() => { navigate('/controle-financeiro'); setProfileOpen(false); }}
                    className="w-full text-left px-4 py-2 flex items-center gap-3 text-sm hover:bg-gray-50 text-gray-700"
                    role="menuitem"
                  >
                    <Building2 size={16} className="text-gray-500" />
                    <span>Minha Unidade</span>
                  </button>

                  {/* Ajustes / Configurações (placeholder futuro) */}
                  {(user?.perfil === 'Admin') && (
                    <button
                      onClick={() => { navigate('/gerenciamento-usuarios'); setProfileOpen(false); }}
                      className="w-full text-left px-4 py-2 flex items-center gap-3 text-sm hover:bg-gray-50 text-gray-700"
                      role="menuitem"
                    >
                      <Settings size={16} className="text-gray-500" />
                      <span>Gerenciar Usuários</span>
                    </button>
                  )}

                  {/* Alterar senha (futuro) */}
                  <button
                    onClick={() => { navigate('/forgot-password'); setProfileOpen(false); }}
                    className="w-full text-left px-4 py-2 flex items-center gap-3 text-sm hover:bg-gray-50 text-gray-700"
                    role="menuitem"
                  >
                    <KeyRound size={16} className="text-gray-500" />
                    <span>Alterar Senha</span>
                  </button>
                </div>

                <div className="border-t border-gray-200">
                  <button
                    onClick={handleLogout}
                    className="w-full text-left px-4 py-3 flex items-center gap-3 text-sm font-medium text-red-600 hover:bg-red-50"
                    role="menuitem"
                  >
                    <LogOut size={16} />
                    <span>Sair</span>
                  </button>
                </div>
              </div>
            )}
        </div>
      </div>
    </header>
  );
};

export default Header;