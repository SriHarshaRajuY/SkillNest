import { createClient } from 'redis'

let redisClient = null

export const getRedisClient = async () => {
    if (redisClient) return redisClient

    const client = createClient({
        url: process.env.REDIS_URL || 'redis://localhost:6379'
    })

    client.on('error', (err) => console.error('Redis Client Error', err))

    try {
        await client.connect()
        console.log('🚀 Redis connected')
        redisClient = client
        return redisClient
    } catch (err) {
        console.warn('⚠️ Redis connection failed. Caching will be disabled.', err.message)
        return null
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
