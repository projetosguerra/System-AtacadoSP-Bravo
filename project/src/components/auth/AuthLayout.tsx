import React from 'react';
import { Logo } from '../Logo.tsx';

interface AuthLayoutProps {
  children: React.ReactNode;
  alternativeAction?: {
    text: string;
    buttonText: string;
    onClick: () => void;
  };
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  alternativeAction
}) => {
  return (
    <div className="min-h-screen bg-white">
      <header className="flex justify-between items-center p-6">
        <Logo />
        {alternativeAction && (
          <button
            onClick={alternativeAction.onClick}
            className="px-6 py-2 border-2 border-green-500 text-green-600 rounded-full hover:bg-green-50 transition-colors font-medium"
          >
            {alternativeAction.buttonText}
          </button>
        )}
      </header>
      <div className="flex">
        <div className="w-full lg:w-1/2 px-6 pb-12">
          <div className="max-w-md mx-auto lg:mx-0 lg:ml-16">
            {children}
          </div>
        </div>
        <div className="hidden lg:block lg:w-1/2 bg-gray-50">
           {/* Placeholder para a imagem */}
           <div className="flex items-center justify-center h-full">
                <img src="../assets/Banner 1.png" alt="Placeholder" className="max-w-xs" />
           </div>
        </div>
      </div>
    </div>
  );
};

