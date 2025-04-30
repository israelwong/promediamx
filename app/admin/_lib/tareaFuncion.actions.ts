// Ruta: src/app/admin/_lib/tareaFuncion.actions.ts
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import {
    TareaFuncion,
    ParametroRequerido,
    CrearFuncionData,
    EditarFuncionData,
    TareaFuncionParametroRequerido
} from './types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';


export async function obtenerFuncionesTareaConParametros(): Promise<(TareaFuncion & { _count?: { tareas?: number }, parametrosRequeridos?: (TareaFuncionParametroRequerido & { parametroRequerido?: Pick<ParametroRequerido, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null })[] })[]> {
    try {
        const funciones = await prisma.tareaFuncion.findMany({
            orderBy: { nombreVisible: 'asc' },
            include: {
                parametrosRequeridos: { // Incluir la tabla de unión
                    include: {
                        parametroRequerido: { // Incluir los detalles del parámetro
                            // Seleccionar los campos necesarios, incluyendo los nuevos nombres
                            select: {
                                id: true,
                                nombreVisible: true, // <-- CAMBIO
                                nombreInterno: true, // <-- CAMBIO
                                tipoDato: true,
                                // descripcion: true, // Opcional: incluir si se necesita en la lista
                            }
                        }
                    }
                },
                _count: { select: { tareas: true } } // Contar tareas asociadas
            }
        });
        // Es importante asegurar que el tipo devuelto coincida con tu interfaz TareaFuncion/FuncionConDetalles
        // El casteo ayuda, pero verifica que la estructura coincida.
        return funciones as (TareaFuncion & {
            _count?: { tareas?: number },
            parametrosRequeridos?: (TareaFuncionParametroRequerido & {
                parametroRequerido?: Pick<ParametroRequerido, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null
            })[]
        })[];
    } catch (error) {
        console.error('Error fetching task functions:', error);
        throw new Error('No se pudieron obtener las funciones de tarea.');
    }
}

// --- Obtener todos los Parámetros Estándar disponibles ---
// (Sin cambios necesarios aquí, asumiendo que devuelve el objeto completo
// y el tipo ParametroRequerido ya está actualizado)
export async function obtenerParametrosRequeridosDisponibles(): Promise<ParametroRequerido[]> {
    try {
        const parametros = await prisma.parametroRequerido.findMany({
            orderBy: { orden: 'asc' }, // Ordenar por el campo 'orden' si existe y es relevante
        });
        return parametros as ParametroRequerido[];
    } catch (error) {
        console.error('Error fetching available parameters:', error);
        throw new Error('No se pudieron obtener los parámetros disponibles.');
    }
}


// --- Crear Función Tarea ---
// (Sin cambios funcionales necesarios aquí respecto a los campos de parámetro)
export async function crearFuncionTarea(
    data: CrearFuncionData
): Promise<{ success: boolean; data?: TareaFuncion; error?: string }> {
    try {
        if (!data.nombreInterno?.trim() || !data.nombreVisible?.trim()) {
            return { success: false, error: "Nombre interno y visible son requeridos." };
        }
        // if (!/^[a-z0-9_]+$/.test(data.nombreInterno)) {
        //     return { success: false, error: "Nombre interno solo puede contener minúsculas, números y guion bajo." };
        // }

        const nuevaFuncion = await prisma.$transaction(async (tx) => {
            const funcionCreada = await tx.tareaFuncion.create({
                data: {
                    nombreInterno: data.nombreInterno.trim(),
                    nombreVisible: data.nombreVisible.trim(),
                    descripcion: data.descripcion?.trim() || null,
                },
            });

            if (data.parametros && data.parametros.length > 0) {
                await tx.tareaFuncionParametroRequerido.createMany({
                    data: data.parametros.map(p => ({
                        tareaFuncionId: funcionCreada.id,
                        parametroRequeridoId: p.parametroRequeridoId,
                        esObligatorio: p.esObligatorio,
                    })),
                    skipDuplicates: true,
                });
            }
            return funcionCreada;
        });

        const funcionCompleta = await obtenerFuncionTareaPorId(nuevaFuncion.id);
        return {
            success: true,
            data: {
                ...funcionCompleta,
                parametrosRequeridos: funcionCompleta?.parametrosRequeridos?.map(pr => ({
                    ...pr,
                    parametroRequerido: {
                        ...pr.parametroRequerido,
                        createdAt: new Date(), // Replace with actual value if available
                        updatedAt: new Date()  // Replace with actual value if available
                    }
                }))
            } as TareaFuncion
        }; // Asegurar casteo correcto
    } catch (error) {
        console.error('Error creating task function:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: `El nombre interno '${data.nombreInterno}' ya existe.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al crear función." };
    }
}


// --- Editar Función Tarea ---
// (Sin cambios funcionales necesarios aquí respecto a los campos de parámetro)
export async function editarFuncionTarea(
    id: string,
    data: EditarFuncionData
): Promise<{ success: boolean; data?: TareaFuncion; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de función no proporcionado." };

        const dataToUpdate: Prisma.TareaFuncionUpdateInput = {};
        if (data.nombreVisible !== undefined) dataToUpdate.nombreVisible = data.nombreVisible.trim();
        if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;

        if (dataToUpdate.nombreVisible === '') {
            return { success: false, error: "El nombre visible no puede estar vacío." };
        }

        await prisma.$transaction(async (tx) => {
            if (Object.keys(dataToUpdate).length > 0) {
                await tx.tareaFuncion.update({
                    where: { id },
                    data: dataToUpdate,
                });
            }

            if (data.parametros !== undefined) {
                await tx.tareaFuncionParametroRequerido.deleteMany({
                    where: { tareaFuncionId: id }
                });
                if (data.parametros.length > 0) {
                    await tx.tareaFuncionParametroRequerido.createMany({
                        data: data.parametros.map(p => ({
                            tareaFuncionId: id,
                            parametroRequeridoId: p.parametroRequeridoId,
                            esObligatorio: p.esObligatorio,
                        })),
                    });
                }
            }
        });

        const funcionCompleta = await obtenerFuncionTareaPorId(id);
        if (funcionCompleta) {
            return {
                success: true,
                data: {
                    ...funcionCompleta,
                    parametrosRequeridos: funcionCompleta.parametrosRequeridos?.map(pr => ({
                        ...pr,
                        parametroRequerido: {
                            ...pr.parametroRequerido,
                            createdAt: new Date(), // Replace with actual value if available
                            updatedAt: new Date()  // Replace with actual value if available
                        }
                    }))
                } as TareaFuncion
            };
        }
        return { success: false, error: "Función no encontrada." };

    } catch (error) {
        console.error(`Error updating task function ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Podría ser por nombreVisible si tiene restricción unique
            return { success: false, error: `El nombre visible '${data.nombreVisible}' ya está en uso.` };
        }
        return { success: false, error: (error as Error).message || "Error desconocido al editar función." };
    }
}


// --- Eliminar Función ---
// (Sin cambios necesarios aquí)
export async function eliminarFuncionTarea(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de función no proporcionado." };

        const tareasAsociadasCount = await prisma.tarea.count({
            where: { tareaFuncionId: id },
        });

        if (tareasAsociadasCount > 0) {
            return { success: false, error: `No se puede eliminar: ${tareasAsociadasCount} tarea(s) usan esta función.` };
        }

        await prisma.tareaFuncion.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting task function ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `Función con ID ${id} no encontrada.` };
        }
        return { success: false, error: (error as Error).message || 'Error desconocido al eliminar función.' };
    }
}

// Helper para obtener una función por ID (usado internamente)
// ACTUALIZADO: El select para parametroRequerido ahora incluye nombreVisible y nombreInterno
async function obtenerFuncionTareaPorId(id: string) {
    return await prisma.tareaFuncion.findUnique({
        where: { id },
        include: {
            parametrosRequeridos: {
                include: {
                    parametroRequerido: {
                        select: { // Asegurar que seleccionamos los campos correctos
                            id: true,
                            nombreVisible: true, // <-- CAMBIO
                            nombreInterno: true, // <-- CAMBIO
                            tipoDato: true
                        }
                    }
                }
            },
            _count: { select: { tareas: true } }
        }
    });
}


// --- NUEVA ACCIÓN: Actualizar Orden de las Funciones ---
export async function actualizarOrdenFunciones(
    funcionesOrdenadas: { id: string; orden: number }[] // Espera un array de {id, nuevoOrden}
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!funcionesOrdenadas || funcionesOrdenadas.length === 0) {
            return { success: true }; // Nada que actualizar
        }

        // Usar una transacción para actualizar todos los órdenes
        await prisma.$transaction(
            funcionesOrdenadas.map((func, index) => // Usar el índice como nuevo orden
                prisma.tareaFuncion.update({
                    where: { id: func.id },
                    data: { orden: index }, // Asignar el índice del array como nuevo orden
                })
            )
        );

        // Opcional: Revalidar la ruta donde se muestra la lista si es necesario
        // revalidatePath('/admin/tareas'); // Ajusta la ruta según corresponda

        return { success: true };
    } catch (error) {
        console.error('Error updating task function order:', error);
        return { success: false, error: (error as Error).message || 'Error desconocido al actualizar el orden.' };
    }
}


// Acción para asociar una TareaFuncion existente a una Tarea
export async function asociarFuncionATarea(
    tareaId: string,
    funcionId: string | null // Permitir null para desasociar
): Promise<{ success: boolean; error?: string }> {
    try {
        if (!tareaId) return { success: false, error: "ID de tarea no proporcionado." };

        await prisma.tarea.update({
            where: { id: tareaId },
            data: { tareaFuncionId: funcionId }, // Asocia o desasocia
        });

        revalidatePath(`/admin/tareas/${tareaId}`); // Revalida la página de edición
        revalidatePath('/admin/tareas'); // Revalida la lista

        return { success: true };
    } catch (error) {
        console.error(`Error al ${funcionId ? 'asociar' : 'desasociar'} función para tarea ${tareaId}:`, error);
        return { success: false, error: `Error al actualizar la tarea: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}

// Acción para obtener solo la función asociada a una tarea (más ligero que obtenerTareaPorId completo)
// Asegúrate que el tipo devuelto coincida con FuncionConDetalles que usaremos


// Define el tipo esperado aquí o impórtalo si ya existe uno similar
type FuncionConDetalles = TareaFuncion & {
    parametrosRequeridos?: (TareaFuncionParametroRequerido & {
        parametroRequerido?: Pick<ParametroRequerido, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato' | 'descripcion'> | null
    })[]
};

export async function obtenerFuncionDeTarea(tareaId: string): Promise<FuncionConDetalles | null> {
    try {
        if (!tareaId) return null;
        const tarea = await prisma.tarea.findUnique({
            where: { id: tareaId },
            select: {
                tareaFuncion: { // Incluye la función relacionada
                    include: {
                        parametrosRequeridos: {
                            include: {
                                parametroRequerido: { // Incluye los detalles del parámetro
                                    select: {
                                        id: true,
                                        nombreVisible: true,
                                        nombreInterno: true,
                                        tipoDato: true,
                                        descripcion: true, // Incluir descripción para mostrarla
                                    }
                                }
                            }
                        }
                    }
                }
            }
        });
        return tarea?.tareaFuncion as FuncionConDetalles | null; // Devuelve la función o null
    } catch (error) {
        console.error(`Error fetching function for tarea ${tareaId}:`, error);
        throw new Error('No se pudo obtener la función asociada a la tarea.');
    }
}