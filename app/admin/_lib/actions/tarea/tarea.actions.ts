// Ruta de este archivo: app/admin/_lib/actions/tarea/tarea.actions.ts
'use server';

import { z } from 'zod'; // Asegúrate de tener zod instalado

import prisma from '@/app/admin/_lib/prismaClient'; // Ajusta la ruta si es diferente
import { revalidatePath } from 'next/cache'; // Para revalidar rutas en Next.js
import { Prisma } from '@prisma/client'; // Importa Prisma para manejar errores específicos
import type { Tarea as TareaPrisma } from '@prisma/client'; // Importar tipos Prisma


import type { ActionResult } from '@/app/admin/_lib/types';

import {
    TareaBaseInfoData,
    tareaBaseInfoSchema,
    tareaParaMarketplaceSchema,
    TareaParaMarketplaceData,
    CrearTareaBasicaInputSchema,
    TareaCreadaOutputSchema,
    CategoriaTareaSimpleSchema,
    ActualizarTareaInputSchema,
    type CrearTareaBasicaInput,
    type TareaCreadaOutput,
    type CategoriaTareaSimple,
    TareaParaEditarSchema,
    type TareaParaEditar,
    type ActualizarTareaInput,
    ActualizarOrdenTareasPorGrupoInputSchema,
    type ActualizarOrdenTareasPorGrupoInput,
    type TareaConDetalles,
} from './tarea.schemas';

function toCamelCase(str: string): string {
    // Elimina acentos y caracteres especiales, deja solo letras/números/espacios
    const sinAcentos = str.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const cleanedStr = sinAcentos.replace(/[^\w\s]/gi, '').trim();
    if (!cleanedStr) return 'funcionGenerica';
    return cleanedStr
        .split(/\s+/)
        .map((word, index) => {
            if (index === 0) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('');
}

// --- NUEVA ACCIÓN PARA CREAR TAREA BÁSICA (Paso 1) ---
export async function crearTareaBasica(
    input: CrearTareaBasicaInput // Usamos el tipo inferido de Zod
): Promise<ActionResult<TareaCreadaOutput>> {
    try {
        // La validación con Zod se hace al inicio de la función o en el componente.
        // Si se pasa un `input` ya validado, se puede omitir aquí.
        // Por robustez, si el input no viene pre-validado, se haría aquí:
        const validationResult = CrearTareaBasicaInputSchema.safeParse(input);
        if (!validationResult.success) {
            console.error('Error de validación en crearTareaBasica (action):', validationResult.error.flatten().fieldErrors);
            return {
                success: false,
                error: 'Datos de entrada inválidos para la acción.', // Mensaje más genérico para el cliente
                validationErrors: validationResult.error.flatten().fieldErrors,
            };
        }

        const { nombre, categoriaTareaId } = validationResult.data;
        const nombreFuncionCamelCase = toCamelCase(nombre);

        const nuevaTarea = await prisma.$transaction(async (tx) => {
            const tarea = await tx.tarea.create({
                data: {
                    nombre: nombre,
                    categoriaTareaId: categoriaTareaId,
                    status: 'activo',
                    version: 1,
                },
                select: { id: true, nombre: true }
            });

            await tx.tareaFuncion.create({
                data: {
                    nombre: nombreFuncionCamelCase, // Asumiendo que TareaFuncion.nombre es @unique
                    tareaId: tarea.id,
                }
            });
            return tarea;
        });

        revalidatePath('/admin/tareas');

        // Validar la salida es una buena práctica pero si el `select` es simple, es menos crítico.
        const outputValidation = TareaCreadaOutputSchema.safeParse(nuevaTarea);
        if (!outputValidation.success) {
            console.warn('Advertencia de validación en la salida de crearTareaBasica:', outputValidation.error.flatten());
            // Devolver los datos crudos si la creación fue exitosa pero el mapeo falló por alguna razón
            return { success: true, data: { id: nuevaTarea.id, nombre: nuevaTarea.nombre } };
        }
        return { success: true, data: outputValidation.data };

    } catch (error: unknown) { // Especificar 'unknown' es mejor que 'any'
        console.error('Error en crearTareaBasica:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                if (error.meta?.target && (error.meta.target as string[]).includes('nombre')) {
                    return { success: false, error: `El nombre de tarea '${input.nombre}' o su función derivada ya existe.` };
                }
            }
            return { success: false, error: `Error de base de datos: ${error.message}` };
        }
        return { success: false, error: 'Error desconocido al crear la tarea.' };
    }
}

// Acción para obtener las tareas marcadas como "por defecto" y activas
export async function obtenerTareasBaseAction(): Promise<ActionResult<TareaBaseInfoData[]>> {
    try {
        const tareasPrisma = await prisma.tarea.findMany({
            where: {
                esTareaPorDefecto: true, // Usamos el nuevo campo
                status: 'activo'
            },
            select: {
                id: true,
                nombre: true,
                // descripcion: true
            },
            orderBy: {
                orden: 'asc' // O por nombre, o como prefieras
            }
        });

        // Validar cada tarea con el schema (opcional pero buena práctica)
        const parsedTareas = z.array(tareaBaseInfoSchema).safeParse(tareasPrisma);
        if (!parsedTareas.success) {
            console.error("Error de validación en obtenerTareasBaseAction:", parsedTareas.error.flatten());
            return { success: false, error: "Error al procesar los datos de las tareas base." };
        }

        return { success: true, data: parsedTareas.data };
    } catch (error) {
        console.error("Error en obtenerTareasBaseAction:", error);
        return { success: false, error: "No se pudieron obtener las tareas base." };
    }
}


export async function obtenerTareasParaMarketplaceAction(
    // Opcional: asistenteId para saber si ya está suscrito (más complejo, hacerlo en un segundo paso si es necesario)
    // asistenteId?: string 
): Promise<ActionResult<TareaParaMarketplaceData[]>> {
    try {
        const tareasPrisma = await prisma.tarea.findMany({
            where: {
                status: 'activo' // Solo mostrar tareas activas en el marketplace
            },
            select: {
                id: true,
                nombre: true,
                descripcionMarketplace: true,
                precio: true,
                categoriaTareaId: true,
                CategoriaTarea: {
                    select: { nombre: true, /* color: true */ } // Añadir color si CategoriaTarea lo tiene y el schema lo espera
                },
                etiquetas: {
                    select: {
                        etiquetaTarea: {
                            select: { id: true, nombre: true }
                        }
                    }
                },
                _count: {
                    select: {
                        AsistenteTareaSuscripcion: { where: { status: 'activo' } }, // Contar solo suscripciones activas
                        TareaGaleria: true
                    }
                }
                // Seleccionar otros campos que TareaParaMarketplaceDataSchema espere (ej. iconoUrl, status, esTareaPorDefecto)
            },
            orderBy: [
                { orden: 'asc' },
                { nombre: 'asc' }
            ]
        });

        // Mapear para asegurar que la estructura coincida exactamente con TareaParaMarketplaceDataSchema
        // y manejar posibles nulos de relaciones.
        const tareasData = tareasPrisma.map(t => ({
            id: t.id,
            nombre: t.nombre,
            descripcion: t.descripcionMarketplace ?? null,
            precio: t.precio ?? null,
            categoriaTareaId: t.categoriaTareaId ?? null,
            CategoriaTarea: t.CategoriaTarea ? { nombre: t.CategoriaTarea.nombre } : null,
            etiquetas: t.etiquetas.map(et => ({
                etiquetaTarea: et.etiquetaTarea ? { id: et.etiquetaTarea.id, nombre: et.etiquetaTarea.nombre } : null
            })).filter(et => et.etiquetaTarea !== null) as { etiquetaTarea: { id: string; nombre: string; } }[], // Filtrar nulos y asegurar tipo
            _count: {
                AsistenteTareaSuscripcion: t._count.AsistenteTareaSuscripcion,
                TareaGaleria: t._count.TareaGaleria
            }
        }));

        const validation = z.array(tareaParaMarketplaceSchema).safeParse(tareasData);
        if (!validation.success) {
            console.error("Error de validación Zod en obtenerTareasParaMarketplaceAction:", validation.error.flatten());
            return { success: false, error: "Datos de tareas con formato inesperado." };
        }
        return { success: true, data: validation.data };

    } catch (error) {
        console.error("Error en obtenerTareasParaMarketplaceAction:", error);
        return { success: false, error: "No se pudieron obtener las tareas para el marketplace." };
    }
}


/**
 * Obtiene las categorías de tareas para ser usadas en filtros.
 */
export async function obtenerCategoriasParaFiltro(): Promise<ActionResult<z.infer<typeof CategoriaTareaSimpleSchema>[]>> {
    try {
        const categorias = await prisma.categoriaTarea.findMany({
            select: {
                id: true,
                nombre: true,
                color: true,
            },
            orderBy: {
                orden: 'asc',
            },
            where: {
                // Podrías añadir un filtro aquí si solo quieres categorías activas, por ejemplo:
                // Tarea: { some: {} } // Solo categorías que tengan al menos una tarea asociada
            }
        });
        return { success: true, data: categorias };
    } catch (error) {
        console.error('Error en obtenerCategoriasParaFiltro:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { success: false, error: `Error de base de datos: ${error.message}` };
        }
        return { success: false, error: 'Error desconocido al obtener las categorías.' };
    }
}

// --- NUEVA ACCIÓN: Actualizar Tarea ---
export async function actualizarTarea(
    id: string,
    input: ActualizarTareaInput // Tipo inferido del schema Zod actualizado
): Promise<ActionResult<TareaPrisma>> {
    console.log(`Actualizar Tarea - ID: ${id}, Input:`, input);
    if (!id) {
        return { success: false, error: "Se requiere el ID de la tarea para actualizar." };
    }

    // La validación Zod ya debería haber ocurrido en el componente antes de llamar a esta acción,
    // pero una validación aquí también es una buena práctica defensiva.
    const validationResult = ActualizarTareaInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error('Error de validación en action actualizarTarea:', validationResult.error.flatten().fieldErrors);
        return {
            success: false,
            error: "Datos de entrada inválidos.",
            validationErrors: validationResult.error.flatten().fieldErrors,
        };
    }
    // Usar los datos validados y parseados por Zod
    const data = validationResult.data;

    try {
        const tareaActual = await prisma.tarea.findUnique({
            where: { id },
            select: { nombre: true, tareaFuncion: { select: { id: true, nombre: true } } }
        });

        if (!tareaActual) {
            return { success: false, error: `Tarea con ID ${id} no encontrada.` };
        }

        const tareaActualizada = await prisma.$transaction(async (tx) => {
            const dataToUpdate: Prisma.TareaUpdateInput = {
                nombre: data.nombre,
                descripcionMarketplace: data.descripcionMarketplace,
                instruccion: data.instruccion,
                precio: data.precio,
                rol: data.rol,
                personalidad: data.personalidad,
                version: data.version, // Zod asegura que es number | null | undefined. Prisma maneja null/undefined.
                status: data.status,
                CategoriaTarea: data.categoriaTareaId
                    ? { connect: { id: data.categoriaTareaId } }
                    : undefined,
                iconoUrl: data.iconoUrl,
            };

            const updatedTarea = await tx.tarea.update({
                where: { id },
                data: dataToUpdate,
            });

            if (data.nombre !== tareaActual.nombre && tareaActual.tareaFuncion?.id) {
                const nuevoNombreFuncion = toCamelCase(data.nombre);
                if (nuevoNombreFuncion && nuevoNombreFuncion !== tareaActual.tareaFuncion.nombre) {
                    try {
                        await tx.tareaFuncion.update({
                            where: { id: tareaActual.tareaFuncion.id },
                            data: { nombre: nuevoNombreFuncion },
                        });
                    } catch (fnError: unknown) {
                        // Si el nuevo nombre de función ya existe para otra tarea, podría fallar
                        // P2002: Unique constraint failed
                        if (
                            typeof fnError === 'object' &&
                            fnError !== null &&
                            'code' in fnError &&
                            (fnError as { code?: string }).code === 'P2002'
                        ) {
                            console.warn(`Conflicto al intentar renombrar TareaFuncion para tarea ${id}: el nombre ${nuevoNombreFuncion} ya existe. Se mantiene el nombre de función anterior.`);
                            // No relanzar el error para que la tarea principal se actualice.
                            // Opcional: añadir un warning al resultado de la acción.
                        } else {
                            throw fnError; // Relanzar otros errores
                        }
                    }
                } else if (!nuevoNombreFuncion && tareaActual.tareaFuncion.nombre) {
                    console.warn(`El nuevo nombre de tarea '${data.nombre}' resultó en un nombre de función vacío. No se actualizó TareaFuncion.`);
                }
            }

            // Si canalIds se elimina del schema y del formulario, este bloque se elimina.
            // if (data.canalIds !== undefined) { // Solo modificar si se provee (puede ser array vacío)
            //     await tx.tareaCanal.deleteMany({ where: { tareaId: id } });
            //     if (data.canalIds.length > 0) {
            //         await tx.tareaCanal.createMany({
            //             data: data.canalIds.map(canalId => ({
            //                 tareaId: id,
            //                 canalConversacionalId: canalId,
            //             })),
            //         });
            //     }
            // }

            if (data.etiquetaIds !== undefined) { // Solo modificar si se provee
                await tx.tareaEtiqueta.deleteMany({ where: { tareaId: id } });
                if (data.etiquetaIds.length > 0) {
                    await tx.tareaEtiqueta.createMany({
                        data: data.etiquetaIds.map(etiquetaId => ({
                            tareaId: id,
                            etiquetaTareaId: etiquetaId,
                        })),
                    });
                }
            }
            return updatedTarea;
        });

        revalidatePath('/admin/tareas');
        revalidatePath(`/admin/tareas/${id}`);
        return { success: true, data: tareaActualizada };
    } catch (error: unknown) {
        console.error(`Error al actualizar tarea ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Asumiendo que 'nombre' es el único otro campo que podría tener un constraint unique a nivel de Tarea.
            if (error.meta?.target && (error.meta.target as string[]).includes('nombre')) {
                return { success: false, error: `El nombre de tarea '${data.nombre}' ya existe.` };
            }
        }
        return { success: false, error: `No se pudo actualizar la tarea. ${(error instanceof Error ? error.message : '')}` };
    }
}

// --- NUEVA ACCIÓN: Eliminar Tarea ---
export async function eliminarTarea(id: string): Promise<ActionResult<null>> {
    if (!id) {
        return { success: false, error: "Se requiere el ID de la tarea para eliminar." };
    }
    try {
        // Validar si hay AsistenteTareaSuscripcion (esto no se borra en cascada usualmente)
        const suscripciones = await prisma.asistenteTareaSuscripcion.count({
            where: { tareaId: id, status: 'activo' } // Contar solo suscripciones activas
        });
        if (suscripciones > 0) {
            return { success: false, error: `No se puede eliminar: ${suscripciones} asistente(s) están activamente suscritos a esta tarea.` };
        }

        // Si no hay suscripciones activas, proceder a eliminar
        // (Las suscripciones inactivas o canceladas podrían quedarse o borrarse según la lógica de negocio)
        await prisma.$transaction(async (tx) => {
            await tx.tarea.delete({ where: { id } });
        });

        revalidatePath('/admin/tareas');
        return { success: true, data: null };
    } catch (error: unknown) {
        console.error(`Error al eliminar tarea ${id}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: `Tarea con ID ${id} no encontrada.` };
        }
        return { success: false, error: `No se pudo eliminar la tarea. ${(error instanceof Error ? error.message : '')}` };
    }
}


// --- ACCIONES EXISTENTES (obtenerTareasConDetalles, obtenerCategoriasParaFiltro, actualizarOrdenTareas) ---
// Se mantienen como estaban en la propuesta anterior, asegurando que `obtenerCategoriasParaFiltro`
// se importe desde aqui o desde categoriaTarea.actions.ts consistentemente.
// Por simplicidad, la duplicaré aquí si es específica para el contexto de tareas.
// Si es genérica, se importaría.

export async function obtenerCategoriasParaDropdown(): Promise<ActionResult<CategoriaTareaSimple[]>> {
    try {
        const categoriasData = await prisma.categoriaTarea.findMany({
            select: { id: true, nombre: true, color: true, }, // color es opcional para el dropdown
            orderBy: { orden: 'asc', },
            // where: { Tarea: { some: {} } } // Opcional: Solo categorías con tareas
        });
        return { success: true, data: categoriasData.map(c => ({ id: c.id, nombre: c.nombre, color: c.color })) };
    } catch (error: unknown) {
        console.error('Error en obtenerCategoriasParaDropdown:', error);
        return { success: false, error: 'No se pudieron obtener las categorías.' };
    }
}

export async function actualizarOrdenTareas(
    input: ActualizarOrdenTareasPorGrupoInput
): Promise<ActionResult<null>> {
    const validationResult = ActualizarOrdenTareasPorGrupoInputSchema.safeParse(input);

    if (!validationResult.success) {
        console.error('Error de validación en actualizarOrdenTareas:', validationResult.error.flatten().fieldErrors);
        return {
            success: false,
            error: 'Datos de entrada inválidos para actualizar el orden.',
            validationErrors: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
        };
    }

    const { categoriaTareaId, tareasOrdenadas } = validationResult.data;

    console.log(`Actualizando orden para categoriaId: ${categoriaTareaId === null ? 'Sin Categoría' : categoriaTareaId}`);
    console.log('Tareas ordenadas:', tareasOrdenadas.map(t => ({ id: t.id, orden: t.orden })));

    try {
        // Asegurar que todas las tareas que se están ordenando realmente pertenecen
        // al grupo especificado (categoría o sin categoría).
        // Esta verificación es una capa adicional de seguridad.
        const idsTareasEnviadas = tareasOrdenadas.map(t => t.id);
        const tareasDesdeDb = await prisma.tarea.findMany({
            where: {
                id: { in: idsTareasEnviadas },
                categoriaTareaId: categoriaTareaId, // Esto asegura que todas las tareas recuperadas pertenecen al grupo correcto
            },
            select: { id: true }
        });

        if (tareasDesdeDb.length !== idsTareasEnviadas.length) {
            console.error('Error de consistencia: No todas las tareas enviadas pertenecen al grupo especificado o algunas no existen.');
            return { success: false, error: 'Error de consistencia: Algunas tareas no pertenecen al grupo especificado.' };
        }

        // Si la validación de pertenencia es exitosa (o si decides omitirla confiando en el frontend),
        // proceder con la actualización en una transacción.
        await prisma.$transaction(
            tareasOrdenadas.map((item) =>
                prisma.tarea.update({
                    where: {
                        id: item.id,
                        // No es estrictamente necesario volver a verificar categoriaTareaId aquí
                        // si ya lo hicimos arriba, pero no hace daño.
                        // categoriaTareaId: categoriaTareaId
                    },
                    data: { orden: item.orden }
                })
            )
        );

        revalidatePath('/admin/tareas');
        // Considera revalidar también la página de edición de la categoría si tienes una
        if (categoriaTareaId) {
            revalidatePath(`/admin/tareas/categorias/${categoriaTareaId}`); // Asumiendo una ruta así
        }
        console.log(`Orden actualizado exitosamente para el grupo: ${categoriaTareaId === null ? 'Sin Categoría' : categoriaTareaId}`);
        return { success: true, data: null };

    } catch (error: unknown) {
        console.error(`Error en actualizarOrdenTareas para el grupo ${categoriaTareaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Errores específicos de Prisma
            return { success: false, error: `Error de base de datos al actualizar orden: ${error.message}` };
        }
        return { success: false, error: 'Error desconocido al actualizar el orden de las tareas.' };
    }
}

// --- NUEVA ACCIÓN: Obtener Tarea por ID para Edición ---
export async function obtenerTareaPorId(id: string): Promise<ActionResult<TareaParaEditar | null>> {

    if (!id) {
        return { success: false, error: "Se requiere el ID de la tarea." };
    }
    try {


        //! SOLO ES TEMPORAL EN LO QUE SE MIGRAN LAS FUNCIONES Buscar si ya existe una TareaFuncion asociada a esta tarea
        const funcionExistente = await prisma.tareaFuncion.findFirst({
            where: { tareaId: id },
            select: { id: true, nombre: true }
        });

        // Si no existe, crear una nueva TareaFuncion con el nombre camelCase de la tarea
        if (!funcionExistente) {
            // Obtener el nombre de la tarea para generar el nombre de la función
            const tareaNombre = await prisma.tarea.findUnique({
                where: { id },
                select: { nombre: true }
            });
            if (tareaNombre?.nombre) {
                const nombreFuncion = toCamelCase(tareaNombre.nombre);
                await prisma.tareaFuncion.create({
                    data: {
                        nombre: nombreFuncion,
                        tareaId: id
                    }
                });
            }
        }

        const tarea = await prisma.tarea.findUnique({
            where: { id },
            select: {
                id: true,
                nombre: true,
                descripcionMarketplace: true,
                instruccion: true,
                precio: true,
                rol: true,
                personalidad: true,
                version: true,
                status: true,
                categoriaTareaId: true,
                iconoUrl: true,
                updatedAt: true,
                CategoriaTarea: { select: { id: true, nombre: true, color: true } },
                tareaFuncion: { select: { id: true, nombre: true } },
                etiquetas: {
                    select: {
                        etiquetaTareaId: true,
                        etiquetaTarea: { select: { id: true, nombre: true } },
                    },
                },
                canalesSoportados: {
                    select: {
                        canalConversacionalId: true,
                        canalConversacional: { select: { id: true, nombre: true, icono: true } },
                    },
                },
                _count: {
                    select: { AsistenteTareaSuscripcion: { where: { status: 'activo' } } }, // Contar solo activas
                },
            },
        });

        if (!tarea) {
            return { success: false, error: `Tarea con ID ${id} no encontrada.`, data: null };
        }

        // Validar/transformar con Zod para asegurar el tipo TareaParaEditar
        const validationResult = TareaParaEditarSchema.safeParse(tarea);
        if (!validationResult.success) {
            console.error("Error de validación Zod en obtenerTareaPorId:", validationResult.error.flatten());
            // Puedes inspeccionar validationResult.error para ver qué campo específico falló
            return { success: false, error: "Formato de datos de tarea inesperado desde la base de datos.", data: null };
        }

        return { success: true, data: validationResult.data };
    } catch (error: unknown) {
        console.error(`Error al obtener tarea ${id}:`, error);
        return { success: false, error: `No se pudo cargar la tarea. ${(error instanceof Error ? error.message : '')}`, data: null };
    }
}


export async function obtenerTareasConDetalles(): Promise<ActionResult<TareaConDetalles[]>> {
    try {
        const tareas = await prisma.tarea.findMany({
            select: {
                id: true,
                nombre: true,
                iconoUrl: true,
                precio: true,
                status: true,
                version: true, // Asegúrate que este campo exista en tu modelo Tarea y tenga el tipo correcto
                orden: true,
                categoriaTareaId: true,
                CategoriaTarea: { // Anidar la selección de CategoriaTarea
                    select: {
                        id: true,
                        nombre: true,
                        color: true,
                        // orden: true, // Descomentar si añades 'orden' a CategoriaTarea
                    }
                },
                tareaFuncion: { // Anidar la selección de tareaFuncion
                    select: {
                        id: true,
                        nombre: true // Nombre camelCase
                    }
                },
                etiquetas: {
                    select: {
                        etiquetaTarea: { // Anidar para obtener los detalles de la etiqueta
                            select: {
                                id: true,
                                nombre: true
                            }
                        }
                    }
                },
                _count: {
                    select: {
                        TareaEjecutada: true,
                        TareaGaleria: true
                    }
                },
            },
            orderBy: [
                // 1. Tareas sin categoría (categoriaTareaId IS NULL) van primero.
                //    Dentro de este grupo, se ordenan por su propio 'orden' y luego 'nombre'.
                { categoriaTareaId: { sort: 'asc', nulls: 'first' } },

                // 2. Luego, las tareas con categoría.
                //    Estas se ordenan por el 'orden' de su categoría (si existe y lo añades).
                //    Si no hay CategoriaTarea.orden, se ordenarán por CategoriaTarea.nombre.
                // { CategoriaTarea: { orden: 'asc' } }, // DESCOMENTAR SI AÑADES 'orden' a CategoriaTarea
                { CategoriaTarea: { nombre: 'asc' } }, // Ordena alfabéticamente por nombre de categoría

                // 3. Dentro de cada categoría (o el grupo sin categoría), ordenar por Tarea.orden.
                { orden: 'asc' },

                // 4. Como último criterio de desempate, por nombre de la tarea.
                { nombre: 'asc' }
            ],
        });

        // El tipo TareaConDetalles debe coincidir con la estructura de datos devuelta por esta query.
        // Prisma inferirá el tipo, pero para asegurar que coincide con tu definición explícita:
        return { success: true, data: tareas as TareaConDetalles[] };
        // Usamos 'as any as TareaConDetalles[]' temporalmente. Idealmente, el tipo inferido por Prisma
        // y tu tipo TareaConDetalles deberían ser idénticos si el 'select' es correcto.
        // Si hay errores de tipo, revisa la definición de TareaConDetalles contra el 'select'.

    } catch (error: unknown) {
        console.error('Error en obtenerTareasConDetalles:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            return { success: false, error: `Error de base de datos: ${error.message}` };
        }
        return { success: false, error: 'Error desconocido al obtener las tareas.' };
    }
}