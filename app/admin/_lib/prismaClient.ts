import { PrismaClient } from '@prisma/client';

// Uso de un objeto global extendido
const globalForPrisma = global as typeof globalThis & {
    prisma?: PrismaClient;
};

const prisma =
    globalForPrisma.prisma ||
    new PrismaClient({
        // log: ['query', 'info', 'warn', 'error'],
    });

if (process.env.NODE_ENV === 'development') globalForPrisma.prisma = prisma;

export default prisma;
