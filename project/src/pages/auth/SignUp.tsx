import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AuthLayout } from '../../components/auth/AuthLayout';
import { Input } from '../../components/ui/Input';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { ReCaptcha } from '../../components/ui/ReCaptcha';

type Setor = { CODSETOR: number; DESCRICAO: string; CNPJ?: string };

const formatPhoneNumber = (value: string) => {
  if (!value) return value;
  const phoneNumber = value.replace(/[^\d]/g, '');
  const len = phoneNumber.length;
  if (len < 3) return `(${phoneNumber}`;
  if (len < 8) return `(${phoneNumber.slice(0,2)}) ${phoneNumber.slice(2)}`;
  return `(${phoneNumber.slice(0,2)}) ${phoneNumber.slice(2,7)}-${phoneNumber.slice(7,11)}`;
};

const formatCNPJMask = (v: string) => {
  const s = (v || '').replace(/\D/g,'').slice(0,14);
  if (s.length <= 2) return s;
  if (s.length <= 5) return `${s.slice(0,2)}.${s.slice(2)}`;
  if (s.length <= 8) return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5)}`;
  if (s.length <= 12) return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8)}`;
  return `${s.slice(0,2)}.${s.slice(2,5)}.${s.slice(5,8)}/${s.slice(8,12)}-${s.slice(12,14)}`;
};

interface SignUpProps {
  onNavigateToSignIn: () => void;
}

export const SignUp: React.FC<SignUpProps> = ({ onNavigateToSignIn }) => {
  const navigate = useNavigate();

  const [setores, setSetores] = useState<Setor[]>([]);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    genero: '',
    telefone: '',
    cnpj: '',
    codSetor: '' as number | '',
    stayConnected: false,
  });

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const r = await fetch('/api/setores');
        if (!r.ok) throw new Error('Falha ao carregar setores');
        const data = await r.json();
        if (alive) setSetores(data || []);
      } catch (e: any) {
        console.warn('Falha ao buscar setores:', e?.message || e);
      }
    })();
    return () => { alive = false; };
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    let { name, value } = e.target;
    if (name === 'telefone') value = formatPhoneNumber(value);
    if (name === 'cnpj') value = formatCNPJMask(value);
    if (name === 'codSetor') value = String(value);
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  function validateBeforeSubmit(): string | null {
    if (!formData.codSetor) return 'Selecione um setor.';
    const cnpjDigits = formData.cnpj.replace(/\D/g,'');
    if (cnpjDigits.length !== 14) return 'CNPJ inválido (14 dígitos).';
    // feedback visual opcional: comparar prefixo se setor tiver CNPJ (não confiável, mantemos backend)
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');
    const basicError = validateBeforeSubmit();
    if (basicError) {
      setError(basicError);
      return;
    }

    setIsLoading(true);
    try {
      const payload = {
        primeiro_nome: formData.firstName,
        ultimo_nome: formData.lastName,
        email: formData.email,
        senha: formData.password,
        genero: formData.genero,
        telefone: formData.telefone,
        codSetor: Number(formData.codSetor),
        cnpj: formData.cnpj.replace(/\D/g,''),
      };

      const resp = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await resp.json().catch(() => ({}));
      if (!resp.ok) {
        throw new Error(data?.error || `Falha ao registrar (${resp.status})`);
      }

      setSuccess('Cadastro validado e realizado! Redirecionando...');
      setTimeout(() => navigate('/login'), 1600);
    } catch (err: any) {
      setError(err?.message || 'Ocorreu um erro. Tente novamente.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogoClick = () => navigate('/login');

  return (
    <AuthLayout
      alternativeAction={{
        text: 'Já tem uma conta?',
        buttonText: 'Entrar',
        onClick: onNavigateToSignIn,
      }}
      onLogoClick={handleLogoClick}
    >
      <div className="mt-8 flex-wrap">
        <p className="text-gray-600 text-sm mb-2">
          Somente Administradores podem se cadastrar. O CNPJ deve corresponder ao setor selecionado.
        </p>
        <h2 className="text-2xl font-bold text-gray-900 mb-8">Cadastro de Administrador</h2>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
              label="E-mail"
              type="email"
              name="email"
              placeholder="email@exemplo.com"
              value={formData.email}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Telefone"
              name="telefone"
              placeholder="(XX) XXXXX-XXXX"
              value={formData.telefone}
              onChange={handleInputChange}
              maxLength={15}
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="w-full">
              <label htmlFor="genero" className="block text-sm font-medium text-gray-700">Gênero</label>
              <select
                id="genero"
                name="genero"
                value={formData.genero}
                onChange={handleInputChange}
                className="w-full mt-2 px-4 py-3 border border-gray-300 rounded-lg bg-white"
                required
              >
                <option value="" disabled>Selecione...</option>
                <option value="Masculino">Masculino</option>
                <option value="Feminino">Feminino</option>
                <option value="Outro">Outro</option>
              </select>
            </div>

            <Input
              label="Senha"
              type="password"
              name="password"
              placeholder="••••••••••"
              value={formData.password}
              onChange={handleInputChange}
              required
            />
          </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="CNPJ da Unidade"
                name="cnpj"
                placeholder="00.000.000/0000-00"
                value={formData.cnpj}
                onChange={handleInputChange}
                maxLength={18}
                required
              />
              <div className="w-full">
                <label className="block text-sm font-medium text-gray-700 mb-2">Setor / Secretaria</label>
                <select
                  name="codSetor"
                  value={formData.codSetor}
                  onChange={handleInputChange}
                  required
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white"
                >
                  <option value="" disabled>Selecione um setor</option>
                  {setores.map(s => (
                    <option key={s.CODSETOR} value={s.CODSETOR}>
                      {s.DESCRICAO}
                    </option>
                  ))}
                </select>
              </div>
            </div>

          <div className="mb-2">
            <Checkbox
              label="Manter conectado"
              name="stayConnected"
              checked={formData.stayConnected as unknown as boolean}
              onChange={(e: any) =>
                setFormData(prev => ({ ...prev, stayConnected: e.target?.checked ?? !prev.stayConnected }))
              }
            />
          </div>

          <ReCaptcha />

          {error && <p className="text-red-500 text-sm text-center mb-2">{error}</p>}
          {success && <p className="text-green-500 text-sm text-center mb-2">{success}</p>}

          <Button type="submit" className="w-full" disabled={isLoading}>
            {isLoading ? 'Cadastrando...' : 'Cadastrar Admin'}
          </Button>
        </form>
      </div>
    </AuthLayout>
  );
};