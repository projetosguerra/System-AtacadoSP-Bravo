import { z } from 'zod';

export const criarSatisfacaoSchema = z.object({
  rating: z.number().min(1).max(5),
  comentario: z.string().max(4000).optional()
});