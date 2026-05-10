import { createClient } from 'redis'

let redisClient = null;
let redisInitFailed = false;

export const getRedisClient = async () => {
    if (redisClient) return redisClient;
    if (redisInitFailed) return null;

    const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
            reconnectStrategy: (retries) => {
                if (retries > 3) {
                    console.warn('⚠️ Redis reconnection limit reached.');
                    return new Error('Retry attempts exhausted');
                }
                return Math.min(retries * 100, 3000);
            }
        }
    })

    client.on('error', (err) => {
    // Silently ignore expected socket closure errors from Redis client
    if (err.name === 'SocketClosedUnexpectedlyError' || (err.message && err.message.includes('SocketClosedUnexpectedlyError')) ) return;
    console.error('Redis Client Error', err);
});

    try {
        if (client) {
            await client.connect();
            console.log('🚀 Redis connected');
            redisClient = client;
            return redisClient;
        }
        return null;
    } catch (err) {
        console.warn('⚠️ Redis connection failed. Caching will be disabled.', err.message);
        redisInitFailed = true;
        return null;
    }
}

export const cacheSet = async (key, value, ttl = 86400) => {
    const client = await getRedisClient()
    if (!client) return null
    return client.set(key, JSON.stringify(value), {
        EX: ttl
    })
}

export const cacheGet = async (key) => {
    const client = await getRedisClient()
    if (!client) return null
    const data = await client.get(key)
    return data ? JSON.parse(data) : null
}
