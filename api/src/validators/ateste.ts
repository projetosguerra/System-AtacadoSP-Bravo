import { z } from 'zod';

export const criarAtesteSchema = z.object({
  recebidoOk: z.boolean(),
  comentario: z.string().max(4000).optional()
});