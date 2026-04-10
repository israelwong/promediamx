'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { AgendarCitaArgsFromAISchema, type ConfiguracionAgendaDelNegocio, type AgendarCitaArgsFromAI } from './agendarCita.schemas';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from './agendarCita.helpers';
import { format, addDays, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const WHATSAPP_CHANNEL_NAME = "WhatsApp"; // Para la comparación

/**
 * ==========================================================================================
 * FUNCIÓN RECOLECTORA ESPECIALIZADA: agendarCita (VERSIÓN FINAL COMPLETA)
 * ==========================================================================================
 * Propósito: Guía al usuario para recolectar los detalles de una cita (fecha, hora, contacto)
 * para un servicio que ya ha sido pre-seleccionado.
 * ==========================================================================================
 */
export const ejecutarAgendarCitaAction: FunctionExecutor = async (argsFromIA, context) => {
    // 1. CONTEXTO Y SANITIZACIÓN
    const { leadId, negocioId, conversacionId, canalNombre } = context;
    const argsSaneados = { ...argsFromIA };
    if (typeof argsSaneados.email_contacto === 'string' && !argsSaneados.email_contacto.includes('@')) {
        delete argsSaneados.email_contacto;
    }

    // 2. VALIDACIÓN
    const validation = AgendarCitaArgsFromAISchema.safeParse(argsSaneados);
    if (!validation.success) {
        console.error("[Agendar Cita] Validación de argumentos de IA fallida:", validation.error.flatten().fieldErrors);
        return { success: false, error: "Argumentos inválidos de la IA.", validationErrors: validation.error.flatten().fieldErrors };
    }
    const argsNuevos = validation.data;

    // 3. ENSAMBLADOR DE CONTEXTO
    let contextoActivo: Partial<AgendarCitaArgsFromAI> = {};
    if (!argsNuevos.iniciar_nuevo_flujo) {
        const historialLlamadas = await prisma.interaccion.findMany({
            where: {
                conversacionId,
                role: 'assistant',
                parteTipo: 'FUNCTION_CALL',
                createdAt: { gte: addDays(new Date(), -1) }, // Optimización: solo buscar en el último día
                functionCallNombre: { in: ['agendarCita', 'confirmarCita', 'confirmarCancelacionCita', 'confirmarReagendamiento'] }
            },
            select: { functionCallNombre: true, functionCallArgs: true, createdAt: true },
            orderBy: { createdAt: 'asc' },
        });

        const funcionesTerminales = ['confirmarCita', 'confirmarCancelacionCita', 'confirmarReagendamiento'];
        const ultimoReseteo = historialLlamadas
            .filter(llamada => funcionesTerminales.includes(llamada.functionCallNombre!))
            .pop()?.createdAt;

        for (const llamada of historialLlamadas) {
            if (llamada.functionCallNombre === 'agendarCita' && (!ultimoReseteo || llamada.createdAt > ultimoReseteo)) {
                contextoActivo = { ...contextoActivo, ...(llamada.functionCallArgs as object) };
            }
        }
    }
    const argsCompletos = { ...contextoActivo, ...argsNuevos };

    // 4. LÓGICA DE RECOLECCIÓN
    const configDb = await prisma.agendaConfiguracion.findUnique({ where: { negocioId } });
    if (!configDb) return { success: false, error: `Configuración de agenda no encontrada.` };
    const configNegocio: ConfiguracionAgendaDelNegocio = {
        requiereNombre: configDb.requiereNombreParaCita,
        requiereEmail: configDb.requiereEmailParaCita,
        requiereTelefono: configDb.requiereTelefonoParaCita,
        bufferMinutos: configDb.bufferMinutos ?? 0,
        aceptaCitasVirtuales: configDb.aceptaCitasVirtuales,
        aceptaCitasPresenciales: configDb.aceptaCitasPresenciales,
    };

    if (!argsCompletos.servicio_nombre) {
        // Este caso no debería ocurrir si el Kickstart funciona, pero es una buena salvaguarda.
        return { success: true, data: { content: "Para continuar, por favor, elige uno de los servicios que te mencioné." } };
    }

    const tipoCita = await prisma.agendaTipoCita.findFirst({ where: { nombre: { equals: argsCompletos.servicio_nombre, mode: 'insensitive' }, negocioId, activo: true } });
    if (!tipoCita) { return { success: true, data: { content: `Lo siento, no encontré el servicio "${argsCompletos.servicio_nombre}".` } }; }

    if (!argsCompletos.fecha_hora_deseada) {
        return { success: true, data: { content: `Perfecto, para el servicio de "${tipoCita.nombre}". ¿En qué fecha y hora te gustaría tu cita?` } };
    }

    const fechaHora = await parsearFechaHoraInteligente(argsCompletos.fecha_hora_deseada);
    if (!fechaHora) { return { success: true, data: { content: `No entendí bien la fecha y hora. Intenta de nuevo, por ejemplo: "mañana a las 4 pm".` } }; }

    if (isBefore(fechaHora, new Date())) {
        return { success: true, data: { content: "La fecha y hora que mencionaste parece ser en el pasado. Por favor, indícame una fecha y hora futuras." } };
    }

    const disponibilidad = await verificarDisponibilidadSlot({ negocioId, agendaTipoCita: tipoCita, fechaHoraInicioDeseada: fechaHora, configAgenda: configNegocio });
    if (!disponibilidad.disponible) { return { success: true, data: { content: disponibilidad.mensaje || `Lo siento, ese horario no está disponible. ¿Te gustaría intentar con otro?`, aiContextData: { servicio_nombre: tipoCita.nombre } } }; }

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { nombre: true, email: true, telefono: true } });
    const nombreFinal = argsCompletos.nombre_contacto || lead?.nombre || null;
    const emailFinal = argsCompletos.email_contacto || lead?.email || null;
    const telefonoFinal = argsCompletos.telefono_contacto || lead?.telefono || null;


    if (configNegocio.requiereNombre && !nombreFinal) { return { success: true, data: { content: `¡Entendido! El horario está disponible. Para continuar, ¿a nombre de quién agendamos?` } }; }
    if (configNegocio.requiereEmail && !emailFinal) { return { success: true, data: { content: `¡Perfecto, ${nombreFinal}! Para enviarte la confirmación, ¿me das tu correo electrónico?` } }; }

    if (canalNombre !== WHATSAPP_CHANNEL_NAME && configNegocio.requiereTelefono && !telefonoFinal) {
        return { success: true, data: { content: `¡Gracias, ${nombreFinal}! Por último, ¿a qué número de teléfono podemos contactarte?` } };
    }

    // 5. PASE DE ESTAFETA
    const telefonoDiezDigitos = telefonoFinal && telefonoFinal.length > 10 ? telefonoFinal.slice(-10) : telefonoFinal;
    const resumen = `¡Estupendo! Solo para confirmar, los datos de tu cita son:\n\n- **Servicio:** ${tipoCita.nombre}\n- **Fecha y Hora:** ${format(fechaHora, "EEEE d 'de' MMMM, h:mm aa", { locale: es })}\n- **Nombre:** ${nombreFinal || 'No proporcionado'}\n- **Email:** ${emailFinal || 'No proporcionado'}\n- **Teléfono:** ${telefonoDiezDigitos || 'No proporcionado'}\n\n¿Es todo correcto para confirmar?`;

    const datosParaConfirmar = {
        servicio_nombre: tipoCita.nombre,
        fecha_hora_deseada: fechaHora.toISOString(),
        nombre_contacto: nombreFinal,
        email_contacto: emailFinal!, // El email sí es requerido para llegar a este punto
        telefono_contacto: telefonoFinal,
        motivo_de_reunion: argsCompletos.motivo_de_reunion || null,
        oferta_id: argsCompletos.oferta_id || null,
    };

    return {
        success: true,
        data: {
            content: resumen,
            aiContextData: { nextActionName: 'confirmarCita', nextActionArgs: datosParaConfirmar }
        }
    };
};