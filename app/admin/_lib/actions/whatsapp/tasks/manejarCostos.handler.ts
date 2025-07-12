// /app/admin/_lib/actions/whatsapp/tasks/manejarCostos.handler.ts
// VERSIÓN CORREGIDA Y FUNCIONAL

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { Prisma, ObjetivoOferta } from '@prisma/client'; // ✅ CORRECCIÓN: Importamos el enum 'ObjetivoOferta'
import type { ActionResult } from '../../../types';
import type { FsmContext, ProcesarMensajeWhatsAppOutput } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator-original';
import { findBestMatchingOffer } from '../helpers/availability.helpers';
import { manejarInformacionGeneral } from './manejarInformacionGeneral.handler';

export async function manejarCostos(
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    const textoUsuario = contexto.mensaje.type === 'text' ? contexto.mensaje.content : '';
    const { conversacionId, usuarioWaId, negocioPhoneNumberId } = contexto;

    console.log(`[COSTOS HANDLER] Iniciando búsqueda de ofertas para: "${textoUsuario}"`);

    const ofertasActivas = await prisma.oferta.findMany({
        where: { negocioId: contexto.asistente.negocio!.id, status: 'ACTIVO' },
        include: { detallesAdicionales: true }
    });

    if (ofertasActivas.length === 0) {
        return manejarInformacionGeneral(contexto);
    }

    const coincidencias = findBestMatchingOffer(textoUsuario, ofertasActivas);

    if (coincidencias.length === 1) {
        const oferta = coincidencias[0];

        const mensajeRespuesta = oferta.descripcion || "Encontré la siguiente información sobre tu consulta.";
        await enviarMensajeAsistente(conversacionId, mensajeRespuesta, usuarioWaId, negocioPhoneNumberId);

        // ✅ CORRECCIÓN: Usamos el campo 'objetivos' para determinar la siguiente acción.
        if (oferta.objetivos.includes(ObjetivoOferta.CITA)) {
            const contextoSeguimiento = {
                preguntaDeCierre: `¿Te gustaría agendar una cita para darte más detalles sobre "${oferta.nombre}"?`,
                siguienteTarea: 'agendarCita'
            };
            await prisma.tareaEnProgreso.create({
                data: {
                    conversacionId,
                    nombreTarea: 'seguimientoGenerico',
                    contexto: contextoSeguimiento as Prisma.JsonObject
                }
            });
        }

    } else if (coincidencias.length > 1) {
        let mensajeLista = "Claro, encontré varias opciones relacionadas. ¿Sobre cuál te gustaría saber más?\n";
        // ✅ CORRECCIÓN: Eliminamos el tipo explícito para evitar conflictos.
        coincidencias.forEach((oferta, index) => {
            mensajeLista += `\n${index + 1}. **${oferta.nombre}**`;
        });

        await enviarMensajeAsistente(conversacionId, mensajeLista, usuarioWaId, negocioPhoneNumberId);
        await prisma.tareaEnProgreso.create({
            data: {
                conversacionId,
                nombreTarea: 'esperandoClarificacionCostos',
                contexto: { opciones: coincidencias.map((c) => c.id) } as Prisma.JsonObject
            }
        });

    } else {
        return manejarInformacionGeneral(contexto);
    }

    return { success: true, data: null };
}