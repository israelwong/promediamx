// app/admin/_lib/actions/agentes/agentes.actions.ts
'use server';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from "next/cache";
import { CrearAgenteSchema, type CrearAgenteData } from "./agente.schemas"; // <-- Nueva importación
import bcrypt from 'bcrypt';
import { EditarAgenteSchema, type EditarAgenteData } from "./agente.schemas"; // <-- Nueva importación
import { type KanbanData, type LeadInKanbanCard, type PipelineKanban } from './agente.schemas';


// --- NUEVA FUNCIÓN PARA OBTENER LA LISTA DE AGENTES ---
export async function obtenerTodosLosAgentes({ negocioId }: { negocioId: string }) {
    if (!negocioId) {
        return { success: false, error: "El ID del negocio es requerido." };
    }

    try {
        const agentes = await prisma.agente.findMany({
            where: {
                crm: {
                    negocioId: negocioId,
                }
            },
            orderBy: { nombre: 'asc' },
            // --- CAMBIO CLAVE: Usamos 'include' para traer las ofertas relacionadas ---
            include: {
                ofertasAsignadas: {
                    // Incluimos la relación con la oferta para poder obtener su nombre
                    include: {
                        oferta: {
                            select: {
                                nombre: true
                            }
                        }
                    }
                }
            }
        });
        return { success: true, data: agentes };
    } catch {
        return { success: false, error: "No se pudieron obtener los agentes." };
    }
}
// --- NUEVA ACCIÓN PARA CREAR AGENTES ---
export async function crearAgenteAction(data: CrearAgenteData): Promise<ActionResult<void>> {
    try {
        const validation = CrearAgenteSchema.safeParse(data);
        if (!validation.success) {
            return { success: false, error: "Datos inválidos." };
        }

        const { email, password, ...restOfData } = validation.data;

        // Verificar si el email ya existe
        const agenteExistente = await prisma.agente.findUnique({ where: { email } });
        if (agenteExistente) {
            return { success: false, error: "Ya existe un agente con este correo electrónico." };
        }

        // Hashear la contraseña (¡MUY IMPORTANTE!)
        const hashedPassword = await bcrypt.hash(password, 10);

        await prisma.agente.create({
            data: {
                ...restOfData,
                email,
                password: hashedPassword,
            }
        });

        // Revalidar la página de la lista de agentes para que se muestre el nuevo
        revalidatePath('/admin/agentes'); // Ajusta esta ruta si es necesario

        return { success: true };

    } catch {
        return { success: false, error: "No se pudo crear el agente." };
    }
}

/**
 * Obtiene los datos de un agente, la lista de todas las ofertas,
 * y las ofertas que ese agente ya tiene asignadas.
 */
export async function obtenerAgenteConOfertas(agenteId: string) {
    try {
        const [agente, todasLasOfertas, asignacionesActuales] = await Promise.all([
            prisma.agente.findUnique({ where: { id: agenteId } }),
            prisma.oferta.findMany({ select: { id: true, nombre: true } }),
            prisma.agenteOferta.findMany({
                where: { agenteId: agenteId },
                select: { ofertaId: true },
            }),
        ]);

        if (!agente) throw new Error("Agente no encontrado");

        const ofertasAsignadasIds = new Set(asignacionesActuales.map(a => a.ofertaId));

        return {
            success: true,
            data: {
                agente,
                todasLasOfertas,
                ofertasAsignadasIds,
            }
        };
    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Error desconocido." };
    }
}

/**
 * Sincroniza las ofertas asignadas a un agente.
 * Borra las que ya no están y crea las nuevas.
 */
export async function actualizarOfertasDeAgente(params: { agenteId: string, nuevasOfertasIds: string[] }): Promise<ActionResult<void>> {
    const { agenteId, nuevasOfertasIds } = params;

    try {
        const asignacionesActuales = await prisma.agenteOferta.findMany({
            where: { agenteId: agenteId },
            select: { ofertaId: true },
        });
        const ofertasActualesIds = new Set(asignacionesActuales.map(a => a.ofertaId));

        const ofertasParaCrear = nuevasOfertasIds
            .filter(id => !ofertasActualesIds.has(id))
            .map(ofertaId => ({ agenteId, ofertaId }));

        const ofertasParaBorrar = Array.from(ofertasActualesIds)
            .filter(id => !nuevasOfertasIds.includes(id));

        await prisma.$transaction([
            prisma.agenteOferta.deleteMany({
                where: {
                    agenteId: agenteId,
                    ofertaId: { in: ofertasParaBorrar },
                },
            }),
            prisma.agenteOferta.createMany({
                data: ofertasParaCrear,
            }),
        ]);

        revalidatePath(`/admin/agentes/${agenteId}`);
        return { success: true };

    } catch {
        return { success: false, error: "No se pudieron actualizar las ofertas." };
    }
}


export async function editarAgenteAction(data: EditarAgenteData): Promise<ActionResult<void>> {
    try {
        const validation = EditarAgenteSchema.safeParse(data);
        if (!validation.success) {
            return { success: false, error: "Datos inválidos." };
        }

        const { id, password, ...restOfData } = validation.data;

        // Verificar que el nuevo email no esté en uso por OTRO agente
        const agenteExistente = await prisma.agente.findFirst({
            where: {
                email: restOfData.email,
                id: { not: id } // Excluir al agente actual de la búsqueda
            }
        });
        if (agenteExistente) {
            return { success: false, error: "Ese correo electrónico ya está en uso por otro agente." };
        }

        const dataToUpdate: Partial<EditarAgenteData> = { ...restOfData };

        // Solo hashear y actualizar la contraseña si se proporcionó una nueva
        if (password) {
            dataToUpdate.password = await bcrypt.hash(password, 10);
        }

        await prisma.agente.update({
            where: { id: id },
            data: dataToUpdate,
        });

        revalidatePath(`/admin/agentes`);
        revalidatePath(`/admin/agentes/${id}`);

        return { success: true };

    } catch {
        return { success: false, error: "No se pudo actualizar el agente." };
    }
}






export async function obtenerDatosPipelineAgente(agenteId: string): Promise<ActionResult<KanbanData>> {
    if (!agenteId) {
        return { success: false, error: "El ID del agente es requerido." };
    }

    try {
        const agente = await prisma.agente.findUnique({
            where: { id: agenteId },
            include: {
                ofertasAsignadas: {
                    select: {
                        oferta: { select: { nombre: true } }
                    }
                }
            }
        });

        if (!agente) return { success: false, error: "Agente no encontrado" };

        const crmId = agente.crmId;
        const nombresOfertas = agente.ofertasAsignadas.map(oa => oa.oferta.nombre);

        if (nombresOfertas.length === 0) {
            const etapasPipelineVacias = await prisma.pipelineCRM.findMany({ where: { crmId }, orderBy: { orden: 'asc' } });
            return {
                success: true,
                data: {
                    leads: [],
                    etapasPipeline: etapasPipelineVacias.map(e => ({ ...e, orden: e.orden ?? 0 })),
                }
            };
        }

        // --- FIX #1: Se corrige el filtro JSON. Usamos un 'OR' en lugar de 'in'. ---
        const leads = await prisma.lead.findMany({
            where: {
                crmId: crmId,
                OR: nombresOfertas.map(nombreOferta => ({
                    jsonParams: {
                        path: ['colegio'],
                        equals: nombreOferta,
                    }
                }))
            },
            select: {
                id: true,
                nombre: true,
                createdAt: true,
                updatedAt: true,
                valorEstimado: true,
                jsonParams: true,
                pipelineId: true,
                agente: { select: { id: true, nombre: true } },
                Etiquetas: { select: { etiqueta: { select: { id: true, nombre: true, color: true } } } },
                Agenda: { where: { status: 'PENDIENTE' }, orderBy: { fecha: 'asc' }, take: 1, select: { fecha: true } }
            }
        });

        const etapasPipeline = await prisma.pipelineCRM.findMany({
            where: { crmId: crmId },
            orderBy: { orden: 'asc' }
        });

        // --- FIX #2: Se hace la transformación de datos de forma explícita para evitar errores de tipo. ---
        const leadsFormateados: LeadInKanbanCard[] = leads.map(lead => {
            return {
                id: lead.id,
                nombre: lead.nombre,
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
                valorEstimado: lead.valorEstimado,
                jsonParams: lead.jsonParams,
                pipelineId: lead.pipelineId,
                agente: lead.agente,
                // Aplanamos la estructura de etiquetas para que sea más fácil de consumir
                Etiquetas: lead.Etiquetas.map(etiquetaLead => etiquetaLead.etiqueta),
                // Extraemos la fecha de la próxima cita o la dejamos como null
                fechaProximaCita: lead.Agenda.length > 0 ? lead.Agenda[0].fecha : null,
            };
        });

        const etapasFormateadas: PipelineKanban[] = etapasPipeline.map(etapa => ({
            ...etapa,
            orden: etapa.orden ?? 0,
        }));

        return {
            success: true,
            data: {
                leads: leadsFormateados,
                etapasPipeline: etapasFormateadas,
            }
        };

    } catch (error) {
        console.error("Error en obtenerDatosPipelineAgente:", error);
        return { success: false, error: "No se pudieron obtener los datos del pipeline." };
    }
}