// Ruta: app/admin/_lib/funciones/citas/agendarCita/agendarCita.actions.ts
'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { AgendarCitaArgsFromAISchema, ConfiguracionAgendaDelNegocio, type AgendarCitaArgsFromAI } from './agendarCita.schemas';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from './agendarCita.helpers';
import { InteraccionParteTipo } from '@prisma/client';

/**
 * VERSIÓN 3 - CON ENSAMBLADOR DE CONTEXTO
 * Esta versión es robusta contra la pérdida de contexto de la IA.
 * Centraliza la lógica de recordar los datos en el backend para un flujo más predecible.
 */
export const ejecutarAgendarCitaActionV3: FunctionExecutor = async (argsFromIA, context) => {

    // 1. --- INICIO: ENSAMBLADOR DE CONTEXTO ---
    // Busca todas las llamadas previas a 'agendarCita' en esta conversación.
    const historialLlamadas = await prisma.interaccion.findMany({
        where: {
            conversacionId: context.conversacionId, // Requiere que el dispatcher pase conversacionId
            role: 'assistant',
            parteTipo: InteraccionParteTipo.FUNCTION_CALL,
            functionCallNombre: 'agendarCita'
        },
        select: { functionCallArgs: true },
        orderBy: { createdAt: 'asc' } // Procesar en orden cronológico
    });

    // Reconstruye el contexto agregando los argumentos de cada llamada pasada.
    let contextoAgregado: Partial<AgendarCitaArgsFromAI> = {};
    for (const llamada of historialLlamadas) {
        const argsAnteriores = llamada.functionCallArgs as Partial<AgendarCitaArgsFromAI>;
        if (argsAnteriores) {
            contextoAgregado = { ...contextoAgregado, ...argsAnteriores };
        }
    }

    // Fusiona el contexto histórico con los nuevos argumentos de la IA.
    const args = { ...contextoAgregado, ...argsFromIA };
    // --- FIN: ENSAMBLADOR DE CONTEXTO ---


    // 2. Valida el conjunto de argumentos completo.
    const validationResult = AgendarCitaArgsFromAISchema.safeParse(args);
    if (!validationResult.success) {
        console.error("Error de validación Zod en AgendarCita V3 con args ensamblados:", validationResult.error);
        return { success: true, data: { content: "Hubo un malentendido con los datos, ¿podemos empezar de nuevo para asegurarnos de que todo esté correcto?" } };
    }
    const argsValidados = validationResult.data;


    // 3. Obtiene la configuración de la agenda del negocio.
    const config = await prisma.agendaConfiguracion.findUnique({ where: { negocioId: context.negocioId } });
    if (!config) {
        return { success: false, error: `Configuración de agenda no encontrada para el negocio ${context.negocioId}.` };
    }
    const configAgenda: ConfiguracionAgendaDelNegocio = {
        requiereNombre: config.requiereNombreParaCita,
        requiereEmail: config.requiereEmailParaCita,
        requiereTelefono: config.requiereTelefonoParaCita,
        bufferMinutos: config.bufferMinutos ?? 0,
        aceptaCitasVirtuales: config.aceptaCitasVirtuales,
        aceptaCitasPresenciales: config.aceptaCitasPresenciales,
    };


    // 4. --- INICIO: CASCADA CONVERSACIONAL ---

    // Paso 4.1: ¿Falta el servicio? Pídelo.
    if (!argsValidados.servicio_nombre) {
        const servicios = await prisma.agendaTipoCita.findMany({ where: { negocioId: context.negocioId, activo: true }, select: { nombre: true }, orderBy: { orden: 'asc' } });
        if (servicios.length === 0) {
            return { success: true, data: { content: "Lo siento, parece que no hay servicios disponibles para agendar en este momento." } };
        }
        const listaServicios = servicios.map(s => `- ${s.nombre}`).join('\n');
        return { success: true, data: { content: `¡Claro! Con gusto. ¿Para cuál de los siguientes servicios te gustaría agendar tu cita?\n\n${listaServicios}` } };
    }

    // Valida el servicio una vez que se proporciona.
    const tipoCita = await prisma.agendaTipoCita.findFirst({ where: { nombre: { equals: argsValidados.servicio_nombre, mode: 'insensitive' }, negocioId: context.negocioId, activo: true } });
    if (!tipoCita) {
        return { success: true, data: { content: `No pude encontrar el servicio "${argsValidados.servicio_nombre}". Por favor, asegúrate de escribirlo exactamente como aparece en la lista.` } };
    }

    // Paso 4.2: ¿Falta la fecha y hora? Pídela.
    if (!argsValidados.fecha_hora_deseada) {
        return { success: true, data: { content: `Perfecto, para el servicio de "${tipoCita.nombre}". Ahora, por favor, dime ¿qué día y a qué hora te gustaría tu cita?` } };
    }

    // Valida la fecha/hora y verifica la disponibilidad.
    const fechaHora = await parsearFechaHoraInteligente(argsValidados.fecha_hora_deseada);
    if (!fechaHora) {
        return { success: true, data: { content: `No entendí bien la fecha y hora que mencionaste ('${argsValidados.fecha_hora_deseada}'). ¿Podrías intentarlo de nuevo? Por ejemplo: "mañana a las 3 pm".` } };
    }

    const disponibilidad = await verificarDisponibilidadSlot({ negocioId: context.negocioId, agendaTipoCita: tipoCita, fechaHoraInicioDeseada: fechaHora, configAgenda: configAgenda });
    if (!disponibilidad.disponible) {
        return {
            success: true,
            data: {
                content: disponibilidad.mensaje || `El horario que solicitaste para "${tipoCita.nombre}" ya no está disponible. ¿Te gustaría intentar con otra fecha u hora?`,
                aiContextData: { status: 'AVAILABILITY_FAILED', messageToAI: "Informé al usuario que el horario no estaba disponible y le pedí uno nuevo." }
            }
        };
    }

    // Paso 4.3: ¿Faltan datos de contacto? Pídelos todos juntos.
    const datosFaltantes: string[] = [];
    if (configAgenda.requiereNombre && !argsValidados.nombre_contacto) {
        datosFaltantes.push("tu nombre completo");
    }
    if (configAgenda.requiereEmail && !argsValidados.email_contacto) {
        datosFaltantes.push("tu correo electrónico");
    }
    const esCanalWhatsApp = context.canalNombre?.toLowerCase() === 'whatsapp';
    if (configAgenda.requiereTelefono && !argsValidados.telefono_contacto && !esCanalWhatsApp) {
        datosFaltantes.push("tu número de teléfono a 10 dígitos");
    }

    if (datosFaltantes.length > 0) {
        const datosAPedir = datosFaltantes.map((dato, index) => {
            if (index === datosFaltantes.length - 1 && datosFaltantes.length > 1) return ` y ${dato}`;
            if (index > 0) return `, ${dato}`;
            return dato;
        }).join('');
        return {
            success: true,
            data: { content: `¡Excelente! El horario de las ${fechaHora.toLocaleTimeString('es-MX', { timeStyle: 'short' })} está disponible. Para continuar, por favor, indícame ${datosAPedir}.` }
        };
    }

    // --- FIN: CASCADA CONVERSACIONAL ---


    // 5. Si todos los datos están presentes, construye el resumen y prepara el pase de estafeta.
    const lead = await prisma.lead.findUnique({ where: { id: context.leadId }, select: { telefono: true } });
    const telefonoFinal = esCanalWhatsApp ? lead?.telefono : argsValidados.telefono_contacto;

    const resumen = `¡Perfecto! Revisa que los datos de tu cita sean correctos:\n\n- **Servicio:** ${tipoCita.nombre}\n- **Fecha y Hora:** ${fechaHora.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}\n- **Nombre:** ${argsValidados.nombre_contacto}\n- **Email:** ${argsValidados.email_contacto}\n- **Teléfono:** ${telefonoFinal || 'No proporcionado'}\n\n¿Es todo correcto para confirmar la cita?`;

    const datosParaConfirmar = {
        servicio_nombre: tipoCita.nombre,
        fecha_hora_deseada: fechaHora.toISOString(),
        nombre_contacto: argsValidados.nombre_contacto!,
        email_contacto: argsValidados.email_contacto!,
        telefono_contacto: telefonoFinal!,
        motivo_de_reunion: argsValidados.motivo_de_reunion,
        ofertaId: argsValidados.ofertaId,
    };

    return {
        success: true,
        data: {
            content: resumen,
            aiContextData: { status: 'CONFIRMATION_REQUIRED', nextActionName: 'confirmarCita', nextActionArgs: datosParaConfirmar }
        }
    };
};