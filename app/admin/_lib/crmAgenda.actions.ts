// app/admin/_lib/crmAgenda.actions.ts (o crmCitas.actions.ts)
'use server';

import prisma from './prismaClient'; // Ajusta ruta
import {
    CitaExistente, NuevaCitaFormData, EditarCitaFormData,
    ObtenerCitasLeadResult, CrearCitaResult, EditarCitaResult, EliminarCitaResult,
    ObtenerDatosFormularioCitaResult, DatosFormularioCita
} from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

/**
 * Obtiene las citas (registros de Agenda) asociadas a un Lead específico.
 * @param leadId - El ID del Lead.
 * @returns Objeto con la lista de citas existentes.
 */
export async function obtenerCitasLead(leadId: string): Promise<ObtenerCitasLeadResult> {
    if (!leadId) {
        return { success: false, error: "ID de Lead no proporcionado." };
    }
    try {
        const citas = await prisma.agenda.findMany({
            where: { leadId: leadId },
            include: {
                agente: { select: { id: true, nombre: true, email: true } }
            },
            orderBy: { fecha: 'desc' }
        });

        // Mapear para asegurar el tipo y formato
        const citasFormateadas: CitaExistente[] = citas.map(cita => ({
            id: cita.id,
            tipo: cita.tipo,
            asunto: cita.asunto,
            fecha: cita.fecha,
            status: cita.status,
            descripcion: cita.descripcion,
            meetingUrl: cita.meetingUrl,
            fechaRecordatorio: cita.fechaRecordatorio, // <-- Incluir fechaRecordatorio
            agenteId: cita.agenteId,
            agente: cita.agente ? { id: cita.agente.id, nombre: cita.agente.nombre || cita.agente.email } : null
        }));

        return { success: true, data: citasFormateadas };

    } catch (error) {
        console.error(`Error fetching citas for lead ${leadId}:`, error);
        return { success: false, error: 'No se pudieron obtener las citas.' };
    }
}
/**
 * Obtiene los datos necesarios para el formulario de nueva cita (lista de agentes Y crmId).
 * @param negocioId - El ID del negocio para encontrar el CRM asociado.
 * @returns Objeto con la lista de agentes disponibles y el crmId.
 */
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
): Promise<CrearCitaResult> {
    if (!leadId) { return { success: false, error: "ID de Lead no proporcionado." }; }
    if (!data.tipo?.trim() || !data.asunto?.trim() || !data.fecha || !data.agenteId) {
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
        const newCita = await prisma.agenda.create({
            data: {
                lead: { connect: { id: leadId } },
                agente: { connect: { id: data.agenteId } },
                tipo: data.tipo.trim(),
                asunto: data.asunto.trim(),
                fecha: fechaDate,
                descripcion: data.descripcion?.trim() || null,
                meetingUrl: data.meetingUrl?.trim() || null,
                fechaRecordatorio: fechaRecordatorioDate, // <-- Guardar Date o null
                status: 'pendiente',
            },
            include: { agente: { select: { id: true, nombre: true, email: true } } }
        });

        const citaCreada: CitaExistente = {
            id: newCita.id, tipo: newCita.tipo, asunto: newCita.asunto, fecha: newCita.fecha, status: newCita.status, descripcion: newCita.descripcion, meetingUrl: newCita.meetingUrl, fechaRecordatorio: newCita.fechaRecordatorio, agenteId: newCita.agenteId,
            agente: newCita.agente ? { id: newCita.agente.id, nombre: newCita.agente.nombre || newCita.agente.email } : null
        };
        return { success: true, data: citaCreada };

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
): Promise<EditarCitaResult> {
    if (!citaId) { return { success: false, error: "ID de Cita no proporcionado." }; }
    if (!data.tipo?.trim() || !data.asunto?.trim() || !data.fecha || !data.agenteId || !data.status) {
        return { success: false, error: "Tipo, Asunto, Fecha, Agente y Status son requeridos." };
    }

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
        const updatedCita = await prisma.agenda.update({
            where: { id: citaId },
            data: {
                tipo: data.tipo.trim(),
                asunto: data.asunto.trim(),
                fecha: fechaDate,
                descripcion: data.descripcion?.trim() || null,
                meetingUrl: data.meetingUrl?.trim() || null,
                fechaRecordatorio: fechaRecordatorioDate, // <-- Actualizar fechaRecordatorio
                status: data.status,
                agente: { connect: { id: data.agenteId } },
            },
            include: { agente: { select: { id: true, nombre: true, email: true } } }
        });

        const citaActualizada: CitaExistente = {
            id: updatedCita.id, tipo: updatedCita.tipo, asunto: updatedCita.asunto, fecha: updatedCita.fecha, status: updatedCita.status, descripcion: updatedCita.descripcion, meetingUrl: updatedCita.meetingUrl, fechaRecordatorio: updatedCita.fechaRecordatorio, agenteId: updatedCita.agenteId,
            agente: updatedCita.agente ? { id: updatedCita.agente.id, nombre: updatedCita.agente.nombre || updatedCita.agente.email } : null
        };
        return { success: true, data: citaActualizada };

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

