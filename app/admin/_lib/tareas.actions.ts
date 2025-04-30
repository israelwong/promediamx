'use server'
import prisma from './prismaClient'
import { Prisma } from '@prisma/client'
import { mejorarTareaConGemini } from '@/scripts/gemini/mejorarTarea' // Ajusta la ruta según tu estructura
import {
    Tarea,
    TareaFuncion,
    ParametroRequerido,
    CrearTareaBasicaInput,
    ActualizarTareaConRelacionesInput,
    TareaParaEditar,
    SugerenciasTarea,
    // TareaConDetalles
} from './types'

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
                descripcion: true,
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


// --- Crear Tarea (Versión Ultra-Simplificada) ---
export async function crearTarea(
    inputData: CrearTareaBasicaInput
): Promise<{ success: boolean; data?: Tarea; error?: string }> {
    try {
        // 1. Validación estricta en el servidor
        if (!inputData.nombre?.trim()) return { success: false, error: "Nombre es requerido." };
        if (!inputData.categoriaTareaId) return { success: false, error: "Categoría es requerida." };
        if (!inputData.canalConversacionalId) return { success: false, error: "Canal principal es requerido." };

        // 2. Calcular orden (dentro de la categoría)
        const ultimoOrden = await prisma.tarea.aggregate({
            _max: { orden: true },
            where: { categoriaTareaId: inputData.categoriaTareaId }
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? -1) + 1;

        // 3. Construir objeto de datos *mínimo* para Prisma.TareaCreateInput
        const dataToCreate: Prisma.TareaCreateInput = {
            nombre: inputData.nombre.trim(),
            CategoriaTarea: { connect: { id: inputData.categoriaTareaId } },
            orden: nuevoOrden,
            version: 1.0, // Valor inicial por defecto
            status: 'activo', // Valor inicial por defecto
            // El resto de campos (descripcion, funcion, instruccion, etc.) quedan null/default
        };

        // 4. Ejecutar transacción para crear Tarea y asociar Canal Principal
        const nuevaTarea = await prisma.$transaction(async (tx) => {
            // Crear la Tarea base
            const tareaCreada = await tx.tarea.create({ data: dataToCreate });

            // Asociar el canal principal (obligatorio)
            await tx.tareaCanal.create({
                data: {
                    tareaId: tareaCreada.id,
                    canalConversacionalId: inputData.canalConversacionalId,
                }
            });
            // No se asocian etiquetas ni función aquí

            return tareaCreada;
        });

        // 5. Devolver resultado
        return { success: true, data: nuevaTarea as Tarea };

    } catch (error: unknown) {
        console.error('Error al crear la tarea:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Asumiendo que 'nombre' es unique
            return { success: false, error: `El nombre de tarea '${inputData.nombre}' ya existe.` };
        }
        return { success: false, error: error instanceof Error ? error.message : 'Error desconocido' };
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
            descripcion: data.descripcion?.trim() ?? null,
            instruccion: data.instruccion?.trim() ?? null,
            trigger: data.trigger?.trim() ?? null,
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
                throw new Error(`El nombre de tarea '${data.nombre}' o el trigger '${data.trigger}' ya existen.`);
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

        const suscripcionesCount = await prisma.asistenteTareaSuscripcion.count({
            where: { tareaId: tareaId }
        });

        if (suscripcionesCount > 0) {
            return { success: false, error: `No se puede eliminar: ${suscripcionesCount} asistente(s) están suscritos a esta tarea.` };
        }

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
                tareaFuncion: { select: { id: true, nombreVisible: true } },
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


// --- Mejorar Tarea con Gemini ---
// (Sin cambios funcionales aquí, pero la obtención de parámetros ya está actualizada)
// Interfaz auxiliar para las sugerencias (sin cambios)

// --- Tipo para los parámetros (Añadir a types.ts si no existe) ---
// Definición necesaria para el mapeo
interface ParametroInput {
    nombre: string;
    tipoDato: string;
    descripcion?: string | null;
    esRequerido: boolean; // Incluir si se necesita enviar a Gemini
}
// ---------------------------------------------------------------

// --- Tipo para los parámetros (Añadir a types.ts si no existe) ---
// Definición necesaria para el mapeo
interface ParametroInput {
    nombre: string;
    tipoDato: string;
    descripcion?: string | null;
    esRequerido: boolean; // Incluir si se necesita enviar a Gemini
}
// ---------------------------------------------------------------

// Esta es la función que se llama desde el componente TareaEditarForm
export async function mejorarTareaGemini(tareaId: string): Promise<SugerenciasTarea | null> {

    try {
        console.log('Inicio de solicitud de mejora para tarea ID:', tareaId);

        // 1. Obtener datos de la tarea y sus relaciones
        const tarea = await prisma.tarea.findUnique({
            where: { id: tareaId },
            include: {
                CategoriaTarea: { select: { nombre: true } },
                tareaFuncion: {
                    include: {
                        parametrosRequeridos: {
                            select: {
                                esObligatorio: true,
                                parametroRequerido: {
                                    select: { nombreInterno: true, tipoDato: true, descripcion: true, nombreVisible: true }
                                }
                            }
                        }
                    }
                },
            }
        });

        if (!tarea) {
            throw new Error('La tarea no existe');
        }

        // 2. Mapear parámetros estándar (si existen)
        const parametrosEstandar: ParametroInput[] = tarea.tareaFuncion?.parametrosRequeridos.map(
            (p) => ({
                nombre: p.parametroRequerido?.nombreInterno ?? 'desconocido',
                tipoDato: p.parametroRequerido?.tipoDato ?? 'texto',
                descripcion: p.parametroRequerido?.descripcion ?? p.parametroRequerido?.nombreVisible ?? '',
                esRequerido: p.esObligatorio ?? false,
            })
        ) || [];

        const todosLosParametros = parametrosEstandar; // Por ahora solo estándar

        // 3. Preparar datos para la función que llama a Gemini
        const dataParaGemini = {
            nombre_tarea: tarea.nombre,
            descripcion_tarea: tarea.descripcion ?? null,
            nombre_categoria: tarea.CategoriaTarea?.nombre ?? null,
            rol_asignado: tarea.rol ?? null,
            personalidad_asistente: tarea.personalidad ?? null,
            nombre_funcion_automatizacion: tarea.tareaFuncion?.nombreInterno ?? null,
            parametros: todosLosParametros,
            instruccion_a_mejorar: tarea.instruccion?.trim() ?? null
        };

        console.log('Datos preparados para enviar a mejorarTareaConGemini:', JSON.stringify(dataParaGemini, null, 2));

        // 4. Llamar a la función que interactúa con Gemini
        // Asumimos que esta función ahora devuelve el OBJETO PARSEADO o null
        const sugerenciasObjeto = await mejorarTareaConGemini( // Renombrado de sugerenciasString
            dataParaGemini.nombre_tarea,
            dataParaGemini.descripcion_tarea,
            dataParaGemini.nombre_categoria,
            dataParaGemini.rol_asignado,
            dataParaGemini.personalidad_asistente,
            dataParaGemini.nombre_funcion_automatizacion,
            dataParaGemini.parametros,
            dataParaGemini.instruccion_a_mejorar
        );

        // 5. Validar y devolver las sugerencias (ya no se necesita parsear)
        if (sugerenciasObjeto) {
            console.log('Sugerencias recibidas (objeto):', sugerenciasObjeto);
            // Validar estructura básica del objeto recibido
            if (typeof sugerenciasObjeto.sugerencia_instruccion === 'undefined' ||
                typeof sugerenciasObjeto.sugerencia_descripcion === 'undefined' || // Añadir checks para otras claves
                typeof sugerenciasObjeto.sugerencia_rol === 'undefined' ||
                typeof sugerenciasObjeto.sugerencia_personalidad === 'undefined') {
                console.error("El objeto recibido de mejorarTareaConGemini no tiene la estructura esperada:", sugerenciasObjeto);
                throw new Error("La respuesta de mejora no contiene la estructura esperada.");
            }
            // El objeto ya es del tipo SugerenciasTarea (o compatible)
            return sugerenciasObjeto;
        } else {
            console.warn("mejorarTareaConGemini devolvió null.");
            return null; // Devolver null si no hubo respuesta
        }

    } catch (error: unknown) {
        // 6. Manejo de errores
        console.error('Error en el proceso de mejorar tarea (acción intermediaria):', error);
        // Relanzar el error para que el componente lo capture
        throw new Error(`Error al solicitar mejora: ${error instanceof Error ? error.message : 'Error desconocido'}`);
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

// --- Actualizar Orden Tareas (sin cambios) ---
export async function actualizarOrdenTareas(tareasOrdenadas: { id: string; orden: number }[]) {
    try {
        const actualizaciones = tareasOrdenadas.map((tarea, index) =>
            prisma.tarea.update({ where: { id: tarea.id }, data: { orden: index } })
        );
        await prisma.$transaction(actualizaciones);
        console.log('Orden de tareas actualizado correctamente');
        return { success: true };
    } catch (error) {
        console.error('Error al actualizar el orden de las tareas:', error);
        return { success: false, error: `Error al actualizar orden: ${error instanceof Error ? error.message : 'Error desconocido'}` };
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

// --- Funciones de validación de Trigger (sin cambios) ---
export async function validarNombreActivadorTarea(nombreActivador: string) {
    try { return await prisma.tarea.findFirst({ where: { trigger: nombreActivador } }); }
    catch (error) { console.error(error); throw new Error('Error al validar el nombre del activador'); }
}
export async function validarYActualizarTriggerTarea(tareaId: string, nuevoTrigger: string) {
    try {
        const triggerLimpio = nuevoTrigger.trim();
        if (!triggerLimpio) {
            return await prisma.tarea.update({ where: { id: tareaId }, data: { trigger: null } });
        }
        const tareaExistente = await prisma.tarea.findFirst({ where: { trigger: triggerLimpio, id: { not: tareaId } } });
        if (tareaExistente) throw new Error('El nombre del trigger ya está en uso.');
        return await prisma.tarea.update({ where: { id: tareaId }, data: { trigger: triggerLimpio } });
    } catch (error) { console.error(error); throw error; }
}

// --- OBTENER FUNCIONES TAREA DISPONIBLES (sin cambios) ---
export async function obtenerFuncionesTareaDisponibles(): Promise<Pick<TareaFuncion, 'id' | 'nombreVisible' | 'nombreInterno'>[]> {
    try {
        return await prisma.tareaFuncion.findMany({
            orderBy: { nombreVisible: 'asc' },
            select: { id: true, nombreVisible: true, nombreInterno: true }
        });
    } catch (error) { console.error(error); throw new Error('No se pudieron obtener las funciones disponibles.'); }
}

// --- OBTENER PARÁMETROS DE UNA FUNCIÓN ESPECÍFICA (sin cambios) ---
// Asegúrate que ParametroRequerido en types.ts está actualizado
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

// En tareas.actions.ts
export async function obtenerTareasConDetalles() {
    try {
        const tareas = await prisma.tarea.findMany({
            // Ordenar por el campo 'orden' si existe, si no por nombre
            orderBy: [{ orden: 'asc' }, { nombre: 'asc' }],
            include: {
                CategoriaTarea: { select: { nombre: true } },
                tareaFuncion: { select: { id: true, nombreVisible: true } },
                etiquetas: { include: { etiquetaTarea: { select: { id: true, nombre: true } } } },
                canalesSoportados: { include: { canalConversacional: { select: { id: true, nombre: true, icono: true } } } },
                _count: {
                    select: {
                        AsistenteTareaSuscripcion: true,
                        TareaGaleria: true, // <-- AÑADIR ESTA LÍNEA
                        TareaEjecutada: true // <-- AÑADIR ESTA LÍNEA
                    }
                }
            }
        });
        // El tipo devuelto ahora debe coincidir con TareaConDetalles actualizado
        return tareas; // Prisma debería inferir el tipo correctamente ahora
    } catch (error) {
        console.error('Error fetching tasks with details:', error);
        throw new Error('No se pudieron obtener las tareas.');
    }
}


// --- Obtener Tareas con detalles (Categoría, Función, Etiquetas, Canales) ---
// ACTUALIZADO: Usa el tipo de retorno específico TareaConDetalles[]
// export async function obtenerTareasConDetalles(): Promise<TareaConDetalles[]> {
//     try {
//         const tareas = await prisma.tarea.findMany({
//             orderBy: {
//                 // Ordenar por 'orden' si existe, si no por 'nombre' o 'createdAt'
//                 orden: 'asc',
//             },
//             include: {
//                 CategoriaTarea: { select: { nombre: true } }, // Solo nombre
//                 tareaFuncion: { select: { id: true, nombreVisible: true } }, // Solo id y nombreVisible
//                 etiquetas: { // Incluir la tabla de unión
//                     include: {
//                         etiquetaTarea: { // Incluir la etiqueta real
//                             select: { id: true, nombre: true } // Solo id y nombre de la etiqueta
//                         }
//                     }
//                 },
//                 canalesSoportados: { // Incluir la tabla de unión
//                     include: {
//                         canalConversacional: { // Incluir el canal real
//                             select: { id: true, nombre: true, icono: true } // id, nombre e icono del canal
//                         }
//                     }
//                 },
//                 // Contar suscripciones para validación de borrado
//                 _count: { select: { AsistenteTareaSuscripcion: true } }
//             }
//         });
//         // El tipo devuelto por Prisma ahora debería coincidir con TareaConDetalles
//         // Ya no es necesario un casteo inseguro 'as Tarea[]'
//         return tareas as TareaConDetalles[];
//     } catch (error) {
//         console.error('Error al obtener tareas con detalles:', error);
//         throw new Error('Error al obtener las tareas');
//     }
// }