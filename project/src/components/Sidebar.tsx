import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  CheckSquare,
  Package,
  Users,
  DollarSign,
  FileText,
  LogOut,
  Store
} from 'lucide-react';

const Sidebar = () => {
  const location = useLocation();
  const currentPath = location.pathname;

  const menuItems = [
    { icon: LayoutDashboard, label: 'Dashboard', path: '/' },
    { icon: CheckSquare, label: 'Painel de Aprovação', path: '/painel-aprovacao' },
    { icon: Package, label: 'Pedidos', path: '/pedidos' },
    { icon: Users, label: 'Gerenciamento de Usuários', path: '/gerenciamento-usuarios' },
    { icon: DollarSign, label: 'Controle Financeiro', path: '/controle-financeiro' },
    { icon: FileText, label: 'Relatórios', path: '/relatorios' },
    { icon: Store, label: 'Catálogo de Produtos', path: '/catalogo-produtos' },
  ];

  return (
    <div className="w-64 bg-white border-r border-gray-200 h-screen flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-gray-200">
        <div className='flex justify-center'>
          <img src="/src/assets/Logomarca-AtacadoSP.png" alt="Logo Atacado São Paulo" />
        </div>
      </div>

      {/* Menu Items */}
      <nav className="flex-1 p-4">
        <ul className="space-y-2">
          {menuItems.map((item, index) => (
            <li key={index}>
              <Link
                to={item.path}
                className={`flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${currentPath === item.path
                  ? 'bg-gray-100 text-gray-900 font-semibold'
                  : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'
                  }`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="p-4 border-t border-gray-200">
        <a
          href="#"
          className="flex items-center space-x-3 px-4 py-3 text-gray-600 hover:bg-gray-50 hover:text-gray-900 rounded-lg transition-colors"
        >
          <LogOut className="w-5 h-5" />
          <span className="text-sm font-medium">Logout</span>
        </a>
      </div>
    </div>
  );
};

export default Sidebar;