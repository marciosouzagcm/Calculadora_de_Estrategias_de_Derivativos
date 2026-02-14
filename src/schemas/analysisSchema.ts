import { z } from 'zod';

export const analysisQuerySchema = z.object({
  ticker: z.string()
    .min(4, "Ticker muito curto")
    .max(6, "Ticker muito longo")
    .transform((val) => val.toUpperCase()),
  preco: z.coerce.number().positive().optional().catch(undefined),
  lote: z.coerce.number().min(1).default(100).catch(100),
  risco: z.enum(['conservador', 'moderado', 'agressivo']).default('moderado').catch('moderado')
});

export type AnalysisQuery = z.infer<typeof analysisQuerySchema>;