// app/admin/_lib/actions/whatsapp/whatsapp.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { InteraccionParteTipo, Prisma, TareaEnProgreso, EstadoTareaConversacional, Agenda, StatusAgenda } from '@prisma/client';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    ProcesarMensajeWhatsAppInputSchema,
    type ProcesarMensajeWhatsAppInput,
    type ProcesarMensajeWhatsAppOutput,
    EnviarMensajeWhatsAppApiInputSchema,
    type EnviarMensajeWhatsAppApiInput,
    type WhatsAppMessageInput
} from './whatsapp.schemas';
import { generarRespuestaAsistente } from '@/app/admin/_lib/ia/ia.actions';
import { enviarMensajeInternoYWhatsAppAction } from '../../dispatcher/funcionesEjecucion.helpers';
import { ejecutarListarServiciosDeCitasAction } from '../../funciones/citas/listarServiciosDeCitas/listarServiciosDeCitas.actions';

// Tipo específico para el objeto Asistente que se usa en el contexto.
type AsistenteContext = {
    id: string;
    nombre: string;
    negocio: {
        id: string;
        nombre: string;
        CRM: {
            id: string;
        } | null;
    } | null;
};

// Tipo para el objeto de contexto que se pasará a través de la FSM
type FsmContext = {
    conversacionId: string;
    leadId: string;
    asistente: AsistenteContext;
    mensaje: WhatsAppMessageInput;
    usuarioWaId: string;
    negocioPhoneNumberId: string;
};

// Tipos específicos para los contextos de cada tarea
type AgendarCitaContext = {
    servicioId?: string;
    servicioNombre?: string;
    fechaHora?: string;
    fechaParcial?: string; // Fecha parcial en formato ISO
};

type CancelarCitaContext = {
    citasEncontradas?: { id: string; asunto: string; fecha: Date }[];
    citaIdParaCancelar?: string;
};

type ReagendarCitaContext = {
    citasEncontradas?: { id: string; asunto: string; fecha: Date; tipoDeCitaId: string | null }[];
    citaOriginalId?: string;
    citaOriginalAsunto?: string;
    citaOriginalFecha?: Date;
    citaOriginalTipoDeCitaId?: string | null;
    nuevaFechaHora?: string;
    nuevaFechaParcial?: { año: number; mes: number; dia: number };
    fechaAmbiguoPasado?: string;
    preguntaConfirmacionHecha?: boolean;
};

// ===================================================================================
// PASO 1: PUNTO DE ENTRADA Y ORQUESTACIÓN PRINCIPAL
// ===================================================================================
export async function procesarMensajeWhatsAppEntranteAction(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    // PASO 1.1: Validación del Input
    console.log('[Paso 1.1] Validando el input del webhook:', input);
    const validation = ProcesarMensajeWhatsAppInputSchema.safeParse(input);
    if (!validation.success) {
        console.error('[ERROR en Paso 1.1] Datos de entrada inválidos:', validation.error.flatten().fieldErrors);
        return { success: false, error: "Datos de entrada inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }

    try {
        // PASO 1.2: Setup de la Conversación (Lead, Asistente, etc.)
        console.log('[Paso 1.2] Iniciando setup de la conversación.');
        const setup = await setupConversacion(validation.data);

        if (!setup.success) {
            console.error('[ERROR en Paso 1.2] El setup de la conversación falló:', setup.error);
            return {
                success: false,
                error: setup.error || "La configuración de la conversación falló.",
                errorDetails: setup.errorDetails
            };
        }
        console.log('[Paso 1.2] Setup de conversación completado con éxito.');

        // PASO 1.3: Cargar Tarea Activa (si existe) y Limpieza de Tareas Obsoletas
        let tareaActiva = null;
        if (setup.data) {
            tareaActiva = await prisma.tareaEnProgreso.findUnique({ where: { conversacionId: setup.data.conversacionId } });
        }

        // SOLUCIÓN "TAREA ZOMBIE": Si la tarea está inactiva por más de 15 minutos, la eliminamos.
        if (tareaActiva) {
            const AHORA = new Date();
            const ULTIMA_ACTUALIZACION = new Date(tareaActiva.updatedAt);
            const MINUTOS_INACTIVA = (AHORA.getTime() - ULTIMA_ACTUALIZACION.getTime()) / 60000;
            if (MINUTOS_INACTIVA > 15) {
                console.warn(`[LIMPIEZA] Tarea obsoleta encontrada (inactiva por ${MINUTOS_INACTIVA.toFixed(2)} min). Eliminando.`);
                await prisma.tareaEnProgreso.delete({ where: { id: tareaActiva.id } });
                tareaActiva = null; // La tratamos como si no existiera.
            }
        }

        console.log(`[Paso 1.3] ¿Tarea activa encontrada?: ${tareaActiva ? `Sí, ID: ${tareaActiva.id}, Estado: ${tareaActiva.estado}` : 'No'}`);

        // PASO 1.4: Enrutamiento al Gestor Adecuado
        if (tareaActiva) {
            console.log('[Paso 1.4] Enrutando al GESTOR DE TAREAS.');
            if (!setup.data) {
                return { success: false, error: "Datos de configuración de la conversación no disponibles." };
            }
            return await manejarTareaEnProgreso(tareaActiva, setup.data.mensaje, setup.data);
        } else {
            console.log('[Paso 1.4] Enrutando al GESTOR DE CONVERSACIÓN GENERAL.');
            return await manejarConversacionGeneral(setup.data!.mensaje, setup.data!);
        }

    } catch (error: unknown) {
        console.error('[WhatsApp Orquestador] Error en el procesamiento principal:', error);
        return { success: false, error: error instanceof Error ? error.message : 'Error interno al procesar mensaje.' };
    }
}

/**
 * ===================================================================================
 * PASO 2: GESTOR DE CONVERSACIÓN GENERAL (VERSIÓN FINAL ANTI-BUCLES)
 * ===================================================================================
 */
async function manejarConversacionGeneral(
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    console.log(`[Paso 2.1] Gestor General: Analizando mensaje de usuario.`);
    if (mensaje.type !== 'text') {
        return { success: true, data: null };
    }
    const mensajeTexto = mensaje.content.toLowerCase();
    let nombreTarea: string | null = null;

    const keywordsReagendar = ['reagendar', 'reagenda', 'cambiar', 'mover', 'modificar', 'reprogramar'];
    if (keywordsReagendar.some(kw => mensajeTexto.includes(kw))) {
        nombreTarea = 'reagendarCita';
    }

    const keywordsCancelar = ['cancela', 'cancelar', 'eliminar', 'borrar'];
    if (!nombreTarea && keywordsCancelar.some(kw => mensajeTexto.includes(kw))) {
        nombreTarea = 'cancelarCita';
    }

    const keywordsBuscar = ['que citas tengo', 'mis citas', 'ver mis citas', 'ver mi agenda', 'muéstrame mis citas'];
    if (!nombreTarea && keywordsBuscar.some(kw => mensajeTexto.includes(kw))) {
        nombreTarea = 'buscarCitas';
    }

    const keywordsAgendar = ['cita', 'agendar', 'reservar', 'reservación'];
    if (!nombreTarea && keywordsAgendar.some(kw => mensajeTexto.includes(kw))) {
        nombreTarea = 'agendarCita';
    }

    if (nombreTarea) {
        console.log(`[Paso 2.2] Intención de "${nombreTarea}" detectada. Creando nueva TareaEnProgreso.`);
        const nuevaTarea = await prisma.tareaEnProgreso.create({
            data: {
                conversacionId: contexto.conversacionId,
                nombreTarea: nombreTarea,
                contexto: {},
                estado: EstadoTareaConversacional.RECOLECTANDO_DATOS,
            }
        });

        console.log(`[Paso 2.3] Pasando control directamente al sub-gestor: ${nombreTarea}`);
        switch (nombreTarea) {
            case 'reagendarCita':
                return manejarReagendarCita(nuevaTarea, mensaje, contexto);
            case 'agendarCita':
                return manejarAgendarCita(nuevaTarea, mensaje, contexto);
            case 'cancelarCita':
                return manejarCancelarCita(nuevaTarea, mensaje, contexto);
            case 'buscarCitas':
                return manejarBuscarCitas(nuevaTarea, mensaje, contexto);
            default:
                await prisma.tareaEnProgreso.delete({ where: { id: nuevaTarea.id } });
                return { success: false, error: `Intención detectada pero sub-gestor para '${nombreTarea}' no implementado.` };
        }
    }

    console.log("[Paso 2.4] No se detectó intención de tarea. Pasando a charla general con IA (lógica no implementada).");
    return { success: true, data: null };
}

/**
 * ===================================================================================
 * PASO 3: GESTOR DE TAREAS EN PROGRESO (ACTUALIZADO CON "META-PREGUNTAS")
 * ===================================================================================
 */
async function manejarTareaEnProgreso(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const { conversacionId, leadId, usuarioWaId, negocioPhoneNumberId } = contexto;

    if (mensaje.type === 'text') {
        const textoUsuario = mensaje.content.toLowerCase();

        // MANEJO DE "META-PREGUNTAS" (sin interrumpir la tarea)
        const keywordsListarCitas = ['que citas tengo', 'mis citas', 'ver mis citas'];
        if (keywordsListarCitas.some(kw => textoUsuario.includes(kw))) {
            console.log(`[META-PREGUNTA] El usuario solicitó la lista de sus citas.`);
            const citasActivas = await prisma.agenda.findMany({
                where: { leadId, status: { in: [StatusAgenda.PENDIENTE] }, fecha: { gte: new Date() } },
                orderBy: { fecha: 'asc' }
            });
            if (citasActivas.length > 0) {
                let mensajeLista = "Claro, estas son tus próximas citas:\n";
                citasActivas.forEach(cita => {
                    const fechaLegible = new Date(cita.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                    mensajeLista += `\n- ${cita.asunto} para el ${fechaLegible}`;
                });
                await enviarMensajeAsistente(conversacionId, mensajeLista, usuarioWaId, negocioPhoneNumberId);
            } else {
                await enviarMensajeAsistente(conversacionId, "Actualmente no tienes ninguna cita futura agendada.", usuarioWaId, negocioPhoneNumberId);
            }
            // Después de responder, le recordamos al usuario en qué estábamos.
            // Esta lógica se podría refinar para ser más contextual a la tarea.
            await enviarMensajeAsistente(conversacionId, "Continuando con nuestra tarea anterior...", usuarioWaId, negocioPhoneNumberId);
            return { success: true, data: null }; // Salimos para esperar la respuesta del usuario
        }

        // Escape para REAGENDAR: si la tarea actual NO es reagendar, pero el usuario quiere reagendar.
        const keywordsReagendar = ['reagendar', 'reagenda', 'cambiar', 'mover', 'modificar', 'reprogramar'];
        if (tarea.nombreTarea !== 'reagendarCita' && keywordsReagendar.some(kw => textoUsuario.includes(kw))) {
            console.log(`[ESCAPE] Intención 'reagendar' detectada. Abortando tarea actual: '${tarea.nombreTarea}'.`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return manejarConversacionGeneral(mensaje, contexto);
        }

        // REINICIO de reagendar: si la tarea actual YA es reagendar y el usuario lo repite.
        if (tarea.nombreTarea === 'reagendarCita' && keywordsReagendar.some(kw => textoUsuario.includes(kw))) {
            console.log(`[REINICIO] El usuario quiere reiniciar la tarea 'reagendarCita'. Eliminando tarea actual.`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return manejarConversacionGeneral(mensaje, contexto);
        }

        // Escape para CANCELAR: si el usuario quiere cancelar desde cualquier otra tarea.
        const keywordsCancelar = ['cancela', 'cancelar', 'eliminar', 'borrar'];
        if (tarea.nombreTarea !== 'cancelarCita' && keywordsCancelar.some(kw => textoUsuario.includes(kw))) {
            console.log(`[ESCAPE] Intención 'cancelar' detectada. Abortando tarea actual: '${tarea.nombreTarea}'.`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return manejarConversacionGeneral(mensaje, contexto);
        }
    }

    // Si no es una meta-pregunta o escape, continuamos con la tarea actual.
    // Si no es un escape, continuamos con la tarea actual.
    console.log(`[Paso 3.1] Gestor de Tareas: Enrutando a sub-gestor para la tarea: "${tarea.nombreTarea}"`);
    switch (tarea.nombreTarea) {
        case 'agendarCita':
            return manejarAgendarCita(tarea, mensaje, contexto);
        case 'cancelarCita':
            return manejarCancelarCita(tarea, mensaje, contexto);
        case 'reagendarCita':
            return manejarReagendarCita(tarea, mensaje, contexto);
        case 'buscarCitas':
            return manejarBuscarCitas(tarea, mensaje, contexto);
        default:
            console.warn(`[FSM ADVERTENCIA] Tarea desconocida: ${tarea.nombreTarea}`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return { success: false, error: "Tarea desconocida." };
    }
}

/** ==================================================================
 * SUB-GESTOR PARA LA TAREA "AGENDAR CITA"
 * ===================================================================
 */
async function manejarAgendarCita(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const { conversacionId, leadId, asistente, usuarioWaId, negocioPhoneNumberId } = contexto;
    const tareaContexto = (tarea.contexto as AgendarCitaContext) || {};

    console.log(`[Paso 3.2 - AGENDAR] Estado Actual: ${tarea.estado}. Contexto:`, tareaContexto);

    switch (tarea.estado) {

        case EstadoTareaConversacional.RECOLECTANDO_DATOS: {
            if (mensaje.type !== 'text') return { success: true, data: null };
            const textoUsuario = mensaje.content;

            // --- LÓGICA DE EXTRACCIÓN OPORTUNISTA ---

            // 1. Intentamos extraer el SERVICIO si aún no lo tenemos en el contexto.
            if (!tareaContexto.servicioId) {
                const serviciosDisponibles = await prisma.agendaTipoCita.findMany({ where: { negocioId: asistente.negocio!.id, activo: true } });
                const servicioEncontrado = serviciosDisponibles.find(s => textoUsuario.toLowerCase().includes(s.nombre.toLowerCase()));
                if (servicioEncontrado) {
                    tareaContexto.servicioId = servicioEncontrado.id;
                    tareaContexto.servicioNombre = servicioEncontrado.nombre;
                }
            }

            // 2. Intentamos extraer FECHA y HORA si aún no tenemos la fecha completa.
            if (!tareaContexto.fechaHora) {
                const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);
                if (palabrasClave) {
                    // Usamos nuestro helper mejorado que nos dice qué encontró
                    const { fecha, hora, fechaEncontrada, horaEncontrada } = construirFechaDesdePalabrasClave(palabrasClave, new Date());

                    if (fechaEncontrada && horaEncontrada) {
                        // Caso 1: Encontramos todo. Guardamos la fecha completa.
                        fecha!.setHours(hora!.hora, hora!.minuto, 0, 0);
                        tareaContexto.fechaHora = fecha!.toISOString();
                        // Si había una fecha parcial guardada, la limpiamos.
                        if (tareaContexto.fechaParcial) delete tareaContexto.fechaParcial;

                    } else if (fechaEncontrada) {
                        // Caso 2: Solo encontramos la fecha. La guardamos parcialmente para "recordarla".
                        tareaContexto.fechaParcial = fecha!.toISOString();

                    } else if (horaEncontrada && tareaContexto.fechaParcial) {
                        // Caso 3: Ya teníamos una fecha parcial y ahora el usuario nos dio la hora.
                        const fechaCompleta = new Date(tareaContexto.fechaParcial);
                        fechaCompleta.setHours(hora!.hora, hora!.minuto, 0, 0);
                        tareaContexto.fechaHora = fechaCompleta.toISOString();
                        delete tareaContexto.fechaParcial; // Limpiamos la fecha parcial del contexto
                    }
                }
            }

            // 3. Actualizamos la TareaEnProgreso en la BD con CUALQUIER información nueva que hayamos recolectado.
            await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject } });

            // --- LÓGICA DE DECISIÓN MEJORADA ---
            // Basado en el contexto actualizado, decidimos qué preguntar.

            if (!tareaContexto.servicioId) {
                // Si sigue faltando el servicio, lo pedimos.
                console.log('[Paso 3.3.1] FALTA SERVICIO. Listando servicios.');
                const resListar = await ejecutarListarServiciosDeCitasAction({}, { conversacionId, leadId, asistenteId: asistente.id, negocioId: asistente.negocio!.id, canalNombre: 'WhatsApp', tareaEjecutadaId: '' });
                if (resListar.success && resListar.data?.content) {
                    await enviarMensajeAsistente(conversacionId, resListar.data.content, usuarioWaId, negocioPhoneNumberId);
                }
            } else if (tareaContexto.fechaParcial && !tareaContexto.fechaHora) {
                // ¡NUEVA LÓGICA! Si tenemos una fecha parcial pero no la hora completa, pedimos la hora.
                const fechaParcialDate = new Date(tareaContexto.fechaParcial);
                await enviarMensajeAsistente(conversacionId, `Entendido, para el ${fechaParcialDate.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}. ¿A qué hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);

            } else if (!tareaContexto.fechaHora) {
                // Si tenemos el servicio pero aún falta cualquier dato de la fecha.
                await enviarMensajeAsistente(conversacionId, `Perfecto, servicio: "${tareaContexto.servicioNombre}". Ahora, ¿para qué fecha y hora te gustaría tu cita?`, usuarioWaId, negocioPhoneNumberId);

            } else {
                // Si ya tenemos todo (servicio y fechaHora completa), avanzamos al estado de confirmación.
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
                const fechaLegible = new Date(tareaContexto.fechaHora).toLocaleString('es-MX', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric', hour: 'numeric', minute: 'numeric', hour12: true, timeZone: 'America/Mexico_City' });
                await enviarMensajeAsistente(conversacionId, `¡Listo! Solo para confirmar: cita para "${tareaContexto.servicioNombre}" el ${fechaLegible}. ¿Es correcto?`, usuarioWaId, negocioPhoneNumberId);
            }

            return { success: true, data: null };
        }

        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO: {
            if (mensaje.type !== 'text') return { success: true, data: null };
            const respuestaUsuario = mensaje.content.toLowerCase();

            if (['si', 'sí', 'simon', 'afirmativo', 'confirmo', 'correcto'].some(kw => respuestaUsuario.includes(kw))) {
                const resultadoAgendado = await ejecutarConfirmacionFinalCitaAction(tareaContexto, contexto);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
                await enviarMensajeAsistente(conversacionId, resultadoAgendado.success ? resultadoAgendado.data!.mensajeAdicional! : `Hubo un problema al agendar tu cita: ${resultadoAgendado.error}`, usuarioWaId, negocioPhoneNumberId);
            } else {
                await enviarMensajeAsistente(conversacionId, "Entendido, he cancelado el proceso. Si quieres intentar de nuevo, solo dímelo.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            }
            return { success: true, data: null };
        }

        default:
            console.warn(`[FSM ADVERTENCIA] Tarea '${tarea.nombreTarea}' en estado no manejado: ${tarea.estado}`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return { success: true, data: null };
    }
}

/** ==================================================================
 * SUB-GESTOR PARA LA TAREA "CANCELAR CITA" (VERSIÓN CON CIERRE DE CICLO EXPLÍCITO)
/** ==================================================================
 */
async function manejarCancelarCita(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const { conversacionId, leadId, usuarioWaId, negocioPhoneNumberId } = contexto;
    const tareaContexto = (tarea.contexto as CancelarCitaContext) || {};

    if (mensaje.type !== 'text') return { success: true, data: null };
    const textoUsuario = mensaje.content;

    console.log(`[Paso 3.2 - CANCELAR] Estado Actual: ${tarea.estado}. Contexto:`, tareaContexto);

    switch (tarea.estado) {

        case EstadoTareaConversacional.RECOLECTANDO_DATOS: {
            // 1. Buscamos TODAS las citas activas del usuario, incluyendo las reagendadas.
            const citasActivas = await prisma.agenda.findMany({
                where: {
                    leadId: leadId,
                    status: { in: [StatusAgenda.PENDIENTE] },
                    fecha: { gte: new Date() }
                },
                orderBy: { fecha: 'asc' },
                take: 10
            });

            if (citasActivas.length === 0) {
                await enviarMensajeAsistente(conversacionId, "No encontré ninguna cita futura para cancelar.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
                return { success: true, data: null };
            }

            // 2. Lógica Oportunista: Intentamos identificar la cita desde el primer mensaje.
            const citaIdentificada = findBestMatchingAppointment(textoUsuario, citasActivas);

            if (citaIdentificada) {
                // ¡Éxito! Encontramos una cita. Saltamos directo a la confirmación.
                tareaContexto.citaIdParaCancelar = citaIdentificada.id;
                await prisma.tareaEnProgreso.update({
                    where: { id: tarea.id },
                    data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO }
                });

                const fechaLegible = new Date(citaIdentificada.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Entendido. Solo para confirmar, ¿cancelamos la cita para "${citaIdentificada.asunto}" del ${fechaLegible}?`, usuarioWaId, negocioPhoneNumberId);

            } else {
                // No hay coincidencia clara, listamos las opciones para que el usuario elija.
                let mensajeLista = "Encontré estas citas futuras a tu nombre. ¿Cuál de ellas te gustaría cancelar?\n";
                citasActivas.forEach((cita, index) => {
                    const fechaLegible = new Date(cita.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                    mensajeLista += `\n${index + 1}. ${cita.asunto} el ${fechaLegible}`;
                });

                tareaContexto.citasEncontradas = citasActivas;
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject } });
                await enviarMensajeAsistente(conversacionId, mensajeLista, usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO: {
            const respuestaUsuario = textoUsuario.toLowerCase();

            if (['si', 'sí', 'afirmativo', 'correcto'].some(kw => respuestaUsuario.includes(kw))) {
                if (tareaContexto.citaIdParaCancelar) {
                    await ejecutarCancelacionFinalCitaAction(tareaContexto.citaIdParaCancelar);
                    await enviarMensajeAsistente(conversacionId, "Listo. Tu cita ha sido cancelada exitosamente.", usuarioWaId, negocioPhoneNumberId);
                }
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            } else {
                await enviarMensajeAsistente(conversacionId, "Entendido, no he cancelado nada. Si necesitas algo más, aquí estoy.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            }
            return { success: true, data: null };
        }

        default:
            console.warn(`[FSM ADVERTENCIA] Tarea '${tarea.nombreTarea}' en estado no manejado: ${tarea.estado}`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return { success: true, data: null };
    }
}

// =====================================================================
// FUNCIÓN PARA REAGENDAR CITA (VERSIÓN COMPLETA Y DEFINITIVA)
// =====================================================================
async function manejarReagendarCita(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {

    const { conversacionId, usuarioWaId, negocioPhoneNumberId, leadId, asistente } = contexto;

    if (mensaje.type !== 'text') return { success: true, data: null };
    const textoUsuario = mensaje.content;

    const tareaContexto = (tarea.contexto as ReagendarCitaContext) || {};

    console.log(`[FSM-REAGENDAR] Iniciando. Estado: ${tarea.estado}. Contexto:`, tareaContexto);

    switch (tarea.estado) {

        case EstadoTareaConversacional.RECOLECTANDO_DATOS: {
            const citasActivas = await prisma.agenda.findMany({
                where: { leadId, status: { in: [StatusAgenda.PENDIENTE] }, fecha: { gte: new Date() } },
                orderBy: { fecha: 'asc' }, take: 5, select: { id: true, asunto: true, fecha: true, tipoDeCitaId: true }
            });

            if (citasActivas.length === 0) {
                await enviarMensajeAsistente(conversacionId, "No encontré ninguna cita futura para reagendar.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
                break;
            }

            const citaIdentificada = findBestMatchingAppointment(textoUsuario, citasActivas);

            if (citaIdentificada) {
                tareaContexto.citaOriginalId = citaIdentificada.id;
                tareaContexto.citaOriginalAsunto = citaIdentificada.asunto;
                const fechaOriginal = new Date(citaIdentificada.fecha);
                tareaContexto.citaOriginalFecha = fechaOriginal;
                tareaContexto.citaOriginalTipoDeCitaId = citaIdentificada.tipoDeCitaId;

                const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);
                if (palabrasClave) {

                    // LÍNEAS CORREGIDAS (SIN ADVERTENCIAS)
                    const resultadoCalculo = construirFechaDesdePalabrasClave(palabrasClave, new Date());
                    let fechaCalculada = resultadoCalculo.fecha; // 'let' porque puede cambiar a null
                    const horaCalculada = resultadoCalculo.hora;   // 'const' porque nunca se reasigna

                    // --- Control de Realidad ---
                    // Si la "nueva" fecha extraída es la misma que la original, y no se dio una nueva hora,
                    // asumimos que el usuario solo mencionó la cita original y no ha propuesto un cambio aún.
                    if (fechaCalculada && sonElMismoDia(fechaCalculada, fechaOriginal) && !horaCalculada) {
                        fechaCalculada = null;
                    }

                    if (fechaCalculada && horaCalculada) {
                        console.log("[FSM-HÍBRIDO] Se calculó cita, fecha y hora. Saltando a VALIDAR.");
                        fechaCalculada.setHours(horaCalculada.hora, horaCalculada.minuto, 0, 0);
                        tareaContexto.nuevaFechaHora = fechaCalculada.toISOString();
                        const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD } });
                        return manejarReagendarCita(tareaActualizada, mensaje, contexto);
                    } else if (fechaCalculada) {
                        console.log("[FSM-HÍBRIDO] Se calculó cita y fecha. Saltando a PEDIR HORA.");
                        tareaContexto.nuevaFechaParcial = { año: fechaCalculada.getFullYear(), mes: fechaCalculada.getMonth() + 1, dia: fechaCalculada.getDate() };
                        await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_HORA } });
                        await enviarMensajeAsistente(conversacionId, `Entendido, para el ${fechaCalculada.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}. ¿A qué hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);
                        return { success: true, data: null };
                    }
                }

                // Si solo identificamos la cita original y no se extrajo ninguna fecha nueva, pedimos la información.
                const fechaLegibleOriginal = fechaOriginal.toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Ok, vamos a reagendar tu cita del ${fechaLegibleOriginal}. ¿Para qué nueva fecha y hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_FECHA } });

            } else {
                // Si no se pudo identificar una cita clara, listamos las opciones.
                let mensajeLista = "Encontré estas citas a tu nombre. Por favor, dime cuál quieres mover y para qué nueva fecha y hora te gustaría:\n";
                citasActivas.forEach((cita, index) => {
                    const fechaLegible = new Date(cita.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                    mensajeLista += `\n${index + 1}. ${cita.asunto} el ${fechaLegible}`;
                });
                tareaContexto.citasEncontradas = citasActivas.map(c => ({ ...c, fecha: new Date(c.fecha) }));
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject } });
                await enviarMensajeAsistente(conversacionId, mensajeLista, usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.RECOLECTANDO_NUEVA_FECHA: {
            const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);

            if (palabrasClave) {
                const { fecha: fechaCalculada, hora: horaCalculada } = construirFechaDesdePalabrasClave(palabrasClave, new Date());

                // Caso A: El usuario dio fecha y hora completas.
                if (fechaCalculada && horaCalculada) {
                    fechaCalculada.setHours(horaCalculada.hora, horaCalculada.minuto, 0, 0);
                    tareaContexto.nuevaFechaHora = fechaCalculada.toISOString();
                    const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD } });
                    return manejarReagendarCita(tareaActualizada, mensaje, contexto);
                }
                // Caso B: El usuario solo dio una fecha válida.
                else if (fechaCalculada) {
                    tareaContexto.nuevaFechaParcial = { año: fechaCalculada.getFullYear(), mes: fechaCalculada.getMonth() + 1, dia: fechaCalculada.getDate() };
                    await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_HORA } });
                    await enviarMensajeAsistente(conversacionId, `Entendido, para el ${fechaCalculada.toLocaleDateString('es-MX', { weekday: 'long', day: 'numeric', month: 'long' })}. ¿A qué hora te gustaría?`, usuarioWaId, negocioPhoneNumberId);
                    return { success: true, data: null };
                }
            }

            // --- ESTA ES LA SOLUCIÓN ---
            // Caso C (El "catch-all"): Si no se encontraron palabras clave, o si no pudimos construir una fecha válida con ellas.
            // En cualquier caso de no entender, pedimos que lo intente de nuevo.
            await enviarMensajeAsistente(conversacionId, "Disculpa, no entendí la fecha que mencionaste. ¿Podrías intentarlo de nuevo? Por ejemplo: 'para el próximo martes a las 3pm'.", usuarioWaId, negocioPhoneNumberId);
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.RECOLECTANDO_NUEVA_HORA: {
            const palabrasClave = await extraerPalabrasClaveDeFecha(textoUsuario);
            if (palabrasClave && palabrasClave.hora_str && tareaContexto.nuevaFechaParcial) {
                const { hora: horaCalculada } = construirFechaDesdePalabrasClave(palabrasClave, new Date());
                if (horaCalculada) {
                    const { año, mes, dia } = tareaContexto.nuevaFechaParcial;
                    const fechaCompleta = new Date(año, mes - 1, dia);
                    fechaCompleta.setHours(horaCalculada.hora, horaCalculada.minuto, 0, 0);

                    tareaContexto.nuevaFechaHora = fechaCompleta.toISOString();
                    delete tareaContexto.nuevaFechaParcial;

                    const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD } });
                    return manejarReagendarCita(tareaActualizada, mensaje, contexto);
                }
            }
            await enviarMensajeAsistente(conversacionId, "No entendí la hora, ¿puedes repetirla? Por ejemplo: 'a las 5pm' o 'a las 14:30'.", usuarioWaId, negocioPhoneNumberId);
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.VALIDANDO_DISPONIBILIDAD: {
            const estaDisponible = await verificarDisponibilidad({
                negocioId: asistente.negocio!.id,
                tipoDeCitaId: tareaContexto.citaOriginalTipoDeCitaId!,
                fechaDeseada: new Date(tareaContexto.nuevaFechaHora!),
                leadId: leadId,
                citaOriginalId: tareaContexto.citaOriginalId
            });

            if (estaDisponible) {
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
                const fechaOriginalLegible = new Date(tareaContexto.citaOriginalFecha!).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                const nuevaFechaLegible = new Date(tareaContexto.nuevaFechaHora!).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Perfecto. Solo para confirmar, ¿cambiamos tu "${tareaContexto.citaOriginalAsunto}" de ${fechaOriginalLegible} a la nueva fecha ${nuevaFechaLegible}? ¿Los datos son correctos?`, usuarioWaId, negocioPhoneNumberId);
            } else {
                const nuevaFechaLegible = new Date(tareaContexto.nuevaFechaHora!).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, `Lo siento, el horario de ${nuevaFechaLegible} no está disponible. Por favor, elige otro día y hora.`, usuarioWaId, negocioPhoneNumberId);
                delete tareaContexto.nuevaFechaHora;
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_NUEVA_FECHA } });
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO: {
            const respuestaUsuarioConfirmacion = textoUsuario.toLowerCase();
            const afirmaciones = ['si', 'sí', 'afirmativo', 'correcto', 'claro', 'adelante'];
            const negaciones = ['no', 'nel', 'cancelar', 'está mal'];

            if (afirmaciones.some(kw => respuestaUsuarioConfirmacion.includes(kw))) {
                const resultado = await ejecutarReagendamientoFinalCitaAction(tareaContexto, contexto);
                const nuevaFechaLegible = new Date(tareaContexto.nuevaFechaHora!).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
                await enviarMensajeAsistente(conversacionId, resultado.success ? `¡Listo! Tu cita ha sido reagendada con éxito para el ${nuevaFechaLegible}.` : "Hubo un problema al reagendar tu cita.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            } else if (negaciones.some(kw => respuestaUsuarioConfirmacion.includes(kw))) {
                await enviarMensajeAsistente(conversacionId, "Entendido, he cancelado el proceso. Tu cita original sigue en pie.", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            } else {
                await enviarMensajeAsistente(conversacionId, "Disculpa, no entendí tu respuesta. Para confirmar el cambio, puedes decir 'sí' o 'correcto'. Si algo está mal, solo di 'no' para cancelar el proceso.", usuarioWaId, negocioPhoneNumberId);
            }
            return { success: true, data: null };
        }

        // El caso PENDIENTE_CONFIRMACION_FECHA_AMBIGUA lo podemos eliminar si el calculador de fecha es robusto.
        // Si se mantiene, su lógica no cambia.

        default: {
            console.warn(`[FSM ADVERTENCIA] Tarea 'reagendarCita' en estado no manejado: ${tarea.estado}`);
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
        }
    }
    return { success: true, data: null };
}

/** ==================================================================
 * ACCIÓN FINAL PARA REAGENDAR CITA
 * ===================================================================
 */
async function ejecutarReagendamientoFinalCitaAction(
    tareaContexto: ReagendarCitaContext,
    fsmContexto: FsmContext
): Promise<ActionResult<{ nuevaCita: Agenda }>> {
    const { leadId, asistente, conversacionId } = fsmContexto;
    const { citaOriginalId, nuevaFechaHora, citaOriginalAsunto, citaOriginalTipoDeCitaId } = tareaContexto;

    if (!citaOriginalId || !nuevaFechaHora || !citaOriginalAsunto || !citaOriginalTipoDeCitaId) {
        return { success: false, error: "Faltan datos críticos para reagendar." };
    }

    try {
        const [, nuevaCita] = await prisma.$transaction([
            prisma.agenda.update({
                where: { id: citaOriginalId },
                data: { status: StatusAgenda.REAGENDADA }
            }),
            prisma.agenda.create({
                data: {
                    negocioId: asistente.negocio!.id,
                    leadId: leadId,
                    asistenteId: asistente.id,
                    fecha: new Date(nuevaFechaHora),
                    tipo: 'Cita',
                    asunto: citaOriginalAsunto,
                    descripcion: `Cita reagendada desde la cita original ID: ${citaOriginalId}. Conversación ID: ${conversacionId}`,
                    tipoDeCitaId: citaOriginalTipoDeCitaId,
                    status: "PENDIENTE"
                }
            })
        ]);

        console.log(`[Paso 4.2 - REAGENDAR] Cita reagendada con éxito. Nueva cita ID: ${nuevaCita.id}`);
        return { success: true, data: { nuevaCita } };

    } catch (error) {
        console.error("[FSM ERROR] Error al reagendar la cita:", error);
        return { success: false, error: "Error interno al procesar el reagendamiento." };
    }
}

/** ==================================================================
 * ACCIÓN FINAL PARA CANCELAR CITA
 * ===================================================================
 */
async function ejecutarCancelacionFinalCitaAction(citaId: string): Promise<ActionResult<Agenda>> {
    console.log(`[Paso 4.1 - CANCELAR] Ejecutando cancelación final en BD para cita ID: ${citaId}`);
    try {
        const citaCancelada = await prisma.agenda.update({
            where: { id: citaId },
            data: { status: StatusAgenda.CANCELADA }
        });
        console.log(`[Paso 4.2 - CANCELAR] Cita actualizada a CANCELADA con éxito.`);
        return { success: true, data: citaCancelada };
    } catch (error) {
        console.error("[FSM ERROR] Error al cancelar la cita en la base de datos:", error);
        return { success: false, error: "Error al cancelar la cita en la base de datos." };
    }
}

/**
 * ===================================================================================
 * PASO 4: ACCIÓN FINAL (ESCRITURA EN BD)
 * ===================================================================================
 */
async function ejecutarConfirmacionFinalCitaAction(
    tareaContexto: AgendarCitaContext,
    fsmContexto: FsmContext
): Promise<ActionResult<{ agenda: Agenda, mensajeAdicional?: string }>> {
    console.log('[Paso 4.1 - AGENDAR] Ejecutando acción final para crear cita en BD.');
    const { leadId, asistente, conversacionId } = fsmContexto;
    const { servicioId, fechaHora, servicioNombre } = tareaContexto;

    if (!servicioId || !fechaHora) {
        console.error('[ERROR en Paso 4.1] Faltan datos críticos para agendar:', tareaContexto);
        return { success: false, error: "Faltan datos críticos (servicio o fecha) para agendar la cita." };
    }

    try {
        const servicio = await prisma.agendaTipoCita.findUnique({ where: { id: servicioId } });
        if (!servicio) {
            return { success: false, error: "El servicio seleccionado ya no es válido." };
        }

        const nuevaCita = await prisma.agenda.create({
            data: {
                negocioId: asistente.negocio!.id,
                leadId: leadId,
                asistenteId: asistente.id,
                fecha: new Date(fechaHora),
                tipo: 'Cita',
                asunto: `Cita para: ${servicio.nombre}`,
                descripcion: `Cita agendada por asistente virtual vía WhatsApp. Conversación ID: ${conversacionId}`,
                tipoDeCitaId: servicio.id,
                status: "PENDIENTE"
            }
        });

        // --- MENSAJE MEJORADO ---
        const fechaLegible = new Date(nuevaCita.fecha).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' });
        const mensajeAdicional = `Tu cita para "${servicioNombre}" ha sido agendada con éxito para el ${fechaLegible}.`;

        return { success: true, data: { agenda: nuevaCita, mensajeAdicional } };
    } catch (error) {
        console.error("[FSM ERROR] Error al crear la cita en la base de datos:", error);
        return { success: false, error: "Error interno al guardar la cita." };
    }
}

/**
 * ===================================================================================
 * FUNCIÓN AUXILIAR: SETUP DE CONVERSACIÓN
 * ===================================================================================
 */
async function setupConversacion(
    input: ProcesarMensajeWhatsAppInput
): Promise<ActionResult<FsmContext>> {
    const { negocioPhoneNumberId, usuarioWaId, nombrePerfilUsuario, mensaje } = input;

    const result = await prisma.$transaction(async (tx) => {
        const asistente = await tx.asistenteVirtual.findFirst({
            where: { phoneNumberId: negocioPhoneNumberId, status: 'activo' },
            include: { negocio: { include: { CRM: true } } }
        });
        if (!asistente || !asistente.negocio || !asistente.negocio.CRM) {
            throw new Error(`Configuración crítica no encontrada para PNID: ${negocioPhoneNumberId}`);
        }

        let lead = await tx.lead.findFirst({ where: { telefono: usuarioWaId, crmId: asistente.negocio.CRM.id } });
        if (lead) {
            if (nombrePerfilUsuario && lead.nombre !== nombrePerfilUsuario) {
                lead = await tx.lead.update({ where: { id: lead.id }, data: { nombre: nombrePerfilUsuario } });
            }
        } else {
            const primerPipeline = await tx.pipelineCRM.findFirst({ where: { crmId: asistente.negocio.CRM.id, status: 'activo' }, orderBy: { orden: 'asc' } });
            if (!primerPipeline) throw new Error(`Pipeline inicial no configurado para CRM ID: ${asistente.negocio.CRM.id}`);
            lead = await tx.lead.create({
                data: {
                    crm: { connect: { id: asistente.negocio.CRM.id } },
                    Pipeline: { connect: { id: primerPipeline.id } },
                    nombre: nombrePerfilUsuario || `Usuario ${usuarioWaId.slice(-4)}`,
                    telefono: usuarioWaId,
                    Canal: {
                        connectOrCreate: {
                            where: { crmId_nombre: { crmId: asistente.negocio.CRM.id, nombre: "WhatsApp" } },
                            create: { nombre: "WhatsApp", crmId: asistente.negocio.CRM.id }
                        }
                    }
                }
            });
        }

        let conversacion = await tx.conversacion.findFirst({ where: { whatsappId: usuarioWaId }, orderBy: { createdAt: 'desc' } });
        if (!conversacion || ['cerrada', 'archivada'].includes(conversacion.status)) {
            conversacion = await tx.conversacion.create({ data: { leadId: lead.id, asistenteVirtualId: asistente.id, status: 'abierta', phoneNumberId: negocioPhoneNumberId, whatsappId: usuarioWaId } });
        } else if (!conversacion.leadId || conversacion.leadId !== lead.id) {
            conversacion = await tx.conversacion.update({ where: { id: conversacion.id }, data: { leadId: lead.id } });
        }

        const mensajeTexto = mensaje.type === 'text' ? mensaje.content : `[Interacción no textual: ${mensaje.type}]`;
        console.log(`[LOG USUARIO] Mensaje entrante de ${usuarioWaId}: "${mensajeTexto}"`);
        await tx.interaccion.create({ data: { conversacionId: conversacion.id, role: 'user', mensajeTexto: mensajeTexto, parteTipo: InteraccionParteTipo.TEXT, canalInteraccion: 'WhatsApp' } });

        return { conversacionId: conversacion.id, leadId: lead.id, asistente };
    });

    return { success: true, data: { ...result, mensaje, usuarioWaId, negocioPhoneNumberId } };
}

// Wrapper para centralizar el log de los mensajes del asistente
async function enviarMensajeAsistente(conversacionId: string, mensaje: string, destinatarioWaId: string, negocioPhoneNumberIdEnvia: string) {
    console.log(`[LOG ASISTENTE] Enviando a ${destinatarioWaId}: "${mensaje}"`);
    return enviarMensajeInternoYWhatsAppAction({ conversacionId, contentFuncion: mensaje, role: 'assistant', parteTipo: InteraccionParteTipo.TEXT, canalOriginal: 'WhatsApp', destinatarioWaId, negocioPhoneNumberIdEnvia });
}

// La función enviarMensajeWhatsAppApiAction no necesita cambios por ahora.
export async function enviarMensajeWhatsAppApiAction(
    input: EnviarMensajeWhatsAppApiInput
): Promise<ActionResult<string | null>> {
    const validation = EnviarMensajeWhatsAppApiInputSchema.safeParse(input);
    if (!validation.success) {
        console.error("[WhatsApp API Sender] Input inválido:", validation.error.flatten().fieldErrors);
        return { success: false, error: "Datos de entrada inválidos para enviar mensaje WhatsApp." };
    }
    const {
        destinatarioWaId,
        mensajeTexto,
        negocioPhoneNumberIdEnvia,
        tokenAccesoAsistente,
        tipoMensaje,
        mediaUrl,
        caption,
        // filename
    } = validation.data;

    const GRAPH_API_VERSION = process.env.WHATSAPP_GRAPH_API_VERSION || 'v20.0';
    const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${negocioPhoneNumberIdEnvia}/messages`;

    const messagePayload: Record<string, unknown> = {
        messaging_product: "whatsapp",
        to: destinatarioWaId,
        type: tipoMensaje,
    };

    switch (tipoMensaje) {
        case 'text':
            if (!mensajeTexto) {
                return { success: false, error: "mensajeTexto es requerido para tipo 'text'." };
            }
            messagePayload.text = { preview_url: false, body: mensajeTexto };
            break;
        case 'image':
            if (!mediaUrl) return { success: false, error: "mediaUrl es requerido para tipo 'image'." };
            messagePayload.image = { link: mediaUrl } as { link: string; caption?: string };
            if (caption) (messagePayload.image as { link: string; caption?: string }).caption = caption;
            break;
        // ... otros casos de media sin cambios
    }

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${tokenAccesoAsistente}`,
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(messagePayload),
        });

        const responseData = await response.json();

        if (!response.ok) {
            const errorMsg = responseData.error?.message || `Error HTTP ${response.status} al enviar mensaje.`;
            return { success: false, error: errorMsg };
        }

        const messageId = responseData.messages?.[0]?.id;
        return { success: true, data: messageId || null };

    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Error de red al enviar mensaje." };
    }
}

/**
 * HELPER DE LÓGICA DE NEGOCIO: VERIFICAR DISPONIBILIDAD DE CITA (VERSIÓN BLINDADA FINAL)
 */
async function verificarDisponibilidad(
    // 1. Se añade 'citaOriginalId' opcional a la firma
    input: { negocioId: string; tipoDeCitaId: string; fechaDeseada: Date; leadId: string; citaOriginalId?: string; }
): Promise<boolean> {
    const { negocioId, tipoDeCitaId, fechaDeseada, leadId, citaOriginalId } = input;
    const TIMEZONE_OFFSET = "-06:00";

    try {
        const tipoCita = await prisma.agendaTipoCita.findUniqueOrThrow({ where: { id: tipoDeCitaId } });
        const duracionMinutos = tipoCita.duracionMinutos || 30;
        const finCitaDeseada = new Date(fechaDeseada.getTime() + duracionMinutos * 60000);

        const citasSolapadasDelLead = await prisma.agenda.findMany({
            where: {
                id: { not: citaOriginalId }, // Ignoramos la cita que se está reagendando
                leadId: leadId,
                status: { in: [StatusAgenda.PENDIENTE] },
                OR: [
                    { fecha: { gte: fechaDeseada, lt: finCitaDeseada } },
                    { fecha: { lte: fechaDeseada }, updatedAt: { gt: fechaDeseada } }
                ],
            }
        });

        if (citasSolapadasDelLead.length > 0) {
            console.error(`[VERIFICAR DISPONIBILIDAD] RECHAZADO: El lead ${leadId} ya tiene OTRA cita solapada.`);
            return false;
        }

        const [horariosRegulares, excepciones, citasExistentesEnElDia] = await prisma.$transaction([
            prisma.horarioAtencion.findMany({ where: { negocioId } }),
            prisma.excepcionHorario.findMany({ where: { negocioId } }),
            prisma.agenda.findMany({
                where: {
                    negocioId,
                    status: { in: [StatusAgenda.PENDIENTE] },
                    fecha: {
                        gte: new Date(new Date(fechaDeseada).setHours(0, 0, 0, 0)),
                        lt: new Date(new Date(fechaDeseada).setHours(23, 59, 59, 999)),
                    }
                }
            })
        ]);

        // ... (lógica de horario laboral sin cambios)
        const diaSemanaJs = fechaDeseada.getDay();
        type DiaSemana = "DOMINGO" | "LUNES" | "MARTES" | "MIERCOLES" | "JUEVES" | "VIERNES" | "SABADO";
        const diaSemanaEnum: DiaSemana = ["DOMINGO", "LUNES", "MARTES", "MIERCOLES", "JUEVES", "VIERNES", "SABADO"][diaSemanaJs] as DiaSemana;
        const fechaDeseadaYYYYMMDD = fechaDeseada.toISOString().split('T')[0];
        const excepcionDelDia = excepciones.find(e => e.fecha.toISOString().startsWith(fechaDeseadaYYYYMMDD));
        let horaInicioStr: string | null = null, horaFinStr: string | null = null;
        if (excepcionDelDia) {
            if (excepcionDelDia.esDiaNoLaborable) return false;
            if (excepcionDelDia.horaInicio && excepcionDelDia.horaFin) {
                horaInicioStr = excepcionDelDia.horaInicio;
                horaFinStr = excepcionDelDia.horaFin;
            }
        } else {
            const horarioRegular = horariosRegulares.find(h => h.dia === diaSemanaEnum);
            if (!horarioRegular) return false;
            horaInicioStr = horarioRegular.horaInicio;
            horaFinStr = horarioRegular.horaFin;
        }
        if (!horaInicioStr || !horaFinStr) return false;
        const inicioDiaLaboral = new Date(`${fechaDeseadaYYYYMMDD}T${horaInicioStr}:00${TIMEZONE_OFFSET}`);
        const finDiaLaboral = new Date(`${fechaDeseadaYYYYMMDD}T${horaFinStr}:00${TIMEZONE_OFFSET}`);
        if (fechaDeseada.getTime() < inicioDiaLaboral.getTime() || finCitaDeseada.getTime() > finDiaLaboral.getTime()) {
            return false;
        }

        // Verificación de concurrencia general
        const limiteConcurrencia = tipoCita.limiteConcurrencia;
        let citasConcurrentes = 0;
        for (const citaExistente of citasExistentesEnElDia) {
            // --- 2. ¡LÍNEA CLAVE AÑADIDA! ---
            // Si la cita que estamos revisando es la misma que queremos reagendar, la ignoramos.
            if (citaExistente.id === citaOriginalId) continue;

            const tipoCitaExistente = await prisma.agendaTipoCita.findUnique({ where: { id: citaExistente.tipoDeCitaId! } });
            const duracionExistente = tipoCitaExistente?.duracionMinutos || 30;
            const finCitaExistente = new Date(citaExistente.fecha.getTime() + duracionExistente * 60000);
            if (fechaDeseada < finCitaExistente && finCitaDeseada > citaExistente.fecha) {
                citasConcurrentes++;
            }
        }
        if (citasConcurrentes >= limiteConcurrencia) return false;

        return true;
    } catch (error) {
        console.error("[VERIFICAR DISPONIBILIDAD] Error:", error);
        return false;
    }
}

/** ==================================================================
 * HELPER PARA DESAMBIGUACIÓN DE CITAS (VERSIÓN FINAL CON DESEMPATE)
 * ===================================================================
 */
function findBestMatchingAppointment(
    userInput: string,
    appointments: { id: string; asunto: string; fecha: Date; tipoDeCitaId?: string | null }[]
): { id: string; asunto: string; fecha: Date; tipoDeCitaId?: string | null } | null {

    const typosComunes: { [key: string]: string } = { 'mates': 'martes', 'miercoles': 'miércoles', 'lal': 'la' };
    let userInputCorregido = userInput.toLowerCase();
    for (const typo in typosComunes) {
        userInputCorregido = userInputCorregido.replace(new RegExp(typo, 'g'), typosComunes[typo]);
    }

    // CORRECCIÓN: Se cambia k.length > 1 por k.length >= 1 para incluir números.
    const userKeywords = new Set(userInputCorregido.split(' ').filter(k => k.length >= 1));

    const timeZone = 'America/Mexico_City';
    const formatWeekday = new Intl.DateTimeFormat('es-MX', { weekday: 'long', timeZone });
    const formatDayNumber = new Intl.DateTimeFormat('es-MX', { day: 'numeric', timeZone });
    const formatHour12 = new Intl.DateTimeFormat('es-MX', { hour: 'numeric', minute: 'numeric', hour12: true, timeZone });

    let scoredAppointments = appointments.map((cita, index) => {
        let score = 0;
        const fechaCita = new Date(cita.fecha);

        const diaNombre = formatWeekday.format(fechaCita).toLowerCase();
        const diaNumero = formatDayNumber.format(fechaCita);
        const hora12h = formatHour12.format(fechaCita).toLowerCase().replace(/\./g, '').replace(/\s/g, '');

        const profile = new Set([diaNombre, diaNumero, hora12h, ...cita.asunto.toLowerCase().split(' ')]);

        userKeywords.forEach(keyword => {
            // Se da máxima prioridad si el usuario escribe el número de la lista.
            if (String(index + 1) === keyword) score += 50;
            if (profile.has(keyword)) score += 5;
            if (hora12h.includes(keyword.replace(/\s/g, ''))) score += 10;
        });

        return { ...cita, score };
    });

    scoredAppointments = scoredAppointments.filter(a => a.score > 0);
    if (scoredAppointments.length === 0) return null;

    const maxScore = Math.max(...scoredAppointments.map(a => a.score));
    const bestMatches = scoredAppointments.filter(a => a.score === maxScore);

    // Devuelve el resultado solo si hay un único ganador claro.
    return bestMatches.length === 1 ? bestMatches[0] : null;
}

/**
 * NUEVO HELPER DE IA: Solo extrae palabras clave, no calcula nada.
 */
async function extraerPalabrasClaveDeFecha(
    textoUsuario: string
): Promise<{ dia_semana?: string; dia_relativo?: string; dia_mes?: number; hora_str?: string } | null> {

    // --- PROMPT FINAL CON MÁS EJEMPLOS Y CONTEXTO ---
    const prompt = `Tu tarea es analizar un texto para extraer palabras clave de fecha y hora. Ignora el resto del texto conversacional. Sé flexible con typos y variaciones.
Texto: "${textoUsuario}"

Extrae cualquier referencia a:
- Un día de la semana (ej: "lunes", "jueves", "sabado").
- Un día relativo (ej: "hoy", "mañana").
- Un número de día del mes (ej: "el 26", "día 30").
- Una hora (ej: "a las 5pm", "14:30", "12pm").

Responde ÚNICA Y EXCLUSIVAMENTE con un objeto JSON válido con el formato:
{"dia_semana": "nombre_dia" | null, "dia_relativo": "relativo" | null, "dia_mes": numero | null, "hora_str": "texto_hora" | null}

Ejemplo 1: "para el sabado 12pm" -> {"dia_semana": "sábado", "dia_relativo": null, "dia_mes": null, "hora_str": "12pm"}
Ejemplo 2: "mañana a las 5" -> {"dia_semana": null, "dia_relativo": "mañana", "dia_mes": null, "hora_str": "a las 5"}
Ejemplo 3: "agenda una cita para el miercoles a las 2pm" -> {"dia_semana": "miércoles", "dia_relativo": null, "dia_mes": null, "hora_str": "a las 2pm"}

Si no encuentras NADA relacionado a una fecha u hora, responde con 'null'.`;

    // El resto de la función se mantiene igual.
    const resultadoIA = await generarRespuestaAsistente({ historialConversacion: [], mensajeUsuarioActual: prompt, contextoAsistente: { nombreAsistente: "Asistente", nombreNegocio: "Negocio" }, tareasDisponibles: [] });
    const respuestaJson = resultadoIA.data?.respuestaTextual;

    if (resultadoIA.success && respuestaJson && respuestaJson.toLowerCase() !== 'null') {
        try {
            const match = respuestaJson.match(/{[\s\S]*}/);
            if (match) return JSON.parse(match[0]);
        } catch (e) {
            console.error("Error parseando JSON de palabras clave de fecha:", e);
        }
    }
    return null;
}

/**
 * NUEVO CALCULADOR DETERMINISTA: Construye una fecha a partir de palabras clave.
 */
function construirFechaDesdePalabrasClave(
    palabrasClave: { dia_semana?: string; dia_relativo?: string; dia_mes?: number; hora_str?: string },
    fechaReferencia: Date
): { fecha: Date | null, hora: { hora: number, minuto: number } | null, fechaEncontrada: boolean, horaEncontrada: boolean } {

    const fechaCalculada: Date | null = new Date(fechaReferencia);
    let fechaModificada = false;

    if (palabrasClave.dia_relativo?.toLowerCase() === 'mañana') {
        fechaCalculada.setDate(fechaCalculada.getDate() + 1);
        fechaModificada = true;
    } else if (palabrasClave.dia_relativo?.toLowerCase() === 'hoy') {
        fechaModificada = true;
    }

    if (palabrasClave.dia_semana) {
        const diasSemana = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
        const diaTarget = diasSemana.indexOf(palabrasClave.dia_semana.toLowerCase());
        if (diaTarget !== -1) {
            const diaActual = fechaCalculada.getDay();
            let diasAAñadir = diaTarget - diaActual;
            if (diasAAñadir <= 0) { diasAAñadir += 7; }
            fechaCalculada.setDate(fechaCalculada.getDate() + diasAAñadir);
            fechaModificada = true;
        }
    }

    if (palabrasClave.dia_mes) {
        fechaCalculada.setDate(palabrasClave.dia_mes);
        fechaModificada = true;
    }

    let horaCalculada: { hora: number, minuto: number } | null = null;
    let horaEncontrada = false;
    if (palabrasClave.hora_str) {
        const matchHora = palabrasClave.hora_str.match(/(\d{1,2}):?(\d{2})?/);
        if (matchHora) {
            let hora = parseInt(matchHora[1], 10);
            const minuto = matchHora[2] ? parseInt(matchHora[2], 10) : 0;

            if (palabrasClave.hora_str.toLowerCase().includes('pm') && hora < 12) { hora += 12; }
            if (palabrasClave.hora_str.toLowerCase().includes('am') && hora === 12) { hora = 0; }

            horaCalculada = { hora, minuto };
            horaEncontrada = true; // Marcamos que encontramos la hora

            if (fechaCalculada) {
                fechaCalculada.setHours(hora, minuto, 0, 0);
            }
        }
    }

    return {
        fecha: fechaModificada ? fechaCalculada : null,
        hora: horaCalculada,
        fechaEncontrada: fechaModificada, // Devolvemos si encontramos la fecha
        horaEncontrada: horaEncontrada      // Devolvemos si encontramos la hora
    };
}

function sonElMismoDia(fecha1: Date, fecha2: Date): boolean {
    return fecha1.getFullYear() === fecha2.getFullYear() &&
        fecha1.getMonth() === fecha2.getMonth() &&
        fecha1.getDate() === fecha2.getDate();
}

/**
 * NUEVA ACCIÓN: Busca y formatea las citas futuras de un usuario.
 */
async function ejecutarBuscarCitasAction(
    args: object, // No necesita argumentos
    fsmContexto: FsmContext
): Promise<ActionResult<{ content: string }>> {
    const { leadId } = fsmContexto;

    try {
        const citasFuturas = await prisma.agenda.findMany({
            where: {
                leadId: leadId,
                status: { in: [StatusAgenda.PENDIENTE, StatusAgenda.REAGENDADA] },
                fecha: { gte: new Date() }
            },
            orderBy: { fecha: 'asc' },
            take: 10 // Mostramos hasta 10 citas futuras
        });

        if (citasFuturas.length === 0) {
            return { success: true, data: { content: "No tienes ninguna cita futura agendada en este momento." } };
        }

        let mensajeLista = "Estas son tus próximas citas agendadas:\n";
        citasFuturas.forEach((cita, index) => {
            const fechaLegible = new Date(cita.fecha).toLocaleString('es-MX', { timeZone: 'America/Mexico_City', dateStyle: 'full', timeStyle: 'short' });
            mensajeLista += `\n${index + 1}. ${cita.asunto} el ${fechaLegible}`;
        });

        return { success: true, data: { content: mensajeLista } };

    } catch (error) {
        console.error("[ACTION ERROR] Error en ejecutarBuscarCitasAction:", error);
        return { success: false, error: "Tuve un problema al buscar tus citas." };
    }
}

/**
 * NUEVO SUB-GESTOR: Orquesta la tarea de simplemente buscar y mostrar citas.
 */
async function manejarBuscarCitas(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const { conversacionId, usuarioWaId, negocioPhoneNumberId } = contexto;

    // Esta tarea es tan simple que se ejecuta de inmediato.
    const resultado = await ejecutarBuscarCitasAction({}, contexto);

    if (resultado.success) {
        await enviarMensajeAsistente(conversacionId, resultado.data!.content, usuarioWaId, negocioPhoneNumberId);
    } else {
        await enviarMensajeAsistente(conversacionId, resultado.error || "Lo siento, algo salió mal.", usuarioWaId, negocioPhoneNumberId);
    }

    // Como la tarea es de una sola acción, la eliminamos inmediatamente después de completarla.
    await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });

    return { success: true, data: null };
}