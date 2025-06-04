// Ruta: app/admin/_lib/funciones/ofertas/aceptarOferta/aceptarOferta.actions.ts
'use server';

import prisma from '../../../prismaClient';
import type { ActionResult } from '../../../types';
import type { FullExecutionFunctionContext, FunctionResponsePayload } from '../../../dispatcher/dispatcher.types'; // Ajusta la ruta
import {
    AceptarOfertaArgsSchema,
    type ActionButtonPayload,
    type ActionPromptPayloadData,
    type UiComponentPayloadActionPrompt
} from './aceptarOferta.schemas';
import { buscarOfertaPorNombre } from '../mostrarDetalleOferta/mostrarDetalleOferta.helpers'; // Reutilizar helper
// No necesitamos OfertaCompleta aquí si el select es más específico
import { ObjetivoOferta as PrismaObjetivoOfertaEnum, Prisma } from '@prisma/client';

export async function ejecutarAceptarOfertaAction(
    argsFromIA: Record<string, unknown>,
    context: FullExecutionFunctionContext
): Promise<ActionResult<FunctionResponsePayload | null>> {
    const actionName = "ejecutarAceptarOfertaAction";
    // console.log(`[${actionName}] Iniciando TareaId: ${context.tareaEjecutadaId}, Args:`, argsFromIA);

    const validationResult = AceptarOfertaArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        console.warn(`[${actionName}] Error de validación de argsFromIA:`, validationResult.error.flatten().fieldErrors);
        const userMessage = "Para aceptar la oferta, necesito que me confirmes claramente a cuál te refieres. ¿Podrías decirme el nombre o ID de la oferta?";
        return {
            success: true, // La función manejó la situación y tiene un mensaje para el usuario
            data: { content: userMessage, media: null, uiComponentPayload: null, aiContextData: { validationError: true, errors: validationResult.error.flatten().fieldErrors } },
            error: "Argumentos de IA inválidos para aceptarOferta.", // Para logs internos
            validationErrors: validationResult.error.flatten().fieldErrors
        };
    }

    // Usar los datos transformados y validados
    const { ofertaIdNormalizado, nombre_de_la_oferta } = validationResult.data;
    const { negocioId, canalNombre } = context;

    // Definir el tipo para ofertaDb basado en el select que haremos
    type OfertaParaAceptar = Prisma.OfertaGetPayload<{
        select: { id: true, nombre: true, status: true, fechaInicio: true, fechaFin: true, objetivos: true, precio: true, descripcion: true }
    }>;
    let ofertaDb: OfertaParaAceptar | null = null;

    try {
        if (ofertaIdNormalizado) {
            ofertaDb = await prisma.oferta.findUnique({
                where: { id: ofertaIdNormalizado, negocioId: negocioId }, // Asegurar que pertenece al negocio
                select: { id: true, nombre: true, status: true, fechaInicio: true, fechaFin: true, objetivos: true, precio: true, descripcion: true }
            });
        } else if (nombre_de_la_oferta) {
            const resultadoBusqueda = await buscarOfertaPorNombre(nombre_de_la_oferta, negocioId);
            if (resultadoBusqueda === "multiple") {
                const userMessage = `Encontré varias ofertas que coinciden con "${nombre_de_la_oferta}". ¿Podrías darme el ID exacto para aceptarla?`;
                return { success: true, data: { content: userMessage, media: null, uiComponentPayload: null, aiContextData: { busquedaAmbigua: true, nombreBusqueda: nombre_de_la_oferta } } };
            }
            if (resultadoBusqueda) {
                ofertaDb = {
                    id: resultadoBusqueda.id,
                    nombre: resultadoBusqueda.nombre,
                    status: resultadoBusqueda.status,
                    fechaInicio: resultadoBusqueda.fechaInicio,
                    fechaFin: resultadoBusqueda.fechaFin,
                    objetivos: resultadoBusqueda.objetivos,
                    precio: resultadoBusqueda.precio,
                    descripcion: resultadoBusqueda.descripcion,
                };
            }
        }

        if (!ofertaDb) {
            const userMessage = `Lo siento, no pude encontrar la oferta "${nombre_de_la_oferta || ofertaIdNormalizado}" o ya no está disponible.`;
            return { success: true, data: { content: userMessage, media: null, uiComponentPayload: null, aiContextData: { ofertaNoEncontrada: true, identificadorBusqueda: nombre_de_la_oferta || ofertaIdNormalizado } } };
        }

        const ahora = new Date();
        if (ofertaDb.status !== 'activo' ||
            (ofertaDb.fechaInicio && new Date(ofertaDb.fechaInicio) > ahora) ||
            (ofertaDb.fechaFin && new Date(ofertaDb.fechaFin) < ahora)) {
            const userMessage = `Lo siento, la oferta "${ofertaDb.nombre}" no está activa o está fuera de su periodo de vigencia en este momento.`;
            return { success: true, data: { content: userMessage, media: null, uiComponentPayload: null, aiContextData: { ofertaId: ofertaDb.id, ofertaInvalida: true, motivo: "No activa o fuera de vigencia" } } };
        }

        let mensajeSiguientePaso = `¡Excelente! Has indicado que te interesa la oferta "${ofertaDb.nombre}". `;
        let uiPayloadParaWebChat: UiComponentPayloadActionPrompt | null = null;
        const aiContextData: Record<string, unknown> = {
            ofertaId: ofertaDb.id,
            nombreOferta: ofertaDb.nombre,
            objetivosOferta: ofertaDb.objetivos?.map(o => PrismaObjetivoOfertaEnum[o]) || [],
            accionConfirmada: "aceptarOferta"
        };

        const tieneObjetivoVenta = ofertaDb.objetivos?.includes(PrismaObjetivoOfertaEnum.VENTA);
        const tieneObjetivoCita = ofertaDb.objetivos?.includes(PrismaObjetivoOfertaEnum.CITA);
        const actionsButtons: ActionButtonPayload[] = [];

        if (tieneObjetivoVenta) {
            mensajeSiguientePaso += "Para continuar, ¿estás listo para proceder con el pago?";
            aiContextData.siguienteAccionSugerida = "procesarPagoConStripe";
            actionsButtons.push({
                label: "Sí, Pagar Ahora",
                actionType: "CALL_FUNCTION",
                actionName: "procesarPagoConStripe",
                payload: { identificador_item_a_pagar: ofertaDb.id, tipo_item_a_pagar: "oferta" },
                style: 'primary'
            });
        }

        if (tieneObjetivoCita) {
            if (!tieneObjetivoVenta) {
                mensajeSiguientePaso += "Para continuar, ¿te gustaría que agendemos tu cita ahora?";
            } else {
                mensajeSiguientePaso += " o ¿prefieres agendar una cita primero?";
            }
            aiContextData.siguienteAccionSugerida = aiContextData.siguienteAccionSugerida ? `${aiContextData.siguienteAccionSugerida}_o_agendarCita` : "agendarCita";
            actionsButtons.push({
                label: "Sí, Agendar Cita",
                actionType: "CALL_FUNCTION",
                actionName: "agendarCita",
                payload: { ofertaId: ofertaDb.id, nombreOferta: ofertaDb.nombre, servicio_nombre: `Cita para oferta: ${ofertaDb.nombre}` },
                style: tieneObjetivoVenta ? 'secondary' : 'primary'
            });
        }

        actionsButtons.push({
            label: "Tengo otra pregunta",
            actionType: "USER_INPUT_EXPECTED",
            payload: { ofertaId: ofertaDb.id, contexto: "pregunta_post_aceptacion" },
            style: 'secondary'
        });

        if (canalNombre?.toLowerCase().includes('webchat') && actionsButtons.length > 1) { // Asegurarse que hay botones además de "Tengo otra pregunta"
            const uiPayloadData: ActionPromptPayloadData = {
                message: `Has aceptado la oferta "${ofertaDb.nombre}". ¿Cómo deseas continuar?`,
                actions: actionsButtons
            };
            uiPayloadParaWebChat = {
                componentType: 'ActionPrompt',
                data: uiPayloadData
            };
            mensajeSiguientePaso = `Oferta "${ofertaDb.nombre}" aceptada. Selecciona una opción:`;
        } else if (actionsButtons.length <= 1 && (tieneObjetivoVenta || tieneObjetivoCita)) {
            // Si solo hay un botón de acción principal (Pagar o Agendar) y el de "otra pregunta",
            // el mensajeSiguientePaso ya construido es adecuado para WhatsApp.
            // No se modifica mensajeSiguientePaso.
        } else {
            // Si no hay VENTA o CITA, y solo queda "Tengo otra pregunta" o ningún botón de acción principal.
            mensajeSiguientePaso = `¡Genial que te interese la oferta "${ofertaDb.nombre}"! Hemos registrado tu interés. ¿Hay algo más en lo que pueda ayudarte?`;
            aiContextData.siguienteAccionSugerida = "ninguna_especifica";
            // Si solo queda "Tengo otra pregunta", no se envía uiPayloadParaWebChat con solo ese botón.
            uiPayloadParaWebChat = null;
        }

        const responsePayload: FunctionResponsePayload = {
            content: mensajeSiguientePaso.trim(),
            media: null,
            uiComponentPayload: uiPayloadParaWebChat as unknown as Record<string, unknown>,
            aiContextData: aiContextData
        };

        // <--- AÑADIR LOG AQUÍ ---
        console.log(`[${actionName}] Payload de respuesta final:`, JSON.stringify(responsePayload, null, 2));
        // <--- FIN DEL LOG ---

        return { success: true, data: responsePayload };

    } catch (error: unknown) {
        console.error(`[${actionName}] Error al procesar aceptación de oferta:`, error);
        const errorMsg = `Error interno al procesar tu solicitud para la oferta: ${error instanceof Error ? error.message : "Desconocido"}`;
        return {
            success: false,
            error: errorMsg,
            data: {
                content: "Lo siento, no pude procesar tu aceptación de la oferta en este momento. Por favor, intenta más tarde.",
                media: null,
                uiComponentPayload: null,
                aiContextData: { error: true, errorMessage: errorMsg, inputArgs: argsFromIA }
            }
        };
    }
}
