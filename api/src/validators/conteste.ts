import { z } from 'zod';

export const criarContesteSchema = z.object({
  justificativa: z.string().min(5, 'Mínimo 5 caracteres')
});

export const analisarContesteSchema = z.object({
  decisao: z.enum(['DEFERIDO','INDEFERIDO']),
  parecer: z.string().optional(),
  reenviarParaAnalise: z.boolean().optional()
});