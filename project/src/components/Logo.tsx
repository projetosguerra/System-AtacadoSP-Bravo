import React from 'react';
import { Link } from 'react-router-dom';

export const Logo: React.FC = () => {
  return (
    <Link to="/">
      <img 
        src="https://atacadosaopaulo.com/images/logo.png" 
        alt="Logo Atacado São Paulo" 
        className="h-10"
      />
    </Link>
  );
};
