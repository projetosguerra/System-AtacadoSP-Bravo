import { z } from 'zod';

export const updateStatusSchema = z.object({
  newStatus: z.number().int(),
  conditionStatus: z.number().int().optional(),
});