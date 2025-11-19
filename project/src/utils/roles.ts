export type NormalizedRole = 'ADMIN' | 'APROVADOR' | 'SOLICITANTE' | 'UNKNOWN';

const ROLE_MAP: Record<string, NormalizedRole> = {
  '1': 'ADMIN',
  '2': 'APROVADOR',
  '3': 'SOLICITANTE',

  admin: 'ADMIN',
  administrador: 'ADMIN',
  aprovador: 'APROVADOR',
  solicitante: 'SOLICITANTE',

  'ADMIN': 'ADMIN',
  'APROVADOR': 'APROVADOR',
  'SOLICITANTE': 'SOLICITANTE',
};

type Normalizable =
  | { perfil?: unknown; tipoUsuario?: unknown }
  | string
  | number
  | null
  | undefined;

export function normalizeRole(input: Normalizable): NormalizedRole {
  if (input == null) return 'UNKNOWN';

  if (typeof input === 'object' && !Array.isArray(input)) {
    const obj = input as { perfil?: unknown; tipoUsuario?: unknown };
    const candidates = [obj.perfil, obj.tipoUsuario].filter(v => v !== undefined && v !== null);

    for (const raw of candidates) {
      const rawStr = String(raw).trim();
      if (ROLE_MAP[rawStr]) return ROLE_MAP[rawStr];
      const lower = rawStr.toLowerCase();
      if (ROLE_MAP[lower]) return ROLE_MAP[lower];
      const num = Number(rawStr);
      if (!Number.isNaN(num) && ROLE_MAP[String(num)]) return ROLE_MAP[String(num)];
    }
    return 'UNKNOWN';
  }

  const rawStr = String(input).trim();
  if (ROLE_MAP[rawStr]) return ROLE_MAP[rawStr];
  const lower = rawStr.toLowerCase();
  if (ROLE_MAP[lower]) return ROLE_MAP[lower];
  const num = Number(rawStr);
  if (!Number.isNaN(num) && ROLE_MAP[String(num)]) return ROLE_MAP[String(num)];

  return 'UNKNOWN';
}

export function hasAnyRole(input: Normalizable, roles: Exclude<NormalizedRole, 'UNKNOWN'>[]): boolean {
  const role = normalizeRole(input);
  return role !== 'UNKNOWN' && roles.includes(role as Exclude<NormalizedRole, 'UNKNOWN'>);
}

export function isAdmin(input: Normalizable): boolean {
  return normalizeRole(input) === 'ADMIN';
}
export function isAprovador(input: Normalizable): boolean {
  return normalizeRole(input) === 'APROVADOR';
}
export function isSolicitante(input: Normalizable): boolean {
  return normalizeRole(input) === 'SOLICITANTE';
}