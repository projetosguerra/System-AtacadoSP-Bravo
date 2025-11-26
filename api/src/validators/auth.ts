import { z } from 'zod';

export const registerSchema = z.object({
  primeiro_nome: z.string().min(1, 'Primeiro nome obrigatório'),
  ultimo_nome: z.string().optional().default(''),
  email: z.string().email('E-mail inválido'),
  senha: z.string().min(6, 'A senha deve ter ao menos 6 caracteres'),
  genero: z.string().optional(),
  telefone: z.string().optional(),
  codSetor: z.union([z.string(), z.number()]).refine(v => {
    const num = Number(v);
    return Number.isFinite(num) && num > 0;
  }, 'Setor obrigatório'),
  cnpj: z.string()
    .transform(v => v.replace(/\D/g,''))
    .refine(v => v.length === 14, 'CNPJ inválido (deve ter 14 dígitos)')
});

export const loginSchema = z.object({
  email: z.string().email(),
  senha: z.string().min(1),
});