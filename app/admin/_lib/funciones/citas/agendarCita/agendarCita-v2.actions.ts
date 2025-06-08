// Ruta: app/admin/_lib/funciones/citas/agendarCita/agendarCita.actions.ts

'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { AgendarCitaArgsFromAISchema, ConfiguracionAgendaDelNegocio } from './agendarCita.schemas';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from './agendarCita.helpers';

/**
 * VERSIÓN MEJORADA (v2) - Recolección de datos optimizada para WhatsApp
 * Elimina pausas y agrupa la solicitud de datos de contacto en un solo mensaje.
 */
export const ejecutarAgendarCitaActionV2: FunctionExecutor = async (argsFromIA, context) => {

    const validationResult = AgendarCitaArgsFromAISchema.safeParse(argsFromIA);
    // Una validación fallida aquí es rara, pero si ocurre, es mejor reiniciar.
    if (!validationResult.success) {
        return { success: true, data: { content: "Hubo un malentendido con los datos, ¿podemos empezar de nuevo para asegurarnos de que todo esté correcto?" } };
    }
    const args = validationResult.data;

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

    // 1. ¿Falta el servicio? Pídelo.
    if (!args.servicio_nombre) {
        const servicios = await prisma.agendaTipoCita.findMany({ where: { negocioId: context.negocioId, activo: true }, select: { nombre: true }, orderBy: { orden: 'asc' } });
        if (servicios.length === 0) {
            return { success: true, data: { content: "Lo siento, parece que no hay servicios disponibles para agendar en este momento." } };
        }
        const listaServicios = servicios.map(s => `- ${s.nombre}`).join('\n');
        return { success: true, data: { content: `¡Claro! Con gusto. ¿Para cuál de los siguientes servicios te gustaría agendar tu cita?\n\n${listaServicios}` } };
    }

    // Valida el servicio una vez proporcionado.
    const tipoCita = await prisma.agendaTipoCita.findFirst({ where: { nombre: { equals: args.servicio_nombre, mode: 'insensitive' }, negocioId: context.negocioId, activo: true } });
    if (!tipoCita) {
        return { success: true, data: { content: `No pude encontrar el servicio "${args.servicio_nombre}". Por favor, asegúrate de escribirlo exactamente como aparece en la lista.` } };
    }

    // 2. ¿Falta la fecha y hora? Pídela.
    if (!args.fecha_hora_deseada) {
        return { success: true, data: { content: `Perfecto, para el servicio de "${tipoCita.nombre}". Ahora, por favor, dime ¿qué día y a qué hora te gustaría tu cita?` } };
    }

    // Valida la fecha y hora y verifica disponibilidad.
    const fechaHora = await parsearFechaHoraInteligente(args.fecha_hora_deseada);
    if (!fechaHora) {
        return { success: true, data: { content: `No entendí bien la fecha y hora que mencionaste ('${args.fecha_hora_deseada}'). ¿Podrías intentarlo de nuevo? Por ejemplo: "mañana a las 3 pm" o "el próximo martes a las 10:30 am".` } };
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

    // --- INICIO DE LA LÓGICA MEJORADA ---

    // 3. Verifica TODOS los datos de contacto que faltan.
    const datosFaltantes: string[] = [];
    if (configAgenda.requiereNombre && !args.nombre_contacto) {
        datosFaltantes.push("tu nombre completo");
    }
    if (configAgenda.requiereEmail && !args.email_contacto) {
        datosFaltantes.push("tu correo electrónico");
    }

    const esCanalWhatsApp = context.canalNombre?.toLowerCase() === 'whatsapp';
    if (configAgenda.requiereTelefono && !args.telefono_contacto && !esCanalWhatsApp) {
        datosFaltantes.push("tu número de teléfono a 10 dígitos");
    }

    // Si falta algún dato de contacto, pídelos TODOS JUNTOS.
    if (datosFaltantes.length > 0) {
        const datosAPedir = datosFaltantes.join(' y ');
        return {
            success: true,
            data: {
                content: `¡Excelente! El horario de las ${fechaHora.toLocaleTimeString('es-MX', { timeStyle: 'short' })} está disponible. Para continuar, por favor, indícame ${datosAPedir}.`
            }
        };
    }

    // 4. Si todos los datos están presentes, construye el resumen para confirmar.
    const lead = await prisma.lead.findUnique({ where: { id: context.leadId }, select: { telefono: true } });
    const telefonoFinal = esCanalWhatsApp ? lead?.telefono : args.telefono_contacto;

    const resumen = `¡Perfecto! Revisa que los datos de tu cita sean correctos:\n\n- **Servicio:** ${tipoCita.nombre}\n- **Fecha y Hora:** ${fechaHora.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short' })}\n- **Nombre:** ${args.nombre_contacto}\n- **Email:** ${args.email_contacto}\n- **Teléfono:** ${telefonoFinal}\n\n¿Es todo correcto para confirmar la cita?`;

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