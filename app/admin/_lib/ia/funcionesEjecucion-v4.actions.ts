// app/admin/_lib/ia/funcionesEjecucion.actions.ts
'use server';

import prisma from '../prismaClient';
import { ActionResult } from '../types';
import { ChatMessageItemSchema, type ChatMessageItem } from './ia.schemas';
import { InteraccionParteTipo, Prisma } from '@prisma/client';
import { z } from 'zod';

import { enviarMensajeWhatsAppApiAction } from '../actions/whatsapp/whatsapp.actions';
import type { EnviarMensajeWhatsAppApiInput } from '../actions/whatsapp/whatsapp.schemas';

// Importaciones de TODAS tus funciones de ejecución específicas y sus schemas Zod
import { type BrindarInfoArgs, type BrindarInfoData, BrindarInfoArgsSchema } from '../funciones/brindarInformacionDelNegocio.schemas';
import { ejecutarBrindarInfoNegocioAction } from '../funciones/brindarInformacionDelNegocio.actions';
import { type InformarHorarioArgs, type InformarHorarioData, InformarHorarioArgsSchema } from '../funciones/informarHorarioDeAtencion.schemas';
import { ejecutarInformarHorarioAction } from '../funciones/informarHorarioDeAtencion.actions';
import { type DarDireccionArgs, type DarDireccionData, DarDireccionArgsSchema } from '../funciones/darDireccionYUbicacion.schemas';
import { ejecutarDarDireccionAction } from '../funciones/darDireccionYUbicacion.actions';
import { type MostrarOfertasArgs, type MostrarOfertasData, MostrarOfertasArgsSchema } from '../funciones/mostrarOfertas.schemas';
import { ejecutarMostrarOfertasAction } from '../funciones/mostrarOfertas.actions';

import {
    type MostrarDetalleOfertaArgs,
    type MostrarDetalleOfertaData,
    MostrarDetalleOfertaArgsSchema,
    type MediaItem
} from '../funciones/mostrarDetalleOferta/mostrarDetalleOferta.schemas';
import { ejecutarMostrarDetalleOfertaAction } from '../funciones/mostrarDetalleOferta/mostrarDetalleOferta.actions';

import { type AceptarOfertaArgs, type AceptarOfertaData, AceptarOfertaArgsSchema } from '../funciones/aceptarOferta.schemas';
import { ejecutarAceptarOfertaAction } from '../funciones/aceptarOferta.actions';
import { type AgendarCitaArgs, type ConfiguracionAgendaDelNegocio, AgendarCitaArgsSchema } from '../funciones/agendarCita.schemas';
import { ejecutarAgendarCitaAction } from '../funciones/agendarCita.actions';
import { type ListarServiciosAgendaArgs, ListarServiciosAgendaArgsSchema, type ListarServiciosAgendaData } from '../funciones/listarServiciosAgenda.schemas';
import { ejecutarListarServiciosAgendaAction } from '../funciones/listarServiciosAgenda.actions';
import { type ListarHorariosDisponiblesArgs, ListarHorariosDisponiblesArgsSchema, type ListarHorariosDisponiblesData } from '../funciones/listarHorariosDisponiblesAgenda.schemas';
import { ejecutarListarHorariosDisponiblesAction } from '../funciones/listarHorariosDisponiblesAgenda.actions';
import { type CancelarCitaArgs, CancelarCitaArgsSchema, type CancelarCitaData } from '../funciones/cancelarCita.schemas';
import { ejecutarCancelarCitaAction } from '../funciones/cancelarCita.actions';
import { type ReagendarCitaArgs, ReagendarCitaArgsSchema, type ReagendarCitaData } from '../funciones/reagendarCita.schemas';
import { ejecutarReagendarCitaAction } from '../funciones/reagendarCita.actions';
import { type ProcesarPagoConStripeArgs, type ProcesarPagoConStripeData, ProcesarPagoConStripeArgsSchema } from '../funciones/procesarPagoConStripe.schemas';
import { ejecutarProcesarPagoConStripeAction } from '../funciones/procesarPagoConStripe.actions';



import { type SimpleFuncionContext } from "@/app/admin/_lib/types"; // o donde definas SimpleFuncionContext

async function enviarMensajeInternoYWhatsAppAction(input: {
    conversacionId: string;
    mensajePrincipal: string | null;
    role: 'assistant' | 'system';
    nombreFuncionEjecutada?: string;
    canalOriginal?: string | null;
    destinatarioWaId?: string | null;
    negocioPhoneNumberIdEnvia?: string | null;
    mediaItems?: MediaItem[] | null;
    datosFuncionParaInteraccion?: Record<string, unknown> | string | null;
}): Promise<ActionResult<ChatMessageItem | null>> {
    const timestampInicio = Date.now();
    console.log(`[enviarMensajeInterno V2] Tarea (función ${input.nombreFuncionEjecutada || 'N/A'}) - INICIO para conv ${input.conversacionId}. Rol: ${input.role}, Canal: ${input.canalOriginal}`);
    console.log(`[enviarMensajeInterno V2] Mensaje Principal Recibido (longitud: ${input.mensajePrincipal?.length || 0}, primeros 100): "${input.mensajePrincipal?.substring(0, 100)}..."`);
    console.log(`[enviarMensajeInterno V2] MediaItems Recibidos (cantidad: ${input.mediaItems?.length || 0}):`, input.mediaItems && input.mediaItems.length > 0 ? JSON.stringify(input.mediaItems.map(m => ({ tipo: m.tipo, url: m.url.substring(0, 40) + "...", caption: m.caption?.substring(0, 30) })), null, 2) : "Ninguno o vacío");

    try {
        if (!input.conversacionId || !input.role) {
            console.warn(`[enviarMensajeInterno V2] Faltan datos críticos (conversacionId, role). Abortando.`);
            return { success: false, error: 'Faltan datos (conversacionId, role).' };
        }

        const tieneTextoPrincipal = input.mensajePrincipal && input.mensajePrincipal.trim() !== "";
        // Validar que mediaItems no sea solo un array vacío, sino que tenga items válidos
        const tieneMediaValida = Array.isArray(input.mediaItems) && input.mediaItems.length > 0 && input.mediaItems.some(m => m.url && m.tipo);

        if (!tieneTextoPrincipal && !tieneMediaValida) {
            console.warn(`[enviarMensajeInterno V2] No hay texto principal ni media válida para enviar para conv ${input.conversacionId}. Abortando.`);
            return { success: false, error: 'Se requiere un mensaje de texto o media válida para enviar.' };
        }

        const textoParaGuardarEnDB = input.mensajePrincipal || (tieneMediaValida ? (input.mediaItems![0].caption || `[Media: ${input.mediaItems![0].tipo}]`) : "[Respuesta sin texto visible]");
        const dataToCreateInDB: Prisma.InteraccionCreateInput = {
            conversacion: { connect: { id: input.conversacionId } },
            role: input.role,
            mensajeTexto: textoParaGuardarEnDB,
            parteTipo: InteraccionParteTipo.TEXT,
            mediaUrl: null,
            mediaType: null,
        };

        if (input.role === 'assistant' && input.nombreFuncionEjecutada) {
            dataToCreateInDB.parteTipo = InteraccionParteTipo.FUNCTION_RESPONSE;
            dataToCreateInDB.functionCallNombre = input.nombreFuncionEjecutada;
            dataToCreateInDB.functionResponseData = {
                content: input.mensajePrincipal,
                media: input.mediaItems || [],
                additionalData: input.datosFuncionParaInteraccion
            } as Prisma.InputJsonValue;
            console.log(`[enviarMensajeInterno V2] Interacción guardada como FUNCTION_RESPONSE para: ${input.nombreFuncionEjecutada}. FunctionResponseData:`, dataToCreateInDB.functionResponseData);
        } else if (tieneMediaValida && !input.nombreFuncionEjecutada) {
            dataToCreateInDB.mediaUrl = input.mediaItems![0].url; // Guarda la primera media si es un mensaje simple
            dataToCreateInDB.mediaType = input.mediaItems![0].tipo;
            console.log(`[enviarMensajeInterno V2] Interacción de ${input.role} guardada con media (primera): ${dataToCreateInDB.mediaType}`);
        }

        const nuevaInteraccion = await prisma.interaccion.create({
            data: dataToCreateInDB,
            select: { /* selección completa */
                id: true, conversacionId: true, role: true, mensajeTexto: true,
                parteTipo: true, functionCallNombre: true, functionCallArgs: true,
                functionResponseData: true, functionResponseNombre: true,
                mediaUrl: true, mediaType: true, createdAt: true,
                agenteCrm: { select: { id: true, nombre: true } },
            }
        });
        const parsedNuevaInteraccion = ChatMessageItemSchema.safeParse(nuevaInteraccion);
        const interaccionPrincipalGuardada: ChatMessageItem | null = parsedNuevaInteraccion.success ? parsedNuevaInteraccion.data : null;
        if (!parsedNuevaInteraccion.success) console.error(`[enviarMensajeInterno V2] Error Zod parseando interacción guardada (ID: ${nuevaInteraccion.id}):`, parsedNuevaInteraccion.error.flatten().fieldErrors);
        else console.log(`[enviarMensajeInterno V2] Interacción guardada en DB (ID: ${interaccionPrincipalGuardada?.id}), ParteTipo: ${interaccionPrincipalGuardada?.parteTipo}`);

        await prisma.conversacion.update({ where: { id: input.conversacionId }, data: { updatedAt: new Date() } });

        const esCanalWhatsApp = input.canalOriginal?.toLowerCase().includes('whatsapp') ?? false;
        if (esCanalWhatsApp && input.destinatarioWaId && input.negocioPhoneNumberIdEnvia && input.role === 'assistant') {
            console.log(`[enviarMensajeInterno V2] DETECTADO CANAL WHATSAPP para conv ${input.conversacionId}. Preparando envío a ${input.destinatarioWaId}.`);
            const asistente = await prisma.asistenteVirtual.findFirst({
                where: { phoneNumberId: input.negocioPhoneNumberIdEnvia, status: 'activo' },
                select: { token: true, id: true }
            });

            if (asistente?.token) {
                console.log(`[enviarMensajeInterno V2] Token encontrado para Asistente ${asistente.id} (PNID ${input.negocioPhoneNumberIdEnvia}).`);
                const commonWhatsAppParams: Pick<EnviarMensajeWhatsAppApiInput, "destinatarioWaId" | "negocioPhoneNumberIdEnvia" | "tokenAccesoAsistente"> = {
                    destinatarioWaId: input.destinatarioWaId,
                    negocioPhoneNumberIdEnvia: input.negocioPhoneNumberIdEnvia,
                    tokenAccesoAsistente: asistente.token,
                };

                if (tieneTextoPrincipal) {
                    console.log(`[enviarMensajeInterno V2] WHATSAPP: Intentando enviar TEXTO a ${input.destinatarioWaId}: "${input.mensajePrincipal!.substring(0, 70)}..."`);
                    const resultadoEnvioTexto = await enviarMensajeWhatsAppApiAction({
                        ...commonWhatsAppParams, tipoMensaje: 'text', mensajeTexto: input.mensajePrincipal!,
                    });
                    if (resultadoEnvioTexto.success) console.log(`[enviarMensajeInterno V2] WHATSAPP: TEXTO enviado a ${input.destinatarioWaId}. MsgID: ${resultadoEnvioTexto.data}`);
                    else console.warn(`[enviarMensajeInterno V2] WHATSAPP: Fallo al enviar TEXTO a ${input.destinatarioWaId}. Error: ${resultadoEnvioTexto.error}`);
                    if (tieneMediaValida) await new Promise(resolve => setTimeout(resolve, 700));
                }

                if (tieneMediaValida) { // Re-chequeo por si acaso
                    console.log(`[enviarMensajeInterno V2] WHATSAPP: Intentando enviar ${input.mediaItems!.length} item(s) de media a ${input.destinatarioWaId}.`);
                    for (let i = 0; i < input.mediaItems!.length; i++) {
                        const media = input.mediaItems![i];
                        if (!media.url || !media.tipo) {
                            console.warn(`[enviarMensajeInterno V2] WHATSAPP: Media item ${i} inválido. Omitiendo.`, media);
                            continue;
                        }
                        console.log(`[enviarMensajeInterno V2] WHATSAPP: Enviando media ${i + 1}/${input.mediaItems!.length}, Tipo: '${media.tipo}', URL: ${media.url.substring(0, 50)}..., Caption: ${media.caption?.substring(0, 30)}`);
                        const mediaInput: EnviarMensajeWhatsAppApiInput = {
                            ...commonWhatsAppParams, tipoMensaje: media.tipo, mediaUrl: media.url,
                            caption: media.caption,
                            filename: media.tipo === 'document' ? (media.filename || "documento") : undefined,
                        };
                        const resultadoEnvioMedia = await enviarMensajeWhatsAppApiAction(mediaInput);
                        if (resultadoEnvioMedia.success) console.log(`[enviarMensajeInterno V2] WHATSAPP: Media ${i + 1} (${media.tipo}) enviado a ${input.destinatarioWaId}. MsgID: ${resultadoEnvioMedia.data}`);
                        else console.warn(`[enviarMensajeInterno V2] WHATSAPP: Fallo al enviar media ${i + 1} (${media.tipo}) a ${input.destinatarioWaId}. Error: ${resultadoEnvioMedia.error}, MediaInput:`, mediaInput);
                        if (input.mediaItems!.length > 1 && i < input.mediaItems!.length - 1) await new Promise(resolve => setTimeout(resolve, 900));
                    }
                } else {
                    console.log(`[enviarMensajeInterno V2] WHATSAPP: No hay media items válidos para enviar a ${input.destinatarioWaId}.`);
                }
            } else {
                console.error(`[enviarMensajeInterno V2] WHATSAPP: No token/asistente para PNID ${input.negocioPhoneNumberIdEnvia}.`);
            }
        } else {
            console.log(`[enviarMensajeInterno V2] No se enviará a WhatsApp. Condiciones no cumplidas. Canal: ${input.canalOriginal}, Rol: ${input.role}, TieneTexto: ${tieneTextoPrincipal}, TieneMedia: ${tieneMediaValida}`);
        }
        console.log(`[enviarMensajeInterno V2] Tarea (función ${input.nombreFuncionEjecutada || 'N/A'}) - FIN para conv ${input.conversacionId}. Duración: ${Date.now() - timestampInicio}ms`);
        return { success: true, data: interaccionPrincipalGuardada };
    } catch (error: unknown) {
        const errorMsg = error instanceof Error ? error.message : "Error desconocido al guardar/enviar mensaje interno.";
        console.error(`[enviarMensajeInterno V2] Error catastrófico para conv ${input.conversacionId}:`, error);
        return { success: false, error: errorMsg };
    }
}

async function actualizarTareaEjecutadaFallidaDispatcher(
    tareaEjecutadaId: string,
    mensajeError: string,
    metadataOriginal?: Record<string, unknown> | null
) {
    // ... (sin cambios respecto a la versión anterior que te di)
    console.warn(`[Dispatcher V2] Fallo en Tarea ${tareaEjecutadaId}. Error: ${mensajeError}. Metadata Original:`, metadataOriginal);
    try {
        let finalMetadata: Record<string, unknown> = {
            ...(metadataOriginal || {}),
            error_dispatcher: mensajeError,
            ejecucionDispatcherExitosa: false,
        };
        if (!metadataOriginal && tareaEjecutadaId) {
            const tareaActual = await prisma.tareaEjecutada.findUnique({
                where: { id: tareaEjecutadaId },
                select: { metadata: true }
            });
            if (tareaActual?.metadata) {
                let parsedExistingMetadata = {};
                if (typeof tareaActual.metadata === 'string') {
                    try { parsedExistingMetadata = JSON.parse(tareaActual.metadata); } catch (e) {
                        console.error(`[Dispatcher V2] Error parseando metadata (string) para Tarea ${tareaEjecutadaId} en fallo:`, e);
                    }
                } else if (typeof tareaActual.metadata === 'object' && tareaActual.metadata !== null) {
                    parsedExistingMetadata = tareaActual.metadata as Record<string, unknown>;
                }
                finalMetadata = { ...parsedExistingMetadata, ...finalMetadata };
            }
        }
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: JSON.stringify(finalMetadata) }
        });
    } catch (updateError) {
        console.error(`[Dispatcher V2] Error crítico al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}

export async function dispatchTareaEjecutadaAction(
    tareaEjecutadaId: string
): Promise<ActionResult<null>> {
    const timestampInicio = Date.now();
    console.log(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - INICIO.`);
    let metadataObj: Record<string, unknown> = {};

    try {
        // ... (Validación de TareaEjecutada y metadata igual que antes)
        const tareaEjecutada = await prisma.tareaEjecutada.findUnique({ where: { id: tareaEjecutadaId } });
        if (!tareaEjecutada) { /* ... manejo de error ... */ console.error(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - NO ENCONTRADA.`); return { success: false, error: `TareaEjecutada con ID ${tareaEjecutadaId} no encontrada.` }; }
        if (!tareaEjecutada.metadata) { /* ... manejo de error ... */ console.error(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - SIN METADATOS.`); await prisma.tareaEjecutada.update({ where: { id: tareaEjecutadaId }, data: { metadata: JSON.stringify({ error_dispatcher: "Metadatos faltantes.", ejecucionDispatcherExitosa: false }) } }); return { success: false, error: "Metadatos no encontrados." }; }
        if (typeof tareaEjecutada.metadata === 'string') {
            try { metadataObj = JSON.parse(tareaEjecutada.metadata); } catch (e) { /* ... manejo de error ... */ console.error(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - ERROR PARSEANDO METADATA:`, e); await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Error al parsear metadata.", null); return { success: false, error: "Error al parsear metadatos." }; }
        } else if (typeof tareaEjecutada.metadata === 'object' && tareaEjecutada.metadata !== null) {
            metadataObj = tareaEjecutada.metadata as Record<string, unknown>;
        } else { /* ... manejo de error ... */ console.error(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - METADATA EN FORMATO INESPERADO.`); await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Metadata en formato inesperado.", null); return { success: false, error: "Metadatos en formato inesperado." }; }

        console.log(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - Metadata parseada (primeros 500 chars):`, JSON.stringify(metadataObj, null, 2).substring(0, 500) + "...");

        const { funcionLlamada, argumentos: argsFromIA, conversacionId, leadId, asistenteVirtualId, canalNombre, destinatarioWaId, negocioPhoneNumberIdEnvia } = metadataObj;
        if (typeof funcionLlamada !== 'string' || typeof argsFromIA === 'undefined' || typeof conversacionId !== 'string' || typeof asistenteVirtualId !== 'string' || typeof leadId !== 'string') {
            const errorMsg = "Metadata incompleta o con tipos incorrectos."; console.error(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - ${errorMsg}`); await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, errorMsg, metadataObj); return { success: false, error: errorMsg };
        }

        let resultadoEjecucionDeFuncion: ActionResult<unknown> | null = null;
        let mensajePrincipalParaUsuario: string | null = null;
        let mediaItemsParaEnviar: MediaItem[] | null = null;
        let datosAdicionalesParaInteraccion: Record<string, unknown> | string | null = null;

        console.log(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - Despachando función: "${funcionLlamada}" para conv "${conversacionId}"`);
        const asistenteDb = await prisma.asistenteVirtual.findUnique({ where: { id: asistenteVirtualId }, include: { negocio: { include: { AgendaConfiguracion: true, cliente: { select: { stripeCustomerId: true, email: true } } } } } });
        if (!asistenteDb?.negocioId || !asistenteDb.negocio) { /* ... manejo de error ... */ mensajePrincipalParaUsuario = "Error: Configuración de negocio no encontrada."; console.error(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - ${mensajePrincipalParaUsuario}`); await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajePrincipalParaUsuario, metadataObj);
        } else {
            const commonArgsParaFunciones = { negocioId: asistenteDb.negocioId, asistenteId: asistenteVirtualId, leadId: leadId, canalNombre: typeof canalNombre === 'string' ? canalNombre : undefined };
            console.log(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - CommonArgs:`, commonArgsParaFunciones, "ArgsFromIA:", argsFromIA);

            try {
                switch (funcionLlamada) {
                    // ... (todos los cases como estaban, solo me aseguro que la asignación a mediaItemsParaEnviar sea correcta)
                    case 'mostrarDetalleOferta': {
                        const parsedArgs = MostrarDetalleOfertaArgsSchema.parse({ ...commonArgsParaFunciones, ...(argsFromIA as object) });
                        console.log(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - Args parseados para mostrarDetalleOferta:`, parsedArgs);
                        resultadoEjecucionDeFuncion = await ejecutarMostrarDetalleOfertaAction(parsedArgs, tareaEjecutadaId);

                        // Loguear el resultado COMPLETO de ejecutarMostrarDetalleOfertaAction
                        console.log(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - Resultado COMPLETO de ejecutarMostrarDetalleOfertaAction:`, JSON.stringify(resultadoEjecucionDeFuncion, (key, value) => typeof value === 'string' && value.length > 100 ? value.substring(0, 100) + "..." : value, 2));

                        if (resultadoEjecucionDeFuncion.success && resultadoEjecucionDeFuncion.data) {
                            const dataResultado = resultadoEjecucionDeFuncion.data as MostrarDetalleOfertaData;
                            mensajePrincipalParaUsuario = dataResultado.mensajeRespuesta;

                            // ASIGNACIÓN CRÍTICA:
                            mediaItemsParaEnviar = dataResultado.mediaItems; // Esto puede ser null si la función lo retorna así

                            console.log(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - De mostrarDetalleOferta: Mensaje="${mensajePrincipalParaUsuario?.substring(0, 50)}...", MediaItems RECIBIDOS POR DISPATCHER (cantidad: ${mediaItemsParaEnviar?.length || 0})`);

                            if (mediaItemsParaEnviar && mediaItemsParaEnviar.length > 0) {
                                console.log(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - Contenido de MediaItems RECIBIDOS POR DISPATCHER:`, JSON.stringify(mediaItemsParaEnviar.map(m => ({ tipo: m.tipo, url: m.url.substring(0, 40) + "..." })), null, 2));
                            }

                            datosAdicionalesParaInteraccion = { ofertaId: dataResultado.ofertaEncontrada?.id, nombreOferta: dataResultado.ofertaEncontrada?.nombre };

                        } else {
                            mensajePrincipalParaUsuario = resultadoEjecucionDeFuncion.error || 'No pude obtener los detalles de la oferta solicitada.';
                            console.warn(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - Error en ejecutarMostrarDetalleOfertaAction: ${resultadoEjecucionDeFuncion.error}`);
                        }
                        break;
                    }
                    // ... otros cases ...
                    default:
                        console.warn(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - Función desconocida: "${funcionLlamada}"`);
                        mensajePrincipalParaUsuario = `Acción '${funcionLlamada}' procesándose.`;
                        break;
                }
            } catch (error: unknown) { /* ... manejo de error Zod/ejecución ... */
                console.error(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - Error en Zod/ejecución para "${funcionLlamada}":`, error);
                if (error instanceof z.ZodError) {
                    mensajePrincipalParaUsuario = `Problema con datos para ${funcionLlamada}.`; console.error(`[Dispatcher V2] ZodError ${funcionLlamada}:`, error.flatten().fieldErrors);
                } else if (error instanceof Error) {
                    mensajePrincipalParaUsuario = `Error procesando ${funcionLlamada}: ${error.message}`;
                } else { mensajePrincipalParaUsuario = `Error inesperado procesando ${funcionLlamada}.`; }
                await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, `Error en case ${funcionLlamada}: ${mensajePrincipalParaUsuario}`, metadataObj);
            }
        }

        if (mensajePrincipalParaUsuario || (mediaItemsParaEnviar && mediaItemsParaEnviar.length > 0)) {
            console.log(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - Preparando para enviar a enviarMensajeInterno. Mensaje (100char): "${mensajePrincipalParaUsuario?.substring(0, 100)}...", Media Count: ${mediaItemsParaEnviar?.length || 0}`);
            await enviarMensajeInternoYWhatsAppAction({
                conversacionId: conversacionId,
                mensajePrincipal: mensajePrincipalParaUsuario,
                role: 'assistant',
                nombreFuncionEjecutada: funcionLlamada,
                canalOriginal: typeof canalNombre === 'string' ? canalNombre : undefined,
                destinatarioWaId: typeof destinatarioWaId === 'string' ? destinatarioWaId : undefined,
                negocioPhoneNumberIdEnvia: typeof negocioPhoneNumberIdEnvia === 'string' ? negocioPhoneNumberIdEnvia : undefined,
                mediaItems: mediaItemsParaEnviar, // Pasa mediaItemsParaEnviar (puede ser null)
                datosFuncionParaInteraccion: datosAdicionalesParaInteraccion,
            });
        } else {
            console.warn(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - No se generó mensaje ni media para función "${funcionLlamada}".`);
        }
        console.log(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - FIN. Duración: ${Date.now() - timestampInicio}ms`);
        return { success: true, data: null };
    } catch (error: unknown) { /* ... manejo de error catastrófico ... */
        const errorMsg = error instanceof Error ? error.message : "Error catastrófico en dispatcher."; console.error(`[Dispatcher V2] Tarea ${tareaEjecutadaId} - ERROR CATASTRÓFICO:`, error); if (tareaEjecutadaId) { await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, `Error catastrófico dispatcher: ${errorMsg}`, metadataObj); } return { success: false, error: errorMsg };
    }
}