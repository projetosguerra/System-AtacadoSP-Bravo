export type NormalizedRole = 'ADMIN' | 'APROVADOR' | 'SOLICITANTE' | 'UNKNOWN';

const ROLE_MAP: Record<string, NormalizedRole> = {
  '1': 'ADMIN',
  '2': 'APROVADOR',
  '3': 'SOLICITANTE',
  admin: 'ADMIN',
  aprovador: 'APROVADOR',
  solicitante: 'SOLICITANTE'
};

export function normalizeRole(user: any): NormalizedRole {
  if (!user) return 'UNKNOWN';

  // Possíveis campos que podem carregar a informação
  const candidates = [
    user.perfil,         // 'Admin', 'Aprovador', 'Solicitante'
    user.tipoUsuario     // 1, 2, 3 (numérico)
  ].filter(v => v !== undefined && v !== null);

  for (const raw of candidates) {
    const str = String(raw).trim().toLowerCase();
    if (ROLE_MAP[str]) return ROLE_MAP[str];
    if (!isNaN(Number(raw)) && ROLE_MAP[String(Number(raw))]) {
      return ROLE_MAP[String(Number(raw))];
    }
  }

  return 'UNKNOWN';
}

export function hasAnyRole(user: any, roles: NormalizedRole[]): boolean {
  return roles.includes(normalizeRole(user));
}