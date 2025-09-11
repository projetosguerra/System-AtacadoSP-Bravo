import React, { useState } from 'react';
import { AuthLayout } from '../../components/auth/AuthLayout.tsx';
import { Button } from '../../components/ui/Button.tsx';

interface EmailVerificationProps {
  onNavigateToSignIn: () => void;
  email?: string;
  type?: 'email' | 'sms';
}

export const EmailVerification: React.FC<EmailVerificationProps> = ({
  onNavigateToSignIn,
  email = 'usuario@exemplo.com',
  type = 'email'
}) => {
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isResending, setIsResending] = useState(false);

  const handleCodeChange = (index: number, value: string) => {
    if (value.length > 1) return; // Only allow single digit
    
    const newCode = [...code];
    newCode[index] = value;
    setCode(newCode);

    // Auto-focus next input
    if (value && index < 5) {
      const nextInput = document.getElementById(`code-${index + 1}`);
      nextInput?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      const prevInput = document.getElementById(`code-${index - 1}`);
      prevInput?.focus();
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const verificationCode = code.join('');
    console.log('Verification code:', verificationCode);
  };

  const handleResend = async () => {
    setIsResending(true);
    // Simulate API call
    setTimeout(() => {
      setIsResending(false);
    }, 2000);
  };

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
          Confirme sua conta
        </h2>
        
        <p className="text-gray-600 text-sm mb-8 leading-relaxed">
          Enviámos um código de verificação para o seu {type === 'email' ? 'e-mail' : 'número de telefone'}{' '}
          <span className="font-medium text-gray-900">{email}</span>. 
          Por favor, insira-o abaixo.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-3">
              Código de Verificação
            </label>
            <div className="flex gap-3 justify-center">
              {code.map((digit, index) => (
                <input
                  key={index}
                  id={`code-${index}`}
                  type="text"
                  maxLength={1}
                  value={digit}
                  onChange={(e) => handleCodeChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(index, e)}
                  className="w-12 h-12 text-center text-xl font-bold border border-gray-300 rounded-lg focus:border-green-500 focus:ring-2 focus:ring-green-100 outline-none transition-all"
                />
              ))}
            </div>
          </div>

          <div className="text-center mb-6">
            <span className="text-sm text-gray-600">Não recebeu o código? </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResending}
              className="text-sm text-green-600 hover:text-green-700 transition-colors font-medium disabled:opacity-50"
            >
              {isResending ? 'Reenviando...' : 'Reenviar código'}
            </button>
          </div>

          <Button type="submit" className="w-full">
            Confirmar
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};