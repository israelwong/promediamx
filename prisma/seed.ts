// /prisma/seed.ts

import { PrismaClient, Oferta, NegocioConocimientoItem } from '@prisma/client';
import { getEmbeddingForText } from '../app/admin/_lib/ia/ia.actions'; // Ajusta la ruta a tu helper

const prisma = new PrismaClient();

async function main() {
    console.log("🚀 Iniciando el proceso de sembrado de embeddings...");

    // --- PROCESO PARA EL MODELO 'Oferta' ---
    console.log("\n1. Procesando Ofertas...");
    const ofertas = await prisma.$queryRaw<Oferta[]>`
        SELECT * FROM "Oferta" WHERE "embedding" IS NULL LIMIT 1
    `;

    if (ofertas.length === 0) {
        console.log("   ✅ No hay nuevas ofertas que procesar.");
    } else {
        console.log(`   Se encontraron ${ofertas.length} ofertas para procesar.`);
        for (const oferta of ofertas) {
            // ✅ ENRIQUECIMIENTO: Añadimos palabras clave relevantes al texto.
            const palabrasClave = "costos precios inscripción colegiatura informes";
            const texto = `${oferta.nombre}. ${oferta.descripcion || ''} ${palabrasClave}`;
            console.log(`   Generando embedding para la oferta: "${oferta.nombre}"...`);
            const embedding = await getEmbeddingForText(texto);

            if (embedding) {
                await prisma.$executeRaw`
                    UPDATE "Oferta"
                    SET "embedding" = ${embedding}::vector
                    WHERE "id" = ${oferta.id}
                `;
                console.log(`   ✅ Embedding para "${oferta.nombre}" guardado.`);
            } else {
                console.error(`   ❌ Fallo al generar embedding para la oferta ID: ${oferta.id}`);
            }
        }
    }

    // --- PROCESO PARA EL MODELO 'NegocioConocimientoItem' ---
    console.log("\n2. Procesando Items de Conocimiento...");
    const itemsConocimiento = await prisma.$queryRaw<NegocioConocimientoItem[]>`
    SELECT * FROM "NegocioConocimientoItem" WHERE "embeddingPregunta" IS NULL LIMIT 1
    `;

    if (itemsConocimiento.length === 0) {
        console.log("   ✅ No hay nuevos items de conocimiento que procesar.");
    } else {
        console.log(`   Se encontraron ${itemsConocimiento.length} items para procesar.`);
        for (const item of itemsConocimiento) {
            console.log(`   Generando embedding para la pregunta: "${item.preguntaFormulada}"...`);
            const embeddingPregunta = await getEmbeddingForText(item.preguntaFormulada);
            let embeddingRespuesta: number[] | null = null;

            if (item.respuesta) {
                embeddingRespuesta = await getEmbeddingForText(item.respuesta);
            }

            if (embeddingPregunta) {
                // ✅ CORRECCIÓN: Usamos $executeRaw también para este modelo.
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

main()
    .catch((e) => {
        console.error("Ocurrió un error durante el sembrado:", e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });