"use server";

import prisma from '@/app/admin/_lib/prismaClient'; // Ajusta tu ruta
import { ActionResult } from '@/app/admin/_lib/types';
import { PreguntaSinRespuestaOfertaListItemSchema, type PreguntaSinRespuestaOfertaListItemType } from './preguntaSinRespuestaOferta.schemas';
// import { revalidatePath } from 'next/cache';

// Helper para la ruta de revalidación
// const getPathToOfertaEdicionPage = (clienteId: string, negocioId: string, ofertaId: string) =>
//     `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`;

export async function obtenerPreguntasSinRespuestaDeOfertaAction(
    ofertaId: string
): Promise<ActionResult<PreguntaSinRespuestaOfertaListItemType[]>> {
    if (!ofertaId) return { success: false, error: "ID de oferta requerido." };
    try {
        const preguntasDb = await prisma.preguntaSinRespuestaOferta.findMany({
            where: { ofertaId: ofertaId },
            select: {
                id: true,
                ofertaId: true,
                preguntaUsuario: true,
                estado: true,
                fechaCreacion: true,
                ofertaDetalleRespuesta: { // Incluir el detalle vinculado si existe
                    select: {
                        id: true,
                        tituloDetalle: true,
                    }
                }
            },
            orderBy: { fechaCreacion: 'desc' },
        });

        // Validar cada item con el schema
        const parseResults = preguntasDb.map(item => PreguntaSinRespuestaOfertaListItemSchema.safeParse(item));
        const validItems: PreguntaSinRespuestaOfertaListItemType[] = [];
        parseResults.forEach((res, index) => {
            if (res.success) {
                validItems.push(res.data);
            } else {
                console.warn(`Datos de PreguntaSinRespuestaOfertaListItem inválidos para ID ${preguntasDb[index]?.id}:`, res.error.flatten());
            }
        });
        return { success: true, data: validItems };
    } catch (error) {
        console.error("Error en obtenerPreguntasSinRespuestaDeOfertaAction:", error);
        return { success: false, error: "No se pudieron obtener las preguntas sin respuesta." };
    }
}

// Aquí irían las actions para:
// - resolverPreguntaCreandoNuevoDetalleAction(...) -> llamaría a createOfertaDetalleAction y luego actualizaría PreguntaSinRespuestaOferta
// - resolverPreguntaVinculandoDetalleExistenteAction(preguntaId, detalleExistenteId) -> actualizaría PreguntaSinRespuestaOferta
// - descartarPreguntaAction(preguntaId) -> cambiaría estado
// - notificarUsuarioRespuestaAction(preguntaId) -> enviaría WhatsApp