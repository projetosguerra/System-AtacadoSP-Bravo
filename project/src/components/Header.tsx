import React from 'react';
import { Mail, Bell } from 'lucide-react';

const Header = () => {
  return (
    <div className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Welcome Section */}
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Bem-vindo, Pietro Guerra</h1>
          <p className="text-gray-600">Hoje é Sexta-Feira, 22/08/2025</p>
        </div>

        {/* User Section */}
        <div className="flex items-center space-x-4">
          {/* Notifications */}
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors">
            <Mail className="w-5 h-5" />
          </button>
          <button className="p-2 text-gray-400 hover:text-gray-600 transition-colors relative">
            <Bell className="w-5 h-5" />
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full"></span>
          </button>

          {/* User Profile */}
          <div className="flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-900">Pietro Guerra</p>
              <p className="text-xs text-red-600">Conta Admin.</p>
            </div>
            <div className="w-8 h-8 bg-gray-900 rounded-full flex items-center justify-center">
              <span className="text-white text-sm font-medium">PG</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Header;