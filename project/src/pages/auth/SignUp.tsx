// Em project/src/pages/auth/SignUp.tsx

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom'; // Importe o useNavigate para redirecionar
import { AuthLayout } from '../../components/auth/AuthLayout.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Checkbox } from '../../components/ui/Checkbox.tsx';
import { ReCaptcha } from '../../components/ui/ReCaptcha.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

interface SignUpProps {
  onNavigateToSignIn: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onNavigateToSignIn }) => {
  const { register } = useAuth();
  const navigate = useNavigate(); 

  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    stayConnected: false,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);


  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    setIsLoading(true);

    try {
      await register(
        formData.firstName,
        formData.lastName,
        formData.email,
        formData.password
      );
      
      setSuccess('Cadastro realizado com sucesso! Redirecionando para o login...');
      setTimeout(() => {
        navigate('/login');
      }, 2000);

    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <AuthLayout
      alternativeAction={{
        text: 'Já tem uma conta?',
        buttonText: 'Sign In',
        onClick: onNavigateToSignIn,
      }}
    >
      <div className="mt-8">
        <p className="text-gray-600 text-sm mb-2">Bem-vindo!</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Faça seu registro
        </h2>

        <form onSubmit={handleSubmit}>
          <Input
            label="Primeiro Nome"
            type="text"
            name="firstName"
            placeholder="Insira seu primeiro nome"
            value={formData.firstName}
            onChange={handleInputChange}
            required
          />
          <Input
            label="Último Nome"
            type="text"
            name="lastName"
            placeholder="Insira seu último nome"
            value={formData.lastName}
            onChange={handleInputChange}
            required
          />
          <Input
            label="Endereço de email"
            type="email"
            name="email"
            placeholder="Insira seu email"
            value={formData.email}
            onChange={handleInputChange}
            required
          />
          <Input
            label="Senha"
            type="password"
            name="password"
            placeholder="••••••••••"
            value={formData.password}
            onChange={handleInputChange}
            showPasswordToggle
            required
          />
          <div className="mb-6">
            <Checkbox
              label="Manter conectado"
              name="stayConnected"
              checked={formData.stayConnected}
              onChange={handleInputChange}
            />
          </div>
          <ReCaptcha />

          {/* Exibe mensagens de erro ou sucesso */}
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center mb-4">{success}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Cadastrando...' : 'Sign Up'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};