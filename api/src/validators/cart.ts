import { z } from 'zod';

export const addItemSchema = z.object({
  codprod: z.number().int(),
  qt: z.number().positive(),
  pvenda: z.number().nonnegative(),
});

export const updateItemSchema = z.object({
  qt: z.number().nonnegative(),
});