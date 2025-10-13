import { z } from 'zod';

const rawEnv = {
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  DATABASE_URL: process.env.DATABASE_URL,
  SESSION_SECRET: process.env.SESSION_SECRET,
  OPENAI_API_KEY: process.env.OPENAI_API_KEY,
  ALLOWED_ORIGINS: process.env.ALLOWED_ORIGINS,
  IMPORT_MAX_DOCX_MB: process.env.IMPORT_MAX_DOCX_MB,
  IMPORT_MAX_PDF_MB: process.env.IMPORT_MAX_PDF_MB,
};

const environmentSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),
  SESSION_SECRET: z.string().min(32, 'SESSION_SECRET must be at least 32 characters'),
  OPENAI_API_KEY: z.string().min(1).optional(),
  ALLOWED_ORIGINS: z
    .string()
    .optional()
    .transform((value) =>
      value
        ? value
            .split(',')
            .map((origin) => origin.trim())
            .filter(Boolean)
        : undefined,
    ),
  IMPORT_MAX_DOCX_MB: z.coerce.number().positive().optional(),
  IMPORT_MAX_PDF_MB: z.coerce.number().positive().optional(),
}).transform((values) => ({
  nodeEnv: values.NODE_ENV,
  databaseUrl: values.DATABASE_URL,
  sessionSecret: values.SESSION_SECRET,
  openAiApiKey: values.OPENAI_API_KEY,
  allowedOrigins:
    values.ALLOWED_ORIGINS && values.ALLOWED_ORIGINS.length > 0
      ? values.ALLOWED_ORIGINS
      : null,
  importMaxDocxMb: values.IMPORT_MAX_DOCX_MB ?? 20,
  importMaxPdfMb: values.IMPORT_MAX_PDF_MB ?? 50,
}));

const parsedEnv = environmentSchema.safeParse(rawEnv);

if (!parsedEnv.success) {
  const formatted = parsedEnv.error.issues
    .map((issue) => `${issue.path.join('.') || 'root'}: ${issue.message}`)
    .join('; ');
  throw new Error(`Invalid environment configuration: ${formatted}`);
}

export const env = parsedEnv.data;
