import { z } from 'zod';

export const createUserSchema = z.object({
  primeiroNome: z.string().min(1),
  ultimoNome: z.string().optional().default(''),
  email: z.string().email(),
  senha: z.string().min(6),
  tipoUsuario: z.number().int().min(1),
  codSetor: z.number().int().nullable().optional(),
  genero: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  idFuncionario: z.string().nullable().optional(),
});

export const updateUserSchema = z.object({
  primeiroNome: z.string().min(1),
  ultimoNome: z.string().optional().default(''),
  email: z.string().email(),
  tipoUsuario: z.number().int().min(1),
  codSetor: z.number().int().nullable().optional(),
  genero: z.string().nullable().optional(),
  telefone: z.string().nullable().optional(),
  idFuncionario: z.string().nullable().optional(),
});