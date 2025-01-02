import { z } from 'zod';

export const userSchema = z.object({
  id: z.number(),
  username: z.string(),
  role: z.enum(['ADMIN', 'EDITOR', 'READER']),
  createdAt: z.string(),
  updatedAt: z.string()
});

export type User = z.infer<typeof userSchema>;
