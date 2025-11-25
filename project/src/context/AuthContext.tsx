import { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';
import { api } from '../lib/api';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;
  token: string | null;
  allUsers: User[];
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (primeiro_nome: string, ultimo_nome: string, email: string, password: string, genero: string, telefone: string) => Promise<void>;
  logout: () => void;
  fetchAllUsers: () => Promise<void>;
  switchUserForTesting: (codUsuario: number) => void;
  error?: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const storedToken = localStorage.getItem('authToken');
    const storedUser = localStorage.getItem('userData');
    if (storedToken) setToken(storedToken);
    if (storedUser) setUser(JSON.parse(storedUser));

    async function validate() {
      if (!storedToken) return;
      try {
        const r = await fetch('/api/ping', {
          headers: { Authorization: `Bearer ${storedToken}` }
        });
        if (r.status === 401) {
          localStorage.removeItem('authToken');
          localStorage.removeItem('userData');
          setToken(null);
          setUser(null);
        }
      } catch {
      }
    }
    validate();
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const data = await api.post<{ token: string; user: any }>('/auth/login', { email, senha: password }, { timeoutMs: 12000 });
      localStorage.setItem('authToken', data.token);
      localStorage.setItem('userData', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
    } catch (e: any) {
      let message = 'Usuário ou senha incorreto.';

      const fromObj = e?.data?.error || e?.response?.data?.error || e?.error;
      if (fromObj && typeof fromObj === 'string') {
        message = fromObj;
      }

      if (typeof e?.message === 'string') {
        const match = e.message.match(/\{[\s\S]*\}$/);
        if (match) {
          try {
            const parsed = JSON.parse(match[0]);
            if (parsed?.error && typeof parsed.error === 'string') {
              message = parsed.error;
            }
          } catch {
          }
        }
      }

      if (!message || typeof message !== 'string') {
        message = 'Usuário ou senha incorreto.';
      }

      throw new Error(message);
    }
  };

  const register = async (primeiro_nome: string, ultimo_nome: string, email: string, password: string, genero: string, telefone: string) => {
    await api.post('/auth/register', { primeiro_nome, ultimo_nome, email, senha: password, genero, telefone }, { timeoutMs: 12000 });
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
    setAllUsers([]);
    setToken(null);
  };

  const fetchAllUsers = useCallback(async () => {
    try {
      const usersData: User[] = await api.get('/usuarios');
      setAllUsers(usersData);
    } catch (error) {
      console.error(error);
      setAllUsers([]);
    }
  }, []);

  const switchUserForTesting = (codUsuario: number) => {
    const newUser = allUsers.find(u => (u as any).codUsuario === codUsuario);
    if (newUser) {
      setUser(newUser);
      localStorage.setItem('userData', JSON.stringify(newUser));
    }
  };

  const isAuthenticated = !!user && !!token;

  return (
    <AuthContext.Provider
      value={{
        isAuthenticated,
        user,
        token,
        allUsers,
        login,
        register,
        logout,
        isLoading,
        fetchAllUsers,
        switchUserForTesting
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};