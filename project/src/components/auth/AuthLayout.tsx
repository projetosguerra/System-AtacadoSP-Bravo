import React from 'react';
import Logo from '../../assets/Logomarca-AtacadoSP.png';
import bannerImage from '../../assets/Banner 1.png';

interface AuthLayoutProps {
  children: React.ReactNode;
  alternativeAction?: {
    text: string;
    buttonText: string;
    onClick: () => void;
  };
  onLogoClick?: () => void;
}

export const AuthLayout: React.FC<AuthLayoutProps> = ({
  children,
  alternativeAction,
  onLogoClick
}) => {
  return (
    <div className="min-h-screen bg-white flex">
      <div className="w-full lg:w-1/2 flex flex-col">
        <header className="flex justify-between items-center p-6">
          <div
            className="cursor-pointer"
            onClick={onLogoClick}
          >
            <img src={Logo} alt="Atacado São Paulo" className="h-16 w-auto" />
          </div>

          {alternativeAction && (
            <button
              onClick={alternativeAction.onClick}
              className="px-4 py-2 border border-green-500 text-green-600 rounded-md hover:bg-green-50 transition-colors duration-200 font-medium"
            >
              {alternativeAction.buttonText}
            </button>
          )}
        </header>

        <div className="flex-1 flex justify-center px-6 pb-12">
          <div className="w-full max-w-md">
            {children}
          </div>
        </div>
      </div>

      <div className="hidden lg:flex lg:w-1/2 bg-gray-50 items-center justify-center max-h-screen">
        <div className="w-full h-full flex items-center justify-center">
          <img
            src={bannerImage}
            alt="Atacado São Paulo Banner"
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );
};