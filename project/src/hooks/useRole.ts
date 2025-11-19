import { useAuth } from '../context/AuthContext';
import { normalizeRole, isAdmin, isAprovador, isSolicitante, NormalizedRole } from '../utils/roles';

export function useRole(): {
  role: NormalizedRole;
  isAdmin: boolean;
  isAprovador: boolean;
  isSolicitante: boolean;
} {
  const { user } = useAuth();
  const role = normalizeRole(user);
  return {
    role,
    isAdmin: isAdmin(user),
    isAprovador: isAprovador(user),
    isSolicitante: isSolicitante(user),
  };
}