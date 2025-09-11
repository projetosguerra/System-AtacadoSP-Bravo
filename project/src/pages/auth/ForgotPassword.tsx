import React, { useState } from 'react';
import { AuthLayout } from '../../components/auth/AuthLayout.tsx';
import { Input } from '../../components/ui/Input.tsx';
import { Button } from '../../components/ui/Button.tsx';

interface ForgotPasswordProps {
  onNavigateToSignIn: () => void;
}

export const ForgotPassword: React.FC<ForgotPasswordProps> = ({
  onNavigateToSignIn
}) => {
  const [email, setEmail] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('Password reset requested for:', email);
    setIsSubmitted(true);
  };

  if (isSubmitted) {
    return (
      <AuthLayout
        alternativeAction={{
          text: '',
          buttonText: 'Sign In',
          onClick: onNavigateToSignIn
        }}
      >
        <div className="mt-8 text-center">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
          </div>
          
          <h2 className="text-2xl font-bold text-gray-900 mb-4">
            E-mail enviado!
          </h2>
          
          <p className="text-gray-600 text-sm mb-8 leading-relaxed">
            Enviamos um link de redefinição de senha para{' '}
            <span className="font-medium text-gray-900">{email}</span>.
            Verifique sua caixa de entrada e siga as instruções.
          </p>

          <Button onClick={onNavigateToSignIn} className="w-full">
            Voltar ao Login
          </Button>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      alternativeAction={{
        text: '',
        buttonText: 'Sign In',
        onClick: onNavigateToSignIn
      }}
    >
      <div className="mt-8">
        <h2 className="text-2xl font-bold text-gray-900 mb-4">
          Recuperar sua Senha
        </h2>
        
        <p className="text-gray-600 text-sm mb-8 leading-relaxed">
          Por favor, insira o seu endereço de e-mail para receber um link de redefinição de senha.
        </p>

        <form onSubmit={handleSubmit}>
          <Input
            label="Endereço de email"
            type="email"
            name="email"
            placeholder="Insira seu email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />

          <Button type="submit" className="w-full mt-4">
            Redefinir Senha
          </Button>
        </form>

        <div className="text-center mt-6">
          <button
            type="button"
            onClick={onNavigateToSignIn}
            className="text-sm text-gray-600 hover:text-gray-800 transition-colors"
          >
            ← Voltar ao login
          </button>
        </div>
      </div>
    </AuthLayout>
  );
};