import { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';

interface AuthContextType {
  isAuthenticated: boolean;
  user: User | null;   
  allUsers: User[];  
  isLoading: boolean;
  login: (email: any, password: any) => Promise<void>;
  register: (primeiro_nome: string, ultimo_nome: string, email: string, password: string) => Promise<void>;
  logout: () => void;
  fetchAllUsers: () => Promise<void>; 
  switchUserForTesting: (codUsuario: number) => void; 
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const userData = localStorage.getItem('userData');
    if (token && userData) {
      setUser(JSON.parse(userData));
    }
    setIsLoading(false);
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, senha: password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha no login');

    localStorage.setItem('authToken', data.token);
    localStorage.setItem('userData', JSON.stringify(data.user));
    setUser(data.user);
  };

  const register = async (primeiro_nome: string, ultimo_nome: string, email: string, password: string) => {
    const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ primeiro_nome, ultimo_nome, email, senha: password }),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || 'Falha no cadastro');
  };

  const logout = () => {
    localStorage.removeItem('authToken');
    localStorage.removeItem('userData');
    setUser(null);
    setAllUsers([]);
  };

  const fetchAllUsers = useCallback(async () => {
    try {
      const response = await fetch('/api/usuarios');
      if (!response.ok) throw new Error('Falha ao buscar usuários');
      const usersData: User[] = await response.json();
      setAllUsers(usersData);
    } catch (error) {
      console.error(error);
      setAllUsers([]);
    }
  }, []);
  
  const switchUserForTesting = (codUsuario: number) => {
    const newUser = allUsers.find(u => u.codUsuario === codUsuario);
    if (newUser) {
      setUser(newUser);
    }
  };

  const isAuthenticated = !!user && !!localStorage.getItem('authToken');

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, allUsers, login, register, logout, isLoading, fetchAllUsers, switchUserForTesting }}>
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