// Ruta: app/admin/_lib/ia/funcionesEjecucion.actions.ts
'use server';

import prisma from '../prismaClient';
import { ActionResult } from '../types';
// Importar ChatMessageItemSchema y ChatMessageItem desde ia.schemas.ts
// Este schema DEBE estar actualizado para usar mensajeTexto y los campos estructurados.
import { ChatMessageItemSchema, type ChatMessageItem } from './ia.schemas';
import { InteraccionParteTipo, Prisma, ChangedByType } from '@prisma/client';

// Importar la acción de envío de WhatsApp
import { enviarMensajeWhatsAppApiAction } from '../actions/whatsapp/whatsapp.actions'; // Ajusta la ruta si es necesario

// Importaciones de TODAS tus funciones de ejecución específicas y sus schemas Zod
import { type BrindarInfoData, BrindarInfoArgsSchema } from '../funciones/brindarInformacionDelNegocio.schemas';
import { ejecutarBrindarInfoNegocioAction } from '../funciones/brindarInformacionDelNegocio.actions';

import { type InformarHorarioData, InformarHorarioArgsSchema } from '../funciones/informarHorarioDeAtencion.schemas';
import { ejecutarInformarHorarioAction } from '../funciones/informarHorarioDeAtencion.actions';

import { type DarDireccionData, DarDireccionArgsSchema } from '../funciones/darDireccionYUbicacion.schemas';
import { ejecutarDarDireccionAction } from '../funciones/darDireccionYUbicacion.actions';

import { type MostrarOfertasData, MostrarOfertasArgsSchema } from '../funciones/mostrarOfertas.schemas';
import { ejecutarMostrarOfertasAction } from '../funciones/mostrarOfertas.actions';

import { type MostrarDetalleOfertaData, MostrarDetalleOfertaArgsSchema } from '../funciones/mostrarDetalleOferta.schemas';
import { ejecutarMostrarDetalleOfertaAction } from '../funciones/mostrarDetalleOferta.actions';

import { type AceptarOfertaData, AceptarOfertaArgsSchema } from '../funciones/aceptarOferta.schemas';
import { ejecutarAceptarOfertaAction } from '../funciones/aceptarOferta.actions';

import { type ConfiguracionAgendaDelNegocio, AgendarCitaArgsSchema } from '../funciones/agendarCita.schemas';
import { ejecutarAgendarCitaAction } from '../funciones/agendarCita.actions';

import { ListarServiciosAgendaArgsSchema } from '../funciones/listarServiciosAgenda.schemas';
import { ejecutarListarServiciosAgendaAction } from '../funciones/listarServiciosAgenda.actions';

import { ListarHorariosDisponiblesArgsSchema } from '../funciones/listarHorariosDisponiblesAgenda.schemas';
import { ejecutarListarHorariosDisponiblesAction } from '../funciones/listarHorariosDisponiblesAgenda.actions';

import { CancelarCitaArgsSchema } from '../funciones/cancelarCita.schemas';
import { ejecutarCancelarCitaAction } from '../funciones/cancelarCita.actions';

import { ReagendarCitaArgsSchema } from '../funciones/reagendarCita.schemas';
import { ejecutarReagendarCitaAction } from '../funciones/reagendarCita.actions';

import { type ProcesarPagoConStripeData, ProcesarPagoConStripeArgsSchema } from '../funciones/procesarPagoConStripe.schemas';
import { ejecutarProcesarPagoConStripeAction } from '../funciones/procesarPagoConStripe.actions';

import type { EnviarMensajeWhatsAppApiInput } from '../actions/whatsapp/whatsapp.schemas';

// --- Definición del tipo para la media ---
interface MediaPayload {
    tipo: 'image' | 'video' | 'document' | 'audio';
    url: string;
    filename?: string; // Para documentos
    // El caption vendrá del input.mensaje principal
}

async function enviarMensajeInternoAction(input: {
    conversacionId: string;
    mensaje: string;
    role: 'assistant' | 'system';
    nombreFuncionEjecutada?: string;
    canalOriginal?: string | null;
    destinatarioWaId?: string | null;
    negocioPhoneNumberIdEnvia?: string | null;
    media?: MediaPayload | null; // NUEVO: Para enviar media
}): Promise<ActionResult<ChatMessageItem>> {

    console.log("[enviarMensajeInternoAction] INICIO. Input:", {
        conversacionId: input.conversacionId,
        role: input.role,
        mensajeLength: input.mensaje?.length,
        canalOriginal: input.canalOriginal,
        nombreFuncionEjecutada: input.nombreFuncionEjecutada,
        mediaType: input.media?.tipo
    });

    try {
        if (!input.conversacionId || !input.role) { // Mensaje puede ser vacío si solo se envía media con caption
            return { success: false, error: 'Faltan datos para enviar el mensaje interno (conversacionId, role).' };
        }
        if (!input.mensaje && !input.media) { // Debe haber o texto o media
            return { success: false, error: 'Se requiere un mensaje de texto o datos de media para enviar.' };
        }

        const dataToCreate: Prisma.InteraccionCreateInput = {
            conversacion: { connect: { id: input.conversacionId } },
            role: input.role,
            mensajeTexto: input.mensaje || null, // Guardar el caption o texto
            parteTipo: InteraccionParteTipo.TEXT, // Default, se cambiará si hay media o es F_R
            mediaUrl: input.media?.url || null,
            mediaType: input.media?.tipo || null,
        };

        if (input.role === 'assistant' && input.nombreFuncionEjecutada) {
            dataToCreate.parteTipo = InteraccionParteTipo.FUNCTION_RESPONSE;
            dataToCreate.functionCallNombre = input.nombreFuncionEjecutada;
            dataToCreate.functionResponseData = { content: input.mensaje, media: input.media } as Prisma.InputJsonValue; // Guardar media también
            console.log(`[enviarMensajeInternoAction] Marcando como FUNCTION_RESPONSE para: ${input.nombreFuncionEjecutada}`);
        } else if (input.media) {
            // Si no es una FUNCTION_RESPONSE pero tiene media, el parteTipo podría ser TEXT
            // y la UI interpretaría mediaUrl/mediaType. O podrías tener un parteTipo específico para media.
            // Por ahora, si hay media, el mensajeTexto actúa como caption.
        }

        const nuevaInteraccion = await prisma.interaccion.create({
            data: dataToCreate,
            select: {
                id: true, conversacionId: true, role: true, mensajeTexto: true,
                parteTipo: true, functionCallNombre: true, functionCallArgs: true,
                functionResponseData: true, functionResponseNombre: true,
                mediaUrl: true, mediaType: true, createdAt: true,
                agenteCrm: { select: { id: true, nombre: true } },
            }
        });
        console.log(`[enviarMensajeInternoAction] Interacción guardada en DB. ID: ${nuevaInteraccion.id}, ParteTipo: ${nuevaInteraccion.parteTipo}`);

        await prisma.conversacion.update({
            where: { id: input.conversacionId },
            data: { updatedAt: new Date() }
        });

        //! -- WHATSAPP
        if (input.canalOriginal?.toLowerCase() === 'whatsapp' &&
            input.destinatarioWaId &&
            input.negocioPhoneNumberIdEnvia &&
            input.role === 'assistant' &&
            (input.mensaje || input.media)
        ) {
            console.log(`[enviarMensajeInternoAction] DETECTADO CANAL WHATSAPP. Intentando enviar respuesta a ${input.destinatarioWaId} desde ${input.negocioPhoneNumberIdEnvia}. Mensaje: "${input.mensaje.substring(0, 70)}..."`);

            const asistente = await prisma.asistenteVirtual.findFirst({
                where: { phoneNumberId: input.negocioPhoneNumberIdEnvia, status: 'activo' },
                select: { token: true, id: true }
            });

            if (asistente?.token) {
                console.log(`[enviarMensajeInternoAction] Token encontrado para Asistente ID: ${asistente.id} (PNID ${input.negocioPhoneNumberIdEnvia}). Procediendo a enviar.`);

                const commonWhatsAppParams = {
                    destinatarioWaId: input.destinatarioWaId,
                    negocioPhoneNumberIdEnvia: input.negocioPhoneNumberIdEnvia,
                    tokenAccesoAsistente: asistente.token,
                };

                if (input.media) { // Si hay media, enviar la media (el mensaje de input.mensaje será el caption)
                    const mediaInput: EnviarMensajeWhatsAppApiInput = {
                        ...commonWhatsAppParams,
                        tipoMensaje: input.media.tipo,
                        mediaUrl: input.media.url,
                        caption: input.mensaje || undefined, // input.mensaje es el caption
                        filename: input.media.tipo === 'document' ? input.media.filename : undefined,
                    };
                    await enviarMensajeWhatsAppApiAction(mediaInput);
                    // Si hay un mensaje de texto ADICIONAL al caption de la media que deba ir separado,
                    // se necesitaría una segunda llamada o una lógica más compleja.
                    // Por ahora, si hay media, input.mensaje es el caption.
                } else if (input.mensaje) { // Si no hay media, pero sí hay mensaje de texto
                    await enviarMensajeWhatsAppApiAction({
                        ...commonWhatsAppParams,
                        tipoMensaje: 'text',
                        mensajeTexto: input.mensaje,
                    });
                }
            } else {
                console.error(`[enviarMensajeInternoAction] No se encontró token para PNID ${input.negocioPhoneNumberIdEnvia} o asistente inactivo. No se pudo enviar mensaje a WhatsApp.`);
            }
            //! -- WEBCHAT
        } else {
            console.log(`[enviarMensajeInternoAction] NO SE CUMPLE CONDICIÓN para enviar a WhatsApp. Detalles:`, {
                canalOriginal: input.canalOriginal,
                destinatarioWaId: input.destinatarioWaId,
                negocioPhoneNumberIdEnvia: input.negocioPhoneNumberIdEnvia,
                role: input.role,
                mensajeNoVacio: !!input.mensaje
            });
        }

        const dataToParse = {
            ...nuevaInteraccion,
            // Si ChatMessageItemSchema en ia.schemas.ts espera 'mensaje', mapear mensajeTexto.
            // Si ya usa 'mensajeTexto', este mapeo no es necesario.
            // mensaje: nuevaInteraccion.mensajeTexto, 
            functionCallArgs: nuevaInteraccion.functionCallArgs ? nuevaInteraccion.functionCallArgs as Record<string, unknown> : null,
            functionResponseData: nuevaInteraccion.functionResponseData ? nuevaInteraccion.functionResponseData as Record<string, unknown> : null,
        };

        const parsedData = ChatMessageItemSchema.safeParse(dataToParse);
        if (!parsedData.success) {
            console.error("[enviarMensajeInternoAction] Error Zod al parsear nueva interaccion:", parsedData.error.flatten().fieldErrors);
            console.error("Datos que fallaron el parseo en enviarMensajeInternoAction:", JSON.stringify(dataToParse, null, 2));
            return { success: false, error: "Error al procesar mensaje interno para Zod." };
        }
        console.log("[enviarMensajeInternoAction] FIN. Retornando éxito.");
        return { success: true, data: parsedData.data };

    } catch (error) {
        console.error(`[Mensaje Interno] Error catastrófico al guardar/enviar mensaje ${input.role} para conv ${input.conversacionId}:`, error);
        return { success: false, error: 'No se pudo guardar/enviar el mensaje interno.' };
    }
}

export async function dispatchTareaEjecutadaAction(
    tareaEjecutadaId: string
): Promise<ActionResult<null>> {
    console.log(`[Dispatcher] Iniciando despacho para TareaEjecutada ${tareaEjecutadaId}`);
    let tareaEjecutada;
    try {
        tareaEjecutada = await prisma.tareaEjecutada.findUnique({ where: { id: tareaEjecutadaId } });
        if (!tareaEjecutada || !tareaEjecutada.metadata) {
            console.error(`[Dispatcher] TareaEjecutada ${tareaEjecutadaId} no encontrada o sin metadatos.`);
            return { success: false, error: "Tarea o metadatos no encontrados." };
        }

        const metadataObj = JSON.parse(tareaEjecutada.metadata as string) as Record<string, unknown>;
        console.log(`[Dispatcher] Metadata parseada para TareaEjecutada ${tareaEjecutadaId}:`, metadataObj);

        const {
            funcionLlamada,
            argumentos,
            conversacionId,
            leadId,
            asistenteVirtualId,
            canalNombre,
            destinatarioWaId,
            negocioPhoneNumberIdEnvia
        } = metadataObj;

        if (!funcionLlamada || typeof argumentos === 'undefined' || !conversacionId || !asistenteVirtualId || !leadId) { // leadId es importante
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Metadata incompleta para despachar (faltan campos esenciales).");
            return { success: false, error: "Faltan datos en metadatos de tarea." };
        }

        let resultadoEjecucion: ActionResult<unknown> | null = null;
        let mensajeResultadoParaUsuario: string | null = null;

        console.log(`[Dispatcher] Despachando función: ${funcionLlamada} para conv ${conversacionId}`);

        const asistenteDb = await prisma.asistenteVirtual.findUnique({
            where: { id: String(asistenteVirtualId) },
            select: {
                negocioId: true,
                negocio: { select: { AgendaConfiguracion: true, id: true, clienteId: true } } // Incluir id y clienteId del negocio
            }
        });

        if (!asistenteDb?.negocioId) {
            mensajeResultadoParaUsuario = "Error interno: No se pudo encontrar el negocio asociado al asistente.";
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
        } else {
            // Todos los argumentos de las funciones de ejecución ahora incluyen negocioId
            // y otros datos de contexto si son necesarios, pasados desde aquí.
            const commonArgs = {
                negocioId: asistenteDb.negocioId,
                asistenteId: asistenteVirtualId, // Renombrado para claridad, antes era asistenteVirtualId
                leadId: leadId,
                canalNombre: canalNombre,
                // Los argumentos específicos de Gemini se fusionan con ...argumentos
            };

            switch (funcionLlamada) {
                case 'brindarInformacionDelNegocio':
                    const argsInfo = BrindarInfoArgsSchema.parse({ ...commonArgs, ...argumentos });
                    resultadoEjecucion = await ejecutarBrindarInfoNegocioAction(argsInfo, tareaEjecutadaId);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) mensajeResultadoParaUsuario = (resultadoEjecucion.data as BrindarInfoData).informacionEncontrada;
                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error obteniendo info.';
                    break;
                case 'informarHorarioDeAtencion':
                    const argsHorario = InformarHorarioArgsSchema.parse({ ...commonArgs, ...argumentos });
                    resultadoEjecucion = await ejecutarInformarHorarioAction(argsHorario, tareaEjecutadaId);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) mensajeResultadoParaUsuario = (resultadoEjecucion.data as InformarHorarioData).respuestaHorario;
                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error obteniendo horario.';
                    break;
                case 'darDireccionYUbicacion':
                    const argsDir = DarDireccionArgsSchema.parse({ ...commonArgs, ...argumentos });
                    resultadoEjecucion = await ejecutarDarDireccionAction(argsDir, tareaEjecutadaId);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) mensajeResultadoParaUsuario = (resultadoEjecucion.data as DarDireccionData).mensajeRespuesta;
                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error obteniendo dirección.';
                    break;
                case 'mostrarOfertas':
                    const argsOfertas = MostrarOfertasArgsSchema.parse({ ...commonArgs, ...argumentos });
                    resultadoEjecucion = await ejecutarMostrarOfertasAction(argsOfertas, tareaEjecutadaId);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) mensajeResultadoParaUsuario = (resultadoEjecucion.data as MostrarOfertasData).mensajeRespuesta;
                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error mostrando ofertas.';
                    break;
                case 'mostrarDetalleOferta':

                    const argsDetalleO = MostrarDetalleOfertaArgsSchema.parse({
                        ...commonArgs,
                        ...argumentos,
                        negocioId: asistenteDb.negocioId,
                        canalNombre
                    });
                    resultadoEjecucion = await ejecutarMostrarDetalleOfertaAction(argsDetalleO, tareaEjecutadaId);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) {
                        const data = resultadoEjecucion.data as MostrarDetalleOfertaData;
                        mensajeResultadoParaUsuario = data.mensajeRespuesta;
                        // ASUMIMOS que MostrarDetalleOfertaData ahora puede devolver un array de media
                        // y tomamos la primera imagen si existe.
                        if (data.media && data.media.length > 0 && data.media[0].tipo === 'image') {
                            mediaParaEnviar = {
                                tipo: 'image',
                                url: data.media[0].url,
                                // El caption será mensajeResultadoParaUsuario
                            };
                            // Si quieres que el mensaje principal sea solo el caption de la primera imagen:
                            // mensajeResultadoParaUsuario = data.media[0].caption || data.mensajeRespuesta;
                        }
                    } else {
                        mensajeResultadoParaUsuario = (resultadoEjecucion.data as MostrarDetalleOfertaData).mensajeRespuesta;
                    }







                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error mostrando detalle oferta.';
                    break;
                case 'aceptarOferta':
                    const argsAceptarO = AceptarOfertaArgsSchema.parse({ ...commonArgs, ...argumentos });
                    resultadoEjecucion = await ejecutarAceptarOfertaAction(argsAceptarO, tareaEjecutadaId);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) mensajeResultadoParaUsuario = (resultadoEjecucion.data as AceptarOfertaData).mensajeSiguientePaso;
                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error aceptando oferta.';
                    break;
                case 'agendarCita':
                    if (!asistenteDb.negocio?.AgendaConfiguracion) {
                        mensajeResultadoParaUsuario = "Error interno: Configuración de agenda no encontrada.";
                        await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                        break;
                    }
                    const configAgenda: ConfiguracionAgendaDelNegocio = {
                        negocioId: asistenteDb.negocioId,
                        aceptaCitasVirtuales: asistenteDb.negocio.AgendaConfiguracion.aceptaCitasVirtuales,
                        aceptaCitasPresenciales: asistenteDb.negocio.AgendaConfiguracion.aceptaCitasPresenciales,
                        requiereEmail: asistenteDb.negocio.AgendaConfiguracion.requiereEmailParaCita,
                        requiereTelefono: asistenteDb.negocio.AgendaConfiguracion.requiereTelefonoParaCita,
                        requiereNombre: asistenteDb.negocio.AgendaConfiguracion.requiereNombreParaCita ?? true,
                        bufferMinutos: asistenteDb.negocio.AgendaConfiguracion.bufferMinutos ?? 0,
                    };
                    const actor = { type: ChangedByType.ASSISTANT, id: typeof asistenteVirtualId === 'string' ? asistenteVirtualId : String(asistenteVirtualId) };
                    const argsAgendar = AgendarCitaArgsSchema.parse({ ...commonArgs, ...argumentos });
                    resultadoEjecucion = await ejecutarAgendarCitaAction(argsAgendar, tareaEjecutadaId, configAgenda, actor);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) mensajeResultadoParaUsuario = (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario;
                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error agendando cita.';
                    break;
                case 'listarServiciosAgenda':
                    const argsListarS = ListarServiciosAgendaArgsSchema.parse({ ...commonArgs, ...argumentos });
                    resultadoEjecucion = await ejecutarListarServiciosAgendaAction(argsListarS, tareaEjecutadaId);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) mensajeResultadoParaUsuario = (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario;
                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error listando servicios.';
                    break;
                case 'listarHorariosDisponiblesAgenda':
                    if (!asistenteDb.negocio?.AgendaConfiguracion) { /* ... error ... */ break; }
                    const configAgendaListarH: ConfiguracionAgendaDelNegocio = { /* ... como en agendarCita ... */
                        negocioId: asistenteDb.negocioId,
                        aceptaCitasVirtuales: asistenteDb.negocio.AgendaConfiguracion.aceptaCitasVirtuales,
                        aceptaCitasPresenciales: asistenteDb.negocio.AgendaConfiguracion.aceptaCitasPresenciales,
                        requiereEmail: asistenteDb.negocio.AgendaConfiguracion.requiereEmailParaCita,
                        requiereTelefono: asistenteDb.negocio.AgendaConfiguracion.requiereTelefonoParaCita,
                        requiereNombre: asistenteDb.negocio.AgendaConfiguracion.requiereNombreParaCita ?? true,
                        bufferMinutos: asistenteDb.negocio.AgendaConfiguracion.bufferMinutos ?? 0,
                    };
                    const argsListarH = ListarHorariosDisponiblesArgsSchema.parse({ ...commonArgs, ...argumentos });
                    resultadoEjecucion = await ejecutarListarHorariosDisponiblesAction(argsListarH, tareaEjecutadaId, configAgendaListarH);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) mensajeResultadoParaUsuario = (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario;
                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error listando horarios.';
                    break;
                case 'cancelarCita':
                    const argsCancelar = CancelarCitaArgsSchema.parse({ ...commonArgs, ...argumentos });
                    resultadoEjecucion = await ejecutarCancelarCitaAction(argsCancelar, tareaEjecutadaId);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) mensajeResultadoParaUsuario = (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario;
                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error cancelando cita.';
                    break;
                case 'reagendarCita':
                    if (!asistenteDb.negocio?.AgendaConfiguracion) { /* ... error ... */ break; }
                    const configAgendaReagendar: ConfiguracionAgendaDelNegocio = { /* ... como en agendarCita ... */
                        negocioId: asistenteDb.negocioId,
                        aceptaCitasVirtuales: asistenteDb.negocio.AgendaConfiguracion.aceptaCitasVirtuales,
                        aceptaCitasPresenciales: asistenteDb.negocio.AgendaConfiguracion.aceptaCitasPresenciales,
                        requiereEmail: asistenteDb.negocio.AgendaConfiguracion.requiereEmailParaCita,
                        requiereTelefono: asistenteDb.negocio.AgendaConfiguracion.requiereTelefonoParaCita,
                        requiereNombre: asistenteDb.negocio.AgendaConfiguracion.requiereNombreParaCita ?? true,
                        bufferMinutos: asistenteDb.negocio.AgendaConfiguracion.bufferMinutos ?? 0,
                    };
                    const actorReagendar = { type: ChangedByType.ASSISTANT, id: typeof asistenteVirtualId === 'string' ? asistenteVirtualId : String(asistenteVirtualId) };
                    const argsReagendar = ReagendarCitaArgsSchema.parse({ ...commonArgs, ...argumentos });
                    resultadoEjecucion = await ejecutarReagendarCitaAction(argsReagendar, tareaEjecutadaId, configAgendaReagendar, actorReagendar);
                    if (resultadoEjecucion.success && resultadoEjecucion.data) mensajeResultadoParaUsuario = (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario;
                    else mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Error reagendando cita.';
                    break;
                case 'procesarPagoConStripe':
                    let clienteStripeId: string | null = null;
                    let emailDelClienteParaPago: string | undefined = undefined;

                    // 1. Obtener el clienteId del negocio
                    const clienteIdDelNegocio = asistenteDb.negocio ? asistenteDb.negocio.clienteId : undefined;

                    if (clienteIdDelNegocio) {
                        const clienteDelNegocio = await prisma.cliente.findUnique({
                            where: { id: clienteIdDelNegocio },
                            select: { stripeCustomerId: true, email: true }
                        });
                        if (clienteDelNegocio) {
                            clienteStripeId = clienteDelNegocio.stripeCustomerId;
                            emailDelClienteParaPago = clienteDelNegocio.email || undefined; // Email del Cliente como fallback
                        }
                    }

                    // 2. Intentar obtener un email más específico del Lead (si existe)
                    if (leadId) {
                        const leadParaPago = await prisma.lead.findUnique({
                            where: { id: typeof leadId === 'string' ? leadId : String(leadId) },
                            select: { email: true }
                        });
                        if (leadParaPago?.email) {
                            emailDelClienteParaPago = leadParaPago.email; // Priorizar email del Lead
                        }
                    }

                    const argsPago = ProcesarPagoConStripeArgsSchema.parse({
                        ...commonArgs,
                        ...argumentos,
                        emailClienteFinal: emailDelClienteParaPago,
                        clienteFinalIdStripe: clienteStripeId // Este es el Customer ID de Stripe del Cliente dueño del Negocio
                    });
                    resultadoEjecucion = await ejecutarProcesarPagoConStripeAction(argsPago, tareaEjecutadaId);
                    if (resultadoEjecucion.success && (resultadoEjecucion.data as ProcesarPagoConStripeData)?.mensajeParaUsuario) {
                        mensajeResultadoParaUsuario = (resultadoEjecucion.data as ProcesarPagoConStripeData).mensajeParaUsuario;
                    } else {
                        mensajeResultadoParaUsuario = (resultadoEjecucion.data as ProcesarPagoConStripeData)?.mensajeParaUsuario || resultadoEjecucion.error || "Error al procesar el pago.";
                    }
                    break;
                default:
                    console.warn(`[Dispatcher] Función desconocida o sin case explícito: ${funcionLlamada}`);
                    mensajeResultadoParaUsuario = `La acción '${funcionLlamada}' se está procesando. Un momento por favor.`;
                    break;
            }
        }

        if (mensajeResultadoParaUsuario) {
            console.log(`[Dispatcher] Preparando para enviar mensaje interno para ${funcionLlamada}. Canal: ${canalNombre}. WAID: ${destinatarioWaId}`);
            await enviarMensajeInternoAction({
                conversacionId: String(conversacionId),
                mensaje: mensajeResultadoParaUsuario,
                role: 'assistant',
                nombreFuncionEjecutada: String(funcionLlamada),
                canalOriginal: typeof canalNombre === 'string' ? canalNombre : canalNombre == null ? null : String(canalNombre),
                destinatarioWaId: typeof destinatarioWaId === 'string' ? destinatarioWaId : destinatarioWaId == null ? null : String(destinatarioWaId),
                negocioPhoneNumberIdEnvia: typeof negocioPhoneNumberIdEnvia === 'string' ? negocioPhoneNumberIdEnvia : negocioPhoneNumberIdEnvia == null ? null : String(negocioPhoneNumberIdEnvia)
            });
        } else {
            console.log(`[Dispatcher] No se generó mensaje de resultado para TareaEjecutada ${tareaEjecutadaId} (función: ${funcionLlamada}). Puede ser una acción interna sin respuesta directa al usuario.`);
        }
        return { success: true, data: null };
    } catch (error: unknown) { // Capturar 'unknown' para acceder a error.issues si es ZodError
        console.error(`[Dispatcher] Error catastrófico para TareaEjecutada ${tareaEjecutadaId}:`, error);
        let errorMessage = "Error interno al despachar tarea.";
        // Intentar obtener el nombre de la función llamada desde tareaEjecutada si está disponible
        let funcionLlamadaCatch = "desconocida";
        try {
            if (typeof tareaEjecutada?.metadata === "string") {
                const meta = JSON.parse(tareaEjecutada.metadata);
                if (meta.funcionLlamada) funcionLlamadaCatch = String(meta.funcionLlamada);
            } else if (typeof tareaEjecutada?.metadata === "object" && tareaEjecutada?.metadata !== null) {
                const metadataObj = tareaEjecutada.metadata as Record<string, unknown>;
                if (typeof metadataObj.funcionLlamada === "string") funcionLlamadaCatch = metadataObj.funcionLlamada;
            }
        } catch { /* ignorar error de parseo */ }
        // Asegurarse de que error es ZodError antes de acceder a sus propiedades
        if (
            typeof error === "object" &&
            error !== null &&
            "flatten" in error &&
            typeof (error as import("zod").ZodError).flatten === "function"
        ) {
            // Se asume que es un ZodError
            const zodError = error as import("zod").ZodError;
            console.error("[Dispatcher] Error de validación Zod en argumentos de función:", zodError.flatten().fieldErrors);
            errorMessage = `Error en los datos para la función ${funcionLlamadaCatch}: ${JSON.stringify(zodError.flatten().fieldErrors)}`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        if (tareaEjecutadaId) await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, `Error de dispatcher: ${errorMessage}`);
        return { success: false, error: errorMessage };
    }
}

async function actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId: string, mensajeError: string) {
    try {
        const tareaActual = await prisma.tareaEjecutada.findUnique({
            where: { id: tareaEjecutadaId },
            select: { metadata: true }
        });
        let metadataActual: Record<string, unknown> = {};
        if (tareaActual?.metadata && typeof tareaActual.metadata === 'string') {
            try { metadataActual = JSON.parse(tareaActual.metadata); } catch (e) { console.warn("Error parseando metadata en TareaFallida:", e); }
        } else if (tareaActual?.metadata && typeof tareaActual.metadata === 'object') {
            metadataActual = tareaActual.metadata as Record<string, unknown>;
        }
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: JSON.stringify({ ...metadataActual, error_dispatcher: mensajeError, ejecucionExitosa: false }) }
        });
    } catch (updateError) {
        console.error(`[Dispatcher] Error al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}
