import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { useAuth } from '../../context/AuthContext';

interface LoginProps {
  onNavigateToSignUp: () => void;
  onNavigateToForgotPassword: () => void;
}

export const Login: React.FC<LoginProps> = ({
  onNavigateToSignUp,
  onNavigateToForgotPassword,
}) => {
  const { login } = useAuth();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: '',
    password: '',
    stayConnected: false,
  });

  const [error, setError] = useState('');
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
    setIsLoading(true);

    console.log('Valores que serão enviados para o login:', { 
        email: formData.email, 
        password: formData.password 
    });

    try {
      await login(formData.email, formData.password);
      navigate('/');
    } catch (err: any) {
      setError(err.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoClick = () => {
    navigate('/login');
  };

  return (
    <AuthLayout
      alternativeAction={{
        text: 'Não tem uma conta?',
        buttonText: 'Sign Up',
        onClick: onNavigateToSignUp,
      }}
      onLogoClick={handleLogoClick}
    >
      <div className="mt-8">
        <p className="text-gray-600 text-sm mb-2">Bem-vindo de volta!</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">
          Faça seu login
        </h2>

        <form onSubmit={handleSubmit}>
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

          <div className="flex justify-between items-center mb-6">
            <Checkbox
              label="Manter conectado"
              name="stayConnected"
              checked={formData.stayConnected}
              onChange={handleInputChange}
            />
            <button
              type="button"
              onClick={onNavigateToForgotPassword}
              className="text-sm text-blue-600 hover:underline"
            >
              Esqueceu a senha?
            </button>
          </div>
          
          {error && <p className="text-red-500 text-sm text-center mb-4">{error}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Entrando...' : 'Sign In'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};