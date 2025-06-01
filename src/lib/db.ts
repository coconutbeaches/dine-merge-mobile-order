import { PrismaClient } from '@prisma/client';

// Prevent multiple instances of Prisma Client in development due to hot reloading
const globalForPrisma = global as unknown as { prisma: PrismaClient };

/**
 * PrismaClient singleton instance
 * 
 * Uses global variable in development to prevent multiple instances during hot reloading
 * Creates a new instance in production
 */
export const prisma =
  globalForPrisma.prisma ||
  new PrismaClient({
    log: process.env.NODE_ENV === 'development' ? ['query', 'error', 'warn'] : ['error'],
  });

// Set the Prisma instance on the global object in development
if (process.env.NODE_ENV !== 'production') {
  globalForPrisma.prisma = prisma;
}

/**
 * Connect to the database
 * 
 * @returns Promise that resolves when connected
 */
export async function connectToDatabase() {
  try {
    await prisma.$connect();
    console.log('Connected to database');
    return prisma;
  } catch (error) {
    console.error('Failed to connect to database:', error);
    process.exit(1);
  }
}

/**
 * Disconnect from the database
 * 
 * @returns Promise that resolves when disconnected
 */
export async function disconnectFromDatabase() {
  try {
    await prisma.$disconnect();
    console.log('Disconnected from database');
  } catch (error) {
    console.error('Failed to disconnect from database:', error);
    process.exit(1);
  }
}
