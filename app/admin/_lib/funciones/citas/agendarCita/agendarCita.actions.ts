'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { AgendarCitaArgsFromAISchema } from './agendarCita.schemas';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from './agendarCita.helpers';
import { format, isBefore } from 'date-fns';
import { es } from 'date-fns/locale';
import { EstadoTareaConversacional } from '@prisma/client';

const WHATSAPP_CHANNEL_NAME = "WhatsApp";

export const ejecutarAgendarCitaAction: FunctionExecutor = async (argsFromIA, context) => {

    console.log("--- DEBUG: EJECUTANDO vGESTOR_DE_ESTADO ---");

    const { leadId, negocioId, conversacionId, canalNombre } = context;

    const validation = AgendarCitaArgsFromAISchema.safeParse(argsFromIA);
    if (!validation.success) {
        return { success: false, error: "Argumentos inválidos de la IA.", validationErrors: validation.error.flatten().fieldErrors };
    }
    const argsNuevosDeEsteTurno = validation.data;

    // --- GESTOR DE ESTADO DEL SERVIDOR (CORREGIDO) ---
    let tareaActiva = await prisma.tareaEnProgreso.findFirst({
        // ✅ Usamos el enum, no un string. Y buscamos tareas en el estado inicial correcto.
        where: { conversacionId, estado: EstadoTareaConversacional.INICIADA }
    });

    if (argsNuevosDeEsteTurno.iniciar_nuevo_flujo || !tareaActiva) {
        if (tareaActiva) {
            // ✅ Usamos el enum correcto para cancelar
            await prisma.tareaEnProgreso.update({
                where: { id: tareaActiva.id },
                data: { estado: EstadoTareaConversacional.CANCELADA_POR_USUARIO }
            });
        }
        tareaActiva = await prisma.tareaEnProgreso.create({
            data: {
                conversacionId,
                nombreTarea: 'agendarCita',
                contexto: argsNuevosDeEsteTurno,
                estado: EstadoTareaConversacional.INICIADA // ✅ Usamos el enum correcto
            }
        });
    } else {
        const contextoFusionado = { ...tareaActiva.contexto as object, ...argsNuevosDeEsteTurno };
        tareaActiva = await prisma.tareaEnProgreso.update({
            where: { id: tareaActiva.id },
            data: { contexto: contextoFusionado }
        });
    }

    const argsCompletos = tareaActiva.contexto as typeof argsNuevosDeEsteTurno;
    // --- FIN GESTOR DE ESTADO ---

    const configDb = await prisma.agendaConfiguracion.findUnique({ where: { negocioId } });
    if (!configDb) {
        return { success: false, error: `Configuración de agenda no encontrada.` };
    }

    // --- LÓGICA CONVERSACIONAL (REORDENADA: PRIMERO LA FECHA) ---

    // 1. Siempre pedimos la fecha y hora primero.
    if (!argsCompletos.fecha_hora_deseada) {
        return { success: true, data: { content: `Perfecto. Para iniciar, ¿en qué fecha y hora te gustaría tu cita?` } };
    }

    // 2. Parseamos y validamos la fecha proporcionada.
    const fechaHora = await parsearFechaHoraInteligente(argsCompletos.fecha_hora_deseada);
    if (!fechaHora) {
        return { success: true, data: { content: `No entendí bien la fecha y hora. Intenta de nuevo (ej: "mañana a las 2pm").` } };
    }
    if (isBefore(fechaHora, new Date())) {
        return { success: true, data: { content: "La fecha y hora que mencionaste parece ser en el pasado. Por favor, indícame una fecha y hora futuras." } };
    }

    // 3. Verificamos disponibilidad ANTES de pedir más datos.
    // Usamos un tipo de cita temporal solo para la validación inicial.
    const tipoCitaTemp = await prisma.agendaTipoCita.findFirst({ where: { negocioId, activo: true } });
    if (!tipoCitaTemp) {
        return { success: false, error: "No hay tipos de cita activos para este negocio." };
    }
    const configAgenda = {
        aceptaCitasPresenciales: configDb.aceptaCitasPresenciales,
        aceptaCitasVirtuales: configDb.aceptaCitasVirtuales,
        bufferMinutos: configDb.bufferMinutos ?? 0,
        requiereNombre: configDb.requiereNombreParaCita ?? false,
        requiereEmail: configDb.requiereEmailParaCita ?? false,
        requiereTelefono: configDb.requiereTelefonoParaCita ?? false,
    };
    const disponibilidad = await verificarDisponibilidadSlot({ negocioId, agendaTipoCita: tipoCitaTemp, fechaHoraInicioDeseada: fechaHora, configAgenda });

    if (!disponibilidad.disponible) {
        return {
            success: true,
            data: {
                content: disponibilidad.mensaje || `Lo siento, ese horario no está disponible. ¿Probamos con otro?`
            }
        };
    }

    // 4. Si el horario está libre, AHORA SÍ pedimos los demás detalles.
    if (!argsCompletos.servicio_nombre) {
        // Aquí podrías listar los servicios si es necesario.
        return { success: true, data: { content: `¡Excelente! El horario está disponible. Ahora, ¿para cuál de nuestros servicios te gustaría agendar?` } };
    }
    const tipoCita = await prisma.agendaTipoCita.findFirst({ where: { nombre: { equals: argsCompletos.servicio_nombre, mode: 'insensitive' }, negocioId, activo: true } });
    if (!tipoCita) {
        return { success: true, data: { content: `Lo siento, no encontré el servicio "${argsCompletos.servicio_nombre}".` } };
    }

    // 5. Recolectamos datos del lead.
    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { nombre: true, email: true, telefono: true } });
    const nombreFinal = argsCompletos.nombre_contacto || lead?.nombre;
    const emailFinal = argsCompletos.email_contacto || lead?.email;
    const telefonoFinal = argsCompletos.telefono_contacto || lead?.telefono;

    if (configDb.requiereNombreParaCita && !nombreFinal) {
        return { success: true, data: { content: `¡Ok, cita para "${tipoCita.nombre}"! Para continuar, ¿a nombre de quién agendamos?` } };
    }
    if (configDb.requiereEmailParaCita && !emailFinal) {
        return { success: true, data: { content: `¡Perfecto, ${nombreFinal}! Para enviarte la confirmación, ¿me das tu correo electrónico?` } };
    }
    if (canalNombre !== WHATSAPP_CHANNEL_NAME && configDb.requiereTelefonoParaCita && !telefonoFinal) {
        return { success: true, data: { content: `¡Gracias, ${nombreFinal}! Por último, ¿a qué número de teléfono podemos contactarte?` } };
    }

    // 6. Construimos y presentamos el resumen final.
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