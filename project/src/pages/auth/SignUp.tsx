import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Checkbox } from '../../components/ui/Checkbox.tsx';
import { ReCaptcha } from '../../components/ui/ReCaptcha.tsx';
import { useAuth } from '../../context/AuthContext.tsx';

const formatPhoneNumber = (value: string) => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const phoneNumberLength = phoneNumber.length;
  if (phoneNumberLength < 3) return `(${phoneNumber}`;
  if (phoneNumberLength < 8) return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2)}`;
  return `(${phoneNumber.slice(0, 2)}) ${phoneNumber.slice(2, 7)}-${phoneNumber.slice(7, 11)}`;
};

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
    genero: '',
    telefone: '',
    stayConnected: false,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);  

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    
    if (name === 'telefone') {
      value = formatPhoneNumber(value);
    }

    setFormData((prev) => ({ ...prev, [name]: value }));
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
        formData.password,
        formData.genero,
        formData.telefone
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

  const handleLogoClick = () => {
    navigate('/login');
  };

  return (
    <AuthLayout
      alternativeAction={{
        text: 'Já tem uma conta?',
        buttonText: 'Sign In',
        onClick: onNavigateToSignIn,
      }}
      onLogoClick={handleLogoClick}
    >
      <div className="mt-8 flex-wrap">
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

          <div className="flex gap-4">
            <div className="w-1/2">
              <label htmlFor="genero" className="block text-sm font-medium text-gray-700">Gênero</label>
              <select
                id="genero"
                name="genero"
                value={formData.genero}
                onChange={handleInputChange}
                className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg 0 transition-colors duration-200 bg-white"
                required
              >
                <option value="" disabled>Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <Input
              label="Telefone"
              name="telefone"
              placeholder="(XX) XXXXX-XXXX"
              value={formData.telefone}
              onChange={handleInputChange}
              maxLength={15}
            />
          </div>

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