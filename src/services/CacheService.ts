import { createClient } from 'redis';
import { logger } from '../utils/logger.js';

const redisClient = createClient({
    url: process.env.REDIS_URL // ex: redis://default:senha@host:port
});

redisClient.on('error', (err) => logger.error('Redis Client Error', err));

export const connectRedis = async () => {
    try {
        await redisClient.connect();
        logger.warn('🚀 Redis conectado com sucesso!');
    } catch (err) {
        logger.error('Falha ao conectar no Redis', err);
    }
};

export const CacheService = {
    async get(key: string) {
        const data = await redisClient.get(key);
        return data ? JSON.parse(data) : null;
    },

    async set(key: string, value: any, ttlSeconds = 300) { // Default 5 min
        await redisClient.set(key, JSON.stringify(value), {
            EX: ttlSeconds
        });
    },

    async del(key: string) {
        await redisClient.del(key);
    }
};