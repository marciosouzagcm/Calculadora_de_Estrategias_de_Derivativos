import winston from 'winston';

const { combine, timestamp, printf, colorize, json } = winston.format;

/**
 * Formatação personalizada para manter o estilo que você já usava:
 * [INFO] 💡 Mensagem
 */
const customFormat = printf(({ level, message, timestamp }) => {
  let emoji = '';
  if (level.includes('info')) emoji = '💡 ';
  if (level.includes('error')) emoji = '❌ ';
  if (level.includes('warn')) emoji = '⚠️ ';
  
  // Remove as cores do level para o cálculo do prefixo se necessário
  const pureLevel = level.toUpperCase().replace(/\u001b\[[0-9;]*m/g, '');
  
  return `${timestamp} [${pureLevel}] ${emoji}${message}`;
});

// Configuração base do Winston
const winstonLogger = winston.createLogger({
  level: 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    json() // Armazena em JSON nos arquivos para facilitar buscas futuras
  ),
  transports: [
    // Erros graves vão para error.log
    new winston.transports.File({ 
      filename: 'logs/error.log', 
      level: 'error' 
    }),
    // Tudo vai para o combined.log
    new winston.transports.File({ 
      filename: 'logs/combined.log' 
    }),
  ],
});

// Adiciona saída no console para desenvolvimento (com o seu estilo de emojis)
if (process.env.NODE_ENV !== 'production') {
  winstonLogger.add(new winston.transports.Console({
    format: combine(
      colorize(),
      timestamp({ format: 'HH:mm:ss' }),
      customFormat
    ),
  }));
}

/**
 * Exportando o logger mantendo a assinatura que você já tinha no projeto,
 * mas agora roteando tudo pelo Winston.
 */
export const logger = {
  info: (message: string, ...args: any[]) => {
    // No Winston, o controle de produção é feito pelo nível do transport
    // mas mantemos o comportamento silencioso em prod para INFO se desejar
    winstonLogger.info(message, ...args);
  },

  error: (message: string, ...args: any[]) => {
    winstonLogger.error(message, ...args);
  },

  warn: (message: string, ...args: any[]) => {
    winstonLogger.warn(message, ...args);
  }
};