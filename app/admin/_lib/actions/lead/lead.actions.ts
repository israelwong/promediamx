'use server';
import { Prisma } from '@prisma/client';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    obtenerLeadDetallesParamsSchema,
    obtenerEtiquetasAsignadasLeadParamsSchema,
    actualizarEtiquetasLeadParamsSchema,
    listarLeadsParamsSchema,
    ListarLeadsResultData,
    obtenerDatosParaFiltrosLeadParamsSchema,
    DatosParaFiltrosLeadData,
    LeadListaItemData,
    LeadDetalleData,                 // Tipo de salida para detalles
    leadDetalleSchema,               // Schema Zod para validar la salida
    obtenerDatosFormularioLeadParamsSchema,
    DatosFormularioLeadData,
    actualizarLeadParamsSchema,
    eliminarLeadParamsSchema,
    crearLeadParamsSchema,

} from './lead.schemas'; // Asumiendo que los schemas están aquí
import { z } from 'zod';
import { crearInteraccionSistemaAction } from '../conversacion/conversacion.actions'; // Necesitaremos esta acción refactorizada
import { revalidatePath } from 'next/cache';



export async function listarLeadsAction(
    params: z.infer<typeof listarLeadsParamsSchema>
): Promise<ActionResult<ListarLeadsResultData>> {
    const validation = listarLeadsParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Parámetros inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { negocioId, filtros, sort } = validation.data;

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { id: true }
        });

        if (!crm) {
            // Si no hay CRM, no puede haber leads asociados directamente a este negocio vía CRM.
            // Devuelve éxito pero con crmId null y leads vacíos.
            return { success: true, data: { crmId: null, leads: [] } };
        }
        const crmId = crm.id;

        const whereConditions: Prisma.LeadWhereInput[] = [{ crmId: crmId }]; // Condición base: pertenecer al CRM del negocio

        if (filtros.searchTerm && filtros.searchTerm.trim() !== '') {
            const term = filtros.searchTerm.trim();
            whereConditions.push({
                OR: [
                    { nombre: { contains: term, mode: 'insensitive' } },
                    { email: { contains: term, mode: 'insensitive' } },
                    { telefono: { contains: term, mode: 'insensitive' } },
                ],
            });
        }

        if (filtros.pipelineId && filtros.pipelineId !== 'all') {
            whereConditions.push({ pipelineId: filtros.pipelineId });
        }
        if (filtros.canalId && filtros.canalId !== 'all') {
            whereConditions.push({ canalId: filtros.canalId });
        }
        if (filtros.agenteId && filtros.agenteId !== 'all') {
            whereConditions.push({ agenteId: filtros.agenteId });
        }
        if (filtros.etiquetaId && filtros.etiquetaId !== 'all') {
            whereConditions.push({ Etiquetas: { some: { etiquetaId: filtros.etiquetaId } } });
        }

        const orderBy: Prisma.LeadOrderByWithRelationInput = {};
        if (sort.campo) {
            // Mapear campos de UI a campos de Prisma si son diferentes
            // Por ahora asumimos que coinciden o son manejables directamente
            orderBy[sort.campo as keyof Prisma.LeadOrderByWithRelationInput] = sort.direccion;
        } else { // Orden por defecto
            orderBy.updatedAt = 'desc';
        }


        const leadsPrisma = await prisma.lead.findMany({
            where: { AND: whereConditions },
            select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                valorEstimado: true,
                Pipeline: { select: { id: true, nombre: true, /* color si lo tienes */ } }, // Renombrado a Pipeline
                agente: { select: { id: true, nombre: true } },
                Etiquetas: { // Nombre de la relación en el modelo Lead
                    select: { etiqueta: { select: { id: true, nombre: true, color: true } } },
                    take: 3, // Limitar número de etiquetas en la preview
                },
                Conversacion: { // Para obtener la última conversación
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { id: true, updatedAt: true, status: true }
                }
            },
            orderBy: orderBy,
            // Considerar paginación
            take: 50,
        });

        const leadsData: LeadListaItemData[] = leadsPrisma.map(lead => ({
            id: lead.id,
            nombre: lead.nombre,
            email: lead.email,
            telefono: lead.telefono,
            status: lead.status,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
            valorEstimado: lead.valorEstimado,
            pipeline: lead.Pipeline ? { id: lead.Pipeline.id, nombre: lead.Pipeline.nombre } : null,
            agente: lead.agente ? { id: lead.agente.id, nombre: lead.agente.nombre } : null,
            etiquetas: lead.Etiquetas?.map(le => ({ etiqueta: { id: le.etiqueta.id, nombre: le.etiqueta.nombre, color: le.etiqueta.color } })),
            ultimaConversacion: lead.Conversacion[0] ? {
                id: lead.Conversacion[0].id,
                updatedAt: lead.Conversacion[0].updatedAt,
                status: lead.Conversacion[0].status
            } : null,
        }));

        return { success: true, data: { crmId, leads: leadsData } };

    } catch (error) {
        console.error('Error en listarLeadsAction:', error);
        return { success: false, error: 'No se pudieron cargar los leads.' };
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


// export async function obtenerLeadDetallesAction(
//     params: z.infer<typeof obtenerLeadDetallesParamsSchema>
// ): Promise<ActionResult<LeadDetailsForPanelData | null>> {
//     const validation = obtenerLeadDetallesParamsSchema.safeParse(params);
//     if (!validation.success) {
//         return { success: false, error: "ID de Lead inválido.", errorDetails: validation.error.flatten().fieldErrors };
//     }
//     const { leadId } = validation.data;
//     try {
//         const lead = await prisma.lead.findUnique({
//             where: { id: leadId },
//             select: { id: true, nombre: true, email: true, telefono: true },
//         });
//         if (!lead) {
//             return { success: false, error: 'Lead no encontrado.', data: null };
//         }
//         return { success: true, data: lead };
//     } catch (error) {
//         console.error('Error en obtenerLeadDetallesAction:', error);
//         return { success: false, error: 'No se pudieron cargar los detalles del lead.', data: null };
//     }
// }

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








export async function obtenerLeadDetallesAction( // Nombre consistente
    params: z.infer<typeof obtenerLeadDetallesParamsSchema>
): Promise<ActionResult<LeadDetalleData | null>> {
    const validation = obtenerLeadDetallesParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de Lead inválido.", errorDetails: validation.error.flatten().fieldErrors, data: null };
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
                jsonParams: true, // Para campos personalizados
                Etiquetas: { // Obtener las etiquetas asignadas
                    select: {
                        etiquetaId: true,
                    },
                },
                createdAt: true,
                updatedAt: true,
            },
        });

        if (!lead) {
            return { success: false, error: 'Lead no encontrado.', data: null };
        }

        // Mapear a LeadDetalleData
        const leadData: LeadDetalleData = {
            id: lead.id,
            nombre: lead.nombre,
            email: lead.email,
            telefono: lead.telefono,
            status: lead.status,
            pipelineId: lead.pipelineId,
            agenteId: lead.agenteId,
            canalId: lead.canalId,
            valorEstimado: lead.valorEstimado,
            // jsonParams: lead.jsonParams ? JSON.parse(JSON.stringify(lead.jsonParams)) : null, // Asegurar que es un objeto JSON parseable si es necesario
            etiquetaIds: lead.Etiquetas.map(le => le.etiquetaId),
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
        };

        // Validar con Zod antes de devolver es una buena práctica
        const parseResult = leadDetalleSchema.safeParse(leadData);
        if (!parseResult.success) {
            console.error("Error de validación Zod en obtenerLeadDetallesAction:", parseResult.error.flatten());
            // console.log("Datos que fallaron:", leadData);
            return { success: false, error: "Formato de datos del lead inesperado.", data: null };
        }

        return { success: true, data: parseResult.data };

    } catch (error) {
        console.error(`Error en obtenerLeadDetallesAction para leadId ${leadId}:`, error);
        return { success: false, error: 'No se pudieron cargar los detalles del lead.', data: null };
    }
}

// --- REFACTORIZACIÓN DE obtenerDatosParaFormularioLead ---
export async function obtenerDatosParaFormularioLeadAction(
    params: z.infer<typeof obtenerDatosFormularioLeadParamsSchema>
): Promise<ActionResult<DatosFormularioLeadData | null>> {
    const validation = obtenerDatosFormularioLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de negocio inválido.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { negocioId } = validation.data;

    try {
        const crmData = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true, // crmId
                Pipeline: { where: { status: 'activo' }, select: { id: true, nombre: true }, orderBy: { orden: 'asc' } },
                Canal: { where: { status: 'activo' }, select: { id: true, nombre: true }, orderBy: { orden: 'asc' } },
                Etiqueta: { where: { status: 'activo' }, select: { id: true, nombre: true, color: true }, orderBy: { orden: 'asc' } },
                Agente: { where: { status: 'activo' }, select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } },
            }
        });

        if (!crmData) {
            // Es posible que un negocio no tenga un CRM configurado aún.
            // Devolver crmId: null y listas vacías para que el formulario no falle.
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

        const datosFormulario: DatosFormularioLeadData = {
            crmId: crmData.id,
            pipelines: crmData.Pipeline.map(p => ({ id: p.id, nombre: p.nombre })),
            canales: crmData.Canal.map(c => ({ id: c.id, nombre: c.nombre })),
            etiquetas: crmData.Etiqueta.map(e => ({ id: e.id, nombre: e.nombre, color: e.color })),
            agentes: crmData.Agente.map(a => ({ id: a.id, nombre: a.nombre ?? null })),
        };

        // Opcional: Validar con Zod antes de devolver
        // const parseResult = datosFormularioLeadSchema.safeParse(datosFormulario);
        // if (!parseResult.success) { /* ... manejo de error ... */ }
        // return { success: true, data: parseResult.data };

        return { success: true, data: datosFormulario };

    } catch (error) {
        console.error('Error en obtenerDatosParaFormularioLeadAction:', error);
        return { success: false, error: 'No se pudieron cargar los datos para el formulario.', data: null };
    }
}

// --- NUEVA VERSIÓN DE editarLead (ahora actualizarLeadAction) ---
export async function actualizarLeadAction(
    params: z.infer<typeof actualizarLeadParamsSchema>
): Promise<ActionResult<LeadDetalleData | null>> { // Devuelve el lead actualizado
    const validation = actualizarLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos para actualizar el lead.", errorDetails: validation.error.flatten().fieldErrors, data: null };
    }
    const { leadId, datos } = validation.data;
    const { etiquetaIds, ...otrosDatosDelLead } = datos;

    try {
        const leadActualizado = await prisma.$transaction(async (tx) => {
            // 1. Actualizar los campos directos del Lead
            const updatedLead = await tx.lead.update({
                where: { id: leadId },
                data: {
                    ...otrosDatosDelLead,
                    // Asegurarse que los campos opcionales que pueden ser null se manejen bien
                    valorEstimado: otrosDatosDelLead.valorEstimado === undefined ? null : otrosDatosDelLead.valorEstimado,
                    pipelineId: otrosDatosDelLead.pipelineId === undefined ? null : otrosDatosDelLead.pipelineId,
                    canalId: otrosDatosDelLead.canalId === undefined ? null : otrosDatosDelLead.canalId,
                    agenteId: otrosDatosDelLead.agenteId === undefined ? null : otrosDatosDelLead.agenteId,
                    status: otrosDatosDelLead.status == null ? undefined : otrosDatosDelLead.status,
                    telefono: otrosDatosDelLead.telefono === undefined ? null : otrosDatosDelLead.telefono,
                    updatedAt: new Date(), // Actualizar timestamp
                },
                select: { // Seleccionar todos los campos necesarios para LeadDetalleData
                    id: true, nombre: true, email: true, telefono: true, status: true,
                    pipelineId: true, agenteId: true, canalId: true, valorEstimado: true,
                    Etiquetas: { select: { etiquetaId: true } }, // Para reconstruir etiquetaIds
                    createdAt: true, updatedAt: true,
                }
            });

            // 2. Actualizar las etiquetas del Lead
            // Eliminar las etiquetas existentes y crear las nuevas
            await tx.leadEtiqueta.deleteMany({
                where: { leadId: leadId },
            });
            if (etiquetaIds && etiquetaIds.length > 0) {
                await tx.leadEtiqueta.createMany({
                    data: etiquetaIds.map(etiqueta_id => ({ // Asegúrate que el nombre del campo coincida con tu schema
                        leadId: leadId,
                        etiquetaId: etiqueta_id, // Corregido: el nombre del campo en LeadEtiqueta es etiquetaId
                    })),
                });
            }

            // Aquí podrías añadir la lógica para crear una interacción de sistema si es necesario
            // if (params.conversacionId && params.nombreAgenteQueActualiza) {
            //   await crearInteraccionSistemaAction({
            //       conversacionId: params.conversacionId,
            //       mensaje: `Detalles del lead actualizados por ${params.nombreAgenteQueActualiza}.`
            //   }, tx);
            // }

            return updatedLead; // Devolver el lead con sus campos base
        });

        // Re-mapear para incluir etiquetaIds directamente como en LeadDetalleData
        const finalData: LeadDetalleData = {
            ...leadActualizado,
            etiquetaIds: etiquetaIds || [], // Usar las etiquetaIds que se intentaron guardar
            // jsonParams si lo manejas, necesitas seleccionarlo y pasarlo.
        };

        // Revalidar paths para que la UI se actualice (lista de leads, página del lead)
        // Necesitarás clienteId y negocioId para esto, considera pasarlos a la action o derivarlos.
        // Por ahora, revalidación genérica, pero deberías hacerla más específica.
        // revalidatePath(`/admin/crm/leads`); // Ejemplo
        // revalidatePath(`/admin/crm/leads/${leadId}`); // Ejemplo

        const parseResult = leadDetalleSchema.safeParse(finalData);
        if (!parseResult.success) {
            console.error("Error Zod en salida de actualizarLeadAction:", parseResult.error.flatten());
            // console.log("Datos que fallaron validación (actualizarLeadAction):", finalData);
            return { success: false, error: "Formato de datos del lead actualizado inesperado.", data: null };
        }

        return { success: true, data: parseResult.data };

    } catch (error) {
        console.error(`Error al actualizar lead ${leadId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Manejar errores específicos de Prisma si es necesario
            // Ej. error.code === 'P2025' (Registro no encontrado)
        }
        return { success: false, error: 'No se pudo actualizar el lead.', data: null };
    }
}


// --- NUEVA VERSIÓN DE eliminarLead (ahora eliminarLeadAction) ---
export async function eliminarLeadAction(
    params: z.infer<typeof eliminarLeadParamsSchema>
): Promise<ActionResult<{ id: string } | null>> { // Devuelve el ID del lead eliminado
    const validation = eliminarLeadParamsSchema.safeParse(params);
    if (!validation.success) {
        return { success: false, error: "ID de Lead inválido.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { leadId } = validation.data;

    try {
        // Considerar qué pasa con las Conversaciones, Citas (Agenda), Bitacora asociadas.
        // Prisma por defecto podría restringir la eliminación si hay dependencias.
        // Puedes necesitar una transacción para eliminar registros relacionados o desasociarlos.
        // Por ahora, una eliminación simple:
        await prisma.lead.delete({
            where: { id: leadId },
        });

        // Revalidar paths
        // revalidatePath(`/admin/crm/leads`); // Ejemplo
        // if (params.negocioId && params.clienteId) {
        //    revalidatePath(`/admin/clientes/${params.clienteId}/negocios/${params.negocioId}/crm/leads`);
        // }


        return { success: true, data: { id: leadId } };
    } catch (error) {
        console.error(`Error al eliminar lead ${leadId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') { // Error: Record to delete does not exist.
                return { success: false, error: "El lead que intentas eliminar no fue encontrado." };
            }
            if (error.code === 'P2003') { // Foreign key constraint failed
                return { success: false, error: "No se puede eliminar el lead porque tiene registros asociados (ej. conversaciones, citas). Debes eliminarlos o desasociarlos primero." };
            }
        }
        return { success: false, error: 'No se pudo eliminar el lead.' };
    }
}




// --- NUEVA ACCIÓN: crearLeadAction ---
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