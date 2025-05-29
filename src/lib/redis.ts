import Redis from 'ioredis';

// Define Redis client options
const redisOptions: Redis.RedisOptions = {
  host: process.env.REDIS_URL?.includes('redis://') 
    ? process.env.REDIS_URL.replace('redis://', '').split(':')[0] 
    : process.env.REDIS_HOST || 'localhost',
  port: parseInt(
    process.env.REDIS_URL?.includes('redis://') 
      ? process.env.REDIS_URL.replace('redis://', '').split(':')[1] || '6379'
      : process.env.REDIS_PORT || '6379'
  ),
  password: process.env.REDIS_PASSWORD || undefined,
  retryStrategy: (times) => {
    // Retry connection with exponential backoff
    const delay = Math.min(times * 50, 2000);
    return delay;
  },
  maxRetriesPerRequest: 3,
  enableReadyCheck: true,
  connectTimeout: 10000, // 10 seconds
};

// Prevent multiple instances of Redis Client in development due to hot reloading
const globalForRedis = global as unknown as { redis: Redis };

// Create Redis client singleton
export const redis =
  globalForRedis.redis ||
  new Redis(process.env.REDIS_URL || redisOptions);

// Set the Redis instance on the global object in development
if (process.env.NODE_ENV !== 'production') {
  globalForRedis.redis = redis;
}

// Handle Redis connection events
redis.on('connect', () => {
  console.log('Connected to Redis');
});

redis.on('error', (error) => {
  console.error('Redis connection error:', error);
  // Don't crash the app on Redis connection error
  // The app can still function without Redis (just slower)
});

redis.on('ready', () => {
  console.log('Redis client ready');
});

/**
 * Check if Redis is available
 * 
 * @returns Promise that resolves to boolean indicating if Redis is connected
 */
export async function isRedisAvailable(): Promise<boolean> {
  try {
    await redis.ping();
    return true;
  } catch (error) {
    console.error('Redis ping failed:', error);
    return false;
  }
}

/**
 * Safely get a value from Redis
 * 
 * Wraps the Redis get operation with error handling to prevent app crashes
 * 
 * @param key - Redis key to get
 * @returns The value or null if not found or error
 */
export async function safeGet(key: string): Promise<string | null> {
  try {
    return await redis.get(key);
  } catch (error) {
    console.error(`Error getting key ${key} from Redis:`, error);
    return null;
  }
}

/**
 * Safely set a value in Redis
 * 
 * Wraps the Redis set operation with error handling to prevent app crashes
 * 
 * @param key - Redis key to set
 * @param value - Value to store
 * @param expiryMode - Expiry mode (EX, PX, etc.)
 * @param time - Expiry time
 * @returns true if successful, false otherwise
 */
export async function safeSet(
  key: string, 
  value: string, 
  expiryMode?: string, 
  time?: number
): Promise<boolean> {
  try {
    if (expiryMode && time) {
      await redis.set(key, value, expiryMode, time);
    } else {
      await redis.set(key, value);
    }
    return true;
  } catch (error) {
    console.error(`Error setting key ${key} in Redis:`, error);
    return false;
  }
}

/**
 * Safely delete keys from Redis
 * 
 * Wraps the Redis del operation with error handling to prevent app crashes
 * 
 * @param keys - Redis keys to delete
 * @returns Number of keys deleted or 0 if error
 */
export async function safeDel(...keys: string[]): Promise<number> {
  try {
    if (keys.length === 0) return 0;
    return await redis.del(...keys);
  } catch (error) {
    console.error(`Error deleting keys from Redis:`, error);
    return 0;
  }
}

/**
 * Flush all cached data
 * 
 * Use with caution - clears all data from Redis
 * 
 * @returns true if successful, false otherwise
 */
export async function flushCache(): Promise<boolean> {
  try {
    await redis.flushall();
    return true;
  } catch (error) {
    console.error('Error flushing Redis cache:', error);
    return false;
  }
}
