'use server';

import prisma from '../../../prismaClient';
// import { Prisma } from '@prisma/client';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { AgendarCitaArgsFromAISchema, ConfiguracionAgendaDelNegocio } from './agendarCita.schemas';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from './agendarCita.helpers';

/**
 * VERSIÓN FINAL PARA RECOLECCIÓN DE DATOS (Canal-Aware)
 * Pide datos uno por uno y es consciente del canal (WhatsApp) para no pedir datos redundantes.
 */
export const ejecutarAgendarCitaAction: FunctionExecutor = async (argsFromIA, context) => {

    const validationResult = AgendarCitaArgsFromAISchema.safeParse(argsFromIA);
    if (!validationResult.success) { return { success: true, data: { content: "Hubo un malentendido con los datos, ¿empezamos de nuevo?" } }; }
    const args = validationResult.data;

    const config = await prisma.agendaConfiguracion.findUnique({ where: { negocioId: context.negocioId } });
    if (!config) return { success: false, error: `Configuración de agenda no encontrada para ${context.negocioId}.` };
    const configAgenda: ConfiguracionAgendaDelNegocio = {
        requiereNombre: config.requiereNombreParaCita,
        requiereEmail: config.requiereEmailParaCita,
        requiereTelefono: config.requiereTelefonoParaCita,
        bufferMinutos: config.bufferMinutos ?? 0,
        aceptaCitasVirtuales: config.aceptaCitasVirtuales,
        aceptaCitasPresenciales: config.aceptaCitasPresenciales,
    };

    if (!args.servicio_nombre) {
        const servicios = await prisma.agendaTipoCita.findMany({ where: { negocioId: context.negocioId, activo: true }, select: { nombre: true }, orderBy: { orden: 'asc' } });
        if (servicios.length === 0) return { success: true, data: { content: "Lo siento, no hay servicios configurados para agendar." } };
        const listaServicios = servicios.map(s => `- ${s.nombre}`).join('\n');
        return { success: true, data: { content: `¡Claro! Estos son nuestros servicios:\n\n${listaServicios}\n\n¿Cuál te gustaría agendar?` } };
    }
    const tipoCita = await prisma.agendaTipoCita.findFirst({ where: { nombre: { equals: args.servicio_nombre, mode: 'insensitive' }, negocioId: context.negocioId, activo: true } });
    if (!tipoCita) return { success: true, data: { content: `No encontré el servicio "${args.servicio_nombre}". ¿Podrías elegir uno de la lista?` } };

    if (!args.fecha_hora_deseada) {
        return { success: true, data: { content: `Perfecto, para "${tipoCita.nombre}". ¿Para qué fecha y hora te gustaría?` } };
    }
    const fechaHora = await parsearFechaHoraInteligente(args.fecha_hora_deseada);
    if (!fechaHora) return { success: true, data: { content: `No entendí bien la fecha y hora ('${args.fecha_hora_deseada}'). Intenta de nuevo, por ejemplo "mañana a las 3 pm".` } };

    const disponibilidad = await verificarDisponibilidadSlot({ negocioId: context.negocioId, agendaTipoCita: tipoCita, fechaHoraInicioDeseada: fechaHora, configAgenda: configAgenda });
    if (!disponibilidad.disponible) {
        return {
            success: true,
            data: {
                content: disponibilidad.mensaje || `El horario para "${tipoCita.nombre}" no está disponible. ¿Te gustaría proponer otro?`,
                aiContextData: { status: 'AVAILABILITY_FAILED', messageToAI: "Acabo de informar al usuario que su horario no estaba disponible..." }
            }
        };
    }

    if (configAgenda.requiereNombre && !args.nombre_contacto) {
        return { success: true, data: { content: `¡Muy bien! El horario de las ${fechaHora.toLocaleTimeString('es-MX', { timeStyle: 'short' })} está disponible. Para continuar, ¿cuál es tu nombre completo?` } };
    }
    if (configAgenda.requiereEmail && !args.email_contacto) {
        return { success: true, data: { content: `Gracias, ${args.nombre_contacto}. Ahora, ¿cuál es tu correo electrónico? (Ahí te enviaremos la confirmación).` } };
    }

    // --- LÓGICA CORREGIDA ---
    // Solo pedimos el teléfono si la configuración lo requiere Y NO estamos en WhatsApp.
    const esCanalWhatsApp = context.canalNombre?.toLowerCase() === 'whatsapp';
    if (configAgenda.requiereTelefono && !args.telefono_contacto && !esCanalWhatsApp) {
        return { success: true, data: { content: `¡Casi listo! Por último, ¿cuál es tu número de teléfono a 10 dígitos?` } };
    }

    // Si estamos en WhatsApp, tomamos el teléfono del Lead; si no, el que nos dieron.
    const lead = await prisma.lead.findUnique({ where: { id: context.leadId }, select: { telefono: true } });
    const telefonoFinal = esCanalWhatsApp ? lead?.telefono : args.telefono_contacto;

    const resumen = `¡Genial! Antes de agendar, por favor revisa los datos:\n- **Servicio:** ${tipoCita.nombre}\n- **Fecha:** ${fechaHora.toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short' })}\n- **Nombre:** ${args.nombre_contacto}\n- **Email:** ${args.email_contacto}\n- **Teléfono:** ${telefonoFinal}\n\n¿Es todo correcto para confirmar la cita?`;

    const datosParaConfirmar = {
        servicio_nombre: tipoCita.nombre,
        fecha_hora_deseada: fechaHora.toISOString(),
        nombre_contacto: args.nombre_contacto!,
        email_contacto: args.email_contacto!,
        telefono_contacto: telefonoFinal!,
        motivo_de_reunion: args.motivo_de_reunion,
        ofertaId: args.ofertaId,
    };

    return {
        success: true,
        data: {
            content: resumen,
            aiContextData: { status: 'CONFIRMATION_REQUIRED', nextActionName: 'confirmarCita', nextActionArgs: datosParaConfirmar }
        }
    };
};