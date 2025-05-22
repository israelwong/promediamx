// app/admin/_lib/actions/agendaCrm/agendaCrm.actions.ts
'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { startOfDay, endOfDay } from 'date-fns'; // Para el rango de "hoy"

import {
    listarCitasLeadParamsSchema,
    AgendaCrmItemData,
    agendaCrmItemSchema, // Para validar salida de listarCitas
    obtenerDatosFormularioCitaParamsSchema,
    DatosFormularioCitaData,
    crearCitaLeadParamsSchema,
    editarCitaLeadParamsSchema,
    eliminarCitaLeadParamsSchema,
    listarEventosAgendaParamsSchema,
    ObtenerEventosAgendaResultData,
    AgendaEventoData, // Para el tipo de retorno

    StatusAgenda,
    listarCitasAgendaParamsSchema, // Nuevo nombre
    ListarCitasAgendaResultData, // Nuevo nombre
    CitaDelDiaData,
    statusAgendaEnum,
} from './agendaCrm.schemas';
import { z } from 'zod';
import { startOfMonth, endOfMonth } from 'date-fns';
// import { revalidatePath } from 'next/cache'; // Si necesitas revalidar

// Acción para listar citas de un Lead
export async function listarCitasLeadAction(
    params: z.infer<typeof listarCitasLeadParamsSchema>
): Promise<ActionResult<AgendaCrmItemData[]>> {
    const validation = listarCitasLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de Lead inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { leadId } = validation.data;

    try {
        const citasPrisma = await prisma.agenda.findMany({
            where: { leadId: leadId },
            include: {
                agente: { select: { id: true, nombre: true } }, // Incluir datos del agente
                // negocio: { select: { id: true, nombre: true } } // Si necesitas datos del negocio
            },
            orderBy: { fecha: 'desc' }, // O 'asc' según preferencia
        });

        // Mapear y validar con Zod
        const mappedData = citasPrisma.map(cita => ({
            ...cita, // Incluye todos los campos de Agenda
            tipo: cita.tipo as AgendaCrmItemData['tipo'], // Cast al enum, asume que los datos son válidos
            status: cita.status as AgendaCrmItemData['status'], // Cast al enum
            agente: cita.agente ? { id: cita.agente.id, nombre: cita.agente.nombre ?? null } : null,
            negocioId: cita.negocioId, // Asegurar que el schema lo tiene si es necesario
            // fecha y fechaRecordatorio ya son Date de Prisma
        }));

        const parsedData = z.array(agendaCrmItemSchema).safeParse(mappedData);
        if (!parsedData.success) {
            console.error("Error Zod en salida de listarCitasLeadAction:", parsedData.error.flatten());
            // console.log("Datos que fallaron validación (listarCitasLeadAction):", mappedData);
            return { success: false, error: "Error al procesar datos de citas." };
        }
        return { success: true, data: parsedData.data };

    } catch (error) {
        console.error(`Error en listarCitasLeadAction para lead ${leadId}:`, error);
        return { success: false, error: 'No se pudieron cargar las citas del lead.' };
    }
}

// Acción para obtener datos para el formulario de cita
export async function obtenerDatosParaFormularioCitaAction(
    params: z.infer<typeof obtenerDatosFormularioCitaParamsSchema>
): Promise<ActionResult<DatosFormularioCitaData | null>> {
    const validation = obtenerDatosFormularioCitaParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { negocioId } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true, // crmId
                Agente: { // Obtener agentes activos del CRM
                    where: { status: 'activo' },
                    select: { id: true, nombre: true },
                    orderBy: { nombre: 'asc' }
                }
            }
        });

        if (!crm) {
            // Esto es un error crítico para el formulario de citas si el CRM no existe
            return { success: false, error: "CRM no encontrado o no configurado para este negocio.", data: null };
        }

        const data: DatosFormularioCitaData = {
            crmId: crm.id,
            agentes: crm.Agente.map(a => ({ id: a.id, nombre: a.nombre ?? null })),
        };
        return { success: true, data: data };

    } catch (error) {
        console.error('Error en obtenerDatosParaFormularioCitaAction:', error);
        return { success: false, error: 'No se pudieron cargar los datos para el formulario de cita.', data: null };
    }
}

// Acción para CREAR una nueva cita/tarea para un Lead
export async function crearCitaLeadAction(
    params: z.infer<typeof crearCitaLeadParamsSchema>
): Promise<ActionResult<AgendaCrmItemData | null>> {
    const validation = crearCitaLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para crear la cita.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { leadId, datos } = validation.data;
    // negocioId no se usa directamente para crear Agenda si leadId y crmId son suficientes,
    // pero el schema lo pide para obtener el primer pipeline/canal en crearLeadAction,
    // para crearCitaLeadAction, se asume que el lead ya existe y está asociado a un negocio.

    try {
        // Encontrar el negocioId a través del CRM o Lead si es necesario para Agenda.negocioId
        // o si la validación lo requiere.
        // Por ahora, el modelo Agenda tiene negocioId opcional.
        // Si tu lógica requiere que Agenda.negocioId esté poblado, necesitarías obtenerlo.
        // const leadInfo = await prisma.lead.findUnique({ where: { id: leadId }, select: { crm: { select: { negocioId: true } } } });
        // if (!leadInfo?.crm?.negocioId) {
        //    return { success: false, error: "No se pudo determinar el negocio para la cita.", data: null };
        // }
        // const negocioIdParaAgenda = leadInfo.crm.negocioId;

        const nuevaCita = await prisma.agenda.create({
            data: {
                leadId: leadId,
                agenteId: datos.agenteId || null, // Zod ya transformó "" a null si es el caso
                asunto: datos.asunto,
                fecha: datos.fecha, // Zod ya la transformó a Date
                descripcion: datos.descripcion,
                tipo: datos.tipo,
                meetingUrl: datos.meetingUrl,
                fechaRecordatorio: datos.fechaRecordatorio, // Zod ya la transformó a Date o null
                status: 'pendiente', // Status por defecto para nuevas citas
                // negocioId: negocioIdParaAgenda, // Si es requerido y lo obtienes
            },
            include: { agente: { select: { id: true, nombre: true } } } // Para devolver AgendaCrmItemData
        });

        // Revalidar la lista de citas para este lead
        // revalidatePath(`/admin/..../crm/leads/${leadId}`); // Ajusta el path

        const returnData = agendaCrmItemSchema.parse({
            ...nuevaCita,
            tipo: nuevaCita.tipo as AgendaCrmItemData['tipo'],
            status: nuevaCita.status as AgendaCrmItemData['status'],
            agente: nuevaCita.agente ? { id: nuevaCita.agente.id, nombre: nuevaCita.agente.nombre ?? null } : null,
        });
        return { success: true, data: returnData };

    } catch (error) {
        console.error(`Error al crear cita para lead ${leadId}:`, error);
        return { success: false, error: 'No se pudo crear la cita.', data: null };
    }
}


// Acción para EDITAR una cita/tarea existente
export async function editarCitaLeadAction(
    params: z.infer<typeof editarCitaLeadParamsSchema>
): Promise<ActionResult<AgendaCrmItemData | null>> {
    const validation = editarCitaLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para editar la cita.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { citaId, datos } = validation.data;

    try {
        const citaActualizada = await prisma.agenda.update({
            where: { id: citaId },
            data: {
                agenteId: datos.agenteId || null,
                asunto: datos.asunto,
                fecha: datos.fecha, // Zod ya la transformó a Date
                descripcion: datos.descripcion,
                tipo: datos.tipo,
                meetingUrl: datos.meetingUrl,
                fechaRecordatorio: datos.fechaRecordatorio, // Zod ya la transformó a Date o null
                status: datos.status,
                updatedAt: new Date(),
            },
            include: { agente: { select: { id: true, nombre: true } } }
        });

        // Revalidar
        // revalidatePath(`/admin/..../crm/leads/${citaActualizada.leadId}`);

        const returnData = agendaCrmItemSchema.parse({
            ...citaActualizada,
            tipo: citaActualizada.tipo as AgendaCrmItemData['tipo'],
            status: citaActualizada.status as AgendaCrmItemData['status'],
            agente: citaActualizada.agente ? { id: citaActualizada.agente.id, nombre: citaActualizada.agente.nombre ?? null } : null,
        });
        return { success: true, data: returnData };

    } catch (error) {
        console.error(`Error al editar cita ${citaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "La cita que intentas editar no fue encontrada.", data: null };
        }
        return { success: false, error: 'No se pudo actualizar la cita.', data: null };
    }
}


// Acción para ELIMINAR una cita/tarea
export async function eliminarCitaLeadAction(
    params: z.infer<typeof eliminarCitaLeadParamsSchema>
): Promise<ActionResult<{ id: string } | null>> { // Devuelve el ID de la cita eliminada
    const validation = eliminarCitaLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de cita inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { citaId } = validation.data;

    try {
        const citaEliminada = await prisma.agenda.delete({
            where: { id: citaId },
            select: { id: true, leadId: true } // Seleccionar leadId para revalidar path
        });

        // Revalidar
        // if (citaEliminada.leadId) {
        //   revalidatePath(`/admin/..../crm/leads/${citaEliminada.leadId}`);
        // }

        return { success: true, data: { id: citaEliminada.id } };
    } catch (error) {
        console.error(`Error al eliminar cita ${citaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "La cita que intentas eliminar no fue encontrada." };
        }
        return { success: false, error: 'No se pudo eliminar la cita.' };
    }
}


// --- REFACTORIZACIÓN de obtenerEventosAgenda ---
export async function listarEventosAgendaAction(
    params: z.infer<typeof listarEventosAgendaParamsSchema>
): Promise<ActionResult<ObtenerEventosAgendaResultData | null>> {
    const validation = listarEventosAgendaParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { negocioId, rangeStart, rangeEnd } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { id: true }
        });

        if (!crm) {
            return { success: true, data: { crmId: null, eventos: [] } }; // CRM no existe
        }
        const crmId = crm.id;

        // Construir filtro de fecha si se proporcionan rangeStart y rangeEnd
        const dateFilter: Prisma.AgendaWhereInput = {
            lead: { crmId: crmId }, // Asegurar que las agendas pertenezcan a leads de este CRM
        };
        if (rangeStart && rangeEnd) {
            dateFilter.fecha = {
                gte: rangeStart,
                lte: rangeEnd,
            };
        } else if (rangeStart) {
            dateFilter.fecha = { gte: rangeStart };
        } else if (rangeEnd) {
            dateFilter.fecha = { lte: rangeEnd };
        }
        // Podrías querer filtrar por status de agenda también, ej. no mostrar 'cancelada'
        // dateFilter.status = { notIn: ['cancelada'] };


        const agendaItems = await prisma.agenda.findMany({
            where: dateFilter,
            include: {
                lead: { select: { id: true, nombre: true } },
                agente: { select: { id: true, nombre: true } },
            },
            orderBy: { fecha: 'asc' },
        });

        const eventos: AgendaEventoData[] = agendaItems.map(item => {
            const leadNombre = item.lead?.nombre || 'Lead Desconocido';
            // Para react-big-calendar, 'end' es exclusivo. Si es un evento puntual, start y end pueden ser iguales.
            // Si tienes una duración, la sumarías a 'start' para obtener 'end'.
            // Por ahora, asumimos que 'fecha' es tanto el inicio como el fin del evento.
            const eventTitle = `[${item.tipo}] ${item.asunto} (${leadNombre})`;

            return {
                title: eventTitle,
                start: new Date(item.fecha), // Asegurar que sean objetos Date
                end: new Date(item.fecha),   // O calcular end si hay duración
                allDay: false, // Asumir que no son eventos de todo el día a menos que tengas esa lógica
                resource: {
                    id: item.id,
                    tipo: item.tipo,
                    descripcion: item.descripcion,
                    status: item.status,
                    lead: item.lead ? { id: item.lead.id, nombre: item.lead.nombre } : null,
                    agente: item.agente ? { id: item.agente.id, nombre: item.agente.nombre } : null,
                },
            };
        });

        // Opcional: Validar con Zod antes de devolver
        // const parseResult = z.array(agendaEventoSchema).safeParse(eventos);
        // if (!parseResult.success) { /* ... manejo de error ... */ }
        // return { success: true, data: { crmId, eventos: parseResult.data } };

        return { success: true, data: { crmId, eventos } };

    } catch (error) {
        console.error(`Error en listarEventosAgendaAction para negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron cargar los eventos de la agenda.', data: null };
    }
}



// export async function listarCitasDelDiaAction(
//     params: z.infer<typeof listarCitasDelDiaParamsSchema>
// ): Promise<ActionResult<ListarCitasDelDiaResultData | null>> {
//     const validation = listarCitasDelDiaParamsSchema.safeParse(params);
//     if (!validation.success) {
//         return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors, data: null };
//     }
//     const { negocioId } = validation.data;

//     try {
//         // Verificar si el negocio tiene un CRM configurado
//         const crm = await prisma.cRM.findUnique({
//             where: { negocioId },
//             select: { id: true }
//         });

//         if (!crm) {
//             // Si no hay CRM, no puede haber citas de leads asociadas a este negocio vía CRM
//             return { success: true, data: { crmId: null, citas: [] } };
//         }
//         const crmId = crm.id;

//         const hoy = new Date();
//         const inicioDelDia = startOfDay(hoy);
//         const finDelDia = endOfDay(hoy);

//         const agendaItems = await prisma.agenda.findMany({
//             where: {
//                 // Filtrar por citas de leads que pertenecen al CRM del negocio
//                 // Y también por el negocioId directamente en la Agenda si existe y está poblado
//                 OR: [
//                     { lead: { crmId: crmId } }, // Citas de leads del CRM
//                     { negocioId: negocioId }    // Citas directas del negocio (si aplica este campo)
//                 ],
//                 fecha: {
//                     gte: inicioDelDia,
//                     lte: finDelDia,
//                 },
//                 // Opcional: Filtrar por status activos
//                 // status: { notIn: ['cancelada', 'completada'] } 
//             },
//             include: {
//                 lead: { select: { id: true, nombre: true } },
//                 agente: { select: { id: true, nombre: true } },
//                 // asistenteVirtual: { select: { id: true, nombre: true } }, // Si las citas pueden ser con asistentes
//                 tipoDeCita: { select: { nombre: true } }, // Del modelo AgendaTipoCita
//             },
//             orderBy: { fecha: 'asc' },
//         });

//         const citasDelDia: CitaDelDiaData[] = agendaItems.map(item => {
//             let asignadoANombre: string | null = null;
//             if (item.agente) {
//                 asignadoANombre = item.agente.nombre ?? `Agente ID: ${item.agente.id.substring(0, 4)}`;
//             }

//             return {
//                 id: item.id,
//                 fecha: item.fecha, // Ya es Date
//                 asunto: item.asunto,
//                 // Validar que item.status sea un valor del enum StatusAgenda
//                 status: statusAgendaEnum.parse(item.status.toLowerCase()) as StatusAgenda, // Asegurar lowercase y parsear
//                 leadId: item.lead?.id ?? null,
//                 leadNombre: item.lead?.nombre ?? null,
//                 tipoOriginal: item.tipo, // El 'tipo' string de la tabla Agenda
//                 tipoDeCitaNombre: item.tipoDeCita?.nombre ?? null, // Del modelo relacionado
//                 agenteId: item.agenteId ?? null,
//                 asignadoANombre: asignadoANombre,
//                 descripcion: item.descripcion,
//                 meetingUrl: item.meetingUrl,
//                 fechaRecordatorio: item.fechaRecordatorio, // Ya es Date o null
//             };
//         });

//         // Validar con Zod (opcional aquí, pero buena práctica)
//         // const parseResult = z.array(citaDelDiaSchema).safeParse(citasDelDia);
//         // if (!parseResult.success) { /* ... error ... */ }
//         // return { success: true, data: { crmId, citas: parseResult.data } };

//         return { success: true, data: { crmId, citas: citasDelDia } };

//     } catch (error) {
//         console.error(`Error en listarCitasDelDiaAction para negocio ${negocioId}:`, error);
//         // Si el error es por el parseo del enum status:
//         if (error instanceof z.ZodError && error.issues.some(issue => issue.path.includes('status'))) {
//             return { success: false, error: 'Se encontraron citas con un estado inválido.', data: null };
//         }
//         return { success: false, error: 'No se pudieron cargar las citas de hoy.', data: null };
//     }
// }





// --- RENOMBRAR Y MODIFICAR listarCitasDelDiaAction ---
export async function listarCitasAgendaAction( // Antes listarCitasDelDiaAction
    params: z.infer<typeof listarCitasAgendaParamsSchema>
): Promise<ActionResult<ListarCitasAgendaResultData | null>> {
    const validation = listarCitasAgendaParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { negocioId, fechaReferencia, tipoRango } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { id: true }
        });

        if (!crm) {
            return { success: true, data: { crmId: null, citas: [] } };
        }
        const crmId = crm.id;

        let inicioRango: Date;
        let finRango: Date;

        if (tipoRango === 'dia') {
            inicioRango = startOfDay(fechaReferencia);
            finRango = endOfDay(fechaReferencia);
        } else { // tipoRango === 'mes'
            inicioRango = startOfMonth(fechaReferencia);
            finRango = endOfMonth(fechaReferencia);
        }

        const agendaItems = await prisma.agenda.findMany({
            where: {
                OR: [
                    { lead: { crmId: crmId } },
                    { negocioId: negocioId }
                ],
                fecha: {
                    gte: inicioRango,
                    lte: finRango,
                },
                // Opcional: filtrar por status activos si se desea
                // status: { notIn: ['cancelada'] } 
            },
            include: {
                lead: { select: { id: true, nombre: true } },
                agente: { select: { id: true, nombre: true } },
                // asistenteVirtual: { select: { id: true, nombre: true } },
                tipoDeCita: { select: { nombre: true } },
            },
            orderBy: { fecha: 'asc' },
        });

        const citasTransformadas: CitaDelDiaData[] = agendaItems.map(item => {
            let asignadoANombre: string | null = null;
            if (item.agente) asignadoANombre = item.agente.nombre ?? `Agente ${item.agente.id.substring(0, 4)}`;
            // else if (item.asistenteVirtual) asignadoANombre = item.asistenteVirtual.nombre;

            return {
                id: item.id,
                fecha: item.fecha,
                asunto: item.asunto,
                status: statusAgendaEnum.parse(item.status.toLowerCase()) as StatusAgenda,
                leadId: item.lead?.id ?? null,
                leadNombre: item.lead?.nombre ?? null,
                tipoOriginal: item.tipo,
                tipoDeCitaNombre: item.tipoDeCita?.nombre ?? null,
                agenteId: item.agenteId ?? null,
                asignadoANombre: asignadoANombre,
                descripcion: item.descripcion,
                meetingUrl: item.meetingUrl,
                fechaRecordatorio: item.fechaRecordatorio,
            };
        });

        return { success: true, data: { crmId, citas: citasTransformadas } };

    } catch (error) {
        console.error(`Error en listarCitasAgendaAction para negocio ${negocioId}, rango ${tipoRango}:`, error);
        if (error instanceof z.ZodError) {
            return { success: false, error: 'Se encontraron citas con un estado o tipo inválido.', data: null };
        }
        return { success: false, error: `No se pudieron cargar las citas para ${tipoRango}.`, data: null };
    }
}