import { useAuth } from '../context/AuthContext';

export function useAuthHeaders() {
  const { token } = useAuth();
  return (contentType?: string): Record<string,string> => {
    const h: Record<string,string> = {};
    if (contentType) h['Content-Type'] = contentType;
    if (token) h.Authorization = `Bearer ${token}`;
    return h;
  };
}