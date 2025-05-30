import { NextResponse } from 'next/server';
import { prisma } from '@/lib/db';
import { isRedisAvailable, redisClient } from '@/lib/redis'; // Correctly import isRedisAvailable and redisClient

/**
 * Health check endpoint
 * Checks the status of the database and Redis connections.
 */
export async function GET() {
  let dbStatus = 'unavailable';
  let redisStatus = 'unavailable';
  const errors: string[] = [];

  // Check database connection
  try {
    await prisma.$connect(); // Simple way to check if DB is reachable
    await prisma.$queryRaw`SELECT 1`; // More robust check
    dbStatus = 'available';
  } catch (e: any) {
    console.error('Database health check failed:', e.message);
    errors.push(`Database connection failed: ${e.message}`);
  } finally {
    await prisma.$disconnect();
  }

  // Check Redis connection
  try {
    if (isRedisAvailable()) { // Use the imported function
      await redisClient.ping(); // Check if Redis server responds to ping
      redisStatus = 'available';
    } else {
      redisStatus = `unavailable (status: ${redisClient.status})`;
      errors.push(`Redis client not ready (status: ${redisClient.status})`);
    }
  } catch (e: any) {
    console.error('Redis health check failed:', e.message);
    errors.push(`Redis connection failed: ${e.message}`);
  }

  const overallHealth = dbStatus === 'available' && redisStatus === 'available';

  if (!overallHealth) {
    return NextResponse.json(
      {
        status: 'unhealthy',
        database: dbStatus,
        redis: redisStatus,
        errors: errors,
        timestamp: new Date().toISOString(),
      },
      { status: 503 }
    );
  }

  return NextResponse.json({
    status: 'healthy',
    database: dbStatus,
    redis: redisStatus,
    timestamp: new Date().toISOString(),
  });
}
