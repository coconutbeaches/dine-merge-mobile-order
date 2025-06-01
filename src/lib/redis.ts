// src/lib/redis.ts
import Redis from 'ioredis';

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';

// Initialize Redis client
const redisClient = new Redis(redisUrl, {
  // Optional: Add any specific ioredis options here
  maxRetriesPerRequest: 3, // Example option
  enableReadyCheck: true,
  // Add more robust error handling for connection issues
  retryStrategy: (times) => {
    // Exponential backoff, max 2 seconds
    const delay = Math.min(times * 50, 2000); 
    console.log(`Redis: retrying connection in ${delay}ms (attempt ${times})`);
    return delay;
  },
  // Keep the client from throwing errors if it's not connected yet,
  // as we check redisClient.status === 'ready' before operations.
  // However, ioredis handles offline queueing by default.
  // For finer control, one might adjust `enableOfflineQueue`.
});

redisClient.on('connect', () => {
  console.log('Successfully connected to Redis');
});

redisClient.on('error', (err) => {
  // Log Redis connection errors. Avoid crashing the app if Redis is temporarily down.
  // The application logic should check redisClient.status before attempting operations.
  console.error('Redis connection error:', err.message);
});

redisClient.on('ready', () => {
  console.log('Redis client is ready to use');
});

redisClient.on('reconnecting', () => {
    console.log('Redis client is reconnecting...');
});

redisClient.on('end', () => {
    console.log('Redis client connection has ended.');
});

/**
 * Checks if the Redis client is connected and ready for operations.
 * @returns {boolean} True if Redis is ready, false otherwise.
 */
export const isRedisAvailable = (): boolean => redisClient.status === 'ready';

// Export the client and the availability check function as named exports
export { redisClient };
