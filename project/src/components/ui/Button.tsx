import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'outline';
  size?: 'sm' | 'md' | 'lg';
  children: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'primary',
  size = 'md',
  children,
  className = '',
  disabled,
  ...props
}) => {
  const baseStyles = 'font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2';
  
  const variants = {
    primary: `bg-green-500 text-white hover:bg-green-600 focus:ring-green-500 ${disabled ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-lg active:scale-[0.98]'}`,
    secondary: `bg-gray-100 text-gray-900 hover:bg-gray-200 focus:ring-gray-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`,
    outline: `border-2 border-green-500 text-green-600 hover:bg-green-50 focus:ring-green-500 ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`
  };

  const sizes = {
    sm: 'px-4 py-2 text-sm',
    md: 'px-6 py-3 text-base',
    lg: 'px-8 py-4 text-lg'
  };

  return (
    <button
      {...props}
      disabled={disabled}
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${className}`}
    >
      {children}
    </button>
  );
};