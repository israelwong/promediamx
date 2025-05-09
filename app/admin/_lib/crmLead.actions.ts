// app/admin/_lib/crmLead.actions.ts (o donde coloques tus acciones de Lead)
'use server';

import prisma from './prismaClient'; // Ajusta ruta
import {
    LeadListaItem, FiltrosLeads, OpcionesSortLeads, ObtenerLeadsResult,
    DatosFiltros, ObtenerDatosFiltrosResult, EditarLeadFormData, ObtenerDetallesLeadResult,
    LeadDetallesEditar, EditarLeadResult,
} from './types'; // Ajusta ruta

import { Prisma } from '@prisma/client';
import {
    NuevoLeadFormData,
    CrearLeadResult,
    ObtenerDatosFormularioLeadResult,
    DatosFormularioLead,
    ActionResult
} from './types'; // Ajusta ruta


/**
 * Obtiene una lista filtrada y ordenada de Leads para un negocio específico.
 * @param negocioId - El ID del negocio.
 * @param filtros - Objeto con los filtros a aplicar.
 * @param sort - Objeto con las opciones de ordenamiento.
 * @returns Objeto con la lista de leads y el crmId.
 */
export async function obtenerLeadsCRM(
    negocioId: string,
    filtros: FiltrosLeads,
    sort: OpcionesSortLeads,
    // skip: number = 0, // Paginación opcional
    // take: number = 25
): Promise<ObtenerLeadsResult> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }

    console.log('Filtros recibidos:', filtros);
    console.log('Opciones de ordenamiento recibidas:', sort);

    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId },
            select: { id: true },
        });

        if (!crm?.id) {
            return { success: true, data: { crmId: null, leads: [] } };
        }
        const crmId = crm.id;

        const where: Prisma.LeadWhereInput = { crmId };
        if (filtros.searchTerm) {
            const term = filtros.searchTerm.trim();
            where.OR = [
                { nombre: { contains: term, mode: 'insensitive' } },
                { email: { contains: term, mode: 'insensitive' } },
                { telefono: { contains: term, mode: 'insensitive' } },
            ];
        }
        if (filtros.pipelineId && filtros.pipelineId !== 'all') {
            where.pipelineId = filtros.pipelineId;
        }
        if (filtros.canalId && filtros.canalId !== 'all') {
            where.canalId = filtros.canalId;
        }
        if (filtros.agenteId && filtros.agenteId !== 'all') {
            where.agenteId = filtros.agenteId;
        }
        if (filtros.etiquetaId && filtros.etiquetaId !== 'all') {
            // Asegúrate que la relación se llame 'Etiquetas' en tu schema Lead
            where.Etiquetas = {
                some: { etiquetaId: filtros.etiquetaId }
            };
        }

        const orderBy: Prisma.LeadOrderByWithRelationInput = {};
        orderBy[sort.campo] = sort.direccion;

        const leads = await prisma.lead.findMany({
            where,
            orderBy,
            // skip,
            // take,
            select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true,
                createdAt: true,
                updatedAt: true,
                status: true,
                valorEstimado: true,
                // Seleccionar relación Pipeline (con P mayúscula como en el schema)
                Pipeline: { select: { id: true, nombre: true } },
                Canal: { select: { id: true, nombre: true } },
                agente: { select: { id: true, nombre: true } },
                // Asegúrate que la relación se llame 'Etiquetas' en tu schema Lead
                Etiquetas: {
                    select: { etiqueta: { select: { id: true, nombre: true, color: true } } }
                },
                Conversacion: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { id: true, updatedAt: true, status: true }
                }
            }
        });

        // --- CORRECCIÓN EN EL MAPEO ---
        const leadsFormateados: LeadListaItem[] = leads.map(lead => ({
            // Copiar propiedades base
            id: lead.id,
            nombre: lead.nombre,
            email: lead.email,
            telefono: lead.telefono,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
            status: lead.status,
            valorEstimado: lead.valorEstimado,
            // Mapear explícitamente Pipeline (P mayúscula) a pipeline (p minúscula)
            pipeline: lead.Pipeline, // <-- AQUÍ LA CORRECCIÓN
            canal: lead.Canal,
            agente: lead.agente,
            etiquetas: lead.Etiquetas, // Asumiendo que 'Etiquetas' es correcto
            ultimaConversacion: lead.Conversacion[0] || null,
        }));
        // --- FIN CORRECCIÓN ---

        return {
            success: true,
            data: {
                crmId: crmId,
                leads: leadsFormateados,
            }
        };

    } catch (error) {
        console.error(`Error fetching leads for negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener los leads.' };
    }
}

/**
 * Obtiene los datos necesarios para poblar los filtros de la lista de leads.
 * @param negocioId - El ID del negocio.
 * @returns Objeto con listas de pipelines, canales, etiquetas y agentes.
 */
export async function obtenerDatosParaFiltrosLead(negocioId: string): Promise<ObtenerDatosFiltrosResult> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const crmData = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true,
                Pipeline: { select: { id: true, nombre: true }, orderBy: { orden: 'asc' } },
                Canal: { select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } },
                Etiqueta: { select: { id: true, nombre: true, color: true }, orderBy: { nombre: 'asc' } },
                Agente: { select: { id: true, nombre: true, email: true }, orderBy: { nombre: 'asc' } } // Incluir email para diferenciar
            }
        });

        if (!crmData) {
            // Si no hay CRM, devolver listas vacías
            return { success: true, data: { pipelines: [], canales: [], etiquetas: [], agentes: [] } };
        }

        // Formatear agentes para mostrar nombre o email si no hay nombre
        const agentesFormateados = crmData.Agente.map(a => ({
            id: a.id,
            nombre: a.nombre || a.email // Usar email como fallback
        }));

        const datosFiltros: DatosFiltros = {
            pipelines: crmData.Pipeline,
            canales: crmData.Canal,
            etiquetas: crmData.Etiqueta,
            agentes: agentesFormateados
        };

        return { success: true, data: datosFiltros };

    } catch (error) {
        console.error(`Error fetching filter data for negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener los datos para los filtros.' };
    }
}



/**
 * Obtiene el ID del CRM y los datos necesarios para poblar los selects en el formulario de nuevo lead.
 * @param negocioId - El ID del negocio.
 * @returns Objeto con crmId y listas de pipelines, canales, etiquetas y agentes.
 */
export async function obtenerDatosParaFormularioLead(negocioId: string): Promise<ObtenerDatosFormularioLeadResult> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const crmData = await prisma.cRM.findUnique({
            where: { negocioId },
            select: {
                id: true, // <-- Asegurarse de seleccionar el ID del CRM
                Pipeline: { select: { id: true, nombre: true }, orderBy: { orden: 'asc' } },
                Canal: { select: { id: true, nombre: true }, orderBy: { nombre: 'asc' } },
                Etiqueta: { select: { id: true, nombre: true, color: true }, orderBy: { nombre: 'asc' } },
                Agente: { select: { id: true, nombre: true, email: true }, orderBy: { nombre: 'asc' } }
                // Añadir selección de CamposPersonalizados si se usan en el form
            }
        });

        if (!crmData) {
            // Si no hay CRM, devolver éxito pero con crmId null y datos vacíos
            return { success: true, data: { crmId: null, pipelines: [], canales: [], etiquetas: [], agentes: [] } };
        }

        const agentesFormateados = crmData.Agente.map(a => ({
            id: a.id,
            nombre: a.nombre || a.email
        }));

        const datosFormulario: DatosFormularioLead & { crmId: string | null } = { // <-- Añadir crmId al tipo
            crmId: crmData.id, // <-- Incluir crmId en la respuesta
            pipelines: crmData.Pipeline,
            canales: crmData.Canal,
            etiquetas: crmData.Etiqueta,
            agentes: agentesFormateados
        };

        // Ajustar el tipo de retorno para que coincida
        return { success: true, data: datosFormulario as ObtenerDatosFormularioLeadResult['data'] };

    } catch (error) {
        console.error(`Error fetching form data for negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener los datos para el formulario.' };
    }
}


/**
 * Crea un nuevo Lead manualmente en el CRM.
 * @param crmId - El ID del CRM al que pertenece el Lead.
 * @param data - Datos del lead a crear desde el formulario.
 * @returns Objeto con el resultado de la operación y el ID/nombre del lead creado.
 */
export async function crearLeadManual(
    crmId: string,
    data: NuevoLeadFormData
): Promise<CrearLeadResult> {

    // console.log('Datos recibidos para crear lead:', data); // Para depuración
    // return { success: false, error: "Función no implementada." }; // Descomentar cuando se implemente

    if (!crmId) {
        return { success: false, error: "ID de CRM no proporcionado." };
    }
    if (!data.nombre?.trim()) {
        return { success: false, error: "El nombre del lead es obligatorio." };
    }
    if (data.email && !/\S+@\S+\.\S+/.test(data.email.trim())) {
        return { success: false, error: "Formato de email inválido." };
    }

    try {
        // --- CORRECCIONES/VERIFICACIONES ---
        const leadData: Prisma.LeadCreateInput = {
            crm: { connect: { id: crmId } }, // Conectar al CRM existente
            nombre: data.nombre.trim(),
            email: data.email?.trim() || null,
            telefono: data.telefono?.trim() || null,
            valorEstimado: data.valorEstimado ?? null, // Usar ?? para manejar 0 correctamente
            status: 'nuevo', // Status inicial
        };
        // --- FIN CORRECCIONES ---

        // Verificar si ya existe un lead con el mismo correo o teléfono en el CRM
        if (data.email || data.telefono) {
            const existingLead = await prisma.lead.findFirst({
                where: {
                    crmId,
                    OR: [
                        { email: data.email?.trim() || undefined },
                        { telefono: data.telefono?.trim() || undefined },
                    ],
                },
                select: { id: true, nombre: true },
            });

            if (existingLead) {
                return {
                    success: false,
                    error: `Ya existe un lead con el mismo correo o teléfono: ${existingLead.nombre}.`,
                };
            }
        }

        const newLead = await prisma.lead.create({
            data: leadData, // Usar el objeto construido
            select: {
                id: true,
                nombre: true,
            }
        });

        return { success: true, data: newLead };

    } catch (error) {
        console.error('Error creating manual lead:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const conflictingField = error.meta?.target;
            return { success: false, error: `El valor proporcionado para '${conflictingField}' ya existe.` };
        }
        // Error más específico si falla la conexión de una relación (ej. ID de etiqueta inválido)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `Error al crear el lead: No se encontró un registro relacionado (posiblemente una etiqueta, pipeline, canal o agente inválido).` };
        }
        return { success: false, error: 'No se pudo crear el lead.' };
    }
}

/**
 * Obtiene los detalles completos de un Lead específico por su ID.
 * @param leadId - El ID del Lead a obtener.
 * @returns Objeto con los detalles del lead o un error.
 */
export async function obtenerDetallesLead(leadId: string): Promise<ObtenerDetallesLeadResult> {
    if (!leadId) {
        return { success: false, error: "ID de Lead no proporcionado." };
    }

    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            select: {
                // Seleccionar campos para LeadDetallesEditar
                id: true,
                nombre: true,
                email: true,
                telefono: true,
                valorEstimado: true,
                status: true,
                pipelineId: true,
                canalId: true,
                agenteId: true,
                createdAt: true,
                updatedAt: true,
                // Incluir relaciones necesarias
                Pipeline: { select: { id: true, nombre: true } },
                Canal: { select: { id: true, nombre: true } },
                agente: { select: { id: true, nombre: true } },
                Etiquetas: { // Asegúrate que se llame 'Etiquetas' en tu schema
                    select: { etiqueta: { select: { id: true, nombre: true, color: true } } }
                },
                // Incluir jsonParams si manejas campos personalizados
                // jsonParams: true,
            }
        });

        if (!lead) {
            return { success: false, error: "Lead no encontrado." };
        }

        // Mapear resultado al tipo esperado
        const leadDetalles: LeadDetallesEditar = {
            ...lead,
            pipeline: lead.Pipeline,
            canal: lead.Canal,
            etiquetas: lead.Etiquetas,
        };

        return { success: true, data: leadDetalles };

    } catch (error) {
        console.error(`Error fetching lead details for id ${leadId}:`, error);
        return { success: false, error: 'No se pudieron obtener los detalles del lead.' };
    }
}


/**
 * Actualiza un Lead existente.
 * @param leadId - El ID del Lead a actualizar.
 * @param data - Datos del lead a modificar.
 * @returns Objeto con el resultado de la operación y el ID/nombre actualizado.
 */
export async function editarLead(
    leadId: string,
    data: EditarLeadFormData
): Promise<EditarLeadResult> {
    if (!leadId) {
        return { success: false, error: "ID de Lead no proporcionado." };
    }
    // Validaciones básicas
    if (!data.nombre?.trim()) {
        return { success: false, error: "El nombre del lead es obligatorio." };
    }
    // No validamos email aquí porque asumimos que no se edita

    try {
        // Construir objeto de datos para actualizar
        const dataToUpdate: Prisma.LeadUpdateInput = {
            nombre: data.nombre.trim(),
            telefono: data.telefono?.trim() || null,
            valorEstimado: data.valorEstimado ?? null, // Manejar 0
            status: data.status, // Asumir que status siempre viene
            // Conectar/desconectar relaciones opcionales
            Pipeline: data.pipelineId ? { connect: { id: data.pipelineId } } : { disconnect: true },
            Canal: data.canalId ? { connect: { id: data.canalId } } : { disconnect: true }, // Asegúrate que se llame 'Canal'
            agente: data.agenteId ? { connect: { id: data.agenteId } } : { disconnect: true },
            // Manejo de etiquetas: borrar existentes y crear las nuevas
            Etiquetas: { // <-- VERIFICA este nombre en tu schema Lead
                // Borrar todas las asociaciones existentes para este lead
                deleteMany: {},
                // Crear las nuevas asociaciones
                ...(data.etiquetaIds && data.etiquetaIds.length > 0 && {
                    create: data.etiquetaIds.map(etiquetaId => ({
                        // Asegúrate que el campo en LeadEtiqueta se llame 'etiqueta'
                        etiqueta: { connect: { id: etiquetaId } }
                    }))
                })
            },
            // Lógica para actualizar campos personalizados (jsonParams) si aplica
            // jsonParams: data.camposPersonalizados || undefined,
            updatedAt: new Date() // Forzar actualización de timestamp
        };

        // Ejecutar actualización
        const updatedLead = await prisma.lead.update({
            where: { id: leadId },
            data: dataToUpdate,
            select: { // Devolver solo ID y nombre
                id: true,
                nombre: true,
            }
        });

        return { success: true, data: updatedLead };

    } catch (error) {
        console.error(`Error updating lead ${leadId}:`, error);
        // Manejar errores específicos de Prisma
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const conflictingField = error.meta?.target;
            return { success: false, error: `El valor proporcionado para '${conflictingField}' ya existe.` };
        }
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            // Puede ocurrir si un ID relacionado (pipeline, canal, agente, etiqueta) no existe
            return { success: false, error: `Error al actualizar: No se encontró un registro relacionado.` };
        }
        return { success: false, error: 'No se pudo actualizar el lead.' };
    }
}

/**
 * Elimina un Lead existente por su ID.
 * @param leadId - El ID del Lead a eliminar.
 * @returns Objeto con el resultado de la operación.
 */
export async function eliminarLead(leadId: string): Promise<{ success: boolean; error?: string }> {
    if (!leadId) {
        return { success: false, error: "ID de Lead no proporcionado." };
    }

    try {
        await prisma.lead.delete({
            where: { id: leadId },
        });

        return { success: true };
    } catch (error) {
        console.error(`Error deleting lead ${leadId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "El Lead no existe o ya fue eliminado." };
        }
        return { success: false, error: "No se pudo eliminar el Lead." };
    }
}

export async function obtenerCrmIdPorNegocioAction(
    negocioId: string
): Promise<ActionResult<string | null>> {
    if (!negocioId) {
        return { success: false, error: "Se requiere ID de negocio." };
    }
    try {
        const crm = await prisma.cRM.findUnique({
            where: { negocioId: negocioId },
            select: { id: true }
        });
        return { success: true, data: crm?.id ?? null };
    } catch (error) {
        console.error(`Error obteniendo crmId para negocio ${negocioId}:`, error);
        return { success: false, error: "Error al buscar CRM." };
    }
}

export async function obtenerLeadListaItemAction(
    leadId: string
): Promise<ActionResult<LeadListaItem | null>> {
    if (!leadId) {
        return { success: false, error: "Se requiere ID de Lead." };
    }
    console.log(`[CRM Lead Actions] Obteniendo LeadListaItem para ID: ${leadId}`);
    try {
        const lead = await prisma.lead.findUnique({
            where: { id: leadId },
            // Incluir exactamente las mismas relaciones y campos que obtenerLeadsCRM
            select: {
                id: true,
                nombre: true,
                email: true,
                telefono: true,
                createdAt: true,
                updatedAt: true,
                status: true,
                valorEstimado: true,
                Pipeline: { select: { id: true, nombre: true } },
                Canal: { select: { id: true, nombre: true } },
                agente: { select: { id: true, nombre: true } },
                Etiquetas: {
                    select: { etiqueta: { select: { id: true, nombre: true, color: true } } }
                },
                Conversacion: {
                    orderBy: { updatedAt: 'desc' },
                    take: 1,
                    select: { id: true, updatedAt: true, status: true }
                }
            }
        });

        if (!lead) {
            console.warn(`[CRM Lead Actions] No se encontró Lead con ID: ${leadId}`);
            return { success: true, data: null }; // No es un error, simplemente no existe
        }

        // Mapear al formato LeadListaItem (igual que en obtenerLeadsCRM)
        const leadFormateado: LeadListaItem = {
            id: lead.id,
            nombre: lead.nombre,
            email: lead.email,
            telefono: lead.telefono,
            createdAt: lead.createdAt,
            updatedAt: lead.updatedAt,
            status: lead.status,
            valorEstimado: lead.valorEstimado,
            pipeline: lead.Pipeline,
            canal: lead.Canal,
            agente: lead.agente,
            etiquetas: lead.Etiquetas,
            ultimaConversacion: lead.Conversacion[0] || null,
        };

        return { success: true, data: leadFormateado };

    } catch (error) {
        console.error(`Error obteniendo LeadListaItem para ${leadId}:`, error);
        return { success: false, error: 'No se pudo obtener el detalle del lead.' };
    }
}
