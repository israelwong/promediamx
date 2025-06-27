'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';
import { AgendarCitaArgsFromAISchema, ConfiguracionAgendaDelNegocio, type AgendarCitaArgsFromAI } from './agendarCita.schemas';
import { parsearFechaHoraInteligente, verificarDisponibilidadSlot } from './agendarCita.helpers';
// import { type Agenda as AgendaModel, type AgendaTipoCita, Prisma } from '@prisma/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

export const ejecutarAgendarCitaAction: FunctionExecutor = async (argsFromIA, context) => {
    const { leadId, negocioId, conversacionId } = context;

    // --- ENSAMBLADOR DE CONTEXTO CONSCIENTE DEL CICLO DE VIDA ---
    const historialLlamadas = await prisma.interaccion.findMany({
        where: {
            conversacionId,
            role: 'assistant',
            parteTipo: 'FUNCTION_CALL',
            functionCallNombre: { in: ['agendarCita', 'confirmarCita', 'confirmarCancelacionCita', 'ejecutarReagendamientoConfirmado'] }
        },
        select: { functionCallNombre: true, functionCallArgs: true, createdAt: true },
        orderBy: { createdAt: 'asc' },
    });

    let contextoActivo: Partial<AgendarCitaArgsFromAI> = {};
    const funcionesTerminales = ['confirmarCita', 'confirmarCancelacionCita', 'ejecutarReagendamientoConfirmado'];

    // Encuentra la fecha de la última vez que una tarea se completó
    const ultimoReseteo = historialLlamadas
        .filter(llamada => funcionesTerminales.includes(llamada.functionCallNombre!))
        .pop()?.createdAt;

    // Construye el contexto solo con las llamadas a 'agendarCita' que ocurrieron DESPUÉS del último reseteo
    for (const llamada of historialLlamadas) {
        if (llamada.functionCallNombre === 'agendarCita') {
            if (!ultimoReseteo || llamada.createdAt > ultimoReseteo) {
                contextoActivo = { ...contextoActivo, ...(llamada.functionCallArgs as object) };
            }
        }
    }
    const args = { ...contextoActivo, ...argsFromIA };

    // Extractor de respaldo para el email
    const historialUsuario = await prisma.interaccion.findFirst({
        where: { conversacionId, role: 'user' }, orderBy: { createdAt: 'desc' }, select: { mensajeTexto: true }
    });
    if (!args.email_contacto && historialUsuario?.mensajeTexto) {
        const emailRegex = /[\w\.\-]+@[\w\.\-]+\.\w+/;
        const emailEncontrado = historialUsuario.mensajeTexto.match(emailRegex);
        if (emailEncontrado) args.email_contacto = emailEncontrado[0];
    }

    const validation = AgendarCitaArgsFromAISchema.safeParse(args);
    const argsValidados = validation.data || {};

    const configDb = await prisma.agendaConfiguracion.findUnique({ where: { negocioId } });
    if (!configDb) return { success: false, error: `Configuración de agenda no encontrada.` };

    const configParaHelper: ConfiguracionAgendaDelNegocio = {
        requiereNombre: configDb.requiereNombreParaCita,
        requiereEmail: configDb.requiereEmailParaCita,
        requiereTelefono: configDb.requiereTelefonoParaCita,
        bufferMinutos: configDb.bufferMinutos ?? 0,
        aceptaCitasVirtuales: configDb.aceptaCitasVirtuales,
        aceptaCitasPresenciales: configDb.aceptaCitasPresenciales,
    };

    if (!argsValidados.servicio_nombre) {
        const servicios = await prisma.agendaTipoCita.findMany({ where: { negocioId, activo: true }, select: { nombre: true }, orderBy: { orden: 'asc' } });
        if (servicios.length === 0) return { success: true, data: { content: "Lo siento, no hay servicios para agendar." } };
        const listaServicios = servicios.map(s => `- ${s.nombre}`).join('\n');
        return { success: true, data: { content: `¡Claro! ¿Para cuál de los siguientes servicios te gustaría agendar?\n\n${listaServicios}` } };
    }

    const tipoCita = await prisma.agendaTipoCita.findFirst({ where: { nombre: { equals: argsValidados.servicio_nombre, mode: 'insensitive' }, negocioId, activo: true } });
    if (!tipoCita) return { success: true, data: { content: `No encontré el servicio "${argsValidados.servicio_nombre}".` } };

    if (!argsValidados.fecha_hora_deseada) {
        return { success: true, data: { content: `Perfecto, para "${tipoCita.nombre}". ¿Para qué fecha y hora te gustaría?` } };
    }

    const fechaHora = await parsearFechaHoraInteligente(argsValidados.fecha_hora_deseada);
    if (!fechaHora) return { success: true, data: { content: `No entendí bien la fecha y hora. Intenta de nuevo.` } };

    const disponibilidad = await verificarDisponibilidadSlot({ negocioId, agendaTipoCita: tipoCita, fechaHoraInicioDeseada: fechaHora, configAgenda: configParaHelper });
    if (!disponibilidad.disponible) return { success: true, data: { content: disponibilidad.mensaje || `Ese horario no está disponible. ¿Probamos con otro?`, aiContextData: { status: 'AVAILABILITY_FAILED' } } };

    const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { nombre: true, email: true, telefono: true } });
    const nombreFinal = lead?.nombre || 'Cliente';
    const emailFinal = argsValidados.email_contacto || lead?.email;

    if (configParaHelper.requiereEmail && !emailFinal) {
        return { success: true, data: { content: `¡Excelente! El horario de las ${fechaHora.toLocaleTimeString('es-MX', { timeStyle: 'short' })} está disponible. Para finalizar, por favor, indícame tu correo electrónico.` } };
    }

    const telefonoCompleto = lead?.telefono;
    const telefonoDiezDigitos = telefonoCompleto && telefonoCompleto.length > 10 ? telefonoCompleto.slice(-10) : telefonoCompleto;
    const resumen = `¡Perfecto! Revisa que los datos sean correctos:\n\n- **Servicio:** ${tipoCita.nombre}\n- **Fecha y Hora:** ${format(fechaHora, "EEEE d 'de' MMMM, h:mm aa", { locale: es })}\n- **Nombre:** ${nombreFinal}\n- **Email:** ${emailFinal}\n- **Teléfono:** ${telefonoDiezDigitos || 'No proporcionado'}\n\n¿Es todo correcto para confirmar?`;

    const datosParaConfirmar = { servicio_nombre: tipoCita.nombre, fecha_hora_deseada: fechaHora.toISOString(), nombre_contacto: nombreFinal, email_contacto: emailFinal!, telefono_contacto: telefonoCompleto!, motivo_de_reunion: argsValidados.motivo_de_reunion, ofertaId: argsValidados.ofertaId };

    return {
        success: true,
        data: {
            content: resumen,
            aiContextData: { nextActionName: 'confirmarCita', nextActionArgs: datosParaConfirmar }
        }
    };
};
