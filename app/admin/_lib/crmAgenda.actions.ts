// app/admin/_lib/crmAgenda.actions.ts (o crmCitas.actions.ts)
'use server';

import prisma from './prismaClient'; // Ajusta ruta
import {
    CitaExistente, NuevaCitaFormData, EditarCitaFormData,
    ObtenerCitasLeadResult,
    // CrearCitaResult, 
    // EditarCitaResult, 
    EliminarCitaResult,
    ObtenerDatosFormularioCitaResult, DatosFormularioCita,
    ActionResult
} from './types';
import { Prisma } from '@prisma/client';

import {
    CitaDelDia,
    ObtenerCitasDelDiaResult,
    StatusAgenda // Importar el enum
} from './crmAgenda.type'; // Desde el nuevo archivo de tipos

export async function obtenerDatosParaFormularioCita(negocioId: string): Promise<ObtenerDatosFormularioCitaResult> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true, // Seleccionar el ID del CRM
                Agente: {
                    where: { status: 'activo' },
                    select: { id: true, nombre: true, email: true },
                    orderBy: { nombre: 'asc' }
                }
            }
        });

        // --- CORRECCIÓN: Devolver crmId null si no se encuentra CRM ---
        if (!crm) {
            console.warn(`CRM no encontrado para negocioId ${negocioId}`);
            // Devolver éxito pero con crmId null y agentes vacíos
            return { success: true, data: { crmId: null, agentes: [] } };
        }
        // --- FIN CORRECCIÓN ---

        const agentesFormateados = crm.Agente.map(a => ({
            id: a.id,
            nombre: a.nombre || a.email // Usar email como fallback
        }));

        // --- CORRECCIÓN: Incluir crmId en el objeto data retornado ---
        const dataPayload: DatosFormularioCita = {
            crmId: crm.id, // <-- Incluir crmId aquí
            agentes: agentesFormateados
        };
        return { success: true, data: dataPayload };
        // --- FIN CORRECCIÓN ---

    } catch (error) {
        console.error(`Error fetching data for cita form (negocio ${negocioId}):`, error);
        return { success: false, error: 'No se pudieron obtener los datos para el formulario de cita.' };
    }
}

/**
 * Crea una nueva entrada en la Agenda asociada a un Lead.
 * @param leadId - El ID del Lead.
 * @param data - Datos de la cita a crear (incluye meetingUrl y fechaRecordatorio opcionales).
 * @returns Objeto con el resultado y la cita creada si tuvo éxito.
 */
export async function crearCitaLead(
    leadId: string,
    data: NuevaCitaFormData // <-- Recibe fecha y fechaRecordatorio como string
) {
    if (!leadId) { return { success: false, error: "ID de Lead no proporcionado." }; }
    if (!data.asunto?.trim() || !data.fecha || !data.agenteId) {
        return { success: false, error: "Tipo, Asunto, Fecha y Agente son requeridos." };
    }

    let fechaDate: Date;
    let fechaRecordatorioDate: Date | null = null; // Inicializar como null

    try {
        fechaDate = new Date(data.fecha);
        if (isNaN(fechaDate.getTime())) { throw new Error("Formato de fecha inválido."); }

        // --- Convertir fechaRecordatorio si existe ---
        if (data.fechaRecordatorio) {
            fechaRecordatorioDate = new Date(data.fechaRecordatorio);
            if (isNaN(fechaRecordatorioDate.getTime())) {
                // Podrías lanzar error o simplemente ignorar la fecha inválida
                console.warn("Formato de fecha de recordatorio inválido, se ignorará:", data.fechaRecordatorio);
                fechaRecordatorioDate = null; // Asegurar que sea null si es inválida
            }
            // Opcional: Validar que recordatorio sea antes de la fecha del evento
            else if (fechaRecordatorioDate >= fechaDate) {
                return { success: false, error: "La fecha de recordatorio debe ser anterior a la fecha de la cita." };
            }
        }
        // --- Fin Conversión ---

    } catch (dateError) {
        console.error("Error parsing date:", dateError);
        // Distinguir qué fecha falló si es necesario
        return { success: false, error: "Formato de fecha y hora inválido." };
    }

    try {
        // const newCita = await prisma.agenda.create({
        //     data: {
        //         lead: { connect: { id: leadId } },
        //         agente: { connect: { id: data.agenteId } },
        //         tipo: data.tipo.trim(), // Ensure 'tipo' is included
        //         asunto: data.asunto.trim(),
        //         fecha: fechaDate,
        //         descripcion: data.descripcion?.trim() || null,
        //         meetingUrl: data.meetingUrl?.trim() || null,
        //         fechaRecordatorio: fechaRecordatorioDate, // <-- Guardar Date o null
        //         status: 'pendiente',
        //     },
        //     include: { agente: { select: { id: true, nombre: true, email: true } } }
        // });

        // const citaCreada: CitaExistente = {
        //     id: newCita.id, asunto: newCita.asunto, fecha: newCita.fecha.toISOString(), status: newCita.status, descripcion: newCita.descripcion, meetingUrl: newCita.meetingUrl, fechaRecordatorio: newCita.fechaRecordatorio ? newCita.fechaRecordatorio.toISOString() : null, agenteId: newCita.agenteId,
        //     // Removed duplicate agenteId property
        // };
        // return { success: true, data: citaCreada };

    } catch (error) {
        console.error(`Error creating cita for lead ${leadId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') { return { success: false, error: `Error al crear la cita: Agente o Lead no encontrado.` }; }
        return { success: false, error: 'No se pudo crear la cita.' };
    }
}

/**
 * Edita una entrada existente en la Agenda.
 * @param citaId - El ID de la cita (Agenda) a editar.
 * @param data - Datos a actualizar (incluye fechaRecordatorio opcional).
 * @returns Objeto con el resultado y la cita actualizada si tuvo éxito.
 */
export async function editarCitaLead(
    citaId: string,
    data: EditarCitaFormData // <-- Recibe fecha y fechaRecordatorio como string
) {
    // if (!citaId) { return { success: false, error: "ID de Cita no proporcionado." }; }
    // if (!data.tipo?.trim() || !data.asunto?.trim() || !data.fecha || !data.agenteId || !data.status) {
    //     return { success: false, error: "Tipo, Asunto, Fecha, Agente y Status son requeridos." };
    // }

    let fechaDate: Date;
    let fechaRecordatorioDate: Date | null = null;

    try {
        fechaDate = new Date(data.fecha);
        if (isNaN(fechaDate.getTime())) { throw new Error("Formato de fecha inválido."); }

        if (data.fechaRecordatorio) {
            fechaRecordatorioDate = new Date(data.fechaRecordatorio);
            if (isNaN(fechaRecordatorioDate.getTime())) {
                console.warn("Formato de fecha de recordatorio inválido, se ignorará:", data.fechaRecordatorio);
                fechaRecordatorioDate = null;
            }
            else if (fechaRecordatorioDate >= fechaDate) {
                return { success: false, error: "La fecha de recordatorio debe ser anterior a la fecha de la cita." };
            }
        } else {
            // Si el string viene vacío o nulo, asegurarse que se guarde null en la BD
            fechaRecordatorioDate = null;
        }

    } catch (dateError) {
        console.error("Error parsing date:", dateError);
        return { success: false, error: "Formato de fecha y hora inválido." };
    }

    try {
        // const updatedCita = await prisma.agenda.update({
        //     where: { id: citaId },
        //     data: {
        //         tipo: data.tipo.trim(),
        //         asunto: data.asunto.trim(),
        //         fecha: fechaDate,
        //         descripcion: data.descripcion?.trim() || null,
        //         meetingUrl: data.meetingUrl?.trim() || null,
        //         fechaRecordatorio: fechaRecordatorioDate, // <-- Actualizar fechaRecordatorio
        //         status: data.status,
        //         agente: { connect: { id: data.agenteId } },
        //     },
        //     include: { agente: { select: { id: true, nombre: true, email: true } } }
        // });

        // const citaActualizada: CitaExistente = {
        //     id: updatedCita.id, asunto: updatedCita.asunto, fecha: updatedCita.fecha.toISOString(), status: updatedCita.status, descripcion: updatedCita.descripcion, meetingUrl: updatedCita.meetingUrl, fechaRecordatorio: updatedCita.fechaRecordatorio ? updatedCita.fechaRecordatorio.toISOString() : null, agenteId: updatedCita.agenteId,
        //     // Remove the agente property to match the CitaExistente type
        //     // agente: updatedCita.agente ? { id: updatedCita.agente.id, nombre: updatedCita.agente.nombre || updatedCita.agente.email } : null
        // };
        // return { success: true, data: citaActualizada };

    } catch (error) {
        console.error(`Error updating cita ${citaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') { return { success: false, error: `Error al editar la cita: Registro no encontrado.` }; }
        return { success: false, error: 'No se pudo editar la cita.' };
    }
}

// --- Acción eliminarCitaLead (sin cambios necesarios aquí) ---
export async function eliminarCitaLead(citaId: string): Promise<EliminarCitaResult> {
    if (!citaId) { return { success: false, error: "ID de Cita no proporcionado." }; }
    try {
        await prisma.agenda.delete({ where: { id: citaId } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting cita ${citaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') { return { success: false, error: `Error al eliminar: Cita no encontrada.` }; }
        return { success: false, error: 'No se pudo eliminar la cita.' };
    }
}


// export async function obtenerEventosAgenda(
//     negocioId: string,
//     rangeStart?: Date,
//     rangeEnd?: Date
// ): Promise<ActionResult<AgendaData>> {
//     if (!negocioId) {
//         return { success: false, error: "ID de negocio no proporcionado." };
//     }

//     try {
//         // 1. Buscar el CRM asociado al negocio
//         const crm = await prisma.cRM.findUnique({
//             where: { negocioId },
//             select: { id: true } // Solo necesitamos el ID del CRM
//         });

//         // 2. Si no hay CRM, devolver éxito pero indicando que no hay CRM
//         if (!crm) {
//             console.log(`CRM no encontrado para negocioId ${negocioId}. No se cargarán eventos de agenda.`);
//             return { success: true, data: { crmId: null, eventos: [] } };
//         }

//         // 3. Construir el filtro base y de fecha
//         // --- CORRECCIÓN: Filtrar por crmId a través de la relación con Lead ---
//         const baseFilter: Prisma.AgendaWhereInput = {
//             lead: { // Acceder a la relación 'lead'
//                 crmId: crm.id // Filtrar por el crmId dentro del lead
//             }
//         };
//         // --- FIN CORRECCIÓN ---

//         // Añadir filtro de fecha si se proporcionan las fechas
//         if (rangeStart && rangeEnd) {
//             const endOfDay = new Date(rangeEnd);
//             endOfDay.setHours(23, 59, 59, 999);
//             baseFilter.fecha = {
//                 gte: rangeStart,
//                 lte: endOfDay,
//             };
//         } else if (rangeStart) {
//             baseFilter.fecha = { gte: rangeStart };
//         } else if (rangeEnd) {
//             const endOfDay = new Date(rangeEnd);
//             endOfDay.setHours(23, 59, 59, 999);
//             baseFilter.fecha = { lte: endOfDay };
//         }

//         // 4. Buscar los registros de Agenda usando el filtro construido
//         // const agendaItems = await prisma.agenda.findMany({
//         //     where: baseFilter, // Usar el filtro combinado
//         //     include: {
//         //         lead: { select: { id: true, nombre: true } },
//         //         agente: { select: { id: true, nombre: true, email: true } }
//         //     },
//         //     orderBy: {
//         //         fecha: 'asc'
//         //     }
//         // });

//         // 5. Mapear los registros de Agenda al formato CalendarEvent (sin cambios en el mapeo)
//         // const eventos: CalendarEvent[] = agendaItems.map(item => {
//         //     const agenteNombre = item.agente?.nombre || item.agente?.email || 'N/A';
//         //     const leadNombre = item.lead?.nombre || 'Lead Desconocido';
//         //     const eventTitle = `${item.tipo}: ${item.asunto} (${agenteNombre} / ${leadNombre})`;

//         //     return {
//         //         id: item.id,
//         //         title: eventTitle,
//         //         start: item.fecha,
//         //         end: item.fecha, // Asumiendo eventos puntuales
//         //         allDay: false,
//         //         resource: {
//         //             tipo: item.tipo,
//         //             asunto: item.asunto,
//         //             descripcion: item.descripcion,
//         //             status: item.status,
//         //             lead: item.lead ? { id: item.lead.id, nombre: item.lead.nombre } : null,
//         //             agente: item.agente ? { id: item.agente.id, nombre: agenteNombre } : null,
//         //         }
//         //     };
//         // });

//         // 6. Devolver éxito con el crmId y los eventos mapeados
//         return { success: true, data: { crmId: crm.id, eventos: eventos } };

//     } catch (error: unknown) {
//         console.error(`Error fetching agenda events for negocio ${negocioId}:`, error);
//         const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
//         return { success: false, error: `No se pudieron obtener los eventos de la agenda: ${errorMessage}` };
//     }
// }



// --- NUEVA SERVER ACTION: Obtener Citas del Día por Negocio ID ---
export async function obtenerCitasDelDiaPorNegocio(
    negocioId: string,
    fechaEspecifica: Date // El día para el cual obtener las citas
): Promise<ObtenerCitasDelDiaResult> {
    if (!negocioId) {
        return { success: false, error: "ID de Negocio no proporcionado." };
    }
    if (!fechaEspecifica) {
        return { success: false, error: "Fecha no proporcionada." };
    }

    try {
        const inicioDelDia = new Date(fechaEspecifica);
        inicioDelDia.setHours(0, 0, 0, 0);

        const finDelDia = new Date(fechaEspecifica);
        finDelDia.setHours(23, 59, 59, 999);

        const citasPrisma = await prisma.agenda.findMany({
            where: {
                // Filtramos por las agendas cuyo tipo de cita pertenece al negocioId
                tipoDeCita: {
                    negocioId: negocioId,
                },
                // Y cuya fecha está dentro del día especificado
                fecha: {
                    gte: inicioDelDia,
                    lte: finDelDia,
                },
            },
            include: {
                lead: { select: { id: true, nombre: true } },
                agente: { select: { id: true, nombre: true, email: true } },
                asistente: { select: { id: true, nombre: true } }, // Asumiendo que AsistenteVirtual tiene 'nombre'
                tipoDeCita: { select: { nombre: true, limiteConcurrencia: true } },
            },
            orderBy: {
                fecha: 'asc', // Orden cronológico
            },
        });

        const citasDelDia: CitaDelDia[] = citasPrisma.map(cita => {
            let asignadoANombre: string | null = null;
            let asignadoATipo: 'agente' | 'asistente' | null = null;

            if (cita.agente) {
                asignadoANombre = cita.agente.nombre || cita.agente.email;
                asignadoATipo = 'agente';
            } else if (cita.asistente) {
                asignadoANombre = cita.asistente.nombre; // Asumiendo que AsistenteVirtual tiene 'nombre'
                asignadoATipo = 'asistente';
            }

            return {
                id: cita.id,
                fecha: cita.fecha,
                asunto: cita.asunto,
                status: cita.status as StatusAgenda, // Castear al enum
                leadNombre: cita.lead?.nombre || null,
                leadId: cita.lead?.id,
                tipoDeCitaNombre: cita.tipoDeCita?.nombre || null,
                tipoDeCitaLimiteConcurrencia: cita.tipoDeCita?.limiteConcurrencia ?? null,
                asignadoANombre: asignadoANombre,
                asignadoATipo: asignadoATipo,
                descripcion: cita.descripcion,
            };
        });

        return { success: true, data: citasDelDia };

    } catch (error) {
        console.error(`Error fetching citas del día para negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener las citas del día.' };
    }
}

// ... (el resto de tus funciones existentes como obtenerEventosAgenda, etc., se mantienen aquí abajo)
// Asegúrate de copiar el resto de tus funciones existentes en este archivo.
// Por ejemplo, la función obtenerCitasLead:
export async function obtenerCitasLead(leadId: string): Promise<ObtenerCitasLeadResult> {
    // ... (código original de esta función)
    if (!leadId) { return { success: false, error: "ID de Lead no proporcionado." }; }
    try {
        const citas = await prisma.agenda.findMany({
            where: { leadId: leadId },
            include: { agente: { select: { id: true, nombre: true, email: true } } },
            orderBy: { fecha: 'desc' }
        });
        const citasFormateadas: CitaExistente[] = citas.map(cita => ({
            id: cita.id, tipo: cita.tipo, asunto: cita.asunto, fecha: cita.fecha.toISOString(), status: cita.status, agenteId: cita.agenteId,
            agente: cita.agente ? { id: cita.agente.id, nombre: cita.agente.nombre || cita.agente.email } : null
        }));
        return { success: true, data: citasFormateadas };
    } catch (error) {
        console.error(`Error fetching citas for lead ${leadId}:`, error);
        return { success: false, error: 'No se pudieron obtener las citas.' };
    }
}
// (Y así con el resto de funciones que ya tenías)

/**
 * Obtiene todas las citas agendadas de un negocio.
 * @param negocioId - El ID del negocio.
 * @returns Objeto con el resultado y las citas agendadas si tuvo éxito.
 */
export async function obtenerTodasLasCitasDelNegocio(
    negocioId: string
): Promise<ActionResult<CitaExistente[]>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    try {
        // Buscar el CRM asociado al negocio
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { id: true } // Solo necesitamos el ID del CRM
        });

        if (!crm) {
            console.log(`CRM no encontrado para negocioId ${negocioId}.`);
            return { success: true, data: [] }; // Devolver éxito con lista vacía
        }

        // Buscar todas las citas asociadas al CRM
        const citas = await prisma.agenda.findMany({
            where: {
                lead: { crmId: crm.id } // Filtrar por crmId a través de la relación con Lead
            },
            include: {
                lead: { select: { id: true, nombre: true } },
                agente: { select: { id: true, nombre: true, email: true } }
            },
            orderBy: { fecha: 'asc' } // Ordenar cronológicamente
        });

        // Formatear las citas al tipo CitaExistente
        const citasFormateadas: CitaExistente[] = citas.map(cita => ({
            id: cita.id,
            tipo: cita.tipo,
            asunto: cita.asunto,
            fecha: cita.fecha.toISOString(), // Convertir a string
            status: cita.status,
            descripcion: cita.descripcion,
            agenteId: cita.agenteId,
            agente: cita.agente
                ? { id: cita.agente.id, nombre: cita.agente.nombre || cita.agente.email }
                : null
        }));

        return { success: true, data: citasFormateadas };

    } catch (error) {
        console.error(`Error fetching all citas for negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener las citas del negocio.' };
    }
}
