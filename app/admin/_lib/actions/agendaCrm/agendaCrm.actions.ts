// app/admin/_lib/actions/agendaCrm/agendaCrm.actions.ts
'use server';

import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { startOfDay, endOfDay, setMinutes, setHours } from 'date-fns'; // Para el rango de "hoy"
import type { Agenda, LeadBitacora } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { enviarEmailConfirmacionCita_v2 } from '@/app/admin/_lib/actions/email/emailv2.actions';

import {
    AgendaCrmItemData,
    agendaCrmItemSchema,
    obtenerDatosFormularioCitaParamsSchema,
    DatosFormularioCitaData,
    crearCitaLeadParamsSchema,
    editarCitaLeadParamsSchema,
    listarEventosAgendaParamsSchema,
    ObtenerEventosAgendaResultData,
    AgendaEventoData,
    StatusAgenda,
    listarCitasAgendaParamsSchema, // Nuevo nombre
    ListarCitasAgendaResultData, // Nuevo nombre
    CitaDelDiaData,
    statusAgendaEnum,
    NuevaCitaSimpleFormData,
    nuevaCitaSimpleFormSchema,
} from './agendaCrm.schemas';
import { z } from 'zod';
import { startOfMonth, endOfMonth } from 'date-fns';
import { setSeconds as dateFnsSetSeconds } from 'date-fns';
// import { revalidatePath } from 'next/cache'; // Si necesitas revalidar


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
    try {
        const nuevaCita = await prisma.agenda.create({
            data: {
                leadId: leadId,
                agenteId: datos.agenteId || null, // Zod ya transformó "" a null si es el caso
                asunto: datos.asunto,
                fecha: datos.fecha, // Zod ya la transformó a Date
                descripcion: datos.descripcion,
                tipo: datos.tipo,
                // fechaRecordatorio: datos.fechaRecordatorio, // Zod ya la transformó a Date o null
                status: 'pendiente', // Status por defecto para nuevas citas
                // negocioId: negocioIdParaAgenda, // Si es requerido y lo obtienes
            },
            include: {
                agente: { select: { id: true, nombre: true } }
            } // Para devolver AgendaCrmItemData
        });

        // Revalidar la lista de citas para este lead
        // revalidatePath(`/admin/..../crm/leads/${leadId}`); // Ajusta el path

        const returnData = agendaCrmItemSchema.parse({
            ...nuevaCita,
            tipo: nuevaCita.tipo as AgendaCrmItemData['tipo'],
            status: nuevaCita.status as AgendaCrmItemData['status'],
            agente: nuevaCita.agenteId ? { id: nuevaCita.agenteId, nombre: null } : null,
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
                // meetingUrl: datos.meetingUrl,
                //  fechaRecordatorio: datos.fechaRecordatorio, // Zod ya la transformó a Date o null
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
        return { success: true, data: { crmId, eventos } };

    } catch (error) {
        console.error(`Error en listarEventosAgendaAction para negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron cargar los eventos de la agenda.', data: null };
    }
}

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
                descripcion: item.descripcion
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





export async function crearCitaSimpleLeadAction(
    params: {
        leadId: string;
        negocioId: string;
        datos: NuevaCitaSimpleFormData;
        enviarNotificacion: boolean;
    }
): Promise<ActionResult<Agenda>> {
    const validation = nuevaCitaSimpleFormSchema.safeParse(params.datos);
    if (!validation.success) {
        const firstError = validation.error.flatten().fieldErrors;
        const errorMessage = Object.values(firstError)[0]?.[0] || "Datos inválidos.";
        return { success: false, error: errorMessage };
    }

    try {
        const citaExistente = await prisma.agenda.findFirst({
            where: { leadId: params.leadId, status: 'PENDIENTE' }
        });
        if (citaExistente) {
            return { success: false, error: "Este lead ya tiene una cita pendiente." };
        }

        const { fecha, hora, ...restOfData } = params.datos;

        // Se combina la fecha y la hora de forma segura en el servidor
        const [hours, minutes] = hora.split(':').map(Number);
        const fechaHoraFinal = setSeconds(setMinutes(setHours(fecha, hours), minutes), 0);

        const nuevaCita = await prisma.agenda.create({
            data: {
                leadId: params.leadId,
                negocioId: params.negocioId,
                asunto: 'Informes',
                fecha: fechaHoraFinal, // Se guarda la fecha combinada
                modalidad: restOfData.modalidad,
                linkReunionVirtual: restOfData.modalidad === 'VIRTUAL' ? restOfData.linkReunionVirtual : null,
                tipo: 'Cita',
                status: 'PENDIENTE',
            }
        });


        // --- ✅ Lógica de Notificación Actualizada ---
        if (params.enviarNotificacion) {
            // 1. Obtener datos del Lead y del Negocio
            const leadYNegocio = await prisma.lead.findUnique({
                where: { id: params.leadId },
                select: {
                    nombre: true,
                    email: true,
                    crm: {
                        select: {
                            negocio: {
                                select: {
                                    nombre: true,
                                    logo: true,
                                    email: true,
                                    direccion: true,
                                    googleMaps: true,
                                }
                            }
                        }
                    }
                }
            });

            if (!leadYNegocio || !leadYNegocio.email || !leadYNegocio.crm?.negocio) {
                console.warn(`Cita ${nuevaCita.id} creada, pero no se pudo notificar por falta de datos del lead/negocio.`);
                return { success: true, data: nuevaCita };
            }

            const negocio = leadYNegocio.crm.negocio;

            // 2. ✅ ¡NUEVO! Obtener la oferta activa del negocio para sacar el email de copia.
            const ofertaActiva = await prisma.oferta.findFirst({
                where: {
                    negocioId: params.negocioId,
                    status: 'ACTIVO'
                },
                select: {
                    nombre: true,
                    emailCopiaConfirmacion: true,
                }
            });

            // 3. Enviar el correo
            await enviarEmailConfirmacionCita_v2({
                emailDestinatario: leadYNegocio.email,
                nombreDestinatario: leadYNegocio.nombre,
                nombreNegocio: negocio.nombre,
                logoNegocioUrl: negocio.logo || undefined,
                nombreServicio: "Demostración de producto",
                // Usamos el nombre de la oferta si existe, si no, un texto genérico.
                nombreOferta: ofertaActiva?.nombre || "Seguimiento personalizado",
                fechaHoraCita: nuevaCita.fecha,
                emailRespuestaNegocio: negocio.email || 'no-reply@promedia.mx',
                modalidadCita: nuevaCita.modalidad === 'VIRTUAL' ? 'virtual' : 'presencial',
                ubicacionCita: negocio.direccion,
                googleMapsUrl: negocio.googleMaps,
                linkReunionVirtual: nuevaCita.linkReunionVirtual,
                // ✅ Se pasa el email de copia obtenido de la oferta.
                // Si no se encuentra oferta o el campo es nulo, no se enviará copia.
                emailCopia: ofertaActiva?.emailCopiaConfirmacion,
            });
        }

        return { success: true, data: nuevaCita };

    } catch (error) {
        console.error("Error en crearCitaSimpleLeadAction:", error);
        return { success: false, error: "No se pudo crear la cita." };
    }
}


export async function listarCitasLeadAction(params: { leadId: string }): Promise<ActionResult<Agenda[]>> {
    try {
        const citas = await prisma.agenda.findMany({
            where: { leadId: params.leadId },
            orderBy: { fecha: 'desc' },
        });
        return { success: true, data: citas };
    } catch (error) {
        console.error(`Error en listarCitasLeadAction para lead ${params.leadId}:`, error);
        return { success: false, error: 'No se pudieron cargar las citas del lead.' };
    }
}

export async function eliminarCitaLeadAction(params: { citaId: string }): Promise<ActionResult<{ id: string }>> {
    try {
        const citaEliminada = await prisma.agenda.delete({
            where: { id: params.citaId },
            select: { id: true }
        });
        return { success: true, data: citaEliminada };
    } catch (error) {
        console.error(`Error al eliminar cita ${params.citaId}:`, error);
        return { success: false, error: 'No se pudo eliminar la cita.' };
    }
}


// Schema para agregar una nueva nota
const agregarNotaSchema = z.object({
    leadId: z.string().cuid(),
    nota: z.string().min(3, "La nota debe tener al menos 3 caracteres."),
});

// Schema para editar una nota existente
const editarNotaSchema = z.object({
    notaId: z.string().cuid(),
    nota: z.string().min(3, "La nota debe tener al menos 3 caracteres."),
});

// Schema para eliminar una nota
const eliminarNotaSchema = z.object({
    notaId: z.string().cuid(),
});


export async function agregarNotaLeadAction(params: z.infer<typeof agregarNotaSchema>): Promise<ActionResult<LeadBitacora>> {
    const validation = agregarNotaSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos." };
    }
    const { leadId, nota } = validation.data;

    try {
        const nuevaNota = await prisma.leadBitacora.create({
            data: { leadId, nota }
        });
        // Revalidar la página del lead para que la nueva nota aparezca
        revalidatePath(`/admin/clientes/.*/negocios/.*/leads/${leadId}`);
        return { success: true, data: nuevaNota };
    } catch (error) {
        console.error("Error en agregarNotaLeadAction:", error);
        return { success: false, error: "No se pudo agregar la nota." };
    }
}

export async function listarNotasLeadAction(params: { leadId: string }): Promise<ActionResult<LeadBitacora[]>> {
    try {
        const notas = await prisma.leadBitacora.findMany({
            where: { leadId: params.leadId },
            orderBy: { createdAt: 'desc' },
        });
        return { success: true, data: notas };
    } catch (error) {
        console.error("Error en listarNotasLeadAction:", error);
        return { success: false, error: "No se pudieron cargar las notas." };
    }
}

export async function editarNotaLeadAction(params: z.infer<typeof editarNotaSchema>): Promise<ActionResult<LeadBitacora>> {
    const validation = editarNotaSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos." };
    }
    const { notaId, nota } = validation.data;

    try {
        const notaActualizada = await prisma.leadBitacora.update({
            where: { id: notaId },
            data: { nota }
        });
        revalidatePath(`/admin/clientes/.*/negocios/.*/leads/${notaActualizada.leadId}`);
        return { success: true, data: notaActualizada };
    } catch (error) {
        console.error("Error en editarNotaLeadAction:", error);
        return { success: false, error: "No se pudo actualizar la nota." };
    }
}

export async function eliminarNotaLeadAction(params: z.infer<typeof eliminarNotaSchema>): Promise<ActionResult<{ id: string }>> {
    const validation = eliminarNotaSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de nota inválido." };
    }
    const { notaId } = validation.data;

    try {
        const notaEliminada = await prisma.leadBitacora.delete({
            where: { id: notaId },
            select: { id: true, leadId: true }
        });
        revalidatePath(`/admin/clientes/.*/negocios/.*/leads/${notaEliminada.leadId}`);
        return { success: true, data: { id: notaEliminada.id } };
    } catch (error) {
        console.error("Error en eliminarNotaLeadAction:", error);
        return { success: false, error: "No se pudo eliminar la nota." };
    }
}
function setSeconds(date: Date, seconds: number): Date {
    return dateFnsSetSeconds(date, seconds);
}

