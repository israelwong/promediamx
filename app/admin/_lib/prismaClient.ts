// Ruta: app/admin/_lib/prismaClient.ts
import { PrismaClient } from '@prisma/client';

declare global {
    var prisma: PrismaClient | undefined;
}

// La lógica del Singleton se mantiene igual
const prismaInstance =
    global.prisma ||
    new PrismaClient({
        log: process.env.NODE_ENV === 'development' ? ['error', 'warn'] : ['error'],
    });

if (process.env.NODE_ENV !== 'production') {
    global.prisma = prismaInstance;
}

// CORRECCIÓN: Exportamos la instancia como la exportación por defecto del archivo.
export default prismaInstance;