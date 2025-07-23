'use server';
import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { asignarEtiquetaLeadParamsSchema } from './lead.schemas';
import {
    obtenerLeadDetallesParamsSchema,
    obtenerEtiquetasAsignadasLeadParamsSchema,
    actualizarEtiquetasLeadParamsSchema,
    listarLeadsParamsSchema,
    obtenerDatosParaFiltrosLeadParamsSchema,
    DatosParaFiltrosLeadData,
    obtenerDatosFormularioLeadParamsSchema,
    DatosFormularioLeadData,

    // actualizarLeadParamsSchema,
    eliminarLeadParamsSchema,
    crearLeadParamsSchema,
    leadDetalleSchema,
    marcarLeadComoGanadoParamsSchema,
    etiquetarYReubicarLeadParamsSchema,
    cambiarEtapaLeadParamsSchema,
    CrearLeadBasicoParams,
    crearLeadBasicoParamsSchema,
    ActualizarLeadParams,
    actualizarLeadParamsSchema,

    obtenerDetallesLeadParamsSchema,
    type LeadDetails
} from './lead.schemas'; // Asumiendo que los schemas están aquí

// Si LeadDetalleData no incluye createdAt y updatedAt, extiéndelo aquí temporalmente:
type LeadDetalleData = {
    id: string;
    nombre: string;
    email: string | null;
    telefono: string | null;
    status: string | null;
    pipelineId: string | null;
    agenteId: string | null;
    canalId: string | null;
    valorEstimado: number | null;
    etiquetaIds: string[];
    createdAt: Date;
    updatedAt: Date;
};
import { z } from 'zod';
import { crearInteraccionSistemaAction } from '../conversacion/conversacion.actions'; // Necesitaremos esta acción refactorizada
import { revalidatePath } from 'next/cache';
import { type ListarLeadsResult } from './lead.schemas';



export async function listarLeadsAction(
    params: z.infer<typeof listarLeadsParamsSchema>
): Promise<ActionResult<ListarLeadsResult>> {

    const validation = listarLeadsParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos." };
    }

    const { negocioId, page, pageSize, searchTerm, colegio } = validation.data;
    const skip = (page - 1) * pageSize;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId: negocioId },
            select: { id: true }
        });

        if (!crm) {
            return { success: true, data: { leads: [], totalCount: 0, page, pageSize } };
        }
        const crmId = crm.id;

        const whereClause: Prisma.LeadWhereInput = {
            crmId: crmId,
            ...(searchTerm && {
                OR: [
                    { nombre: { contains: searchTerm, mode: 'insensitive' } },
                    { email: { contains: searchTerm, mode: 'insensitive' } },
                    { telefono: { contains: searchTerm, mode: 'insensitive' } },
                ],
            }),
            // ✅ Se añade el filtro por colegio en los jsonParams
            ...(colegio && {
                jsonParams: {
                    path: ['colegio'],
                    equals: colegio,
                }
            }),
        };

        const [leads, totalCount] = await prisma.$transaction([
            prisma.lead.findMany({
                where: whereClause,
                select: {
                    id: true,
                    nombre: true,
                    email: true,
                    telefono: true,
                    createdAt: true,
                    jsonParams: true, // ✅ Se seleccionan los jsonParams
                    Pipeline: { select: { id: true, nombre: true } },
                    agente: { select: { id: true, nombre: true } },
                },
                orderBy: { createdAt: 'desc' },
                skip,
                take: pageSize,
            }),
            prisma.lead.count({ where: whereClause }),
        ]);

        const result: ListarLeadsResult = {
            leads: leads.map(lead => ({
                id: lead.id,
                nombre: lead.nombre,
                email: lead.email,
                telefono: lead.telefono,
                createdAt: lead.createdAt,
                jsonParams: lead.jsonParams, // ✅ Se pasan los jsonParams
                etapaPipeline: lead.Pipeline,
                agenteAsignado: lead.agente,
            })),
            totalCount,
            page,
            pageSize,
        };

        return { success: true, data: result };

    } catch (error) {
        console.error("Error en listarLeadsAction:", error);
        return { success: false, error: "No se pudieron cargar los leads." };
    }
}
export async function obtenerDatosFiltrosLeadAction(
    params: z.infer<typeof obtenerDatosParaFiltrosLeadParamsSchema>
): Promise<ActionResult<DatosParaFiltrosLeadData>> {
    const validation = obtenerDatosParaFiltrosLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId } = validation.data;

    try {
        const crmData = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true,
                Pipeline: { where: { status: 'activo' }, select: { id: true, nombre: true }, orderBy: { orden: 'asc' } },
                Canal: { where: { status: 'activo' }, select: { id: true, nombre: true }, orderBy: { orden: 'asc' } },
                Etiqueta: { where: { status: 'activo' }, select: { id: true, nombre: true, color: true }, orderBy: { orden: 'asc' } },
                Agente: { where: { status: 'activo' }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } },
            }
        });

        if (!crmData) {
            // Si no hay CRM, devolver éxito con crmId null y arrays vacíos para filtros.
            return {
                success: true,
                data: {
                    crmId: null,
                    pipelines: [],
                    canales: [],
                    etiquetas: [],
                    agentes: []
                }
            };
        }

        const data: DatosParaFiltrosLeadData = {
            crmId: crmData.id,
            pipelines: crmData.Pipeline.map(p => ({ id: p.id, nombre: p.nombre, color: undefined /* Añadir si lo tienes */ })), // Color es opcional
            canales: crmData.Canal.map(c => ({ id: c.id, nombre: c.nombre })),
            etiquetas: crmData.Etiqueta.map(e => ({ id: e.id, nombre: e.nombre, color: e.color })),
            agentes: crmData.Agente.map(a => ({ id: a.id, nombre: a.nombre ?? null })),
        };
        return { success: true, data };

    } catch (error) {
        console.error('Error en obtenerDatosFiltrosLeadAction:', error);
        return { success: false, error: 'No se pudieron cargar los datos para los filtros.' };
    }
}



export async function obtenerEtiquetasAsignadasLeadAction(
    params: z.infer<typeof obtenerEtiquetasAsignadasLeadParamsSchema>
): Promise<ActionResult<string[]>> {
    const validation = obtenerEtiquetasAsignadasLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de Lead inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { leadId } = validation.data;
    try {
        const leadEtiquetas = await prisma.leadEtiqueta.findMany({
            where: { leadId: leadId },
            select: { etiquetaId: true },
        });
        const data = leadEtiquetas.map(le => le.etiquetaId);
        return { success: true, data };
    } catch (error) {
        console.error('Error en obtenerEtiquetasAsignadasLeadAction:', error);
        return { success: false, error: 'No se pudieron cargar las etiquetas asignadas.' };
    }
}

export async function actualizarEtiquetasDelLeadAction( // Renombrada para claridad
    params: z.infer<typeof actualizarEtiquetasLeadParamsSchema>
): Promise<ActionResult<null>> {
    const validation = actualizarEtiquetasLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { leadId, etiquetaIds, conversacionId, nombreAgenteQueActualiza } = validation.data;

    try {
        await prisma.$transaction(async (tx) => {
            await tx.leadEtiqueta.deleteMany({ where: { leadId: leadId } });
            if (etiquetaIds.length > 0) {
                await tx.leadEtiqueta.createMany({
                    data: etiquetaIds.map(etiquetaId => ({ leadId: leadId, etiquetaId: etiquetaId })),
                });
            }
        });
        if (conversacionId) { // Solo crear interacción si hay ID de conversación
            const mensajeSistema = `Etiquetas del lead actualizadas${nombreAgenteQueActualiza ? ` por ${nombreAgenteQueActualiza}` : ''}.`;
            // Asumiendo que crearInteraccionSistemaAction ya está refactorizada y disponible
            await crearInteraccionSistemaAction({ conversacionId, mensaje: mensajeSistema });
        }
        return { success: true, data: null };
    } catch (error) {
        console.error('Error en actualizarEtiquetasDelLeadAction:', error);
        return { success: false, error: 'No se pudieron actualizar las etiquetas del lead.' };
    }
}


export async function actualizarLeadAction(
    params: ActualizarLeadParams
): Promise<ActionResult<LeadDetalleData | null>> {
    const validation = actualizarLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para actualizar el lead.", data: null };
    }

    const { leadId, datos } = validation.data;
    const { etiquetaIds, jsonParams, ...otrosDatosDelLead } = datos;

    try {
        const leadActualizado = await prisma.$transaction(async (tx) => {
            // 1. Actualizar los campos directos y los jsonParams del Lead
            const updatedLead = await tx.lead.update({
                where: { id: leadId },
                data: {
                    ...otrosDatosDelLead,
                    jsonParams: jsonParams || Prisma.JsonNull, // Actualiza los campos personalizados
                    agenteId: otrosDatosDelLead.agenteId ?? undefined,
                    canalId: otrosDatosDelLead.canalId ?? undefined,
                    pipelineId: otrosDatosDelLead.pipelineId ?? undefined,
                    status: otrosDatosDelLead.status ?? undefined,
                    telefono: otrosDatosDelLead.telefono ?? undefined,
                    valorEstimado: otrosDatosDelLead.valorEstimado ?? undefined,
                },
                select: { // Seleccionamos todo lo necesario para reconstruir el objeto de retorno
                    id: true, nombre: true, email: true, telefono: true, status: true,
                    pipelineId: true, agenteId: true, canalId: true, valorEstimado: true,
                    jsonParams: true, createdAt: true, updatedAt: true,
                }
            });

            // 2. Sincronizar las etiquetas del Lead
            await tx.leadEtiqueta.deleteMany({
                where: { leadId: leadId },
            });
            if (etiquetaIds && etiquetaIds.length > 0) {
                await tx.leadEtiqueta.createMany({
                    data: etiquetaIds.map(etiquetaId => ({
                        leadId: leadId,
                        etiquetaId: etiquetaId,
                    })),
                });
            }

            return updatedLead;
        });
        const finalData: LeadDetalleData = {
            ...leadActualizado,
            etiquetaIds: etiquetaIds || [],
        };
        return { success: true, data: finalData };

    } catch (error) {
        console.error(`Error al actualizar lead ${leadId}:`, error);
        return { success: false, error: 'No se pudo actualizar el lead.', data: null };
    }
}


// --- NUEVA VERSIÓN DE eliminarLead (ahora eliminarLeadAction) ---

export async function eliminarLeadAction(
    params: z.infer<typeof eliminarLeadParamsSchema>
): Promise<ActionResult<{ id: string } | null>> {
    const validation = eliminarLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de Lead inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { leadId } = validation.data;

    try {
        // Verificar si el lead tiene citas agendadas
        const citasAgendadas = await prisma.agenda.findMany({
            where: { leadId: leadId }
        });
        if (citasAgendadas.length > 0) {
            return { success: false, error: "El lead tiene una cita agendada. Debes eliminar la cita antes de eliminar el lead." };
        }

        await prisma.lead.delete({
            where: { id: leadId },
        });
        return { success: true, data: { id: leadId } };
    } catch (error) {
        console.error(`Error al eliminar lead ${leadId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return { success: false, error: "El lead que intentas eliminar no fue encontrado." };
            }
            if (error.code === 'P2003') {
                return { success: false, error: "No se puede eliminar el lead porque tiene registros asociados. Debes eliminarlos o desasociarlos primero." };
            }
        }
        return { success: false, error: 'No se pudo eliminar el lead.' };
    }
}


export async function crearLeadAction(
    params: z.infer<typeof crearLeadParamsSchema>
): Promise<ActionResult<LeadDetalleData | null>> {
    const validation = crearLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para crear el lead.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { crmId, negocioId, datos } = validation.data;
    const { nombre, email, telefono, valorEstimado } = datos;

    try {
        // 1. Obtener el primer pipeline activo para este CRM (etapa inicial por defecto)
        const primerPipeline = await prisma.pipelineCRM.findFirst({
            where: {
                crmId: crmId,
                status: 'activo',
            },
            orderBy: {
                orden: 'asc', // Asumiendo que 'orden' define la secuencia de etapas
            },
            select: { id: true },
        });

        if (!primerPipeline) {
            return { success: false, error: `No se encontró una etapa de pipeline inicial activa para el CRM. Por favor, configura el pipeline del CRM del negocio (ID: ${negocioId}).`, data: null };
        }

        // 2. (Opcional) Obtener el canal "Manual" o "Directo" por defecto
        let canalIdPorDefecto: string | null = null;
        const canalDirecto = await prisma.canalCRM.findFirst({
            where: {
                crmId: crmId,
                // Busca por un nombre específico que uses para entrada manual
                OR: [{ nombre: 'Directo' }, { nombre: 'Manual' }],
                status: 'activo'
            },
            select: { id: true }
        });
        if (canalDirecto) {
            canalIdPorDefecto = canalDirecto.id;
        } else {
            // Si no existe, podrías crearlo o simplemente dejar canalId como null
            console.warn(`Canal por defecto 'Directo' o 'Manual' no encontrado para CRM ${crmId}. El lead se creará sin canal de origen.`);
        }


        // 3. Crear el Lead
        const nuevoLead = await prisma.lead.create({
            data: {
                crmId: crmId,
                nombre: nombre,
                email: email,
                telefono: telefono,
                valorEstimado: valorEstimado, // Ya es number | null | undefined gracias a Zod
                status: 'nuevo', // Estado inicial por defecto
                pipelineId: primerPipeline.id, // Asignar a la primera etapa del pipeline
                canalId: canalIdPorDefecto, // Asignar canal por defecto si se encontró
                // agenteId: params.agenteCreadorId, // Si pasas el agente que lo crea
                // No se asignan etiquetas por defecto en esta acción simple
            },
            select: { // Seleccionar todos los campos necesarios para LeadDetalleData
                id: true, nombre: true, email: true, telefono: true, status: true,
                pipelineId: true, agenteId: true, canalId: true, valorEstimado: true,
                Etiquetas: { select: { etiquetaId: true } },
                createdAt: true, updatedAt: true,
            }
        });

        // Mapear a LeadDetalleData
        const leadData: LeadDetalleData = {
            id: nuevoLead.id,
            nombre: nuevoLead.nombre,
            email: nuevoLead.email,
            telefono: nuevoLead.telefono,
            status: nuevoLead.status,
            pipelineId: nuevoLead.pipelineId,
            agenteId: nuevoLead.agenteId,
            canalId: nuevoLead.canalId,
            valorEstimado: nuevoLead.valorEstimado,
            etiquetaIds: nuevoLead.Etiquetas.map(le => le.etiquetaId), // Siempre será [] para un nuevo lead sin etiquetas
            createdAt: nuevoLead.createdAt,
            updatedAt: nuevoLead.updatedAt,
        };

        const parseResult = leadDetalleSchema.safeParse(leadData);
        if (!parseResult.success) {
            console.error("Error Zod en salida de crearLeadAction:", parseResult.error.flatten());
            return { success: false, error: "Formato de datos del lead creado inesperado.", data: null };
        }

        // Revalidar la lista de leads para este negocio
        revalidatePath(`/admin/clientes/${params.crmId}/negocios/${negocioId}/crm/leads`); // Asumiendo que clienteId se puede obtener o no es crucial aquí

        return { success: true, data: parseResult.data };

    } catch (error) {
        console.error('Error al crear lead manual:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Ejemplo: Error de constraint único si el email debe ser único por CRM
            if (error.code === 'P2002' && (error.meta?.target as string[])?.includes('email')) {
                return { success: false, error: 'Ya existe un lead con este email para este CRM.', data: null };
            }
        }
        return { success: false, error: 'No se pudo crear el lead.', data: null };
    }
}

export async function obtenerDetallesLeadAction(
    params: z.infer<typeof obtenerDetallesLeadParamsSchema>
): Promise<ActionResult<LeadDetails>> {
    const validation = obtenerDetallesLeadParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "ID de lead inválido." };

    try {
        const lead = await prisma.lead.findUnique({
            where: { id: validation.data.leadId },
            select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true,
                jsonParams: true, // ✅ Se selecciona el campo jsonParams
                Pipeline: { select: { id: true, nombre: true, crmId: true } },
                Etiquetas: {
                    select: {
                        etiqueta: { select: { id: true, nombre: true, color: true } }
                    }
                }
            }
        });

        if (!lead) return { success: false, error: "Lead no encontrado." };

        // Mapeo de datos al esquema de salida
        const leadData: LeadDetails = {
            id: lead.id,
            nombre: lead.nombre,
            email: lead.email,
            telefono: lead.telefono,
            jsonParams: lead.jsonParams, // ✅ Se añade al objeto de datos
            etapaPipeline: lead.Pipeline,
            etiquetas: lead.Etiquetas.map(e => e.etiqueta)
        };

        return { success: true, data: leadData };

    } catch (error) {
        console.error("Error en obtenerDetallesLeadAction:", error);
        return { success: false, error: "Error al obtener detalles del lead." };
    }
}


export async function marcarLeadComoGanadoAction(
    params: z.infer<typeof marcarLeadComoGanadoParamsSchema>
): Promise<ActionResult<boolean>> {
    const validation = marcarLeadComoGanadoParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "Parámetros inválidos." };
    const { leadId, negocioId } = validation.data;

    try {
        // 1. Encontrar la etapa "Ganado" de este negocio
        const etapaGanado = await prisma.pipelineCRM.findFirst({
            where: {
                crm: { negocioId },
                nombre: { equals: 'Ganado', mode: 'insensitive' }
            },
        });

        if (!etapaGanado) return { success: false, error: "No se encontró la etapa 'Ganado'." };

        // 2. Actualizar el lead a esta nueva etapa
        await prisma.lead.update({
            where: { id: leadId },
            data: { pipelineId: etapaGanado.id },
        });

        // 3. Revalidar el path para que Next.js refresque los datos del pipeline
        revalidatePath(`/admin/clientes/.*/negocios/${negocioId}/leads`);

        return { success: true, data: true };
    } catch {
        return { success: false, error: "Error al actualizar el lead." };
    }
}

import { actualizarEstadoCitaParamsSchema } from '../citas/citas.schemas'; // Asegúrate de que este schema esté definido correctamente

export async function actualizarEstadoCitaAction(
    params: z.infer<typeof actualizarEstadoCitaParamsSchema>
): Promise<ActionResult<boolean>> {
    const validation = actualizarEstadoCitaParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "Parámetros inválidos." };

    const { agendaId, nuevoEstado } = validation.data;

    try {
        await prisma.agenda.update({
            where: { id: agendaId },
            data: { status: nuevoEstado },
        });

        // Asumimos que las citas se ven en una ruta de 'citas', revalidamos
        revalidatePath('/admin/clientes/.*/negocios/.*/citas');

        return { success: true, data: true };
    } catch {
        return { success: false, error: "Error al actualizar el estado de la cita." };
    }
}


export async function asignarEtiquetaLeadAction(
    params: z.infer<typeof asignarEtiquetaLeadParamsSchema>
): Promise<ActionResult<boolean>> {
    const validation = asignarEtiquetaLeadParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "Parámetros inválidos." };

    const { leadId, nombreEtiqueta, crmId, colorEtiqueta } = validation.data;

    try {
        // Usamos 'upsert' para crear la etiqueta si no existe, o encontrarla si ya existe.
        const etiqueta = await prisma.etiquetaCRM.upsert({
            where: { crmId_nombre: { crmId, nombre: nombreEtiqueta } },
            update: {}, // No actualizamos nada si ya existe
            create: {
                crmId,
                nombre: nombreEtiqueta,
                color: colorEtiqueta,
            },
        });

        // Creamos la relación en la tabla intermedia, ignorando si ya existe.
        await prisma.leadEtiqueta.create({
            data: {
                leadId,
                etiquetaId: etiqueta.id,
            },
        });

        // Revalidamos la ruta de leads para que se reflejen los cambios en la UI
        // Esta es una revalidación más genérica que puede servir.
        revalidatePath('/admin/clientes', 'layout');

        return { success: true, data: true };
    } catch (error) {
        // Prisma tira un error P2002 si la relación ya existe, lo cual no es un error para nosotros.
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: true, data: true };
        }
        console.error("Error en asignarEtiquetaLeadAction:", error);
        return { success: false, error: "No se pudo asignar la etiqueta." };
    }
}


// import { etiquetarYReubicarLeadParamsSchema } from './lead.schemas';
export async function etiquetarYReubicarLeadAction(
    params: z.infer<typeof etiquetarYReubicarLeadParamsSchema>
): Promise<ActionResult<boolean>> {
    const validation = etiquetarYReubicarLeadParamsSchema.safeParse(params);
    if (!validation.success) return { success: false, error: "Parámetros inválidos." };

    const { leadId, negocioId, nombreEtiqueta, nombreEtapaDestino } = validation.data;

    try {
        // Usamos una transacción para asegurar que ambas operaciones (o ninguna) se completen.
        const result = await prisma.$transaction(async (tx) => {
            // 1. Encontrar el CRM ID
            const lead = await tx.lead.findUnique({ where: { id: leadId }, select: { crmId: true } });
            if (!lead?.crmId) throw new Error("CRM no encontrado para este lead.");

            // 2. Crear/encontrar la etiqueta
            const etiqueta = await tx.etiquetaCRM.upsert({
                where: { crmId_nombre: { crmId: lead.crmId, nombre: nombreEtiqueta } },
                update: {},
                create: { crmId: lead.crmId, nombre: nombreEtiqueta },
            });

            // 3. Asignar la etiqueta al lead
            await tx.leadEtiqueta.create({
                data: { leadId, etiquetaId: etiqueta.id },
            });

            // 4. Encontrar la etapa de destino del pipeline
            const etapaDestino = await tx.pipelineCRM.findFirst({
                where: { crm: { negocioId }, nombre: { equals: nombreEtapaDestino, mode: 'insensitive' } },
            });
            if (!etapaDestino) throw new Error(`Etapa de pipeline '${nombreEtapaDestino}' no encontrada.`);

            // 5. Mover el lead a la nueva etapa
            await tx.lead.update({
                where: { id: leadId },
                data: { pipelineId: etapaDestino.id },
            });

            return true;
        });

        revalidatePath('/admin/clientes', 'layout');
        return { success: true, data: result };

    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Si la etiqueta ya estaba asignada, no es un error fatal.
            return { success: true, data: true };
        }
        console.error("Error en etiquetarYReubicarLeadAction:", error);
        return { success: false, error: (error as Error).message || "No se pudo completar la acción." };
    }
}

// import { cambiarEtapaLeadParamsSchema } from './lead.schemas';

export async function cambiarEtapaLeadAction(
    params: z.infer<typeof cambiarEtapaLeadParamsSchema>
): Promise<ActionResult<boolean>> {
    const validation = cambiarEtapaLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos." };
    }

    const { leadId, negocioId, nombreEtapaDestino } = validation.data;

    try {
        // 1. Encontrar la etapa de destino del pipeline por su nombre para ese negocio
        const etapaDestino = await prisma.pipelineCRM.findFirst({
            where: {
                crm: { negocioId },
                nombre: { equals: nombreEtapaDestino, mode: 'insensitive' } // 'insensitive' para evitar errores de mayúsculas/minúsculas
            },
        });

        // Si no se encuentra la etapa, es un error fatal para esta operación.
        if (!etapaDestino) {
            return { success: false, error: `La etapa de pipeline '${nombreEtapaDestino}' no fue encontrada.` };
        }

        // 2. Mover el lead a esta nueva etapa
        await prisma.lead.update({
            where: { id: leadId },
            data: { pipelineId: etapaDestino.id },
        });

        // Revalidamos el caché para que la UI refleje el cambio
        revalidatePath('/admin/clientes', 'layout');

        return { success: true, data: true };

    } catch (error) {
        console.error(`Error en cambiarEtapaLeadAction:`, error);
        return { success: false, error: "No se pudo actualizar la etapa del lead." };
    }
}

/**
 * Acción para crear un nuevo Lead con datos básicos.
 * Asigna el lead al primer pipeline disponible.
 * @param params - crmId y los datos del formulario.
 * @returns El ID del lead recién creado para la redirección.
 */
/**
 * Acción para crear un nuevo Lead con datos básicos.
 * Infiere el crmId a partir del negocioId.
 */
export async function crearLeadBasicoAction(
    params: CrearLeadBasicoParams
): Promise<ActionResult<{ id: string }>> {
    const validation = crearLeadBasicoParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos." };
    }
    const { negocioId, datos } = validation.data;

    try {
        // ✅ PASO 1: Inferir el crmId a partir del negocioId.
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { id: true }
        });

        if (!crm) {
            return { success: false, error: "No se encontró un CRM configurado para este negocio." };
        }
        const crmId = crm.id;

        // 2. Obtener el primer pipeline activo para este CRM
        const primerPipeline = await prisma.pipelineCRM.findFirst({
            where: { crmId: crmId, status: 'activo' },
            orderBy: { orden: 'asc' },
            select: { id: true, nombre: true },
        });

        if (!primerPipeline) {
            return { success: false, error: "No se encontró un pipeline inicial configurado para este CRM." };
        }


        // 3. Crear el Lead
        const nuevoLead = await prisma.lead.create({
            data: {
                crmId: crmId,
                nombre: datos.nombre,
                email: datos.email || null,
                telefono: datos.telefono || null,
                status: primerPipeline.nombre.toLowerCase(),
                pipelineId: primerPipeline.id,
            },
            select: { id: true }
        });

        revalidatePath(`/admin/clientes/.*`, 'layout');

        return { success: true, data: { id: nuevoLead.id } };

    } catch (error) {
        console.error('Error al crear lead básico:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: 'Ya existe un lead con este email.' };
        }
        return { success: false, error: 'No se pudo crear el lead.' };
    }
}


export async function obtenerDatosParaFormularioLeadAction(
    params: z.infer<typeof obtenerDatosFormularioLeadParamsSchema>
): Promise<ActionResult<DatosFormularioLeadData | null>> {

    // ✅ PASO 1: Se añade la validación que faltaba.
    const validation = obtenerDatosFormularioLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", data: null };
    }
    const { negocioId } = validation.data;

    try {
        const crmData = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true,
                Pipeline: { where: { status: 'activo' }, select: { id: true, nombre: true }, orderBy: { orden: 'asc' } },
                Canal: { where: { status: 'activo' }, select: { id: true, nombre: true }, orderBy: { orden: 'asc' } },
                Etiqueta: { where: { status: 'activo' }, select: { id: true, nombre: true, color: true }, orderBy: { orden: 'asc' } },
                Agente: { where: { status: 'activo' }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } },
                CampoPersonalizado: { where: { status: 'activo' }, orderBy: { orden: 'asc' } },
            }
        });

        // ✅ PASO 2: Se maneja el caso en que crmData sea null.
        if (!crmData) {
            console.warn(`[obtenerDatosParaFormularioLeadAction] No se encontró CRM para el negocioId: ${negocioId}`);
            // Devolvemos un objeto válido con listas vacías para que el formulario no falle.
            return {
                success: true,
                data: {
                    crmId: null,
                    pipelines: [],
                    canales: [],
                    etiquetas: [],
                    agentes: [],
                    camposPersonalizados: []
                }
            };
        }

        const datosFormulario: DatosFormularioLeadData = {
            crmId: crmData.id,
            pipelines: crmData.Pipeline.map(p => ({ id: p.id, nombre: p.nombre })),
            canales: crmData.Canal.map(c => ({ id: c.id, nombre: c.nombre })),
            etiquetas: crmData.Etiqueta.map(e => ({ id: e.id, nombre: e.nombre, color: e.color ?? null })),
            agentes: crmData.Agente.map(a => ({ id: a.id, nombre: a.nombre ?? null })),
            camposPersonalizados: crmData.CampoPersonalizado.map(cp => ({
                id: cp.id,
                nombre: cp.nombre,
                tipo: cp.tipo,
                nombreCampo: cp.nombreCampo || '', // Aseguramos que no sea null
                metadata: cp.metadata,
            })),
        };

        return { success: true, data: datosFormulario };

    } catch (error) {
        console.error("Error en obtenerDatosParaFormularioLeadAction:", error);
        return { success: false, error: "No se pudieron cargar los datos para el formulario.", data: null };
    }
}


export async function obtenerLeadDetallesAction(
    params: z.infer<typeof obtenerLeadDetallesParamsSchema>
): Promise<ActionResult<LeadDetalleData | null>> {

    const validation = obtenerLeadDetallesParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de Lead inválido.", data: null };
    }
    const { leadId } = validation.data;

    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true,
                status: true,
                pipelineId: true,
                agenteId: true,
                canalId: true,
                valorEstimado: true,
                // Se asegura de que jsonParams se seleccione en la consulta a la base de datos
                jsonParams: true,
                Etiquetas: { select: { etiquetaId: true } },
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!lead) {
            return { success: false, error: 'Lead no encontrado.', data: null };
        }

        // Se prepara el objeto para la validación, incluyendo jsonParams
        const leadDataParaValidar = {
            id: lead.id,
            nombre: lead.nombre,
            email: lead.email ?? null,
            telefono: lead.telefono ?? null,
            status: lead.status ?? null,
            pipelineId: lead.pipelineId ?? null,
            agenteId: lead.agenteId ?? null,
            canalId: lead.canalId ?? null,
            valorEstimado: lead.valorEstimado ?? null,
            jsonParams: lead.jsonParams ?? null, // Se incluye en el objeto a validar
            etiquetaIds: lead.Etiquetas.map(le => le.etiquetaId),
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt ?? lead.createdAt,
        };

        // Se valida el objeto final contra el schema para asegurar la consistencia
        const validatedData = leadDetalleSchema.parse(leadDataParaValidar);

        return { success: true, data: validatedData };

    } catch (error) {
        if (error instanceof z.ZodError) {
            console.error("Error de validación Zod en obtenerLeadDetallesAction:", error.flatten());
            return { success: false, error: "Los datos del lead en la base de datos no tienen el formato esperado." };
        }
        console.error(`Error en obtenerLeadDetallesAction para leadId ${leadId}:`, error);
        return { success: false, error: 'No se pudieron cargar los detalles del lead.', data: null };
    }
}
