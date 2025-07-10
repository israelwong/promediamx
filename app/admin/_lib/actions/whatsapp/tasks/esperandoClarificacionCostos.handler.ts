// /app/admin/_lib/actions/whatsapp/tasks/esperandoClarificacionCostos.handler.ts

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso, Prisma } from '@prisma/client';
// import { ObjetivoOferta } from '@prisma/client';
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator';
import { buscarMejoresRespuestas } from './responderPreguntaGeneral.handler'; // Asumimos que el helper vive aquí
import { manejarSeguimiento } from './manejarSeguimiento.handler';

export async function manejarEsperandoClarificacionCostos(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    const { conversacionId, usuarioWaId, negocioPhoneNumberId, asistente } = contexto;
    const textoUsuario = mensaje.type === 'text' ? mensaje.content : '';
    const { preguntaOriginal } = (tarea.contexto as { preguntaOriginal?: string }) || {};

    if (!textoUsuario) {
        return { success: true, data: null };
    }

    const textoEnriquecido = `${preguntaOriginal || ''} ${textoUsuario}`;
    console.log(`[CLARIFICACION] Buscando con texto enriquecido: "${textoEnriquecido}"`);

    const umbralDeConfianza = asistente.umbralSimilitud ?? 0.72;
    // Define a type for items returned by buscarMejoresRespuestas
    type ResultadoBusquedaSemantica = {
        descripcion: string;
        fuente: string;
        nombre: string;
        objetivos?: string[];
        [key: string]: unknown;
    };

    const mejoresCoincidencias = await buscarMejoresRespuestas(textoEnriquecido, asistente.negocio!.id, umbralDeConfianza);

    if (mejoresCoincidencias.length > 0) {
        // Tomamos la mejor coincidencia de la nueva búsqueda
        const itemElegido = mejoresCoincidencias[0] as unknown as ResultadoBusquedaSemantica;

        // 1. Damos la respuesta específica que el usuario eligió.
        await enviarMensajeAsistente(conversacionId, itemElegido.descripcion, usuarioWaId, negocioPhoneNumberId);

        // 2. Borramos la tarea de clarificación, ya cumplió su misión.
        await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });

        // 3. ✅ LÓGICA DE SEGUIMIENTO CONTEXTUAL
        const objetivoCita = itemElegido.objetivos?.find((o: string) => o === 'CITA');
        if (itemElegido.fuente === 'Oferta' && objetivoCita) {
            const contextoSeguimiento = {
                siguienteTarea: 'agendarCita',
                preguntaDeCierre: `Veo que te interesa "${itemElegido.nombre}". ¿Te gustaría agendar una cita?`
            };

            // Creamos la nueva tarea de seguimiento Y enviamos el CTA
            const nuevaTareaSeguimiento = await prisma.tareaEnProgreso.create({
                data: {
                    conversacionId,
                    nombreTarea: 'seguimientoGenerico',
                    contexto: contextoSeguimiento as Prisma.JsonObject
                }
            });
            // La ejecutamos inmediatamente para enviar el mensaje de cierre
            await manejarSeguimiento(nuevaTareaSeguimiento, mensaje, contexto);
        }

    } else {
        // Si la respuesta sigue siendo ambigua, pedimos de nuevo.
        await enviarMensajeAsistente(conversacionId, "Disculpa, sigo sin entender cuál de las opciones elegiste. Por favor, intenta ser un poco más específico.", usuarioWaId, negocioPhoneNumberId);
    }

    return { success: true, data: null };
}

// Nota: El helper 'buscarMejoresRespuestas' debería estar en un archivo compartido o importado correctamente
// para que esta función pueda llamarlo.