// /pages/api/seed/embeddings.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient, Oferta, NegocioConocimientoItem } from '@prisma/client';
import { getEmbeddingForText } from '@/app/admin/_lib/ia/ia.actions';

const prisma = new PrismaClient();

async function seedLogic() {
    console.log("🚀 Iniciando el proceso de sembrado desde la API (Pages Router)...");

    // --- PROCESO PARA 'Oferta' ---
    console.log("\n1. Procesando Ofertas...");
    // ✅ CORRECCIÓN: Seleccionamos explícitamente las columnas que SÍ soporta el cliente.
    const ofertas = await prisma.$queryRaw<Oferta[]>`
        SELECT id, nombre, descripcion FROM "Oferta" WHERE "embedding" IS NULL LIMIT 10
    `;

    if (ofertas.length === 0) {
        console.log("   ✅ No hay nuevas ofertas que procesar.");
    } else {
        console.log(`   Se encontraron ${ofertas.length} ofertas para procesar.`);
        for (const oferta of ofertas) {
            const texto = `${oferta.nombre}. ${oferta.descripcion || ''}`;
            console.log(`   Generando embedding para la oferta: "${oferta.nombre}"...`);
            const embedding = await getEmbeddingForText(texto);
            if (embedding) {
                await prisma.$executeRaw`UPDATE "Oferta" SET "embedding" = ${embedding}::vector WHERE "id" = ${oferta.id}`;
                console.log(`   ✅ Embedding para "${oferta.nombre}" guardado.`);
            } else {
                console.error(`   ❌ Fallo al generar embedding para la oferta ID: ${oferta.id}`);
            }
        }
    }

    // --- PROCESO PARA 'NegocioConocimientoItem' ---
    console.log("\n2. Procesando Items de Conocimiento...");
    // ✅ CORRECCIÓN: Seleccionamos explícitamente las columnas que SÍ soporta el cliente.
    const itemsConocimiento = await prisma.$queryRaw<NegocioConocimientoItem[]>`
        SELECT id, "preguntaFormulada", respuesta FROM "NegocioConocimientoItem" WHERE "embeddingPregunta" IS NULL LIMIT 10
    `;

    if (itemsConocimiento.length === 0) {
        console.log("   ✅ No hay nuevos items de conocimiento que procesar.");
    } else {
        console.log(`   Se encontraron ${itemsConocimiento.length} items para procesar.`);
        for (const item of itemsConocimiento) {
            console.log(`   Generando embedding para la pregunta: "${item.preguntaFormulada}"...`);
            const [embeddingPregunta, embeddingRespuesta] = await Promise.all([
                getEmbeddingForText(item.preguntaFormulada),
                item.respuesta ? getEmbeddingForText(item.respuesta) : Promise.resolve(null)
            ]);

            if (embeddingPregunta) {
                await prisma.$executeRaw`
                    UPDATE "NegocioConocimientoItem"
                    SET "embeddingPregunta" = ${embeddingPregunta}::vector,
                        "embeddingRespuesta" = ${embeddingRespuesta}::vector
                    WHERE "id" = ${item.id}
                `;
                console.log(`   ✅ Embedding para "${item.preguntaFormulada}" guardado.`);
            } else {
                console.error(`   ❌ Fallo al generar embedding para el item ID: ${item.id}`);
            }
        }
    }
    console.log("\n✨ Proceso de sembrado de embeddings finalizado.");
}

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: 'Acceso denegado.' });
    }
    seedLogic().catch(e => console.error("Error en el proceso de sembrado en segundo plano:", e));
    return res.status(202).json({
        message: "Proceso de sembrado iniciado. Revisa la consola de tu servidor para ver el progreso."
    });
}