import { z } from 'zod';
import { fields } from '@/shared/validation';
import { phoneSchema } from '../auth/schemas';

export const agentSchema = z.object({
  id: z.uuid().optional(),
  name: fields.requiredText(60),
  phone: phoneSchema,
  vehicleType: z.enum(['bicycle', 'two_wheeler', 'other'], { error: 'required' }),
  vehicleReg: z
    .string()
    .trim()
    .max(20, { error: 'tooLong' })
    .optional()
    .transform((v) => (v ? v.toUpperCase() : null)),
});

export type AgentInput = z.input<typeof agentSchema>;
