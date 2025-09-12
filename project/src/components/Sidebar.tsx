import { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Users, DollarSign, CheckSquare, ShoppingCart, FileText, LogOut } from 'lucide-react';
import logo from '../assets/Logomarca-AtacadoSP.png';
import { useAuth } from '../context/AuthContext';
import { ConfirmationModal } from './ConfirmationModal';

const Sidebar = () => {
  const { user, logout } = useAuth();

  const [isLogoutModalOpen, setLogoutModalOpen] = useState(false);

  const handleLogoutConfirm = () => {
    logout();
    setLogoutModalOpen(false);
  };

  const navLinkClasses = ({ isActive }: { isActive: boolean }) =>
    `flex items-center gap-3 p-3 rounded-lg transition-colors ${isActive ? 'bg-gray-200 text-black-700 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
    }`;

  const adminMenu = [
    { to: '/', icon: <Home size={24} />, label: 'Dashboard' },
    { to: '/gerenciamento-usuarios', icon: <Users size={24} />, label: 'Gerenciamento de Usuários' },
    { to: '/controle-financeiro', icon: <DollarSign size={24} />, label: 'Controle Financeiro' },
    { to: '/painel-aprovacao', icon: <CheckSquare size={24} />, label: 'Painel de Aprovação' },
    { to: '/catalogo-produtos', icon: <ShoppingCart size={24} />, label: 'Catálogo de Produtos' },
    { to: '/pedidos', icon: <FileText size={24} />, label: 'Pedidos' },
  ];

  const solicitanteMenu = [
    { to: '/', icon: <Home size={24} />, label: 'Dashboard' },
    { to: '/catalogo-produtos', icon: <ShoppingCart size={24} />, label: 'Catálogo de Produtos' },
    { to: '/pedidos', icon: <FileText size={24} />, label: 'Pedidos' },
  ];

  const aprovadorMenu = [
    { to: '/', icon: <Home size={24} />, label: 'Dashboard' },
    { to: '/controle-financeiro', icon: <DollarSign size={24} />, label: 'Controle Financeiro' },
    { to: '/painel-aprovacao', icon: <CheckSquare size={24} />, label: 'Painel de Aprovação' },
    { to: '/catalogo-produtos', icon: <ShoppingCart size={24} />, label: 'Catálogo de Produtos' },
    { to: '/pedidos', icon: <FileText size={24} />, label: 'Pedidos' },
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
    <aside className="w-64 bg-white shadow-md flex flex-col flex-shrink-0">
      <div className="p-6 flex items-center justify-center border-b">
        <img src={logo} alt="Logo Atacado São Paulo" className="h-12" />
      </div>
      <nav className="flex-1 p-4 space-y-2">
        {menuItems.map((item, index) => (
          <NavLink key={index} to={item.to} className={navLinkClasses} end>
            {item.icon}
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
      <div className="p-4 border-t">
        <button
            onClick={() => setLogoutModalOpen(true)}
            className="w-full flex items-center p-2 rounded-md text-red-400 hover:bg-red-500 hover:text-white transition-colors"
          >
            <LogOut className="mr-3" />
            Logout
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

