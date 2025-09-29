import { z } from 'zod';

export const updateLimiteSchema = z.object({
  saldo: z.number(),
  alteradoPorCodUsuario: z.number().int(),
});