import { z } from 'zod';

export const registerSchema = z.object({
  primeiro_nome: z.string().min(1),
  ultimo_nome: z.string().optional().default(''),
  email: z.string().email(),
  senha: z.string().min(6),
  genero: z.string().optional(),
  telefone: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});