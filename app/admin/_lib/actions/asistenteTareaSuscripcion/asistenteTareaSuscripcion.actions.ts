// app/admin/_lib/actions/asistenteTareaSuscripcion/asistenteTareaSuscripcion.actions.ts
'use server';

import { z } from 'zod'; // Asegúrate de tener zod instalado

import prisma from '@/app/admin/_lib/prismaClient';
import { revalidatePath } from 'next/cache';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    TareaSuscritaDetalleData,
    tareaSuscritaDetalleSchema,
    UpsertSuscripcionTareaInput,
    upsertSuscripcionTareaInputSchema,
    SuscripcionBasicaData,
    suscripcionBasicaDataSchema,
    TareaSuscripcionDetallesData,
    tareaSuscripcionDetallesSchema,
    SuscripcionIdentificadores, // Schema para la entrada de cancelar
    // suscripcionIdentificadoresSchema // No es necesario si el tipo es suficiente

} from './asistenteTareaSuscripcion.schemas';

import {
    SuscripcionActivaInfoData,
    suscripcionActivaInfoSchema,
    // ... otros schemas como UpsertSuscripcionTareaInput, SuscripcionBasicaData ...
} from './asistenteTareaSuscripcion.schemas';

import { Prisma } from '@prisma/client';


export async function obtenerTareasSuscritasDetalladasAction(
    asistenteId: string
): Promise<ActionResult<TareaSuscritaDetalleData[]>> {
    if (!asistenteId) {
        return { success: false, error: "ID de asistente no proporcionado." };
    }
    try {
        const suscripcionesPrisma = await prisma.asistenteTareaSuscripcion.findMany({
            where: {
                asistenteVirtualId: asistenteId,
                status: 'activo', // Solo mostrar suscripciones activas en esta lista
            },
            select: {
                id: true, // ID de la suscripción
                montoSuscripcion: true,
                tarea: {
                    select: {
                        id: true,
                        nombre: true,
                        descripcionMarketplace: true,
                        precio: true,
                        CategoriaTarea: { select: { nombre: true, color: true } }, // <-- Añadido para incluir CategoriaTarea
                        _count: {
                            select: {
                                // Contar ejecuciones específicas para este asistente y esta tarea
                                TareaEjecutada: {
                                    where: { asistenteVirtualId: asistenteId }
                                }
                            }
                        }
                    }
                }
            },
            orderBy: {
                tarea: { nombre: 'asc' }
            }
        });

        const resultado: TareaSuscritaDetalleData[] = suscripcionesPrisma.map(s => ({
            suscripcionId: s.id,
            nombre: s.tarea.nombre, // Agregar el campo nombre a nivel superior
            tarea: {
                id: s.tarea.id,
                nombre: s.tarea.nombre,
                descripcion: s.tarea.descripcionMarketplace,
                precio: s.tarea.precio,
            },
            montoSuscripcion: s.montoSuscripcion,
            ejecuciones: s.tarea._count.TareaEjecutada,
        }));

        // Validar la salida (opcional pero recomendado)
        const parsedResult = z.array(tareaSuscritaDetalleSchema).safeParse(resultado);
        if (!parsedResult.success) {
            console.error("Error de validación en obtenerTareasSuscritasDetalladasAction:", parsedResult.error.flatten());
            return { success: false, error: "Error al procesar datos de tareas suscritas." };
        }

        return { success: true, data: parsedResult.data };

    } catch (error) {
        console.error(`Error al obtener tareas suscritas detalladas para asistente ${asistenteId}:`, error);
        return { success: false, error: "No se pudieron obtener las tareas suscritas." };
    }
}

export async function crearOreactivarSuscripcionAction(
    input: UpsertSuscripcionTareaInput
): Promise<ActionResult<SuscripcionBasicaData>> {
    const validation = upsertSuscripcionTareaInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos de entrada inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { asistenteId, tareaId } = validation.data;

    try {
        const [tareaInfo, asistenteInfo] = await Promise.all([
            prisma.tarea.findUnique({ where: { id: tareaId }, select: { precio: true, status: true } }),
            prisma.asistenteVirtual.findUnique({ where: { id: asistenteId }, select: { clienteId: true, negocioId: true } })
        ]);

        if (!tareaInfo) return { success: false, error: "Tarea no encontrada." };
        if (tareaInfo.status !== 'activo') return { success: false, error: "La tarea no está activa y no se puede suscribir." };
        if (!asistenteInfo?.clienteId || !asistenteInfo.negocioId) {
            // No es un error fatal para la operación, pero sí para revalidatePath si fueran null.
            console.warn(`Cliente/Negocio no encontrado para asistente ${asistenteId}. La revalidación podría ser parcial.`);
        }

        const monto = tareaInfo.precio ?? 0; // Si la tarea no tiene precio, se asume 0
        const { clienteId, negocioId } = asistenteInfo || { clienteId: null, negocioId: null };

        const suscripcion = await prisma.asistenteTareaSuscripcion.upsert({
            where: {
                asistenteVirtualId_tareaId: { // Constraint único compuesto
                    asistenteVirtualId: asistenteId,
                    tareaId: tareaId,
                }
            },
            update: { // Si ya existe (ej. estaba inactiva), la reactivamos
                status: 'activo',
                montoSuscripcion: monto,
                fechaDesuscripcion: null, // Limpiar fecha de desuscripción
                // fechaSuscripcion no se actualiza, se mantiene la original o la de creación.
            },
            create: { // Si no existe, la creamos
                asistenteVirtualId: asistenteId,
                tareaId: tareaId,
                montoSuscripcion: monto,
                status: 'activo',
                // fechaSuscripcion tomará el default now()
            }
        });

        if (clienteId && negocioId) {
            revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
            revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}/tarea/${tareaId}`); // Si hay una página de detalle
        }
        revalidatePath(`/admin/marketplace/${asistenteId}`); // Revalidar marketplace del asistente
        revalidatePath(`/admin/marketplace`); // Revalidar marketplace general

        const parsedData = suscripcionBasicaDataSchema.parse({ id: suscripcion.id, status: suscripcion.status });
        return { success: true, data: parsedData };

    } catch (error) {
        console.error(`Error al suscribir/reactivar tarea ${tareaId} para asistente ${asistenteId}:`, error);
        // Manejar error P2002 (unique constraint) si ocurre en un caso no esperado por el upsert.
        return { success: false, error: `Error al procesar la suscripción: ${error instanceof Error ? error.message : String(error)}` };
    }
}

export async function obtenerDetallesSuscripcionTareaAction(
    tareaId: string, // tareaId es siempre requerida
    asistenteId: string | null // asistenteId ahora es opcional (puede ser null)
): Promise<ActionResult<TareaSuscripcionDetallesData | null>> {
    if (!tareaId) {
        return { success: false, error: "Falta ID de tarea." };
    }

    try {
        // 1. Obtener siempre los detalles de la Tarea
        const tareaDataPrisma = await prisma.tarea.findUnique({
            where: { id: tareaId },
            select: {
                id: true, nombre: true, descripcionMarketplace: true, precio: true, iconoUrl: true,
                CategoriaTarea: { select: { nombre: true, color: true } },
                etiquetas: { select: { etiquetaTarea: { select: { id: true, nombre: true } } } },
                TareaGaleria: { select: { id: true, imageUrl: true, altText: true, descripcion: true }, orderBy: { orden: 'asc' } }
            }
        });

        if (!tareaDataPrisma) {
            return { success: false, error: `Tarea con ID ${tareaId} no encontrada.` };
        }

        // 2. Si se proporciona asistenteId, intentar obtener su información y la suscripción
        let suscripcionInfoPrisma = null;
        let clienteIdDb: string | null = null;
        let negocioIdDb: string | null = null;

        if (asistenteId) {
            const asistenteInfo = await prisma.asistenteVirtual.findUnique({
                where: { id: asistenteId },
                select: {
                    clienteId: true,
                    negocioId: true,
                    AsistenteTareaSuscripcion: {
                        where: { tareaId: tareaId }, // Busca suscripción para ESTA tarea
                        select: { id: true, status: true, montoSuscripcion: true, fechaSuscripcion: true, fechaDesuscripcion: true },
                        take: 1 // Solo debería haber una o ninguna
                    }
                }
            });

            if (asistenteInfo) {
                suscripcionInfoPrisma = asistenteInfo.AsistenteTareaSuscripcion?.[0] || null;
                clienteIdDb = asistenteInfo.clienteId;
                negocioIdDb = asistenteInfo.negocioId;
            } else {
                // Si se pasó un asistenteId pero no se encontró, podría ser un error o simplemente
                // que se está intentando ver una tarea para un asistente que ya no existe.
                // Para el flujo de "ver tarea sin contexto de asistente", este bloque no se ejecuta.
                console.warn(`Asistente con ID ${asistenteId} no encontrado al buscar detalles de suscripción.`);
                // No retornamos error aquí, permitimos que se muestren los detalles de la tarea sin info de suscripción.
            }
        }

        // 3. Mapear los datos para la validación Zod y la respuesta
        const dataToParse: TareaSuscripcionDetallesData = {
            tarea: {
                id: tareaDataPrisma.id,
                nombre: tareaDataPrisma.nombre,
                // descripcion: tareaDataPrisma.descripcion ?? null,
                precio: tareaDataPrisma.precio ?? null,
                iconoUrl: tareaDataPrisma.iconoUrl ?? undefined,
                CategoriaTarea: tareaDataPrisma.CategoriaTarea ? {
                    nombre: tareaDataPrisma.CategoriaTarea.nombre,
                    color: tareaDataPrisma.CategoriaTarea.color ?? undefined,
                } : null,
                etiquetas: tareaDataPrisma.etiquetas
                    .map(et => et.etiquetaTarea ? ({ etiquetaTarea: { id: et.etiquetaTarea.id, nombre: et.etiquetaTarea.nombre } }) : null)
                    .filter(Boolean) as { etiquetaTarea: { id: string; nombre: string } }[], // Asegura que no haya nulos y que el tipo sea correcto
                TareaGaleria: tareaDataPrisma.TareaGaleria.map(g => ({
                    id: g.id, // Asegúrate que el schema Zod TareaGaleriaItemData incluya 'id'
                    imageUrl: g.imageUrl,
                    altText: g.altText ?? undefined,
                    descripcion: g.descripcion ?? undefined,
                })),
            },
            suscripcion: suscripcionInfoPrisma ? {
                id: suscripcionInfoPrisma.id,
                status: suscripcionInfoPrisma.status,
                montoSuscripcion: suscripcionInfoPrisma.montoSuscripcion ?? null,
                fechaSuscripcion: suscripcionInfoPrisma.fechaSuscripcion,
                fechaDesuscripcion: suscripcionInfoPrisma.fechaDesuscripcion ?? null,
            } : null,
            clienteId: clienteIdDb, // Será null si no hay asistenteId o el asistente no tiene clienteId
            negocioId: negocioIdDb, // Será null si no hay asistenteId o el asistente no tiene negocioId
        };

        const validationResult = tareaSuscripcionDetallesSchema.safeParse(dataToParse);

        if (!validationResult.success) {
            console.error("Error de validación Zod en obtenerDetallesSuscripcionTareaAction:", validationResult.error.flatten());
            // console.log("Datos que fallaron validación:", dataToParse); // Para depuración
            return { success: false, error: "Datos de la tarea o suscripción con formato inesperado." };
        }

        return { success: true, data: validationResult.data };

    } catch (error) {
        console.error(`Error obteniendo detalles para tarea ${tareaId} (asistente ${asistenteId || 'N/A'}):`, error);
        return { success: false, error: "No se pudieron obtener los detalles." };
    }
}

export async function obtenerSuscripcionesParaAsistenteAction(
    asistenteId: string
): Promise<ActionResult<SuscripcionActivaInfoData[]>> {
    if (!asistenteId) {
        // Devolver éxito con array vacío si no hay asistenteId,
        // ya que el componente puede llamarlo sin asistenteId para la vista global.
        return { success: true, data: [] };
    }
    try {
        const suscripcionesPrisma = await prisma.asistenteTareaSuscripcion.findMany({
            where: {
                asistenteVirtualId: asistenteId,
                status: 'activo' // Solo queremos saber las activas para marcar como "suscrito"
            },
            select: {
                id: true, // ID de la suscripción
                tareaId: true,
            }
        });
        const validation = z.array(suscripcionActivaInfoSchema).safeParse(suscripcionesPrisma);
        if (!validation.success) {
            console.error("Error Zod en obtenerSuscripcionesParaAsistenteAction:", validation.error.flatten());
            return { success: false, error: "Datos de suscripciones con formato inesperado." };
        }
        return { success: true, data: validation.data };
    } catch (error) {
        console.error(`Error obteniendo suscripciones para asistente ${asistenteId}:`, error);
        return { success: false, error: 'No se pudieron obtener las suscripciones del asistente.' };
    }
}

// Helper para los paths a revalidar (reutilizable)
function getPathsToRevalidateForSuscripcion(
    clienteId: string | null,
    negocioId: string | null,
    asistenteId: string,
    tareaId?: string
): string[] {
    const paths = [];
    if (clienteId && negocioId && asistenteId) {
        const basePathAsistente = `/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`;
        paths.push(basePathAsistente); // Página de edición del asistente (donde se listan tareas en AsistenteTareas)
        if (tareaId) {
            paths.push(`${basePathAsistente}/tarea/${tareaId}`); // Esta misma página de detalle de suscripción
            // También la ruta del marketplace para esta tarea específica con contexto
            paths.push(`/admin/marketplace/suscripcion/${tareaId}?asistenteId=${asistenteId}&clienteId=${clienteId}&negocioId=${negocioId}`);
        }
    }
    // Revalidar marketplace general y el contextualizado para el asistente
    if (asistenteId) paths.push(`/admin/marketplace/${asistenteId}`);
    paths.push(`/admin/marketplace`);
    if (tareaId) paths.push(`/admin/marketplace/suscripcion/${tareaId}`); // Detalle genérico de tarea

    console.log("[RevalidatePaths Suscripcion]", paths);
    return paths;
}

// export async function obtenerDetallesSuscripcionTareaAction(
//     asistenteIdParam: string | null, // Puede ser null si se ve la tarea sin contexto de asistente
//     tareaId: string
// ): Promise<ActionResult<TareaSuscripcionDetallesData | null>> {
//     if (!tareaId) {
//         return { success: false, error: "Falta ID de tarea." };
//     }
//     try {
//         const tareaDataPrisma = await prisma.tarea.findUnique({
//             where: { id: tareaId },
//             select: {
//                 id: true, nombre: true, descripcion: true, precio: true, iconoUrl: true,
//                 CategoriaTarea: { select: { nombre: true, color: true } },
//                 etiquetas: { select: { etiquetaTarea: { select: { id: true, nombre: true } } } },
//                 TareaGaleria: { select: { id: true, imageUrl: true, altText: true, descripcion: true }, orderBy: { orden: 'asc' } }
//             }
//         });
//         if (!tareaDataPrisma) {
//             return { success: false, error: `Tarea con ID ${tareaId} no encontrada.` };
//         }
//         let suscripcionInfoPrisma = null;
//         let clienteIdDb: string | null = null;
//         let negocioIdDb: string | null = null;
//         if (asistenteIdParam) {
//             const asistenteInfo = await prisma.asistenteVirtual.findUnique({
//                 where: { id: asistenteIdParam },
//                 select: {
//                     clienteId: true,
//                     negocioId: true,
//                     AsistenteTareaSuscripcion: {
//                         where: { tareaId: tareaId },
//                         select: { id: true, status: true, montoSuscripcion: true, fechaSuscripcion: true, fechaDesuscripcion: true },
//                         take: 1
//                     }
//                 }
//             });
//             if (asistenteInfo) {
//                 suscripcionInfoPrisma = asistenteInfo.AsistenteTareaSuscripcion?.[0] || null;
//                 clienteIdDb = asistenteInfo.clienteId; // Puede ser null si AsistenteVirtual.clienteId es opcional
//                 negocioIdDb = asistenteInfo.negocioId; // Puede ser null si AsistenteVirtual.negocioId es opcional
//             } else {
//                 console.warn(`Asistente con ID ${asistenteIdParam} no encontrado al buscar suscripción.`);
//             }
//         }
//         // Mapeo y transformación cuidadosa a la estructura que espera el schema Zod
//         const dataToParse = {
//             tarea: {
//                 id: tareaDataPrisma.id,
//                 nombre: tareaDataPrisma.nombre,
//                 descripcion: tareaDataPrisma.descripcion ?? null,
//                 precio: tareaDataPrisma.precio ?? null,
//                 iconoUrl: tareaDataPrisma.iconoUrl ?? undefined,
//                 CategoriaTarea: tareaDataPrisma.CategoriaTarea ? {
//                     nombre: tareaDataPrisma.CategoriaTarea.nombre,
//                     color: tareaDataPrisma.CategoriaTarea.color ?? undefined,
//                 } : null,
//                 etiquetas: tareaDataPrisma.etiquetas
//                     .map(et => et.etiquetaTarea ? { id: et.etiquetaTarea.id, nombre: et.etiquetaTarea.nombre } : null)
//                     .filter(Boolean) as { id: string; nombre: string }[], // Filtrar nulos y asegurar tipo
//                 TareaGaleria: tareaDataPrisma.TareaGaleria.map(g => ({
//                     ...g,
//                     altText: g.altText ?? undefined,
//                     descripcion: g.descripcion ?? undefined,
//                 })),
//             },
//             suscripcion: suscripcionInfoPrisma ? {
//                 id: suscripcionInfoPrisma.id,
//                 status: suscripcionInfoPrisma.status,
//                 montoSuscripcion: suscripcionInfoPrisma.montoSuscripcion ?? null,
//                 fechaSuscripcion: suscripcionInfoPrisma.fechaSuscripcion,
//                 fechaDesuscripcion: suscripcionInfoPrisma.fechaDesuscripcion ?? null,
//             } : null,
//             clienteId: clienteIdDb,
//             negocioId: negocioIdDb,
//         };
//         const validationResult = tareaSuscripcionDetallesSchema.safeParse(dataToParse);
//         if (!validationResult.success) {
//             console.error("Error Zod en obtenerDetallesSuscripcionTareaAction:", validationResult.error.flatten());
//             return { success: false, error: "Datos de suscripción con formato inesperado." };
//         }
//         return { success: true, data: validationResult.data };
//     } catch (error) {
//         console.error("Error en obtenerDetallesSuscripcionTareaAction:", error);
//         return { success: false, error: "No se pudieron obtener los detalles de la suscripción." };
//     }
// }

export async function cancelarSuscripcionTareaAction(
    input: SuscripcionIdentificadores // Recibe un objeto con todos los IDs
): Promise<ActionResult<SuscripcionBasicaData>> {
    const { suscripcionId, asistenteId, tareaId, clienteId, negocioId } = input;

    if (!suscripcionId) return { success: false, error: "ID de suscripción no proporcionado." };
    if (!asistenteId) return { success: false, error: "ID de asistente no proporcionado." };
    // clienteId y negocioId pueden ser null si la action los obtiene de otra forma para revalidación.
    // Pero si se pasan, se usan.

    try {
        const updatedSuscripcion = await prisma.asistenteTareaSuscripcion.update({
            where: {
                id: suscripcionId,
                asistenteVirtualId: asistenteId // Doble chequeo
            },
            data: { status: 'inactivo', fechaDesuscripcion: new Date() },
            select: { id: true, status: true }
        });

        const paths = getPathsToRevalidateForSuscripcion(clienteId, negocioId, asistenteId, tareaId);
        paths.forEach(p => revalidatePath(p, 'page'));

        const validatedData = suscripcionBasicaDataSchema.parse(updatedSuscripcion);
        return { success: true, data: validatedData };
    } catch (error) {
        console.error(`Error al cancelar suscripción ${suscripcionId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Suscripción no encontrada o no pertenece al asistente." };
        }
        return { success: false, error: "Error al cancelar la suscripción." };
    }
}

export async function crearOreactivarSuscripcionTareaAction(
    input: UpsertSuscripcionTareaInput // Recibe un objeto con todos los IDs
): Promise<ActionResult<SuscripcionBasicaData>> {

    const { asistenteId, tareaId, clienteId, negocioId } = input;

    if (!asistenteId || !tareaId) return { success: false, error: "Faltan IDs de asistente o tarea." };
    // Validar que clienteId y negocioId vengan si son obligatorios para la action
    if (!clienteId || !negocioId) return { success: false, error: "Faltan IDs de cliente o negocio para revalidación." };


    try {
        const tareaInfo = await prisma.tarea.findUnique({
            where: { id: tareaId },
            select: { precio: true, status: true }
        });
        if (!tareaInfo) return { success: false, error: "Tarea no encontrada." };
        if (tareaInfo.status !== 'activo') return { success: false, error: "Esta tarea no está activa." };

        // No necesitamos buscar AsistenteVirtual aquí si clienteId y negocioId ya vienen en el input.
        // Si no vinieran, aquí se buscarían:
        // const asistenteContext = await prisma.asistenteVirtual.findUnique({ where: { id: asistenteId }, select: { clienteId: true, negocioId: true }});
        // const effectiveClienteId = clienteId || asistenteContext?.clienteId;
        // const effectiveNegocioId = negocioId || asistenteContext?.negocioId;


        const montoACobrar = tareaInfo.precio ?? 0;
        const suscripcion = await prisma.asistenteTareaSuscripcion.upsert({
            where: { asistenteVirtualId_tareaId: { asistenteVirtualId: asistenteId, tareaId: tareaId } },
            update: { status: 'activo', montoSuscripcion: montoACobrar, fechaDesuscripcion: null },
            create: { asistenteVirtualId: asistenteId, tareaId: tareaId, montoSuscripcion: montoACobrar, status: 'activo' },
            select: { id: true, status: true }
        });

        const paths = getPathsToRevalidateForSuscripcion(clienteId, negocioId, asistenteId, tareaId);
        paths.forEach(p => revalidatePath(p, 'page'));

        const validatedData = suscripcionBasicaDataSchema.parse(suscripcion);
        return { success: true, data: validatedData };
    } catch (error) {
        console.error(`Error al suscribir/reactivar tarea ${tareaId} para ${asistenteId}:`, error);
        return { success: false, error: "Error al procesar la suscripción." };
    }
}