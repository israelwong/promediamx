'use server';
import prisma from '../prismaClient';
// import { Prisma, CRM } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import type { EstadisticasCRMResumen, ActionResult } from '../types'; // Ajusta la ruta

type CRMConConteo = {
    id: string;
    negocioId: string;
    status: string;
    _count: {
        Lead: number;
        Agente: number;
    };
};

export async function obtenerCRM(negocioId: string): Promise<CRMConConteo | null> {
    if (!negocioId) {
        console.warn("obtenerCRM llamado sin negocioId");
        return null;
    }
    try {
        const crm = await prisma.cRM.findUnique({
            where: {
                // Usar el índice único negocioId establecido en el schema
                negocioId: negocioId,
            },
            include: {
                // Incluir el conteo de las relaciones deseadas
                _count: {
                    select: {
                        Lead: true,
                        Agente: true,
                        // Puedes añadir Pipeline: true, Etiqueta: true, etc. si los necesitas
                    },
                },
            },
        });
        return crm as CRMConConteo | null; // Castear al tipo con conteo
    } catch (error) {
        console.error(`Error al obtener CRM para el negocio ${negocioId}:`, error);
        throw new Error("Error al obtener la información del CRM.");
    }
}

export async function obtenerEstadisticasResumenCRM(negocioId: string): Promise<EstadisticasCRMResumen | null> {
    if (!negocioId) return null;

    try {
        // 1. Buscar si el CRM existe para este negocio
        const crm = await prisma.cRM.findUnique({
            where: { negocioId: negocioId },
            select: { id: true } // Solo necesitamos saber si existe
        });

        // 2. Si no existe CRM, devolver estado "no configurado"
        if (!crm) {
            return { crmConfigurado: false };
        }

        const crmId = crm.id;

        // 3. Si existe, obtener conteos básicos
        const [totalLeads, totalConversaciones] = await Promise.all([
            prisma.lead.count({
                where: { crmId: crmId }
            }),
            prisma.conversacion.count({
                where: {
                    // Asumiendo que la conversación está ligada al Lead,
                    // y el Lead está ligado al CRM. Ajusta si tu relación es diferente.
                    lead: {
                        crmId: crmId
                    }
                    // O si la conversación se liga directo al asistente y este al negocio:
                    // asistenteVirtual: {
                    //     negocioId: negocioId
                    // }
                }
            })
            // Podrías añadir aquí consultas groupBy para leadsPorPipeline/Etiqueta si las necesitas
        ]);

        // 4. Devolver estadísticas
        return {
            crmConfigurado: true,
            totalLeads: totalLeads ?? 0,
            totalConversaciones: totalConversaciones ?? 0,
        };

    } catch (error) {
        console.error(`Error obteniendo estadísticas CRM para negocio ${negocioId}:`, error);
        return null; // Indicar error
    }
}


// --- Acción para Crear CRM y Poblar Datos Iniciales ---

/**
 * @description Crea un registro CRM para un negocio si no existe, y lo puebla
 * con datos iniciales (canales, pipeline, etiquetas).
 * @param {string} negocioId - El ID del negocio para el cual crear el CRM.
 * @returns {Promise<ActionResult<{ crmId: string }>>} - Resultado con el ID del CRM creado/existente o un error.
 */
export async function crearCRMyPoblarDatos(negocioId: string): Promise<ActionResult<{ crmId: string }>> {
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };

    try {
        // Usar transacción para asegurar atomicidad
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Verificar si ya existe un CRM para este negocio
            const crmExistente = await tx.cRM.findUnique({
                where: { negocioId: negocioId },
                select: { id: true }
            });

            // Si ya existe, simplemente devolver su ID
            if (crmExistente) {
                console.log(`CRM ya existe para negocio ${negocioId} (ID: ${crmExistente.id}). Saltando creación.`);
                return { id: crmExistente.id, creadoAhora: false };
            }

            // 2. Si no existe, Crear el CRM
            console.log(`Creando CRM para negocio ${negocioId}...`);
            const nuevoCRM = await tx.cRM.create({
                data: {
                    negocioId: negocioId,
                    status: 'activo',
                },
                select: { id: true } // Obtener el ID del CRM recién creado
            });
            const nuevoCrmId = nuevoCRM.id;
            console.log(`CRM creado con ID: ${nuevoCrmId}`);

            // 3. Poblar Canales por defecto
            const canalesDefault = [
                { nombre: 'WhatsApp', orden: 1 },
                { nombre: 'Formulario Web', orden: 2 }, // Renombrado/Ajustado
                { nombre: 'Facebook', orden: 3 },      // Simplificado
                { nombre: 'Instagram', orden: 4 },
                { nombre: 'Llamada Directa', orden: 5 },// Renombrado/Ajustado
                // { nombre: 'Referido', orden: 6 }, // Opcional
            ];
            await tx.canalCRM.createMany({
                data: canalesDefault.map(c => ({ ...c, crmId: nuevoCrmId })),
            });
            console.log(`Canales default creados para CRM ${nuevoCrmId}`);

            // 4. Poblar Pipeline por defecto
            const pipelineDefault = [
                { nombre: 'Nuevo Lead', orden: 1 }, // Más descriptivo
                { nombre: 'Contactado', orden: 2 },
                { nombre: 'Calificado', orden: 3 }, // Etapa intermedia
                { nombre: 'Propuesta Enviada', orden: 4 },
                { nombre: 'Negociación', orden: 5 },
                { nombre: 'Ganado', orden: 6 },
                { nombre: 'Perdido', orden: 7 },
                // { nombre: 'Descartado', orden: 8 }, // Opcional
            ];
            await tx.pipelineCRM.createMany({
                data: pipelineDefault.map(p => ({ ...p, crmId: nuevoCrmId })),
            });
            console.log(`Pipeline default creado para CRM ${nuevoCrmId}`);

            // 5. Poblar Etiquetas por defecto
            const etiquetasDefault = [
                { nombre: 'Prioridad Alta', color: '#ef4444', orden: 1 }, // red-500
                { nombre: 'Prioridad Media', color: '#f97316', orden: 2 }, // orange-500
                { nombre: 'Prioridad Baja', color: '#3b82f6', orden: 3 }, // blue-500
                { nombre: 'Seguimiento Futuro', color: '#a855f7', orden: 4 }, // purple-500
                { nombre: 'No Contactar', color: '#64748b', orden: 5 }, // slate-500
            ];
            await tx.etiquetaCRM.createMany({
                data: etiquetasDefault.map(e => ({ ...e, crmId: nuevoCrmId })),
            });
            console.log(`Etiquetas default creadas para CRM ${nuevoCrmId}`);

            return { id: nuevoCrmId, creadoAhora: true };
        }); // Fin de la transacción

        // Revalidar la página de edición del negocio después de crear/verificar el CRM
        const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { clienteId: true } });
        const basePath = negocio?.clienteId ? `/admin/clientes/${negocio.clienteId}/negocios/${negocioId}` : `/admin/negocios/${negocioId}`;
        revalidatePath(`${basePath}/editar`); // Revalida donde está el widget
        // También podría ser útil revalidar la página del CRM si se redirige allí
        revalidatePath(`${basePath}/crm`);

        return { success: true, data: { crmId: resultado.id } };

    } catch (error) {
        console.error(`Error creando/poblando CRM para negocio ${negocioId}:`, error);
        return { success: false, error: "No se pudo configurar el CRM." };
    }
}