'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { AgendarCitaArgsFromAISchema } from './agendarCita.schemas';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from './agendarCita.helpers';
import { format, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';

const WHATSAPP_CHANNEL_NAME = "WhatsApp";

export const ejecutarAgendarCitaAction: FunctionExecutor = async (argsFromIA, context) => {

    console.log("--- DEBUG: EJECUTANDO vGESTOR_DE_ESTADO ---");

    const { leadId, negocioId, conversacionId, canalNombre } = context;

    const validation = AgendarCitaArgsFromAISchema.safeParse(argsFromIA);
    if (!validation.success) {
        return { success: false, error: "Argumentos inválidos de la IA.", validationErrors: validation.error.flatten().fieldErrors };
    }
    const argsNuevosDeEsteTurno = validation.data;

    // =========================================================================
    // GESTOR DE ESTADO DEL SERVIDOR
    // =========================================================================
    let tareaActiva = await prisma.tareaEnProgreso.findUnique({
        where: { conversacionId, status: 'ACTIVA' }
    });

    // Si la IA pide iniciar un nuevo flujo o no hay tarea activa, creamos una nueva.
    if (argsNuevosDeEsteTurno.iniciar_nuevo_flujo || !tareaActiva) {
        // Si existía una tarea anterior, la marcamos como cancelada para evitar conflictos.
        if (tareaActiva) {
            await prisma.tareaEnProgreso.update({ where: { id: tareaActiva.id }, data: { status: 'CANCELADA' } });
        }
        tareaActiva = await prisma.tareaEnProgreso.create({
            data: {
                conversacionId,
                nombreTarea: 'agendarCita',
                contexto: argsNuevosDeEsteTurno,
                status: 'ACTIVA'
            }
        });
    } else {
        // Si ya hay una tarea activa, fusionamos el contexto viejo con el nuevo.
        const contextoFusionado = { ...tareaActiva.contexto as object, ...argsNuevosDeEsteTurno };
        tareaActiva = await prisma.tareaEnProgreso.update({
            where: { id: tareaActiva.id },
            data: { contexto: contextoFusionado }
        });
    }

    const argsCompletos = tareaActiva.contexto as typeof argsNuevosDeEsteTurno;
    // =========================================================================

    // A partir de aquí, la lógica es la misma, pero ahora `argsCompletos` es 100% fiable.
    const configDb = await prisma.agendaConfiguracion.findUnique({ where: { negocioId } });
    if (!configDb) return { success: false, error: `Configuración de agenda no encontrada.` };

    // ... (El resto de la lógica de recolección de datos y pase de estafeta se mantiene exactamente igual)

    if (!argsCompletos.servicio_nombre) {
        return { success: true, data: { content: "Perfecto, ¿para cuál de los servicios que te mencioné te gustaría agendar?" } };
    }
    const tipoCita = await prisma.agendaTipoCita.findFirst({ where: { nombre: { equals: argsCompletos.servicio_nombre, mode: 'insensitive' }, negocioId, activo: true } });
    if (!tipoCita) { return { success: true, data: { content: `Lo siento, no encontré el servicio "${argsCompletos.servicio_nombre}".` } }; }

    if (!argsCompletos.fecha_hora_deseada) {
        return { success: true, data: { content: `Perfecto, para "${tipoCita.nombre}". ¿En qué fecha y hora te gustaría tu cita?` } };
    }

    const fechaHora = await parsearFechaHoraInteligente(argsCompletos.fecha_hora_deseada);
    if (!fechaHora) { return { success: true, data: { content: `No entendí bien la fecha y hora. Intenta de nuevo.` } }; }

    if (isBefore(fechaHora, new Date())) {
        return { success: true, data: { content: "La fecha y hora que mencionaste parece ser en el pasado. Por favor, indícame una fecha y hora futuras." } };
    }

    const configAgenda = {
        aceptaCitasPresenciales: configDb.aceptaCitasPresenciales,
        aceptaCitasVirtuales: configDb.aceptaCitasVirtuales,
        bufferMinutos: configDb.bufferMinutos ?? 0,
        requiereNombre: configDb.requiereNombreParaCita,
        requiereEmail: configDb.requiereEmailParaCita,
        requiereTelefono: configDb.requiereTelefonoParaCita,
    };
    const disponibilidad = await verificarDisponibilidadSlot({ negocioId, agendaTipoCita: tipoCita, fechaHoraInicioDeseada: fechaHora, configAgenda });
    if (!disponibilidad.disponible) { return { success: true, data: { content: disponibilidad.mensaje || `Lo siento, ese horario no está disponible. ¿Probamos con otro?`, aiContextData: { servicio_nombre: tipoCita.nombre } } }; }

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { nombre: true, email: true, telefono: true } });
    const nombreFinal = argsCompletos.nombre_contacto || lead?.nombre;
    const emailFinal = argsCompletos.email_contacto || lead?.email;
    const telefonoFinal = argsCompletos.telefono_contacto || lead?.telefono;

    if (configDb.requiereNombreParaCita && !nombreFinal) { return { success: true, data: { content: `¡Entendido! El horario está disponible. Para continuar, ¿a nombre de quién agendamos?` } }; }
    if (configDb.requiereEmailParaCita && !emailFinal) { return { success: true, data: { content: `¡Perfecto, ${nombreFinal}! Para enviarte la confirmación, ¿me das tu correo electrónico?` } }; }

    if (canalNombre !== WHATSAPP_CHANNEL_NAME && configDb.requiereTelefonoParaCita && !telefonoFinal) {
        return { success: true, data: { content: `¡Gracias, ${nombreFinal}! Por último, ¿a qué número de teléfono podemos contactarte?` } };
    }

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