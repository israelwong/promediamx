// app/admin/_lib/crmAgente.actions.ts
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt'; // Importar bcrypt
import { Agente, ActionResult } from './types'; // Ajusta ruta
import { AgenteBasico } from './agente.types'; // Ajusta ruta


// Asumiendo que ObtenerAgentesResult está definido en alguna parte, por ejemplo:
interface ObtenerAgentesResultData {
    crmId: string | null;
    agentes: Agente[]; // Usar tu tipo Agente
}
// Removed unused and redundant interface ObtenerAgentesResult

/**
 * Obtiene el ID del CRM asociado a un negocio y todos sus agentes.
 * @param negocioId - El ID del negocio.
 * @returns Objeto con crmId y la lista de agentes (sin password).
 */

export async function obtenerAgentesCRM(negocioId: string): Promise<ActionResult<ObtenerAgentesResultData>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const negocioConCRM = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                CRM: {
                    select: {
                        id: true,
                        Agente: {
                            orderBy: { nombre: 'asc' },
                            select: { // Seleccionar campos necesarios para construir tu tipo Agente
                                id: true,
                                crmId: true,
                                userId: true,
                                nombre: true,
                                email: true,
                                telefono: true,
                                rol: true,
                                status: true,
                                createdAt: true,
                                updatedAt: true,
                                // NO seleccionar password
                            }
                        }
                    }
                }
            },
        });

        const crmId = negocioConCRM?.CRM?.id ?? null;

        const agentesPrisma = negocioConCRM?.CRM?.Agente ?? [];

        // Mapeo explícito para asegurar compatibilidad con el tipo Agente
        const agentes: Agente[] = agentesPrisma.map(agentePrisma => {
            // Construir el objeto base con los campos seleccionados
            const agenteBase = {
                ...agentePrisma,
                userId: agentePrisma.userId ?? null,
                nombre: agentePrisma.nombre ?? null,
                telefono: agentePrisma.telefono ?? null,
                rol: agentePrisma.rol ?? null,
                // Asegurar que las relaciones opcionales sean undefined si no se seleccionaron
                crm: undefined,
                Lead: undefined,
                Bitacora: undefined,
                Agenda: undefined,
                Notificacion: undefined,
                conversacionesAsignadas: undefined,
                interaccionesRealizadas: undefined,
                // --- CORRECCIÓN: Explicitar que password es undefined ---
                // Esto funcionará SI Y SOLO SI tu tipo Agente define password como opcional (password?: ...)
                password: undefined,
                // --- FIN CORRECCIÓN ---
            };
            // Castear al final si es necesario para satisfacer el tipo Agente[]
            // Esto asume que el tipo Agente es compatible con agenteBase ahora
            return agenteBase as Agente;
        });

        return {
            success: true,
            data: {
                crmId: crmId,
                agentes: agentes
            }
        };

    } catch (error) {
        console.error(`Error fetching agentes for negocio ${negocioId}:`, error);
        return { success: false, error: 'No se pudieron obtener los agentes.' };
    }
}



/**
 * Crea un nuevo Agente para un CRM específico.
 * @param data - Datos del agente a crear (crmId, nombre, email, password, etc.).
 * @returns Objeto con el resultado y el agente creado (sin password) si tuvo éxito.
 */
export async function crearAgenteCRM(
    data: Pick<Agente, 'crmId' | 'nombre' | 'email' | 'telefono' | 'password' | 'rol' | 'status'>
): Promise<{ success: boolean; data?: Agente; error?: string }> {
    try {
        // Validaciones
        if (!data.crmId || !data.nombre?.trim() || !data.email?.trim() || !data.password) {
            return { success: false, error: "crmId, nombre, email y contraseña son requeridos." };
        }
        if (!/\S+@\S+\.\S+/.test(data.email.trim())) {
            return { success: false, error: "Formato de email inválido." };
        }

        // Verificar duplicados de email (unique globalmente)
        const existingEmail = await prisma.agente.findUnique({ where: { email: data.email.trim() } });
        if (existingEmail) { return { success: false, error: 'El email ya está registrado para otro agente.' }; }

        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        // Crear agente
        const newAgente = await prisma.agente.create({
            data: {
                crmId: data.crmId,
                nombre: data.nombre.trim(),
                email: data.email.trim(),
                telefono: data.telefono?.trim() || null,
                password: hashedPassword, // Guardar hash
                rol: data.rol || 'agente_ventas',
                status: data.status || 'activo',
            },
            // Devolver datos sin password
            select: { id: true, crmId: true, userId: true, nombre: true, email: true, telefono: true, rol: true, status: true, createdAt: true, updatedAt: true }
        });
        return { success: true, data: newAgente as Agente };
    } catch (error) {
        console.error('Error creating agente:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Este error no debería ocurrir por email si la validación anterior funciona,
            // pero podría ser por otro campo unique si lo hubiera.
            return { success: false, error: `El valor proporcionado para un campo único ya existe.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear agente." };
    }
}

/**
 * Edita un Agente existente (no permite cambiar contraseña ni email).
 * @param id - ID del agente a editar.
 * @param data - Datos a actualizar (nombre, telefono, rol, status).
 * @returns Objeto con el resultado y el agente actualizado (sin password) si tuvo éxito.
 */
export async function editarAgenteCRM(
    id: string,
    // Excluir email y password de la edición
    data: Partial<Pick<Agente, 'nombre' | 'telefono' | 'rol' | 'status'>>
): Promise<{ success: boolean; data?: Agente; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de agente no proporcionado." };

        const dataToUpdate: Prisma.AgenteUpdateInput = {};
        // Solo permitir actualizar estos campos
        if (data.nombre !== undefined && data.nombre !== null) dataToUpdate.nombre = data.nombre.trim();
        if (data.telefono !== undefined) dataToUpdate.telefono = data.telefono?.trim() || null;
        if (data.rol !== undefined) dataToUpdate.rol = data.rol;
        if (data.status !== undefined) dataToUpdate.status = data.status;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }

        // Actualizar agente
        const updatedAgente = await prisma.agente.update({
            where: { id },
            data: dataToUpdate,
            // Devolver datos sin password
            select: { id: true, crmId: true, userId: true, nombre: true, email: true, telefono: true, rol: true, status: true, createdAt: true, updatedAt: true }
        });
        return { success: true, data: updatedAgente as Agente };
    } catch (error) {
        console.error(`Error updating agente ${id}:`, error);
        // P2002 no debería ocurrir aquí si no cambiamos email
        return { success: false, error: (error as Error).message || "Error desconocido al editar agente." };
    }
}

/**
 * Elimina un agente por su ID.
 * @param id - ID del agente a eliminar.
 * @returns Objeto indicando el éxito o fracaso de la operación.
 */
export async function eliminarAgenteCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de agente no proporcionado." };

        // Asumiendo onDelete: SetNull en Lead.agenteId
        await prisma.agente.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting agente ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            return { success: false, error: "No se puede eliminar el agente porque tiene registros asociados (ej: bitácora, agenda)." };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar agente." };
    }
}


export async function obtenerAgenteCrmPorUsuarioAction(
    usuarioId: string,
    negocioId: string
): Promise<ActionResult<AgenteBasico | null>> {

    console.log(`[Agente Actions] Buscando Agente para Usuario ${usuarioId} en Negocio ${negocioId}`);
    if (!usuarioId || !negocioId) {
        return { success: false, error: "Se requiere ID de usuario y negocio." };
    }

    try {
        // 1. Encontrar el CRM del negocio
        const crm = await prisma.cRM.findUnique({
            where: { negocioId: negocioId },
            select: { id: true }
        });

        if (!crm) {
            console.log(`[Agente Actions] No se encontró CRM para Negocio ${negocioId}`);
            return { success: true, data: null }; // No hay CRM, por lo tanto no hay agente
        }

        // 2. Buscar al Agente en ese CRM que tenga el userId correspondiente
        // ASUNCIÓN: El modelo Agente tiene un campo 'userId' que lo vincula al modelo Usuario
        const agente = await prisma.agente.findFirst({
            where: {
                crmId: crm.id,
                userId: usuarioId, // Busca por el ID del Usuario logueado
                status: 'activo' // Opcional: Asegurar que el agente esté activo
            },
            select: {
                id: true,
                nombre: true,
                // email: true // Podrías devolver el email si lo necesitas
            }
        });

        if (!agente) {
            console.log(`[Agente Actions] No se encontró Agente activo para Usuario ${usuarioId} en CRM ${crm.id}`);
            return { success: true, data: null }; // El usuario no es un agente activo en este CRM
        }

        console.log(`[Agente Actions] Agente encontrado: ID=${agente.id}, Nombre=${agente.nombre}`);
        const agenteBasico: AgenteBasico = {
            id: agente.id,
            nombre: agente.nombre // El nombre puede ser null si así está en tu BD
        };

        return { success: true, data: agenteBasico };

    } catch (error) {
        console.error("[Agente Actions] Error buscando Agente por Usuario y Negocio:", error);
        return { success: false, error: "Error al buscar la información del agente.", data: null };
    }
}