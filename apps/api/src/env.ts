import dotenv from 'dotenv';
import path from 'path';

// Load apps/api/.env regardless of the process CWD (workspace root vs app dir).
dotenv.config({ path: path.resolve(__dirname, '../.env') });

export const env = {
  DATABASE_URL: process.env.DATABASE_URL ?? 'file:./dev.db',
  JWT_SECRET: process.env.JWT_SECRET ?? 'dev-only-insecure-secret-change-in-production',
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN ?? '12h',
  PORT: Number(process.env.PORT ?? 4000),
  CORS_ORIGIN: process.env.CORS_ORIGIN ?? 'http://localhost:3000',
  NODE_ENV: process.env.NODE_ENV ?? 'development',
  // Optional: set OPENAI_API_KEY to enable full LLM natural-language understanding.
  // When unset, the assistant falls back to a built-in NL rules engine.
  OPENAI_API_KEY: process.env.OPENAI_API_KEY ?? '',
  OPENAI_MODEL: process.env.OPENAI_MODEL ?? 'gpt-4o-mini',
  OPENAI_BASE_URL: process.env.OPENAI_BASE_URL ?? 'https://api.openai.com/v1',
};
