// Ruta actual: /app/admin/_lib/tareas.actions.ts
'use server'
import prisma from './prismaClient'
import { Prisma } from '@prisma/client'

import {
    TareaConDetalles,
    CategoriaTareaSimple,
    OrdenarTareasInput,
    ActionResult,
    Tarea,
    // TareaFuncion,
    ParametroRequerido,
    CrearTareaBasicaInput,
    ActualizarTareaConRelacionesInput,
    TareaParaEditar,
    TareaParaMarketplace,
    CanalConversacionalSimple,

} from './tareas.type'

/************************************ */

export async function obtenerTareas() {
    const tareas = await prisma.tarea.findMany({
        orderBy: {
            orden: 'asc'
        }
    })
    return tareas
}

export async function obtenerTareasActivas() {
    try {
        const tareas = await prisma.tarea.findMany({
            where: { status: 'activo' },
            orderBy: {
                orden: 'asc'
            },
            select: {
                id: true,
                nombre: true,
                // descripcion: true,
                precio: true,
                categoriaTareaId: true
            }
        });

        return tareas;
    } catch (error) {
        console.error('Error al obtener las tareas activas:', error);
        throw new Error('Error al obtener las tareas activas');
    }
}

// --- Actualizar Tarea (Manejando Relaciones M-N) ---
export async function actualizarTarea(
    tareaId: string,
    data: ActualizarTareaConRelacionesInput // Usar el nuevo tipo de entrada
): Promise<Tarea> { // Devolver la tarea actualizada completa
    try {
        // 1. Validaciones básicas del lado del servidor
        if (!tareaId) throw new Error("ID de tarea no proporcionado.");
        if (!data.nombre?.trim()) throw new Error("El nombre no puede estar vacío.");
        if (typeof data.version !== 'number' || data.version <= 0) throw new Error("La versión debe ser un número positivo.");
        if (!data.status) throw new Error("El status es requerido.");
        if (!data.categoriaTareaId) throw new Error("La categoría es requerida.");

        // 2. Preparar datos para actualizar los campos escalares de Tarea
        const dataToUpdateTarea: Prisma.TareaUpdateInput = {
            nombre: data.nombre.trim(),
            // descripcion: data.descripcion?.trim() ?? null,
            // descripcionTool: data.descripcionTool?.trim() ?? null,
            instruccion: data.instruccion?.trim() ?? null,
            precio: data.precio ?? null,
            rol: data.rol?.trim() ?? null,
            personalidad: data.personalidad?.trim() ?? null,
            version: data.version,
            status: data.status,
            // iconoUrl: data.iconoUrl?.trim() || null, // <-- Añadido: guardar iconoUrl (o null si está vacío)
            // Conectar relaciones opcionales si se proporcionan IDs
            ...(data.categoriaTareaId && { CategoriaTarea: { connect: { id: data.categoriaTareaId } } }),
            ...(data.tareaFuncionId ? { tareaFuncion: { connect: { id: data.tareaFuncionId } } } : { tareaFuncion: { disconnect: true } }), // Conectar o desconectar función
        };

        // 3. Ejecutar todo dentro de una transacción
        const tareaActualizada = await prisma.$transaction(async (tx) => {
            // a. Actualizar los campos básicos de la Tarea
            const updatedTarea = await tx.tarea.update({
                where: { id: tareaId },
                data: dataToUpdateTarea,
            });

            // b. Actualizar Canales Soportados (Borrar existentes y crear nuevos)
            // Solo si se proporcionó el array canalIds (incluso si está vacío, para borrar)
            if (data.canalIds !== undefined) {
                // Borrar asociaciones antiguas
                await tx.tareaCanal.deleteMany({
                    where: { tareaId: tareaId }
                });
                // Crear nuevas asociaciones si el array no está vacío
                if (data.canalIds.length > 0) {
                    await tx.tareaCanal.createMany({
                        data: data.canalIds.map(canalId => ({
                            tareaId: tareaId,
                            canalConversacionalId: canalId,
                        })),
                    });
                }
            } // Si canalIds es undefined, no se hace nada con los canales

            // c. Actualizar Etiquetas (Borrar existentes y crear nuevos)
            // Solo si se proporcionó el array etiquetaIds
            if (data.etiquetaIds !== undefined) {
                // Borrar asociaciones antiguas
                await tx.tareaEtiqueta.deleteMany({
                    where: { tareaId: tareaId }
                });
                // Crear nuevas asociaciones si el array no está vacío
                if (data.etiquetaIds.length > 0) {
                    await tx.tareaEtiqueta.createMany({
                        data: data.etiquetaIds.map(etiquetaId => ({
                            tareaId: tareaId,
                            etiquetaTareaId: etiquetaId,
                        })),
                    });
                }
            } // Si etiquetaIds es undefined, no se hace nada con las etiquetas

            // Devolver la tarea actualizada desde la transacción
            // Podríamos volver a consultarla con includes si es necesario,
            // pero devolver el resultado directo del update es más eficiente.
            return updatedTarea;
        });

        // 4. Devolver la tarea actualizada (puede que no incluya las relaciones actualizadas
        // a menos que se haga un include en el update o se vuelva a consultar)
        // Para simplificar, devolvemos el objeto Tarea base.
        return tareaActualizada as Tarea;

    } catch (error) {
        console.error(`Error al actualizar la tarea ${tareaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') { // Error de unicidad
                throw new Error(`El nombre de tarea '${data.nombre}' ya existe.`);
            }
            if (error.code === 'P2025') { // Registro no encontrado para actualizar/conectar
                throw new Error(`No se encontró la tarea, categoría o función especificada.`);
            }
        }
        throw new Error(`Error al actualizar la tarea: ${error instanceof Error ? error.message : 'Error desconocido'}`);
    }
}

export async function eliminarTarea(tareaId: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!tareaId) return { success: false, error: "ID de tarea no proporcionado." };

        //!-- Validación de suscripciones (opcional) --
        // const suscripcionesCount = await prisma.asistenteTareaSuscripcion.count({
        //     where: { tareaId: tareaId }
        // });

        // if (suscripcionesCount > 0) {
        //     return { success: false, error: `No se puede eliminar: ${suscripcionesCount} asistente(s) están suscritos a esta tarea.` };
        // }


        // Eliminar tareas ejecutadas asociadas antes de eliminar la tarea
        await prisma.tareaEjecutada.deleteMany({
            where: { tareaId: tareaId }
        });

        // Desuscribir tareas de asistentes antes de eliminar
        await prisma.asistenteTareaSuscripcion.deleteMany({
            where: { tareaId: tareaId }
        });

        await prisma.tarea.delete({
            where: { id: tareaId }
        });
        return { success: true };
    } catch (error) {
        console.error('Error al eliminar la tarea:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `Tarea con ID ${tareaId} no encontrada.` };
        }
        return { success: false, error: `Error al eliminar la tarea: ${error instanceof Error ? error.message : 'Error desconocido'}` };
    }
}



// --- Obtener Tarea por ID con detalles necesarios para editar ---
// ACTUALIZADO: Incluir canalesSoportados y etiquetas

export async function obtenerTareaPorId(tareaId: string): Promise<TareaParaEditar | null> {
    try {
        if (!tareaId) return null; // Devolver null si no hay ID

        const tarea = await prisma.tarea.findUnique({
            where: { id: tareaId },
            include: {
                // Incluir función asociada (solo ID y nombre)
                tareaFuncion: { select: { id: true } },
                // Contar suscripciones para validación de borrado
                _count: { select: { AsistenteTareaSuscripcion: true } },
                // Incluir canales asociados (solo necesitamos el ID del canal)
                canalesSoportados: {
                    select: {
                        // tareaId: true, // No es necesario aquí
                        canalConversacionalId: true, // El ID directo
                        canalConversacional: { // Incluir objeto anidado
                            select: { id: true } // Seleccionar solo el ID del canal
                        }
                    }
                },
                // Incluir etiquetas asociadas (solo necesitamos el ID de la etiqueta)
                etiquetas: {
                    select: {
                        // tareaId: true, // No es necesario aquí
                        etiquetaTareaId: true, // El ID directo
                        etiquetaTarea: { // Incluir objeto anidado
                            select: { id: true } // Seleccionar solo el ID de la etiqueta
                        }
                    }
                }
            }
        });

        // Castear al tipo específico TareaParaEditar
        return tarea as TareaParaEditar | null;

    } catch (error) {
        console.error('Error al obtener la tarea:', error);
        // Lanzar el error para que el componente lo maneje si es necesario
        throw new Error('Error al obtener los detalles de la tarea');
    }
}

// --- Funciones auxiliares (sin cambios) ---
export async function obtenerCategorias() {
    try { return await prisma.categoriaTarea.findMany({ orderBy: { orden: 'asc' } }); }
    catch (e) { console.error(e); throw new Error("Error al obtener categorías"); }
}

export async function obtenerTodasEtiquetasTarea() {
    try { return await prisma.etiquetaTarea.findMany({ orderBy: { nombre: 'asc' } }); }
    catch (e) { console.error(e); throw new Error("Error al obtener etiquetas"); }
}

export async function obtenerTodosCanalesConversacionales() {
    try {
        return await prisma.canalConversacional.findMany({
            where: { status: 'activo' },
            orderBy: { nombre: 'asc' }
        });
    } catch (e) {
        console.error(e);
        throw new Error("Error al obtener canales activos");
    }
}

// --- Actualizar Instrucción Tarea (sin cambios) ---
export async function actualizarInstruccionTarea(tareaId: string, nuevaInstruccion: string) {
    try {
        const tareaActualizada = await prisma.tarea.update({
            where: { id: tareaId },
            data: { instruccion: nuevaInstruccion.trim() }
        });
        console.log('Instrucción de la tarea actualizada correctamente');
        return tareaActualizada;
    } catch (error) {
        console.error('Error al actualizar la instrucción de la tarea:', error);
        throw new Error('Error al actualizar la instrucción de la tarea');
    }
}

// --- OBTENER FUNCIONES TAREA DISPONIBLES (sin cambios) ---
// export async function obtenerFuncionesTareaDisponibles(): Promise<Pick<TareaFuncion, 'id' | 'nombreVisible' | 'nombreInterno'>[]> {
//     try {
//         return await prisma.tareaFuncion.findMany({
//             orderBy: { nombreVisible: 'asc' },
//             select: { id: true, nombreVisible: true, nombreInterno: true }
//         });
//     } catch (error) { console.error(error); throw new Error('No se pudieron obtener las funciones disponibles.'); }
// }

export async function obtenerParametrosPorFuncionId(funcionId: string): Promise<ParametroRequerido[]> {
    if (!funcionId) return [];
    try {
        const parametrosUnion = await prisma.tareaFuncionParametroRequerido.findMany({
            where: { tareaFuncionId: funcionId },
            include: { parametroRequerido: true }, // Incluir el objeto completo
            orderBy: { parametroRequerido: { orden: 'asc' } }
        });
        return parametrosUnion
            .map(union => union.parametroRequerido) // Mapear para obtener solo ParametroRequerido
            .filter(param => param !== null) as ParametroRequerido[]; // Filtrar nulos y castear
    } catch (error) { console.error(error); throw new Error('No se pudieron obtener los parámetros para la función.'); }
}

type TareaBaseInfo = Pick<Tarea, 'id' | 'nombre' | 'descripcion'>;
export async function obtenerTareasBase(): Promise<TareaBaseInfo[]> {
    try {
        // Encontrar todas las Tareas base (precio 0 o null)
        const tareasBase = await prisma.tarea.findMany({
            where: {
                OR: [
                    { precio: null },
                    { precio: 0 }
                ],
                status: 'activo' // Asegurarse de suscribir solo a tareas activas
            },
            orderBy: {
                orden: 'asc' // Ordenar por el campo 'orden' en orden ascendente
            },
            select: {
                id: true,
                nombre: true,
                // descripcion: true
            }
        });

        return tareasBase;

    } catch (error) {
        console.error('Error al obtener las tareas base:', error);
        throw new Error('No se pudieron obtener las tareas base.');
    }
}


export async function obtenerTareasParaMarketplace(): Promise<TareaParaMarketplace[]> {
    try {
        const tareas = await prisma.tarea.findMany({
            where: {
                status: 'activo' // Solo mostrar tareas activas en el marketplace
            },
            select: {
                id: true,
                nombre: true,
                // descripcion: true,
                precio: true,
                categoriaTareaId: true,
                CategoriaTarea: { // Incluir nombre de categoría
                    select: { nombre: true }
                },
                etiquetas: { // Incluir etiquetas asociadas
                    select: {
                        etiquetaTarea: {
                            select: { id: true, nombre: true }
                        }
                    }
                },
                _count: { // Incluir conteos
                    select: {
                        AsistenteTareaSuscripcion: true, // Contar suscripciones activas? O todas? (Considerar)
                        TareaGaleria: true
                    }
                }
            },
            orderBy: [ // Ordenar
                { orden: 'asc' },
                { nombre: 'asc' }
            ]
        });
        // Asegurarse que el tipo devuelto coincida
        return tareas as TareaParaMarketplace[];
    } catch (error) {
        console.error("Error fetching tasks for marketplace:", error);
        throw new Error("No se pudieron obtener las tareas para el marketplace.");
    }
}

// --- Obtener Tareas para la Lista (ACTUALIZADA para incluir versión y conteo de asistentes) ---
export async function obtenerTareasConDetalles(): Promise<ActionResult<TareaConDetalles[]>> {
    try {
        const tareas = await prisma.tarea.findMany({
            orderBy: [
                { orden: 'asc' },
                { nombre: 'asc' }
            ],
            select: {
                id: true,
                nombre: true,
                status: true,
                precio: true,
                orden: true,
                iconoUrl: true,
                categoriaTareaId: true,
                // tareaFuncionId: true,
                version: true, // <-- AÑADIDO: Seleccionar versión

                CategoriaTarea: {
                    select: {
                        nombre: true,
                        color: true
                    }
                },
                tareaFuncion: {
                    select: {
                        id: true,
                        // nombreVisible: true
                    }
                },
                etiquetas: {
                    select: {
                        etiquetaTarea: {
                            select: {
                                id: true,
                                nombre: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        TareaGaleria: true,
                        TareaEjecutada: true,
                        AsistenteTareaSuscripcion: true // <-- AÑADIDO: Conteo de asistentes suscritos
                    }
                }
            }
        });

        // El tipo TareaConDetalles ya debe ser compatible con esta estructura
        return { success: true, data: tareas as unknown as TareaConDetalles[] };

    } catch (error: unknown) {
        console.error('Error fetching tasks with details:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido al obtener tareas.';
        return { success: false, error: `No se pudieron obtener las tareas: ${errorMessage}` };
    }
}

// ... (el resto de tus funciones en tareas.actions.ts: actualizarOrdenTareas, obtenerCategoriasParaFiltro, crearTarea, etc., se mantienen igual que en tu archivo original)
// Asegúrate de copiar el resto de tus funciones aquí si este es el archivo completo.
// Por ejemplo, la función actualizarOrdenTareas:
export async function actualizarOrdenTareas(tareasOrdenadas: OrdenarTareasInput): Promise<ActionResult> {
    if (!Array.isArray(tareasOrdenadas)) {
        return { success: false, error: "Datos de ordenamiento inválidos." };
    }
    try {
        const actualizaciones = tareasOrdenadas.map(tarea =>
            prisma.tarea.update({
                where: { id: tarea.id },
                data: { orden: tarea.orden }
            })
        );
        await prisma.$transaction(actualizaciones);
        console.log('Orden de tareas actualizado correctamente');
        return { success: true, data: null };
    } catch (error: unknown) {
        console.error('Error al actualizar el orden de las tareas:', error);
        let errorMessage = 'Error desconocido al actualizar orden.';
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            errorMessage = `Error de base de datos: ${error.code}`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: `Error al actualizar orden: ${errorMessage}` };
    }
}

export async function obtenerCategoriasParaFiltro(): Promise<ActionResult<CategoriaTareaSimple[]>> {
    try {
        const categorias = await prisma.categoriaTarea.findMany({
            select: {
                id: true,
                nombre: true,
                color: true
            },
            orderBy: {
                orden: 'asc',
            }
        });
        return { success: true, data: categorias };
    } catch (error: unknown) {
        console.error('Error al obtener categorías para filtro:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
        return { success: false, error: `No se pudieron obtener las categorías: ${errorMessage}` };
    }
}

// ... (y así sucesivamente para el resto de tus funciones)
export async function crearTarea(
    inputData: CrearTareaBasicaInput
): Promise<ActionResult<Tarea>> {
    try {
        if (!inputData.nombre?.trim()) return { success: false, error: "Nombre es requerido." };
        if (!inputData.categoriaTareaId) return { success: false, error: "Categoría es requerida." };
        if (!inputData.canalConversacionalId) return { success: false, error: "Canal principal es requerido." };

        const ultimoOrden = await prisma.tarea.aggregate({
            _max: { orden: true },
            where: { categoriaTareaId: inputData.categoriaTareaId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        const dataToCreate: Prisma.TareaCreateInput = {
            nombre: inputData.nombre.trim(),
            CategoriaTarea: { connect: { id: inputData.categoriaTareaId } },
            orden: nuevoOrden,
            version: 1.0,
            status: 'activo',
        };

        const nuevaTarea = await prisma.$transaction(async (tx) => {
            const tareaCreada = await tx.tarea.create({ data: dataToCreate });
            await tx.tareaCanal.create({
                data: {
                    tareaId: tareaCreada.id,
                    canalConversacionalId: inputData.canalConversacionalId,
                }
            });
            return tareaCreada;
        });
        return { success: true, data: nuevaTarea as Tarea };
    } catch (error: unknown) {
        console.error('Error al crear la tarea:', error);
        let errorMessage = 'Error desconocido al crear tarea.';
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            errorMessage = `El nombre de tarea '${inputData.nombre}' ya existe.`;
        } else if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}

export async function obtenerCanalesActivos(): Promise<ActionResult<CanalConversacionalSimple[]>> {
    try {
        const canales = await prisma.canalConversacional.findMany({
            where: { status: 'activo' },
            select: {
                id: true,
                nombre: true,
            },
            orderBy: {
                orden: 'asc',
            }
        });
        return { success: true, data: canales };
    } catch (error: unknown) {
        console.error('Error al obtener canales activos:', error);
        const errorMessage = error instanceof Error ? error.message : 'Error desconocido.';
        return { success: false, error: `No se pudieron obtener los canales activos: ${errorMessage}` };
    }
}