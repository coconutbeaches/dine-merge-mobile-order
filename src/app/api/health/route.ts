import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRedisAvailable } from '@/lib/redis';

/**
 * Health check endpoint
 * 
 * Verifies database and Redis connections
 * Returns 200 OK if all systems are operational
 * Returns 503 Service Unavailable if any system is down
 * 
 * @route GET /api/health
 */
export async function GET() {
  try {
    // Check system components
    const [databaseStatus, redisStatus] = await Promise.allSettled([
      checkDatabase(),
      checkRedis(),
    ]);

    // Determine overall status
    const isHealthy = 
      databaseStatus.status === 'fulfilled' && databaseStatus.value &&
      redisStatus.status === 'fulfilled' && redisStatus.value;

    // Prepare response
    const response = {
      status: isHealthy ? 'healthy' : 'unhealthy',
      timestamp: new Date().toISOString(),
      environment: process.env.NODE_ENV || 'development',
      version: process.env.NEXT_PUBLIC_APP_VERSION || '1.0.0',
      components: {
        database: {
          status: databaseStatus.status === 'fulfilled' && databaseStatus.value ? 'up' : 'down',
        },
        redis: {
          status: redisStatus.status === 'fulfilled' && redisStatus.value ? 'up' : 'down',
        },
      },
    };

    // Return appropriate status code
    return NextResponse.json(
      response,
      { status: isHealthy ? 200 : 503 }
    );
  } catch (error) {
    console.error('Health check failed:', error);
    
    return NextResponse.json(
      {
        status: 'error',
        timestamp: new Date().toISOString(),
        error: 'Health check failed',
      },
      { status: 500 }
    );
  }
}

/**
 * Check database connection
 * 
 * @returns Promise<boolean> - true if database is connected
 */
async function checkDatabase(): Promise<boolean> {
  try {
    // Execute a simple query to check database connection
    await prisma.$queryRaw`SELECT 1`;
    return true;
  } catch (error) {
    console.error('Database health check failed:', error);
    return false;
  }
}

/**
 * Check Redis connection
 * 
 * @returns Promise<boolean> - true if Redis is connected
 */
async function checkRedis(): Promise<boolean> {
  try {
    return await isRedisAvailable();
  } catch (error) {
    console.error('Redis health check failed:', error);
    return false;
  }
}
