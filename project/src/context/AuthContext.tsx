import React, { createContext, useState, useContext, useEffect, ReactNode, useCallback } from 'react';
import { User } from '../types';

interface AuthContextType {
  currentUser: User | null;
  users: User[];
  setCurrentUser: (user: User | null) => void;
  refetchUsers: () => void;
  loading: boolean;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de um AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  const fetchUsers = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch('/api/usuarios'); 
      if (!response.ok) {
        throw new Error(`Falha na API: ${response.statusText}`);
      }
      const data: User[] = await response.json();
      setUsers(data);

      if (data.length > 0) {
        const currentUserStillExists = data.some(user => user.codUsuario === currentUser?.codUsuario);
        if (!currentUserStillExists) {
            setCurrentUser(data[0]);
        }
      } else {
        setCurrentUser(null);
      }

    } catch (err: any) {
      console.error("Falha ao buscar usuários:", err);
      setError(err.message);
      setUsers([]); 
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, [currentUser?.codUsuario]);

  useEffect(() => {
    fetchUsers();

  }, []);

  const refetchUsers = () => {
    fetchUsers();
  };
  
  const handleSetCurrentUser = (user: User | null) => {
    setCurrentUser(user);
  };

  const value = { currentUser, users, setCurrentUser: handleSetCurrentUser, refetchUsers, loading, error };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};