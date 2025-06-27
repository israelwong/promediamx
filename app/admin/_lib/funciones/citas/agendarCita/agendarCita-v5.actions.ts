/**
 * Agendamiento de pcinripio a fin escenario 1
 */

'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { AgendarCitaArgsFromAISchema } from './agendarCita.schemas';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from './agendarCita.helpers';
import { format, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const WHATSAPP_CHANNEL_NAME = "WhatsApp";

/**
 * ==========================================================================================
 * VERSIÓN CANÓNICA FINAL: SIN ENSAMBLADOR DE CONTEXTO
 * ==========================================================================================
 * Esta versión confía 100% en la IA para agregar el contexto y solo se protege
 * con un filtro de saneamiento. Es la arquitectura más simple y robusta.
 * ==========================================================================================
 */
export const ejecutarAgendarCitaAction: FunctionExecutor = async (argsFromIA, context) => {

    console.log("--- DEBUG: EJECUTANDO vCANONICA (SIN ENSAMBLADOR) ---");

    // 1. CONTEXTO Y SANITIZACIÓN
    const { leadId, negocioId, canalNombre } = context;
    const argsSaneados = { ...argsFromIA };
    if (typeof argsSaneados.email_contacto === 'string') {
        const emailRegex = /.+@.+\..+/;
        if (!emailRegex.test(argsSaneados.email_contacto)) {
            console.log(`[Sanitización] Se detectó y eliminó un email inválido: "${argsSaneados.email_contacto}"`);
            delete argsSaneados.email_contacto;
        }
    }

    // 2. VALIDACIÓN: Trabajamos solo con lo que la IA nos da en este turno.
    const validation = AgendarCitaArgsFromAISchema.safeParse(argsSaneados);
    if (!validation.success) {
        return { success: false, error: "Argumentos inválidos de la IA.", validationErrors: validation.error.flatten().fieldErrors };
    }
    const argsCompletos = validation.data;

    // 3. LÓGICA DE RECOLECCIÓN: Simple y directa.
    const configDb = await prisma.agendaConfiguracion.findUnique({ where: { negocioId } });
    if (!configDb) return { success: false, error: `Configuración de agenda no encontrada.` };

    const configNegocio = {
        requiereNombre: configDb.requiereNombreParaCita,
        requiereEmail: configDb.requiereEmailParaCita,
        requiereTelefono: configDb.requiereTelefonoParaCita,
        bufferMinutos: configDb.bufferMinutos ?? 0,
        aceptaCitasVirtuales: configDb.aceptaCitasVirtuales,
        aceptaCitasPresenciales: configDb.aceptaCitasPresenciales,
    };

    // Si la IA no nos da el servicio (porque es el primer turno después del Kickstart)...
    if (!argsCompletos.servicio_nombre) {
        // Esta respuesta se activa si la IA olvida el servicio. El Kickstart ya mostró la lista.
        return { success: true, data: { content: "Perfecto, ¿para cuál de los servicios que te mencioné te gustaría agendar?" } };
    }

    const tipoCita = await prisma.agendaTipoCita.findFirst({ where: { nombre: { equals: argsCompletos.servicio_nombre, mode: 'insensitive' }, negocioId, activo: true } });
    if (!tipoCita) { return { success: true, data: { content: `Lo siento, no encontré el servicio "${argsCompletos.servicio_nombre}".` } }; }

    // Si la IA (a pesar de tener el dato) no nos lo pasó, se lo pedimos.
    if (!argsCompletos.fecha_hora_deseada) {
        return { success: true, data: { content: `Perfecto, para "${tipoCita.nombre}". ¿En qué fecha y hora te gustaría tu cita?` } };
    }

    const fechaHora = await parsearFechaHoraInteligente(argsCompletos.fecha_hora_deseada);
    if (!fechaHora) { return { success: true, data: { content: `No entendí bien la fecha y hora. Intenta de nuevo, por ejemplo: "mañana a las 4 pm".` } }; }

    if (isBefore(fechaHora, new Date())) {
        return { success: true, data: { content: "La fecha y hora que mencionaste parece ser en el pasado. Por favor, indícame una fecha y hora futuras." } };
    }

    const disponibilidad = await verificarDisponibilidadSlot({ negocioId, agendaTipoCita: tipoCita, fechaHoraInicioDeseada: fechaHora, configAgenda: configNegocio });
    if (!disponibilidad.disponible) { return { success: true, data: { content: disponibilidad.mensaje || `Lo siento, ese horario no está disponible. ¿Probamos con otro?`, aiContextData: { servicio_nombre: tipoCita.nombre } } }; }

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { nombre: true, email: true, telefono: true } });
    const nombreFinal = argsCompletos.nombre_contacto || lead?.nombre;
    const emailFinal = argsCompletos.email_contacto || lead?.email;
    const telefonoFinal = argsCompletos.telefono_contacto || lead?.telefono;

    if (configNegocio.requiereNombre && !nombreFinal) { return { success: true, data: { content: `¡Entendido! El horario está disponible. Para continuar, ¿a nombre de quién agendamos?` } }; }
    if (configNegocio.requiereEmail && !emailFinal) { return { success: true, data: { content: `¡Perfecto, ${nombreFinal}! Para enviarte la confirmación, ¿me das tu correo electrónico?` } }; }

    if (canalNombre !== WHATSAPP_CHANNEL_NAME && configNegocio.requiereTelefono && !telefonoFinal) {
        return { success: true, data: { content: `¡Gracias, ${nombreFinal}! Por último, ¿a qué número de teléfono podemos contactarte?` } };
    }

    // 4. PASE DE ESTAFETA
    const telefonoDiezDigitos = telefonoFinal && telefonoFinal.length > 10 ? telefonoFinal.slice(-10) : telefonoFinal;
    const resumen = `¡Estupendo! Solo para confirmar, los datos de tu cita son:\n\n- **Servicio:** ${tipoCita.nombre}\n- **Fecha y Hora:** ${format(fechaHora, "EEEE d 'de' MMMM, h:mm aa", { locale: es })}\n- **Nombre:** ${nombreFinal || 'No proporcionado'}\n- **Email:** ${emailFinal || 'No proporcionado'}\n- **Teléfono:** ${telefonoDiezDigitos || 'No proporcionado'}\n\n¿Es todo correcto para confirmar?`;

    const datosParaConfirmar = {
        servicio_nombre: tipoCita.nombre,
        fecha_hora_deseada: fechaHora.toISOString(),
        nombre_contacto: nombreFinal || null,
        email_contacto: emailFinal!,
        telefono_contacto: telefonoFinal || null,
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