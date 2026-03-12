/**
 * Shared Zod schemas for form and API input validation.
 */
import { z } from 'zod';

export const clientNameSchema = z
  .string()
  .min(1, 'Name is required')
  .max(200, 'Name must be at most 200 characters');

export const createClientSchema = z.object({
  name: clientNameSchema,
  description: z.string().max(2000).optional().transform((s) => (s === '' ? undefined : s)),
  website: z.union([
    z.literal(''),
    z.string().max(500).url('Please enter a valid URL'),
  ]).optional().transform((s) => (s === '' ? undefined : s)),
});

export type CreateClientInput = z.infer<typeof createClientSchema>;

export function validateCreateClient(input: {
  name: string;
  description?: string;
  website?: string;
}): { success: true; data: CreateClientInput } | { success: false; error: string } {
  const result = createClientSchema.safeParse({
    name: (input.name ?? '').trim(),
    description: (input.description ?? '').trim(),
    website: (input.website ?? '').trim(),
  });
  if (result.success) return { success: true, data: result.data };
  const err = result.error.flatten();
  const first = err.fieldErrors.name?.[0] ?? err.fieldErrors.website?.[0] ?? result.error.message;
  return { success: false, error: first };
}
