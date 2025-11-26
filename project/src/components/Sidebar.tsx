import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, DollarSign, CheckSquare, ShoppingCart, FileText, LogOut, Menu, X } from 'lucide-react';
import logo from '../assets/Logomarca-AtacadoSP.png';
import { useAuth } from '../context/AuthContext';
import { ConfirmationModal } from './ConfirmationModal';

const Sidebar = () => {
  const { user, logout } = useAuth();
  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);
  const [isMobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleLogoutConfirm = () => {
    logout();
    setLogoutModalOpen(false);
  };

  const closeMobileMenu = () => {
    setMobileMenuOpen(false);
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-5 px-6 py-5 rounded-xl text-base transition-all duration-200 ${
      isActive 
        ? 'bg-gray-50 text-gray-700 font-semibold border-l-4 border-gray-600 shadow-sm' 
        : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900 border-l-4 border-transparent'
    }`;

  const adminMenu = [
    { to: '/', icon: <Home size={20} />, label: 'Dashboard' },
    { to: '/gerenciamento-usuarios', icon: <Users size={20} />, label: 'Gerenciamento de Usuários' },
    { to: '/controle-financeiro', icon: <DollarSign size={20} />, label: 'Controle Financeiro' },
    { to: '/painel-aprovacao', icon: <CheckSquare size={20} />, label: 'Painel de Aprovação' },
    { to: '/catalogo-produtos', icon: <ShoppingCart size={20} />, label: 'Catálogo de Produtos' },
    { to: '/pedidos', icon: <FileText size={20} />, label: 'Pedidos' },
  ];

  const solicitanteMenu = [
    { to: '/', icon: <Home size={20} />, label: 'Dashboard' },
    { to: '/catalogo-produtos', icon: <ShoppingCart size={20} />, label: 'Catálogo de Produtos' },
    { to: '/pedidos', icon: <FileText size={20} />, label: 'Pedidos' },
  ];

  const aprovadorMenu = [
    { to: '/', icon: <Home size={20} />, label: 'Dashboard' },
    { to: '/controle-financeiro', icon: <DollarSign size={20} />, label: 'Controle Financeiro' },
    { to: '/painel-aprovacao', icon: <CheckSquare size={20} />, label: 'Painel de Aprovação' },
    { to: '/catalogo-produtos', icon: <ShoppingCart size={20} />, label: 'Catálogo de Produtos' },
    { to: '/pedidos', icon: <FileText size={20} />, label: 'Pedidos' },
  ];

  const getMenu = () => {
    if (!user) return [];
    switch (user.perfil) {
      case 'Admin': return adminMenu;
      case 'Aprovador': return aprovadorMenu;
      case 'Solicitante': return solicitanteMenu;
      default: return [];
    }
  };

  const menuItems = getMenu();

  return (
    <>
      <button
        onClick={() => setMobileMenuOpen(true)}
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-white rounded-lg shadow-md hover:bg-gray-50 transition-colors"
        aria-label="Abrir menu"
      >
        <Menu size={24} className="text-gray-700" />
      </button>

      {/* Overlay escuro para mobile */}
      {isMobileMenuOpen && (
        <div
          className="lg:hidden fixed inset-0 bg-black bg-opacity-50 z-40 transition-opacity"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-50
          w-72 bg-white shadow-xl lg:shadow-md 
          flex flex-col
          transform transition-transform duration-300 ease-in-out
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {/* Header do Sidebar */}
        <div className="relative p-6 border-b border-gray-200 bg-white">
          {/* Botão fechar no mobile */}
          <button
            onClick={closeMobileMenu}
            className="lg:hidden absolute top-4 right-4 p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Fechar menu"
          >
            <X size={20} className="text-gray-600" />
          </button>

          <div className="flex justify-center">
            <img 
              src={logo} 
              alt="Logo Atacado São Paulo" 
              className="h-12 w-auto object-contain"
            />
          </div>
        </div>

        {/* Menu de navegação */}
        <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
          {menuItems.map((item, index) => (
            <NavLink
              key={index}
              to={item.to}
              className={navLinkClasses}
              onClick={closeMobileMenu}
              end
            >
              <span className="flex-shrink-0">{item.icon}</span>
              <span className="text-sm font-medium">{item.label}</span>
            </NavLink>
          ))}
        </nav>

        {/* Footer com botão de logout */}
        <div className="p-4 border-t border-gray-200 bg-gray-50">
          <button
            onClick={() => {
              setLogoutModalOpen(true);
              closeMobileMenu();
            }}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-red-600 hover:bg-red-50 hover:text-red-700 transition-all duration-200 font-medium text-sm border border-transparent hover:border-red-200"
          >
            <LogOut size={20} />
            <span>Sair do Sistema</span>
          </button>
        </div>
      </aside>

      <ConfirmationModal
        isOpen={isLogoutModalOpen}
        onClose={() => setLogoutModalOpen(false)}
        onConfirm={handleLogoutConfirm}
        title="Confirmar Logout"
        message="Você tem certeza que deseja sair do sistema?"
      />
    </>
  );
};

export default Sidebar;