// // Ruta: src/app/admin/_lib/tareaFuncion.actions.ts
// 'use server';
// import prisma from './prismaClient'; // Ajusta ruta
// import {
//     TareaFuncion,
//     ParametroRequerido,
//     // CrearFuncionData, // Eliminamos esta importación del ./types global
//     // EditarFuncionData, // Eliminamos esta importación del ./types global
//     TareaFuncionParametroRequerido,
// } from './types'; // Los tipos base TareaFuncion, ParametroRequerido, etc., se mantienen desde aquí
// import { Prisma } from '@prisma/client';
// import { revalidatePath } from 'next/cache';
// import { FuncionConDetalles } from './tareaFuncion.type'; // Importamos el tipo específico para la función

// // --- NUEVAS IMPORTACIONES DE TIPOS ESPECÍFICOS DE LA ENTIDAD ---
// import {
//     CrearTareaFuncionInput,
//     EditarTareaFuncionInput
// } from './tareaFuncion.type'; // Importamos los tipos desde el archivo dedicado

// // --- Funciones (Lógica interna sin cambios) ---

// export async function obtenerFuncionesTareaConParametros(): Promise<(TareaFuncion & { _count?: { tareas?: number }, parametrosRequeridos?: (TareaFuncionParametroRequerido & { parametroRequerido?: Pick<ParametroRequerido, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null })[] })[]> {
//     try {
//         const funciones = await prisma.tareaFuncion.findMany({
//             orderBy: { nombreVisible: 'asc' }, // En tu código original era 'orden', pero el schema no lo tiene. Usaré 'nombreVisible'.
//             include: {
//                 parametrosRequeridos: {
//                     include: {
//                         parametroRequerido: {
//                             select: {
//                                 id: true,
//                                 nombreVisible: true,
//                                 nombreInterno: true,
//                                 tipoDato: true,
//                             }
//                         }
//                     }
//                 },
//                 _count: { select: { tareas: true } }
//             }
//         });
//         return funciones as (TareaFuncion & {
//             _count?: { tareas?: number },
//             parametrosRequeridos?: (TareaFuncionParametroRequerido & {
//                 parametroRequerido?: Pick<ParametroRequerido, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null
//             })[]
//         })[];
//     } catch (error) {
//         console.error('Error fetching task functions:', error);
//         throw new Error('No se pudieron obtener las funciones de tarea.');
//     }
// }

// export async function obtenerParametrosRequeridosDisponibles(): Promise<ParametroRequerido[]> {
//     try {
//         const parametros = await prisma.parametroRequerido.findMany({
//             orderBy: { orden: 'asc' },
//         });
//         return parametros as ParametroRequerido[];
//     } catch (error) {
//         console.error('Error fetching available parameters:', error);
//         throw new Error('No se pudieron obtener los parámetros disponibles.');
//     }
// }

// // --- Crear Función Tarea (Firma actualizada) ---
// export async function crearFuncionTarea(
//     data: CrearTareaFuncionInput // <-- TIPO ACTUALIZADO
// ): Promise<{ success: boolean; data?: TareaFuncion; error?: string }> {
//     try {
//         if (!data.nombreInterno?.trim() || !data.nombreVisible?.trim()) {
//             return { success: false, error: "Nombre interno y visible son requeridos." };
//         }
//         // Comentado según tu código original
//         // if (!/^[a-z0-9_]+$/.test(data.nombreInterno)) {
//         //     return { success: false, error: "Nombre interno solo puede contener minúsculas, números y guion bajo." };
//         // }

//         const nuevaFuncion = await prisma.$transaction(async (tx) => {
//             const funcionCreada = await tx.tareaFuncion.create({
//                 data: {
//                     nombreInterno: data.nombreInterno.trim(),
//                     nombreVisible: data.nombreVisible.trim(),
//                     descripcion: data.descripcion?.trim() || null,
//                     // 'orden' no se maneja aquí en tu lógica original
//                 },
//             });

//             if (data.parametros && data.parametros.length > 0) {
//                 await tx.tareaFuncionParametroRequerido.createMany({
//                     data: data.parametros.map(p => ({
//                         tareaFuncionId: funcionCreada.id,
//                         parametroRequeridoId: p.parametroRequeridoId,
//                         esObligatorio: p.esObligatorio,
//                     })),
//                     skipDuplicates: true, // Mantener según tu lógica original
//                 });
//             }
//             return funcionCreada;
//         });

//         // Lógica para obtener la función completa después de crearla (original)
//         const funcionCompleta = await obtenerFuncionTareaPorId(nuevaFuncion.id);
//         // El casteo a TareaFuncion aquí asume que la estructura de funcionCompleta es compatible.
//         // Los campos createdAt/updatedAt en los parámetros anidados son un detalle de tu casteo original.
//         return {
//             success: true,
//             data: {
//                 ...funcionCompleta,
//                 parametrosRequeridos: funcionCompleta?.parametrosRequeridos?.map(pr => ({
//                     ...pr,
//                     parametroRequerido: pr.parametroRequerido ? { // Verificar si parametroRequerido existe
//                         ...pr.parametroRequerido,
//                         // Los campos createdAt y updatedAt no están en el select de obtenerFuncionTareaPorId para parametroRequerido.
//                         // Si son necesarios, deben añadirse al select o el tipo TareaFuncion debe reflejar que son opcionales.
//                         // Por ahora, se omite para evitar errores si no existen.
//                         // createdAt: new Date(), 
//                         // updatedAt: new Date()  
//                     } : null // Mantener null si no existe
//                 }))
//             } as TareaFuncion
//         };
//     } catch (error) {
//         console.error('Error creating task function:', error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
//             return { success: false, error: `El nombre interno '${data.nombreInterno}' ya existe.` };
//         }
//         return { success: false, error: (error as Error).message || "Error desconocido al crear función." };
//     }
// }


// // --- Editar Función Tarea (Firma actualizada) ---
// export async function editarFuncionTarea(
//     id: string,
//     data: EditarTareaFuncionInput // <-- TIPO ACTUALIZADO
// ): Promise<{ success: boolean; data?: TareaFuncion; error?: string }> {
//     try {
//         if (!id) return { success: false, error: "ID de función no proporcionado." };

//         const dataToUpdate: Prisma.TareaFuncionUpdateInput = {};
//         if (data.nombreVisible !== undefined) dataToUpdate.nombreVisible = data.nombreVisible.trim();
//         if (data.descripcion !== undefined) dataToUpdate.descripcion = data.descripcion?.trim() || null;

//         if (dataToUpdate.nombreVisible === '') { // Validación original
//             return { success: false, error: "El nombre visible no puede estar vacío." };
//         }

//         await prisma.$transaction(async (tx) => {
//             if (Object.keys(dataToUpdate).length > 0) {
//                 await tx.tareaFuncion.update({
//                     where: { id },
//                     data: dataToUpdate,
//                 });
//             }

//             // Manejo de parámetros (lógica original)
//             if (data.parametros !== undefined) {
//                 await tx.tareaFuncionParametroRequerido.deleteMany({
//                     where: { tareaFuncionId: id }
//                 });
//                 if (data.parametros.length > 0) {
//                     await tx.tareaFuncionParametroRequerido.createMany({
//                         data: data.parametros.map(p => ({
//                             tareaFuncionId: id,
//                             parametroRequeridoId: p.parametroRequeridoId,
//                             esObligatorio: p.esObligatorio,
//                         })),
//                     });
//                 }
//             }
//         });

//         const funcionCompleta = await obtenerFuncionTareaPorId(id);
//         if (funcionCompleta) {
//             return {
//                 success: true,
//                 data: {
//                     ...funcionCompleta,
//                     parametrosRequeridos: funcionCompleta.parametrosRequeridos?.map(pr => ({
//                         ...pr,
//                         parametroRequerido: {
//                             ...pr.parametroRequerido,
//                             createdAt: new Date(), // Replace with actual value if available
//                             updatedAt: new Date()  // Replace with actual value if available
//                         }
//                     }))
//                 } as TareaFuncion
//             };
//         }
//         return { success: false, error: "Función no encontrada." };

//     } catch (error) {
//         console.error(`Error updating task function ${id}:`, error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002' && data.nombreVisible) {
//             return { success: false, error: `El nombre visible '${data.nombreVisible}' ya está en uso.` };
//         }
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
//             return { success: false, error: `Función con ID ${id} no encontrada.` };
//         }
//         return { success: false, error: (error as Error).message || "Error desconocido al editar función." };
//     }
// }

// // --- Eliminar Función (Lógica original) ---
// export async function eliminarFuncionTarea(id: string): Promise<{ success: boolean; error?: string }> {
//     try {
//         if (!id) return { success: false, error: "ID de función no proporcionado." };

//         const tareasAsociadasCount = await prisma.tarea.count({
//             where: { tareaFuncionId: id },
//         });

//         if (tareasAsociadasCount > 0) {
//             return { success: false, error: `No se puede eliminar: ${tareasAsociadasCount} tarea(s) usan esta función.` };
//         }

//         await prisma.tareaFuncion.delete({ where: { id } });
//         return { success: true };
//     } catch (error) {
//         console.error(`Error deleting task function ${id}:`, error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
//             return { success: false, error: `Función con ID ${id} no encontrada.` };
//         }
//         return { success: false, error: (error as Error).message || 'Error desconocido al eliminar función.' };
//     }
// }

// // Helper para obtener una función por ID (Lógica original, con select ajustado)
// async function obtenerFuncionTareaPorId(id: string) {
//     return await prisma.tareaFuncion.findUnique({
//         where: { id },
//         include: {
//             parametrosRequeridos: {
//                 include: {
//                     parametroRequerido: {
//                         select: {
//                             id: true,
//                             nombreVisible: true,
//                             nombreInterno: true,
//                             tipoDato: true
//                             // 'descripcion' no estaba en tu select original para esta helper
//                         }
//                     }
//                 }
//             },
//             _count: { select: { tareas: true } }
//         }
//     });
// }

// // --- Actualizar Orden de las Funciones (Lógica original) ---
// export async function actualizarOrdenFunciones(
//     funcionesOrdenadas: { id: string; orden: number }[]
// ): Promise<{ success: boolean; error?: string }> {
//     try {
//         if (!funcionesOrdenadas || funcionesOrdenadas.length === 0) {
//             return { success: true };
//         }

//         await prisma.$transaction(
//             funcionesOrdenadas.map((func, index) =>
//                 prisma.tareaFuncion.update({
//                     where: { id: func.id },
//                     // Tu schema de TareaFuncion no tiene 'orden', así que esta parte no haría nada.
//                     // Si 'orden' se añade al schema, esto funcionaría.
//                     // Por ahora, lo dejo como en tu original, aunque 'orden' no exista en el schema que me pasaste.
//                     data: { orden: index },
//                 })
//             )
//         );
//         // revalidatePath('/admin/tareas/funciones'); // Ajusta la ruta según corresponda

//         return { success: true };
//     } catch (error) {
//         console.error('Error updating task function order:', error);
//         return { success: false, error: (error as Error).message || 'Error desconocido al actualizar el orden.' };
//     }
// }

// // --- Asociar/Desasociar Función a Tarea (Lógica original) ---
// export async function asociarFuncionATarea(
//     tareaId: string,
//     funcionId: string | null
// ): Promise<{ success: boolean; error?: string }> {
//     try {
//         if (!tareaId) return { success: false, error: "ID de tarea no proporcionado." };

//         await prisma.tarea.update({
//             where: { id: tareaId },
//             data: { tareaFuncionId: funcionId },
//         });

//         revalidatePath(`/admin/tareas/${tareaId}`);
//         revalidatePath('/admin/tareas');

//         return { success: true };
//     } catch (error) {
//         console.error(`Error al ${funcionId ? 'asociar' : 'desasociar'} función para tarea ${tareaId}:`, error);
//         return { success: false, error: `Error al actualizar la tarea: ${error instanceof Error ? error.message : 'Error desconocido'}` };
//     }
// }

// // --- Obtener Función de Tarea (Lógica original, con tipo de retorno ajustado) ---
// // El tipo FuncionConDetalles es el que definimos en tareaFuncion.type.ts
// type FuncionConDetallesParaAction = TareaFuncion & {
//     parametrosRequeridos?: (TareaFuncionParametroRequerido & {
//         parametroRequerido?: Pick<ParametroRequerido, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato' | 'descripcion'> | null
//     })[]
// };

// export async function obtenerFuncionDeTarea(tareaId: string): Promise<FuncionConDetallesParaAction | null> {
//     try {
//         if (!tareaId) return null;
//         const tarea = await prisma.tarea.findUnique({
//             where: { id: tareaId },
//             select: {
//                 tareaFuncion: {
//                     include: {
//                         parametrosRequeridos: {
//                             include: {
//                                 parametroRequerido: {
//                                     select: {
//                                         id: true,
//                                         nombreVisible: true,
//                                         nombreInterno: true,
//                                         tipoDato: true,
//                                         descripcion: true,
//                                     }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         });
//         // El casteo aquí asume que la estructura devuelta por Prisma es compatible.
//         return tarea?.tareaFuncion as FuncionConDetallesParaAction | null;
//     } catch (error) {
//         console.error(`Error fetching function for tarea ${tareaId}:`, error);
//         throw new Error('No se pudo obtener la función asociada a la tarea.');
//     }
// }


// // --- NUEVA SERVER ACTION EXPORTADA ---
// // Obtiene los detalles de una TareaFuncion específica por su ID
// export async function obtenerFuncionTareaDetallesPorId(id: string): Promise<FuncionConDetalles | null> {
//     try {
//         if (!id) return null;
//         const funcion = await prisma.tareaFuncion.findUnique({
//             where: { id },
//             include: {
//                 parametrosRequeridos: {
//                     include: {
//                         parametroRequerido: {
//                             select: {
//                                 id: true,
//                                 nombreVisible: true,
//                                 nombreInterno: true,
//                                 tipoDato: true,
//                                 descripcion: true // Incluimos descripción para el form de edición
//                             }
//                         }
//                     }
//                 },
//                 _count: { select: { tareas: true } }
//             }
//         });
//         if (!funcion) return null;
//         // Aseguramos que el tipo de retorno sea compatible con FuncionConDetalles
//         return funcion as unknown as FuncionConDetalles;
//     } catch (error) {
//         console.error(`Error fetching task function details for ID ${id}:`, error);
//         throw new Error('No se pudieron obtener los detalles de la función de tarea.');
//     }
// }