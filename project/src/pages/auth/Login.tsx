import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { Button } from '../../components/ui/Button.tsx';
import { Checkbox } from '../../components/ui/Checkbox.tsx';
import { ReCaptcha } from '../../components/ui/ReCaptcha.tsx';
// import { useAuth } from '../../context/AuthContext.tsx'; // Será usado no futuro

export const Login: React.FC = () => {
  const navigate = useNavigate();
  // const { login } = useAuth(); // Função a ser implementada no AuthContext

  const [formData, setFormData] = useState({ username: '', password: '', rememberMe: false });

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Login submetido:', formData);
    // Aqui virá a chamada: await login(formData.username, formData.password);
  };

  return (
    <AuthLayout
      alternativeAction={{ text: '', buttonText: 'Sign Up', onClick: () => navigate('/signup') }}
    >
      <div className="mt-8">
        <p className="text-gray-600 text-sm mb-2">Bem-vindo de volta!</p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Por favor, faça Login</h2>
        <form onSubmit={handleSubmit}>
          <Input label="Usuário" type="text" name="username" placeholder="Insira seu usuário" value={formData.username} onChange={handleInputChange} required />
          <Input label="Senha" type="password" name="password" placeholder="••••••••••" value={formData.password} onChange={handleInputChange} showPasswordToggle required />
          <div className="flex items-center justify-between mb-6">
            <Checkbox label="Lembrar-me" name="rememberMe" checked={formData.rememberMe} onChange={handleInputChange} />
            <button type="button" onClick={() => navigate('/forgot-password')} className="text-sm text-green-600 hover:text-green-700 transition-colors">
              Esqueci minha senha
            </button>
          </div>
          <ReCaptcha />
          <Button type="submit" className="w-full">Sign In</Button>
        </form>
      </div>
    </AuthLayout>
  );
};

