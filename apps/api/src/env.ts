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
};
