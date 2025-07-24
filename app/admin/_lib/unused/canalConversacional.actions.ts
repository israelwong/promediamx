/**
 * The above TypeScript code defines functions to manage conversational channels including creating,
 * editing, deleting, and ordering them, with error handling and data validation.
 * @returns The functions in the provided code return different types of data based on their purpose:
 */
// Ruta: app/admin/_lib/canalConversacional.actions.ts
'use server';
import prisma from '../prismaClient';
import { CanalConversacional as CanalConversacionalBasePrisma } from '../types'; // Tipo base de la entidad
import { Prisma } from '@prisma/client';

// --- IMPORTACIÓN DE TIPO DE INPUT ACTUALIZADA ---
import { CanalConversacionalInput } from './canalConversacional.type';

// --- Obtener SOLO Canales Conversacionales ACTIVOS ---
// Esta función puede ser útil para selectores donde solo se quieren mostrar canales funcionales.
export async function obtenerCanalesActivos(): Promise<CanalConversacionalBasePrisma[]> {
    try {
        const canales = await prisma.canalConversacional.findMany({
            where: { status: 'activo' },
            orderBy: { orden: 'asc' }, // Consistentemente ordenado por 'orden'
        });
        return canales as CanalConversacionalBasePrisma[];
    } catch (error) {
        console.error('Error al obtener los canales conversacionales activos:', error);
        // Considera no lanzar un error genérico aquí, sino quizás devolver un array vacío o un objeto con error.
        // Por ahora, mantenemos el throw para consistencia con el original.
        throw new Error('No se pudieron obtener los canales activos');
    }
}

// --- Obtener Todos los Canales Conversacionales (Ordenados por 'orden') ---
// Incluye conteo de tareas y asistentes para la UI de gestión.
export async function obtenerCanalesConversacionales(): Promise<(CanalConversacionalBasePrisma & { _count?: { tareasSoportadas?: number, AsistenteVirtual?: number } })[]> {
    try {
        const canales = await prisma.canalConversacional.findMany({
            orderBy: { orden: 'asc' },
            include: {
                _count: {
                    select: {
                        tareasSoportadas: true, // Cuenta las relaciones en TareaCanal
                        AsistenteVirtual: true  // Cuenta los asistentes que tienen este canal asignado
                    }
                }
            }
        });
        // El tipo de retorno debe reflejar la inclusión de _count.
        // Prisma.CanalConversacionalGetPayload<{ include: { _count: ... } }> sería más preciso.
        return canales as (CanalConversacionalBasePrisma & { _count?: { tareasSoportadas?: number, AsistenteVirtual?: number } })[];
    } catch (error) {
        console.error('Error al obtener los canales conversacionales:', error);
        throw new Error('No se pudieron obtener los canales conversacionales');
    }
}

// --- Crear un nuevo Canal Conversacional (Asignar orden) ---
export async function crearCanalConversacional(
    data: CanalConversacionalInput
): Promise<{ success: boolean; data?: CanalConversacionalBasePrisma; error?: string }> {
    try {
        if (!data.nombre?.trim()) {
            return { success: false, error: "El nombre del canal es obligatorio." };
        }
        // Calcular el siguiente 'orden' para el nuevo canal
        const ultimoCanal = await prisma.canalConversacional.findFirst({
            orderBy: { orden: 'desc' },
            select: { orden: true }
        });
        const nuevoOrden = (ultimoCanal?.orden ?? -1) + 1; // Si no hay ninguno, empieza en 0

        const newCanal = await prisma.canalConversacional.create({
            data: {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || null,
                icono: data.icono?.trim() || null,
                status: data.status || 'activo', // Default a 'activo' si no se provee
                orden: nuevoOrden,
            },
        });
        return { success: true, data: newCanal as CanalConversacionalBasePrisma };
    } catch (error) {
        console.error('Error al crear el canal conversacional:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Asumiendo que 'nombre' es unique en el schema para CanalConversacional
            return { success: false, error: `El nombre de canal '${data.nombre}' ya existe.` };
        }
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al crear el canal.") };
    }
}

// --- Editar un Canal Conversacional existente ---
// 'orden' no se edita aquí, se maneja con ordenarCanalesConversacionales.
export async function editarCanalConversacional(
    id: string,
    data: CanalConversacionalInput // El tipo de input ya maneja campos opcionales excepto 'nombre'
): Promise<{ success: boolean; data?: CanalConversacionalBasePrisma; error?: string }> {
    try {
        if (!id) {
            return { success: false, error: "ID de canal no proporcionado." };
        }
        if (data.nombre !== undefined && !data.nombre.trim()) { // Si se provee nombre, no puede ser vacío
            return { success: false, error: "El nombre del canal no puede estar vacío." };
        }

        // Construir el objeto de datos para actualizar, solo con campos definidos en 'data'
        const dataToUpdate: Prisma.CanalConversacionalUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;
        if (data.icono !== undefined) dataToUpdate.icono = data.icono?.trim() || null;
        if (data.status !== undefined) dataToUpdate.status = data.status;

        // Prevenir actualización si no hay datos (aunque CanalConversacionalInput requiere nombre)
        if (Object.keys(dataToUpdate).length === 0) {
            const canalExistente = await prisma.canalConversacional.findUnique({ where: { id } });
            return { success: true, data: canalExistente as CanalConversacionalBasePrisma }; // Devuelve el canal sin cambios
        }

        const updatedCanal = await prisma.canalConversacional.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedCanal as CanalConversacionalBasePrisma };
    } catch (error) {
        console.error(`Error al actualizar el canal conversacional ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && data.nombre) { // Si el error es por nombre único
                return { success: false, error: `El nombre de canal '${data.nombre}' ya existe.` };
            }
            if (error.code === 'P2025') { // Registro no encontrado
                return { success: false, error: `Canal con ID ${id} no encontrado.` };
            }
        }
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al editar el canal.") };
    }
}

// --- Eliminar un Canal Conversacional ---
export async function eliminarCanalConversacional(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) {
            return { success: false, error: "ID de canal no proporcionado." };
        }

        // Verificar si el canal está siendo usado por Tareas o Asistentes
        const tareasAsociadasCount = await prisma.tareaCanal.count({
            where: { canalConversacionalId: id }
        });
        const asistentesAsociadosCount = await prisma.asistenteVirtual.count({
            where: { canalConversacionalId: id }
        });

        if (tareasAsociadasCount > 0 || asistentesAsociadosCount > 0) {
            let errorMsg = "No se puede eliminar: el canal está en uso.";
            if (tareasAsociadasCount > 0) errorMsg += ` ${tareasAsociadasCount} tarea(s).`;
            if (asistentesAsociadosCount > 0) errorMsg += ` ${asistentesAsociadosCount} asistente(s).`;
            return { success: false, error: errorMsg.trim() };
        }

        await prisma.canalConversacional.delete({
            where: { id }
        });
        return { success: true };
    } catch (error) {
        console.error(`Error al eliminar el canal conversacional ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `Canal con ID ${id} no encontrado.` };
        }
        // P2003 (foreign key constraint failed on the field) también es relevante
        // pero las validaciones previas deberían cubrirlo.
        return { success: false, error: (error instanceof Error ? error.message : 'Error desconocido al eliminar el canal.') };
    }
}

// --- Actualizar el Orden de los Canales Conversacionales ---
export async function ordenarCanalesConversacionales(
    items: { id: string; orden: number }[]
): Promise<{ success: boolean; error?: string }> {
    if (!items || items.length === 0) {
        return { success: true }; // No hay nada que ordenar, operación exitosa.
    }
    try {
        // Usar una transacción para asegurar que todas las actualizaciones de orden se completen o ninguna.
        const updatePromises = items.map(item =>
            prisma.canalConversacional.update({
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        return { success: true };
    } catch (error) {
        console.error("Error al actualizar el orden de los canales:", error);
        return { success: false, error: (error instanceof Error ? error.message : "Error desconocido al actualizar el orden.") };
    }
}
