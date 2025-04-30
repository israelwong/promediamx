// Ejemplo en: @/app/admin/_lib/crmAgente.actions.ts
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { Agente } from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';
import bcrypt from 'bcrypt'; // Importar bcrypt

// --- Obtener Agentes para un CRM ---
export async function obtenerAgentesCRM(crmId: string): Promise<Agente[]> {
    if (!crmId) return [];
    try {
        const agentes = await prisma.agente.findMany({
            where: { crmId: crmId },
            orderBy: { nombre: 'asc' }, // Ordenar por nombre
            // Excluir password del select por seguridad
            select: {
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
                // Opcional: Conteo de leads asignados
                _count: { select: { Lead: true } }
            }
        });
        // Castear para que coincida con el tipo Agente (que puede incluir password opcional)
        return agentes as Agente[];
    } catch (error) {
        console.error(`Error fetching agentes for CRM ${crmId}:`, error);
        throw new Error('No se pudieron obtener los agentes.');
    }
}

// --- Crear un nuevo Agente ---
export async function crearAgenteCRM(
    // Recibir datos necesarios, incluyendo password en texto plano
    data: Pick<Agente, 'crmId' | 'nombre' | 'email' | 'telefono' | 'password' | 'rol' | 'status'>
): Promise<{ success: boolean; data?: Agente; error?: string }> {
    try {
        // Validaciones básicas
        if (!data.crmId || !data.nombre?.trim() || !data.email?.trim() || !data.password) {
            return { success: false, error: "crmId, nombre, email y contraseña son requeridos." };
        }
        // Validar formato email
        if (!/\S+@\S+\.\S+/.test(data.email)) {
            return { success: false, error: "Formato de email inválido." };
        }

        // Verificar duplicados (email debe ser único globalmente)
        const existingEmail = await prisma.agente.findUnique({ where: { email: data.email.trim() } });
        if (existingEmail) { return { success: false, error: 'El email ya está registrado para otro agente.' }; }

        // Hashear contraseña ANTES de guardar
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        const newAgente = await prisma.agente.create({
            data: {
                crmId: data.crmId,
                nombre: data.nombre.trim(),
                email: data.email.trim(),
                telefono: data.telefono?.trim() || null,
                password: hashedPassword, // Guardar hash
                rol: data.rol || 'agente_ventas', // Rol por defecto
                status: data.status || 'activo', // Status por defecto
            },
            // Devolver datos sin password
            select: { id: true, crmId: true, userId: true, nombre: true, email: true, telefono: true, rol: true, status: true, createdAt: true, updatedAt: true }
        });
        return { success: true, data: newAgente as Agente };
    } catch (error) {
        console.error('Error creating agente:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El valor proporcionado para un campo único ya existe.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear agente." };
    }
}

// --- Editar un Agente (NO contraseña) ---
export async function editarAgenteCRM(
    id: string,
    data: Partial<Pick<Agente, 'nombre' | 'email' | 'telefono' | 'rol' | 'status'>>
): Promise<{ success: boolean; data?: Agente; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de agente no proporcionado." };

        // Validar formato email si se cambia
        if (data.email && !/\S+@\S+\.\S+/.test(data.email)) {
            return { success: false, error: "Formato de email inválido." };
        }

        const dataToUpdate: Prisma.AgenteUpdateInput = {};
        if (data.nombre !== undefined && data.nombre !== null) dataToUpdate.nombre = data.nombre.trim();
        if (data.email !== undefined) dataToUpdate.email = data.email.trim();
        if (data.telefono !== undefined) dataToUpdate.telefono = data.telefono?.trim() || null;
        if (data.rol !== undefined) dataToUpdate.rol = data.rol;
        if (data.status !== undefined) dataToUpdate.status = data.status;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }

        const updatedAgente = await prisma.agente.update({
            where: { id },
            data: dataToUpdate,
            // Devolver datos sin password
            select: { id: true, crmId: true, userId: true, nombre: true, email: true, telefono: true, rol: true, status: true, createdAt: true, updatedAt: true }
        });
        return { success: true, data: updatedAgente as Agente };
    } catch (error) {
        console.error(`Error updating agente ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El email '${data.email}' ya está registrado.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar agente." };
    }
}

// --- Eliminar un Agente (Asegurarse que relación Lead->Agente tenga onDelete: SetNull) ---
export async function eliminarAgenteCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de agente no proporcionado." };

        // **NOTA:** Asumiendo que la relación en el modelo Lead tiene onDelete: SetNull para agenteId,
        // Prisma manejará automáticamente la desvinculación de los leads.
        // Si no, necesitarías hacer un updateMany aquí para poner agenteId a null en los Leads.

        await prisma.agente.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting agente ${id}:`, error);
        // Podría fallar si hay otras restricciones (ej: en Bitacora o Agenda si no tienen SetNull/Cascade)
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            return { success: false, error: "No se puede eliminar el agente porque tiene registros asociados (ej: bitácora, agenda)." };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar agente." };
    }
}

// --- Tipo Agente (Asegúrate que coincida con tu schema) ---
/*
export interface Agente {
    id: string;
    crmId: string;
    crm?: CRM | null;
    userId?: string | null;
    nombre?: string | null;
    email: string;
    telefono?: string | null;
    password?: string | null; // Solo presente en creación, NUNCA se devuelve desde el backend
    rol?: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    Lead?: Lead[];
    Bitacora?: Bitacora[];
    Agenda?: Agenda[];
    // Conteo opcional
     _count?: {
        Lead?: number;
    };
}
*/