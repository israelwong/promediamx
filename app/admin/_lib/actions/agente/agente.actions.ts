// app/admin/_lib/actions/agentes/agentes.actions.ts
'use server';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from "next/cache";
import { CrearAgenteSchema, type CrearAgenteData } from "./agente.schemas"; // <-- Nueva importación
import bcrypt from 'bcrypt';
import { EditarAgenteSchema, type EditarAgenteData } from "./agente.schemas"; // <-- Nueva importación


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






export async function obtenerDatosPipelineAgente(agenteId: string) {
    try {
        const agente = await prisma.agente.findUnique({
            where: { id: agenteId },
            select: { crmId: true }
        });

        if (!agente || !agente.crmId) {
            throw new Error("Agente o CRM no encontrado.");
        }

        const ofertasAsignadas = await prisma.oferta.findMany({
            where: { agentesAsignados: { some: { agenteId: agenteId } } },
            select: { nombre: true }
        });
        const nombresDeOfertas = ofertasAsignadas.map(o => o.nombre);

        const etapasPipeline = await prisma.pipelineCRM.findMany({
            where: { crmId: agente.crmId },
            orderBy: { orden: 'asc' }
        });

        if (nombresDeOfertas.length === 0) {
            return { success: true, data: { leads: [], etapasPipeline } };
        }

        // --- INICIO DE LA CORRECCIÓN ---

        const leadsDesdeDB = await prisma.lead.findMany({
            where: {
                crmId: agente.crmId,
                // Se reemplaza el filtro 'in' por una estructura 'OR' que Prisma sí soporta para JSON.
                OR: nombresDeOfertas.map(nombreOferta => ({
                    jsonParams: {
                        path: ['colegio'],
                        equals: nombreOferta,
                    }
                }))
            },
            include: {
                Etiquetas: { include: { etiqueta: true } },
                // --- INICIO DE LA CORRECCIÓN ---
                Agenda: {
                    // Se busca la próxima cita con estado 'PENDIENTE'
                    where: { status: 'PENDIENTE' },
                    // Se ordena por fecha para obtener la más próxima primero
                    orderBy: { fecha: 'asc' },
                    // Solo necesitamos la primera que encuentre
                    take: 1,
                },
                agente: {
                    select: {
                        id: true,
                        nombre: true,
                    }
                }
            },
            orderBy: { updatedAt: 'desc' }
        });

        const leadsParaKanban = leadsDesdeDB.map(lead => {
            return {
                id: lead.id,
                nombre: lead.nombre,
                createdAt: lead.createdAt,
                updatedAt: lead.updatedAt,
                valorEstimado: lead.valorEstimado,
                pipelineId: lead.pipelineId,
                Etiquetas: lead.Etiquetas.map(e => e.etiqueta),
                agente: lead.agente,
                jsonParams: lead.jsonParams,
                fechaProximaCita: lead.Agenda.length > 0 ? lead.Agenda[0].fecha : null
            };
        });

        // --- FIN DE LA CORRECCIÓN ---

        return { success: true, data: { leads: leadsParaKanban, etapasPipeline } };

    } catch (error) {
        return { success: false, error: error instanceof Error ? error.message : "Error al obtener datos del pipeline." };
    }
}