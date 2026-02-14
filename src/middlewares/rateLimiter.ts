import rateLimit from 'express-rate-limit';

export const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // Janela de 15 minutos
  max: 100, // Limite de 100 requisições por IP nesta janela
  message: {
    status: 429,
    message: "Muitas requisições vindas deste IP. Por favor, tente novamente após 15 minutos."
  },
  standardHeaders: true, // Retorna info de limite nos headers RateLimit-*
  legacyHeaders: false, // Desabilita os headers X-RateLimit-*
});

// Limite mais estrito para rotas sensíveis (ex: Login ou cálculos pesados)
export const apiLimiter = rateLimit({
  windowMs: 1 * 60 * 1000, // 1 minuto
  max: 10, // Apenas 10 requisições por minuto
  message: {
    message: "Calma aí! Você atingiu o limite de consultas por minuto."
  }
});