// /pages/api/test/db-connection.ts

import type { NextApiRequest, NextApiResponse } from 'next';
// Importamos la instancia ÚNICA de Prisma desde el archivo que modificamos.
import prisma from '@/app/admin/_lib/prismaClient';

type TestResponse = {
    success: boolean;
    message: string;
    data?: {
        serverTime: string;
        negocioCount?: number;
    };
    error?: string;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<TestResponse>
) {
    console.log("--- [DB TEST] Iniciando prueba de conexión a la base de datos... ---");

    try {
        // Realizamos una consulta muy simple y rápida: contar los negocios.
        const count = await prisma.negocio.count();

        console.log(`[DB TEST] ¡ÉXITO! La consulta a la base de datos se completó. Número de negocios: ${count}`);

        // Si la consulta funciona, la conexión es exitosa.
        return res.status(200).json({
            success: true,
            message: "¡Conexión a la base de datos exitosa!",
            data: {
                serverTime: new Date().toISOString(),
                negocioCount: count,
            }
        });

    } catch (error: unknown) {
        const errorMessage = error instanceof Error ? error.message : "Error desconocido";

        console.error("[DB TEST] ¡FALLO CRÍTICO! Error al conectar o consultar la base de datos:", error);

        // Si hay un error, lo devolvemos en la respuesta.
        return res.status(500).json({
            success: false,
            message: "Fallo la conexión a la base de datos.",
            error: errorMessage
        });
    }
}
