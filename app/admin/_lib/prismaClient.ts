// RUTA: app/admin/_lib/prismaClient.ts

import { PrismaClient } from '@prisma/client';

// Declaramos una variable global para almacenar la instancia de Prisma.
// Esto es necesario porque en desarrollo, con el hot-reloading de Next.js,
// se pueden crear múltiples instancias de PrismaClient, agotando las conexiones.
declare global {
    var prisma: PrismaClient | undefined;
}

// Creamos la instancia del cliente. Si ya existe una instancia global, la reutilizamos.
// Si no, creamos una nueva. Esto asegura que solo haya una conexión activa.
const prisma = global.prisma || new PrismaClient({
    // Opcional: puedes añadir logs para ver las consultas de Prisma
    // log: ['query', 'info', 'warn', 'error'],
});

// En desarrollo, guardamos la instancia en la variable global.
if (process.env.NODE_ENV !== 'production') {
    global.prisma = prisma;
}

// Exportamos la instancia única de Prisma para que toda la aplicación la use.
export default prisma;
