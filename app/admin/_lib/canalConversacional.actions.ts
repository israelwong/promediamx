'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { CanalConversacional } from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';


// --- Obtener SOLO Canales Conversacionales ACTIVOS ---
export async function obtenerCanalesActivos(): Promise<CanalConversacional[]> {
    try {
        const canales = await prisma.canalConversacional.findMany({
            where: { status: 'activo' }, // Filtrar por activos
            orderBy: { nombre: 'asc' },
        });
        return canales as CanalConversacional[];
    } catch (error) {
        console.error('Error al obtener los canales conversacionales activos:', error);
        throw new Error('No se pudieron obtener los canales activos');
    }
}

// --- Obtener Canales (Ordenados por 'orden') ---
export async function obtenerCanalesConversacionales(): Promise<CanalConversacional[]> {
    try {
        const canales = await prisma.canalConversacional.findMany({
            orderBy: { orden: 'asc' }, // **CAMBIO: Ordenar por 'orden'**
        });
        return canales as CanalConversacional[];
    } catch (error) {
        console.error('Error al obtener los canales conversacionales:', error);
        throw new Error('No se pudieron obtener los canales conversacionales');
    }
}

// --- Crear Canal (Asignar orden) ---
export async function crearCanalConversacional(
    data: Pick<CanalConversacional, 'nombre' | 'descripcion' | 'icono' | 'status'>
): Promise<{ success: boolean; data?: CanalConversacional; error?: string }> {
    try {
        if (!data.nombre?.trim()) {
            return { success: false, error: "El nombre es obligatorio." };
        }
        // **NUEVO: Calcular siguiente orden**
        const ultimoOrden = await prisma.canalConversacional.aggregate({ _max: { orden: true } });
        const nuevoOrden = (ultimoOrden._max.orden ?? 0) + 1;

        const newCanal = await prisma.canalConversacional.create({
            data: {
                nombre: data.nombre.trim(),
                descripcion: data.descripcion?.trim() || null,
                icono: data.icono?.trim() || null,
                status: data.status || 'activo',
                orden: nuevoOrden, // **NUEVO: Asignar orden**
            },
        });
        return { success: true, data: newCanal as CanalConversacional };
    } catch (error) {
        console.error('Error al crear el canal conversacional:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de canal '${data.nombre}' ya existe.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear canal." };
    }
}

// --- Editar Canal (Sin cambios necesarios aquí para orden) ---
export async function editarCanalConversacional(
    id: string,
    data: Partial<Pick<CanalConversacional, 'nombre' | 'descripcion' | 'icono' | 'status'>>
): Promise<{ success: boolean; data?: CanalConversacional; error?: string }> {
    try {
        // ... (validaciones y lógica existente) ...
        if (!id) return { success: false, error: "ID de canal no proporcionado." };

        const dataToUpdate: Prisma.CanalConversacionalUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;
        if (data.icono !== undefined) dataToUpdate.icono = data.icono?.trim() || null;
        if (data.status !== undefined) dataToUpdate.status = data.status;

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }
        if (dataToUpdate.nombre === '') {
            return { success: false, error: "El nombre no puede estar vacío." };
        }

        const updatedCanal = await prisma.canalConversacional.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedCanal as CanalConversacional };
    } catch (error) {
        console.error(`Error updating canal conversacional ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre de canal '${data.nombre}' ya existe.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar canal." };
    }
}

// --- Eliminar Canal (Sin cambios necesarios aquí para orden) ---
export async function eliminarCanalConversacional(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        // ... (validaciones existentes) ...
        if (!id) return { success: false, error: "ID de canal no proporcionado." };
        const tareasAsociadasCount = await prisma.tareaCanal.count({ where: { canalConversacionalId: id } });
        if (tareasAsociadasCount > 0) {
            return { success: false, error: `No se puede eliminar: ${tareasAsociadasCount} tarea(s) usan este canal.` };
        }
        await prisma.canalConversacional.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting canal conversacional ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            return { success: false, error: "No se puede eliminar el canal porque tiene registros asociados." };
        }
        return { success: false, error: (error as Error).message || 'Error desconocido al eliminar canal.' };
    }
}

// --- **NUEVA Acción: Ordenar Canales** ---
export async function ordenarCanalesConversacionales(
    items: { id: string; orden: number }[]
): Promise<{ success: boolean; error?: string }> {
    if (!items || items.length === 0) {
        return { success: true }; // No hay nada que ordenar
    }
    try {
        const updatePromises = items.map(item =>
            prisma.canalConversacional.update({ // Usar el modelo correcto
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        return { success: true };
    } catch (error) {
        console.error("Error updating canal order:", error);
        return { success: false, error: (error as Error).message || "Error al actualizar el orden." };
    }
}
