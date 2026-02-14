import { z } from 'zod';
import dotenv from 'dotenv';
import { logger } from '../utils/logger.js';

dotenv.config();

const envSchema = z.object({
  // Servidor
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.string().transform(Number).default("3000"),

  // APIs Externas
  BRAPI_TOKEN: z.string().min(1, "BRAPI_TOKEN é obrigatório"),

  // Banco de Dados TiDB
  DATABASE_URL: z.string().url("DATABASE_URL inválida"),
  TIDB_HOST: z.string(),
  TIDB_PORT: z.string(),
  TIDB_USER: z.string(),
  TIDB_PASSWORD: z.string(),
  TIDB_NAME: z.string(),

  // Redis & Sentry
  REDIS_URL: z.string().optional(), // Opcional se estiver em dev sem Redis
  SENTRY_DSN: z.string().url().optional(),
});

export const validateEnv = () => {
  const parsed = envSchema.safeParse(process.env);

  if (!parsed.success) {
    logger.error("❌ Erro de configuração nas variáveis de ambiente:");
    console.error(JSON.stringify(parsed.error.format(), null, 2));
    process.exit(1); // Trava a inicialização se faltar algo vital
  }

  logger.warn("✅ Variáveis de ambiente validadas com sucesso.");
  return parsed.data;
};