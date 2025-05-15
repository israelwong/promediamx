// Ruta: app/admin/_lib/negocioAgenda.actions.ts
'use server';

import prisma from './prismaClient';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import {
    NegocioAgendaConfig,
    TipoCitaInput,
    HorarioAtencionBase,
    ExcepcionHorarioInput,
    ExcepcionHorarioBase,
    PreferenciasAgendaNegocioInput,
    AgendaActionResult,
    DiaSemana,
    // --- NUEVO TIPO IMPORTADO ---
    AgendaConfigSummary,
    PreferenciasGeneralesSummary
} from './negocioAgenda.type';

import {
    Negocio,
    AgendaTipoCita
} from '@prisma/client';

// --- NUEVA ACTION ---
export async function obtenerTiposCitaPorNegocioId(negocioId: string): Promise<AgendaActionResult<AgendaTipoCita[]>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    try {
        const tipos = await prisma.agendaTipoCita.findMany({
            where: { negocioId: negocioId },
            orderBy: { orden: 'asc' } // Asumiendo que tienes un campo 'orden' en AgendaTipoCita
        });
        return { success: true, data: tipos as AgendaTipoCita[] };
    } catch (error) {
        console.error("Error obteniendo tipos de cita por negocioId:", error);
        return { success: false, error: "No se pudieron obtener los tipos de cita." };
    }
}

// --- Obtener Configuración Completa de la Agenda ---
export async function obtenerConfiguracionAgenda(negocioId: string): Promise<AgendaActionResult<NegocioAgendaConfig>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    try {
        type NegocioConRelacionesAgenda = Prisma.NegocioGetPayload<{
            select: {
                id: true,
                aceptaCitasPresenciales: true,
                aceptaCitasVirtuales: true,
                requiereTelefonoParaCita: true,
                requiereEmailParaCita: true,
                metodosPagoTexto: true,
                agendaTipoCita: { orderBy: { orden: 'asc' } }, // Ordenar aquí también
                horariosAtencion: { orderBy: { dia: 'asc' } },
                excepcionesHorario: { orderBy: { fecha: 'asc' } },
            }
        }>;

        const negocio: NegocioConRelacionesAgenda | null = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                id: true,
                aceptaCitasPresenciales: true,
                aceptaCitasVirtuales: true,
                requiereTelefonoParaCita: true,
                requiereEmailParaCita: true,
                metodosPagoTexto: true,
                agendaTipoCita: { orderBy: { orden: 'asc' } },
                horariosAtencion: { orderBy: { dia: 'asc' } },
                excepcionesHorario: { orderBy: { fecha: 'asc' } },
            }
        });

        if (!negocio) {
            return { success: false, error: "Negocio no encontrado." };
        }

        const horariosParaConfig: HorarioAtencionBase[] = negocio.horariosAtencion.map(h => ({
            id: h.id,
            negocioId: h.negocioId,
            dia: h.dia as DiaSemana,
            horaInicio: h.horaInicio,
            horaFin: h.horaFin,
        }));

        const excepcionesParaConfig: ExcepcionHorarioBase[] = negocio.excepcionesHorario.map(eh => ({
            id: eh.id,
            negocioId: eh.negocioId,
            fecha: eh.fecha.toISOString().split('T')[0],
            esDiaNoLaborable: eh.esDiaNoLaborable,
            horaInicio: eh.horaInicio,
            horaFin: eh.horaFin,
            descripcion: eh.descripcion,
        }));

        const config: NegocioAgendaConfig = {
            id: negocio.id,
            aceptaCitasPresenciales: negocio.aceptaCitasPresenciales,
            aceptaCitasVirtuales: negocio.aceptaCitasVirtuales,
            requiereTelefonoParaCita: negocio.requiereTelefonoParaCita,
            requiereEmailParaCita: negocio.requiereEmailParaCita,
            metodosPagoTexto: negocio.metodosPagoTexto,
            agendaTiposCita: negocio.agendaTipoCita as AgendaTipoCita[],
            horariosAtencion: horariosParaConfig,
            excepcionesHorario: excepcionesParaConfig,
        };
        return { success: true, data: config };
    } catch (error) {
        console.error("Error obteniendo configuración de agenda:", error);
        return { success: false, error: "No se pudo obtener la configuración de la agenda." };
    }
}

// --- Gestión de Tipos de Cita (AgendaTipoCita) ---
export async function crearTipoCita(negocioId: string, data: TipoCitaInput): Promise<AgendaActionResult<AgendaTipoCita>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!data.nombre?.trim()) return { success: false, error: "El nombre del tipo de cita es obligatorio." };

    try {
        // Calcular el siguiente orden para el nuevo tipo de cita
        const ultimoTipoCita = await prisma.agendaTipoCita.findFirst({
            where: { negocioId },
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoTipoCita?.orden ?? -1) + 1;

        const nuevoTipoCita = await prisma.agendaTipoCita.create({
            data: {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || null,
                duracionMinutos: data.duracionMinutos || null,
                esVirtual: data.esVirtual || false,
                esPresencial: data.esPresencial || false,
                orden: nuevoOrden, // Asignar el nuevo orden
                negocio: { connect: { id: negocioId } }
            }
        });
        revalidatePath(`/admin/negocios/${negocioId}/agenda`);
        return { success: true, data: nuevoTipoCita as AgendaTipoCita };
    } catch (error) {
        console.error("Error creando tipo de cita:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El tipo de cita "${data.nombre}" ya existe para este negocio.` }; // Asumiendo unique(negocioId, nombre)
        }
        return { success: false, error: "No se pudo crear el tipo de cita." };
    }
}

export async function actualizarTipoCita(tipoCitaId: string, data: Partial<TipoCitaInput>): Promise<AgendaActionResult<AgendaTipoCita>> {
    if (!tipoCitaId) return { success: false, error: "ID de tipo de cita no proporcionado." };
    if (data.nombre !== undefined && !data.nombre?.trim()) {
        return { success: false, error: "El nombre del tipo de cita no puede estar vacío." };
    }
    try {
        const dataToUpdate: Prisma.AgendaTipoCitaUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;
        if (data.duracionMinutos !== undefined) dataToUpdate.duracionMinutos = data.duracionMinutos ?? null;
        if (data.esVirtual !== undefined) dataToUpdate.esVirtual = data.esVirtual;
        if (data.esPresencial !== undefined) dataToUpdate.esPresencial = data.esPresencial;
        // 'orden' no se actualiza aquí, se maneja con una acción separada.

        const tipoCitaActualizado = await prisma.agendaTipoCita.update({
            where: { id: tipoCitaId },
            data: dataToUpdate
        });
        const negocio = await prisma.agendaTipoCita.findUnique({ where: { id: tipoCitaId }, select: { negocioId: true } });
        if (negocio?.negocioId) revalidatePath(`/admin/negocios/${negocio.negocioId}/agenda`);
        return { success: true, data: tipoCitaActualizado as AgendaTipoCita };
    } catch (error) {
        console.error("Error actualizando tipo de cita:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && data.nombre) {
            return { success: false, error: `El tipo de cita "${data.nombre}" ya existe.` };
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Tipo de cita no encontrado." };
        }
        return { success: false, error: "No se pudo actualizar el tipo de cita." };
    }
}

export async function eliminarTipoCita(tipoCitaId: string): Promise<AgendaActionResult> {
    if (!tipoCitaId) return { success: false, error: "ID de tipo de cita no proporcionado." };
    try {
        const agendasAsociadas = await prisma.agenda.count({ where: { tipoDeCitaId: tipoCitaId } });
        if (agendasAsociadas > 0) {
            return { success: false, error: `No se puede eliminar: ${agendasAsociadas} cita(s) usan este tipo.` };
        }
        const tipoCita = await prisma.agendaTipoCita.findUnique({ where: { id: tipoCitaId }, select: { negocioId: true } });
        await prisma.agendaTipoCita.delete({ where: { id: tipoCitaId } });
        if (tipoCita?.negocioId) revalidatePath(`/admin/negocios/${tipoCita.negocioId}/agenda`);
        return { success: true };
    } catch (error) {
        console.error("Error eliminando tipo de cita:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Tipo de cita no encontrado." };
        }
        return { success: false, error: "No se pudo eliminar el tipo de cita." };
    }
}

// --- NUEVA ACTION para actualizar el orden de los tipos de cita ---
export async function actualizarOrdenTiposCita(
    negocioId: string, // Necesario para revalidar el path correcto
    itemsOrdenados: { id: string; orden: number }[]
): Promise<AgendaActionResult> {
    if (!itemsOrdenados || itemsOrdenados.length === 0) {
        return { success: true };
    }
    try {
        await prisma.$transaction(
            itemsOrdenados.map(item =>
                prisma.agendaTipoCita.update({
                    where: { id: item.id },
                    data: { orden: item.orden },
                })
            )
        );
        revalidatePath(`/admin/negocios/${negocioId}/agenda`);
        return { success: true };
    } catch (error) {
        console.error("Error actualizando orden de tipos de cita:", error);
        return { success: false, error: (error as Error).message || "Error al actualizar el orden." };
    }
}


// ... (resto de las funciones: guardarHorariosAtencion, crearExcepcionHorario, etc., se mantienen igual)
// --- Gestión de Horario de Atención Semanal ---
export async function guardarHorariosAtencion(negocioId: string, horariosInput: HorarioAtencionBase[]): Promise<AgendaActionResult> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    try {
        const timeRegex = /^(0[0-9]|1[0-9]|2[0-3]):[0-5][0-9]$/;
        for (const h of horariosInput) {
            if (!timeRegex.test(h.horaInicio) || !timeRegex.test(h.horaFin)) {
                return { success: false, error: `Formato de hora inválido para ${h.dia}. Use HH:MM.` };
            }
            if (h.horaInicio >= h.horaFin) {
                return { success: false, error: `La hora de inicio debe ser anterior a la hora de fin para ${h.dia}.` };
            }
        }

        await prisma.$transaction(async (tx) => {
            await tx.horarioAtencion.deleteMany({ where: { negocioId: negocioId } });
            if (horariosInput.length > 0) {
                await tx.horarioAtencion.createMany({
                    data: horariosInput.map(h => ({
                        negocioId: negocioId,
                        dia: h.dia,
                        horaInicio: h.horaInicio,
                        horaFin: h.horaFin,
                    }))
                });
            }
        });
        revalidatePath(`/admin/negocios/${negocioId}/agenda`);
        return { success: true };
    } catch (error) {
        console.error("Error guardando horarios de atención:", error);
        return { success: false, error: "No se pudieron guardar los horarios de atención." };
    }
}

// --- Gestión de Excepciones de Horario ---
export async function crearExcepcionHorario(negocioId: string, data: ExcepcionHorarioInput): Promise<AgendaActionResult<ExcepcionHorarioBase>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    if (!data.fecha) return { success: false, error: "La fecha es obligatoria." };
    try {
        const fechaDate = new Date(data.fecha + "T00:00:00Z"); // Interpretar como UTC para consistencia
        if (isNaN(fechaDate.getTime())) {
            return { success: false, error: "Formato de fecha inválido." };
        }

        const nuevaExcepcion = await prisma.excepcionHorario.create({
            data: {
                negocioId: negocioId,
                fecha: fechaDate,
                esDiaNoLaborable: data.esDiaNoLaborable,
                horaInicio: !data.esDiaNoLaborable ? data.horaInicio : null,
                horaFin: !data.esDiaNoLaborable ? data.horaFin : null,
                descripcion: data.descripcion?.trim() || null,
            }
        });
        revalidatePath(`/admin/negocios/${negocioId}/agenda`);
        return { success: true, data: { ...nuevaExcepcion, fecha: nuevaExcepcion.fecha.toISOString().split('T')[0] } as ExcepcionHorarioBase };
    } catch (error) {
        console.error("Error creando excepción de horario:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `Ya existe una excepción para la fecha ${data.fecha}.` };
        }
        return { success: false, error: "No se pudo crear la excepción de horario." };
    }
}

export async function actualizarExcepcionHorario(excepcionId: string, data: Partial<ExcepcionHorarioInput>): Promise<AgendaActionResult<ExcepcionHorarioBase>> {
    if (!excepcionId) return { success: false, error: "ID de excepción no proporcionado." };
    try {
        const dataToUpdate: Prisma.ExcepcionHorarioUpdateInput = {};
        if (data.fecha !== undefined) {
            const fechaDate = new Date(data.fecha + "T00:00:00Z"); // Interpretar como UTC
            if (isNaN(fechaDate.getTime())) return { success: false, error: "Formato de fecha inválido." };
            dataToUpdate.fecha = fechaDate;
        }
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;
        if (data.esDiaNoLaborable !== undefined) dataToUpdate.esDiaNoLaborable = data.esDiaNoLaborable;

        if (data.esDiaNoLaborable === false) {
            if (data.horaInicio !== undefined) dataToUpdate.horaInicio = data.horaInicio;
            if (data.horaFin !== undefined) dataToUpdate.horaFin = data.horaFin;
        } else if (data.esDiaNoLaborable === true) {
            dataToUpdate.horaInicio = null;
            dataToUpdate.horaFin = null;
        }

        const excepcionActualizada = await prisma.excepcionHorario.update({
            where: { id: excepcionId },
            data: dataToUpdate
        });
        const negocio = await prisma.excepcionHorario.findUnique({ where: { id: excepcionId }, select: { negocioId: true } });
        if (negocio?.negocioId) revalidatePath(`/admin/negocios/${negocio.negocioId}/agenda`);
        return { success: true, data: { ...excepcionActualizada, fecha: excepcionActualizada.fecha.toISOString().split('T')[0] } as ExcepcionHorarioBase };
    } catch (error) {
        console.error("Error actualizando excepción de horario:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && data.fecha) {
            return { success: false, error: `Ya existe una excepción para la fecha ${data.fecha}.` };
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Excepción no encontrada." };
        }
        return { success: false, error: "No se pudo actualizar la excepción de horario." };
    }
}

export async function eliminarExcepcionHorario(excepcionId: string): Promise<AgendaActionResult> {
    if (!excepcionId) return { success: false, error: "ID de excepción no proporcionado." };
    try {
        const negocio = await prisma.excepcionHorario.findUnique({ where: { id: excepcionId }, select: { negocioId: true } });
        await prisma.excepcionHorario.delete({ where: { id: excepcionId } });
        if (negocio?.negocioId) revalidatePath(`/admin/negocios/${negocio.negocioId}/agenda`);
        return { success: true };
    } catch (error) {
        console.error("Error eliminando excepción de horario:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Excepción no encontrada." };
        }
        return { success: false, error: "No se pudo eliminar la excepción de horario." };
    }
}

export async function actualizarPreferenciasAgendaNegocio(negocioId: string, data: PreferenciasAgendaNegocioInput): Promise<AgendaActionResult<Negocio>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    try {
        const negocioActualizado = await prisma.negocio.update({
            where: { id: negocioId },
            data: {
                aceptaCitasPresenciales: data.aceptaCitasPresenciales,
                aceptaCitasVirtuales: data.aceptaCitasVirtuales,
                requiereTelefonoParaCita: data.requiereTelefonoParaCita,
                requiereEmailParaCita: data.requiereEmailParaCita,
                metodosPagoTexto: data.metodosPagoTexto?.trim() || null,
            }
        });
        revalidatePath(`/admin/negocios/${negocioId}/agenda`);
        return { success: true, data: negocioActualizado as Negocio };
    } catch (error) {
        console.error("Error actualizando preferencias de agenda:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Negocio no encontrado." };
        }
        return { success: false, error: "No se pudieron actualizar las preferencias de la agenda." };
    }
}

// --- Obtener Resumen de Configuración de Agenda ---
export async function obtenerResumenConfiguracionAgenda(negocioId: string): Promise<AgendaActionResult<AgendaConfigSummary>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                aceptaCitasPresenciales: true,
                aceptaCitasVirtuales: true,
                requiereTelefonoParaCita: true,
                requiereEmailParaCita: true,
                metodosPagoTexto: true,
                // Para los conteos, seleccionamos solo lo necesario para contar
                agendaTipoCita: { select: { id: true } },
                horariosAtencion: { select: { id: true, horaInicio: true, horaFin: true } },
                excepcionesHorario: { select: { id: true } },
            }
        });

        if (!negocio) {
            return {
                success: true,
                data: {
                    preferencias: undefined, // O un objeto de PreferenciasGeneralesSummary con todos los campos en false/vacío
                    totalTiposCita: 0,
                    horariosDefinidos: false,
                    totalExcepciones: 0,
                    configuracionIniciada: false
                }
            };
        }

        const preferencias: PreferenciasGeneralesSummary = {
            aceptaPresenciales: negocio.aceptaCitasPresenciales,
            aceptaVirtuales: negocio.aceptaCitasVirtuales,
            requiereTelefono: negocio.requiereTelefonoParaCita,
            requiereEmail: negocio.requiereEmailParaCita,
            metodosPagoDefinidos: !!negocio.metodosPagoTexto?.trim(),
        };

        const horariosDefinidos = negocio.horariosAtencion.some(h => h.horaInicio && h.horaFin);
        const totalTiposCita = negocio.agendaTipoCita.length;
        const totalExcepciones = negocio.excepcionesHorario.length;

        const algunaPreferenciaSet = Object.values(preferencias).some(value => value === true || (typeof value === 'string' && value.length > 0));
        const configuracionIniciada = algunaPreferenciaSet || totalTiposCita > 0 || horariosDefinidos || totalExcepciones > 0;

        const summary: AgendaConfigSummary = {
            preferencias,
            totalTiposCita,
            horariosDefinidos,
            totalExcepciones,
            configuracionIniciada
        };

        return { success: true, data: summary };
    } catch (error) {
        console.error("Error obteniendo resumen de configuración de agenda:", error);
        return { success: false, error: "No se pudo obtener el resumen de la configuración." };
    }
}


