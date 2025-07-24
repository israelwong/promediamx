'use server';

import { z } from 'zod'; // Asegúrate de tener Zod instalado

import prisma from '@/app/admin/_lib/prismaClient';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    AsistenteEnListaData, // Ya lo teníamos
    CrearAsistenteFormInput,
    crearAsistenteFormSchema,
    AsistenteCreadoData,
    asistenteCreadoDataSchema,
    // Nuevos schemas
    NegocioParaDropdownData,
    negocioParaDropdownSchema,
    ActualizarAsistenteFormInput,
    actualizarAsistenteFormSchema,
    AsistenteDetalleData,
    asistenteDetalleDataSchema,
} from './asistenteVirtual.schemas';
// import type { AsistenteVirtual as AsistenteVirtualPrisma } from '@prisma/client'; // Para casteos si es necesario

// ... (imports existentes: prisma, revalidatePath, Prisma, ActionResult, otros schemas) ...
import { subirImagenStorage, eliminarImagenStorage } from '@/app/admin/_lib/unused/imageHandler.actions'; // Importante
import { ActualizarAvatarResultData, actualizarAvatarResultSchema } from './asistenteVirtual.schemas';


// Función helper para parsear y validar AsistenteDetalleData
function parseToAsistenteDetalleData(data: unknown): AsistenteDetalleData { // 'unknown' para flexibilidad de entrada de Prisma
    const result = asistenteDetalleDataSchema.safeParse(data);
    if (!result.success) {
        console.error("Error de validación interna (Prisma a Zod para AsistenteDetalle):", result.error.flatten());
        throw new Error("Discrepancia de datos internos al procesar detalles del asistente.");
    }
    return result.data;
}


// obtenerAsistentesParaListaAction (ya definida en respuesta anterior, la copio aquí por completitud del archivo)
export async function obtenerAsistentesParaListaAction(
    negocioId: string
): Promise<ActionResult<AsistenteEnListaData[]>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const asistentesPrisma = await prisma.asistenteVirtual.findMany({
            where: { negocioId: negocioId },
            select: {
                id: true,
                nombre: true,
                urlImagen: true,
                status: true,
                AsistenteTareaSuscripcion: {
                    where: { status: 'activo', montoSuscripcion: { gt: 0 } },
                    select: { montoSuscripcion: true }
                },
                _count: { select: { Conversacion: true } }
            },
            orderBy: { nombre: 'asc' }
        });
        const resultado: AsistenteEnListaData[] = asistentesPrisma.map(asistente => ({
            id: asistente.id,
            nombre: asistente.nombre,
            urlImagen: asistente.urlImagen,
            status: asistente.status,
            costoTotalTareasAdicionales: asistente.AsistenteTareaSuscripcion.reduce((s, sub) => s + (sub.montoSuscripcion ?? 0), 0),
            totalConversaciones: asistente._count?.Conversacion,
        }));
        return { success: true, data: resultado };
    } catch (error) {
        console.error(`Error al obtener lista de asistentes para negocio ${negocioId}:`, error);
        return { success: false, error: `Error al obtener asistentes: ${error instanceof Error ? error.message : String(error)}` };
    }
}

// crearAsistenteVirtualAction (ya definida en respuesta anterior, la copio aquí)
export async function crearAsistenteVirtualAction(
    input: CrearAsistenteFormInput
): Promise<ActionResult<AsistenteCreadoData>> {
    const validation = crearAsistenteFormSchema.safeParse(input);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para crear el asistente.",
            errorDetails: validation.error.flatten().fieldErrors,
        };
    }
    const { nombre, descripcion, negocioId, clienteId } = validation.data;
    const VERSION_DEFAULT = 1.0;
    const STATUS_DEFAULT = 'activo';
    const ORIGEN_DEFAULT = 'cliente';

    try {
        const nuevoAsistente = await prisma.$transaction(async (tx) => {
            const asistenteCreado = await tx.asistenteVirtual.create({
                data: {
                    nombre, descripcion, negocioId, clienteId,
                    version: VERSION_DEFAULT, status: STATUS_DEFAULT, origen: ORIGEN_DEFAULT,
                    // precioBase se omite o se pone null si aún existe en el schema
                }
            });
            const tareasPorDefecto = await tx.tarea.findMany({
                where: { esTareaPorDefecto: true, status: 'activo' },
                select: { id: true }
            });
            if (tareasPorDefecto.length > 0) {
                await tx.asistenteTareaSuscripcion.createMany({
                    data: tareasPorDefecto.map(tarea => ({
                        asistenteVirtualId: asistenteCreado.id,
                        tareaId: tarea.id, montoSuscripcion: 0, status: 'activo'
                    })),
                    skipDuplicates: true,
                });
            }
            return asistenteCreado;
        });
        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente`);

        const parsedOutput = asistenteCreadoDataSchema.parse({ id: nuevoAsistente.id, nombre: nuevoAsistente.nombre });
        return { success: true, data: parsedOutput };
    } catch (error) {
        console.error("Error en crearAsistenteVirtualAction:", error);
        return { success: false, error: `No se pudo crear el asistente: ${error instanceof Error ? error.message : "Error desconocido"}` };
    }
}

// --- NUEVAS ACTIONS PARA EDICIÓN ---

export async function obtenerAsistenteVirtualPorIdAction(
    asistenteId: string
): Promise<ActionResult<AsistenteDetalleData | null>> {
    if (!asistenteId) return { success: false, error: "ID de asistente no proporcionado." };
    try {
        const asistentePrisma = await prisma.asistenteVirtual.findUnique({
            where: { id: asistenteId },
            include: {
                negocio: { // Incluir Negocio para mostrarlo y para el clienteId del negocio
                    select: {
                        id: true,
                        nombre: true,
                        // clienteId: true, // Ya tenemos el clienteId del Asistente, si es el mismo
                    }
                }
                // No incluir AsistenteTareaSuscripcion aquí, se manejará por separado en AsistenteTareas.tsx
            }
        });

        if (!asistentePrisma) {
            return { success: false, error: "Asistente no encontrado." };
        }
        // El token no debería enviarse al cliente así, pero lo mantenemos por ahora
        // para que coincida con tu tipo AsistenteVirtual original.
        // En producción, enviar solo un placeholder o un booleano 'tokenConfigurado'.
        return { success: true, data: parseToAsistenteDetalleData(asistentePrisma) };
    } catch (error) {
        console.error(`Error en obtenerAsistenteVirtualPorIdAction ${asistenteId}:`, error);
        return { success: false, error: "No se pudo cargar el asistente virtual." };
    }
}

export async function obtenerNegociosParaDropdownAction(): Promise<ActionResult<NegocioParaDropdownData[]>> {
    try {
        const negociosPrisma = await prisma.negocio.findMany({
            orderBy: { nombre: 'asc' },
            select: {
                id: true,
                nombre: true,
                cliente: {
                    select: { id: true, nombre: true }
                }
            }
        });
        // Validar/transformar con Zod
        const parsedNegocios = z.array(negocioParaDropdownSchema).safeParse(negociosPrisma);
        if (!parsedNegocios.success) {
            console.error("Error de validación en obtenerNegociosParaDropdownAction:", parsedNegocios.error.flatten());
            return { success: false, error: "Error al procesar datos de negocios." };
        }
        return { success: true, data: parsedNegocios.data };
    } catch (error) {
        console.error("Error en obtenerNegociosParaDropdownAction:", error);
        return { success: false, error: "Error al cargar lista de negocios." };
    }
}

export async function actualizarAsistenteVirtualAction(
    asistenteId: string,
    inputData: ActualizarAsistenteFormInput
): Promise<ActionResult<AsistenteDetalleData>> {
    if (!asistenteId) return { success: false, error: "ID de asistente no proporcionado." };

    const validation = actualizarAsistenteFormSchema.safeParse(inputData);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para actualizar el asistente.",
            errorDetails: validation.error.flatten().fieldErrors,
        };
    }
    const dataToUpdate = validation.data;

    try {
        // El campo 'token' es sensible. Si viene vacío o null y ya existe un token, ¿debería borrarse?
        // Por ahora, si es null se actualiza a null. Si no viene en dataToUpdate, no se toca.
        // Si viene como string vacío, Zod lo transforma a null con .transform(val => val || null)

        const prismaUpdateData: Prisma.AsistenteVirtualUpdateInput = {
            ...dataToUpdate,
            // precioBase: undefined, // Asegurar que no se intenta actualizar precioBase
        };
        // Eliminar precioBase explícitamente si aún está en el tipo y no queremos actualizarlo
        if ('precioBase' in prismaUpdateData) {
            delete (prismaUpdateData as Record<string, unknown>).precioBase;
        }


        const asistenteActualizadoPrisma = await prisma.asistenteVirtual.update({
            where: { id: asistenteId },
            data: prismaUpdateData,
            include: { // Volver a incluir el negocio para devolver el objeto completo
                negocio: { select: { id: true, nombre: true } }
            }
        });

        // Revalidar la página de edición y la lista si el nombre cambió.
        revalidatePath(`/admin/clientes/.*/negocios/.*/asistente/${asistenteId}`, 'page'); // Revalida la página de edición específica
        // Podrías necesitar revalidar la lista de asistentes si campos como nombre o status cambian y se muestran allí.
        // router.refresh() en el cliente también ayuda.

        return { success: true, data: parseToAsistenteDetalleData(asistenteActualizadoPrisma) };
    } catch (error) {
        console.error(`Error en actualizarAsistenteVirtualAction ${asistenteId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') return { success: false, error: "Asistente no encontrado para actualizar." };
            // Manejar otros errores de Prisma si es necesario
        }
        return { success: false, error: `Error al actualizar el asistente: ${error instanceof Error ? error.message : "Error desconocido"}` };
    }
}

export async function eliminarAsistenteVirtualAction(
    asistenteId: string
): Promise<ActionResult<null>> {
    if (!asistenteId) return { success: false, error: "ID de asistente no proporcionado." };
    try {
        // Primero, obtener el clienteId y negocioId para la revalidación de paths
        const asistente = await prisma.asistenteVirtual.findUnique({
            where: { id: asistenteId },
            select: { clienteId: true, negocioId: true }
        });

        if (!asistente) {
            return { success: false, error: "Asistente no encontrado para eliminar." };
        }

        // No se puede eliminar si tiene tareas suscritas (según tu lógica anterior)
        const suscripcionesCount = await prisma.asistenteTareaSuscripcion.count({
            where: { asistenteVirtualId: asistenteId }
        });
        if (suscripcionesCount > 0) {
            return { success: false, error: `No se puede eliminar: ${suscripcionesCount} tarea(s) están suscritas a este asistente.` };
        }
        // Aquí podrías añadir lógica para eliminar TareaEjecutada, Conversacion si es necesario y parte de la lógica de negocio.

        await prisma.asistenteVirtual.delete({
            where: { id: asistenteId }
        });

        if (asistente.clienteId && asistente.negocioId) {
            revalidatePath(`/admin/clientes/${asistente.clienteId}/negocios/${asistente.negocioId}/asistente`); // Revalida la lista
        }
        return { success: true, data: null };
    } catch (error) {
        console.error(`Error en eliminarAsistenteVirtualAction ${asistenteId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Asistente no encontrado para eliminar." };
        }
        return { success: false, error: `Error al eliminar el asistente: ${error instanceof Error ? error.message : "Error desconocido"}` };
    }
}



export async function actualizarAvatarAsistenteAction(
    asistenteId: string,
    negocioId: string, // Necesario para la ruta de storage y actualizar almacenamientoUsadoBytes
    clienteId: string, // Necesario para revalidatePath
    formData: FormData, // Ahora recibe FormData
    urlImagenActual: string | null | undefined
): Promise<ActionResult<ActualizarAvatarResultData>> {
    if (!asistenteId || !negocioId || !clienteId) {
        return { success: false, error: "Faltan IDs de contexto (asistente, negocio, cliente)." };
    }

    const file = formData.get('file') as File | null;
    if (!file) {
        return { success: false, error: "Archivo no encontrado en FormData." };
    }

    // Validaciones básicas del archivo (tipo, tamaño) - El componente ya las hace, pero una doble verificación no está mal.
    const validTypes = ['image/png', 'image/jpeg', 'image/webp'];
    if (!validTypes.includes(file.type)) {
        return { success: false, error: "Tipo de archivo no válido (solo PNG, JPG, WEBP)." };
    }
    const maxSizeMB = 2; // Definir aquí o pasar como argumento si es configurable
    if (file.size > maxSizeMB * 1024 * 1024) {
        return { success: false, error: `El archivo excede el límite de ${maxSizeMB}MB.` };
    }

    // Obtener tamaño del archivo anterior para ajustar almacenamientoUsadoBytes
    // const tamañoBytesAnterior: number | bigint = 0;
    if (urlImagenActual) {
        // Si tenemos un sistema para rastrear el tamaño de los avatares en DB, lo usaríamos.
        // Por ahora, asumimos que no lo tenemos, y la eliminación/subida neta es lo que cuenta.
        // En un sistema más robusto, AsistenteVirtual tendría un campo 'avatarFileSize'.
        // Aquí, simplemente confiaremos en el tamaño del nuevo archivo y el hecho de que el viejo se borra.
    }

    const nuevoTamañoBytes = file.size;

    // Ruta de almacenamiento: Asistentes/{asistenteId}/Avatar/avatar.{extension}
    // Usar un nombre de archivo fijo (ej. "avatar") con timestamp para evitar caché del navegador en la URL.
    const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'png';
    const filePath = `Asistentes/${asistenteId}/Avatar/avatar.${fileExtension}`;

    try {
        // Iniciar transacción
        const resultado = await prisma.$transaction(async (tx) => {
            // 1. Si hay una imagen actual, intentar eliminarla de Supabase
            //    y obtener su tamaño si lo tuviéramos guardado para ajustar el contador del negocio.
            //    Por ahora, la lógica de imageHandler.eliminarImagenStorage no devuelve tamaño.
            if (urlImagenActual) {
                const deleteOldResult = await eliminarImagenStorage(urlImagenActual);
                if (!deleteOldResult.success) {
                    // No es un error fatal, pero loguearlo. Podría ser que el archivo ya no existía.
                    console.warn(`No se pudo eliminar el avatar anterior de Supabase (${urlImagenActual}): ${deleteOldResult.error}`);
                }
                // Si supiéramos el tamaño del archivo anterior, aquí haríamos:
                // await tx.negocio.update({ where: { id: negocioId }, data: { almacenamientoUsadoBytes: { decrement: tamañoBytesAnterior } } });
                // Como no lo sabemos con certeza aquí, el efecto neto será solo el incremento del nuevo.
                // Esto es una simplificación. Un sistema robusto guardaría el tamaño del avatar en AsistenteVirtual.
            }

            // 2. Subir la nueva imagen
            const uploadResult = await subirImagenStorage(file, filePath);
            if (!uploadResult.success || !uploadResult.publicUrl) {
                throw new Error(uploadResult.error || "Error al subir el nuevo avatar a Supabase.");
            }
            const nuevaUrlImagen = uploadResult.publicUrl;

            // 3. Actualizar AsistenteVirtual en Prisma
            const asistenteActualizado = await tx.asistenteVirtual.update({
                where: { id: asistenteId },
                data: { urlImagen: nuevaUrlImagen /*, avatarFileSize: nuevoTamañoBytes // Si tuvieras este campo */ },
            });

            // 4. Actualizar almacenamientoUsadoBytes en Negocio
            // Esta lógica es simplificada: asume que el tamaño anterior se "perdió" o no se rastreó bien.
            // Idealmente: decrementas el viejo tamaño (si lo conoces), incrementas el nuevo.
            // Si urlImagenActual existía, su espacio se libera.
            // Lo más simple aquí es solo incrementar por el nuevo, asumiendo que eliminarImagenStorage liberó espacio.
            // Una mejor aproximación sería:
            // oldSize = (await tx.asistenteVirtual.findUnique({where: {id: asistenteId}}))?.avatarFileSize || 0;
            // diff = nuevoTamañoBytes - oldSize;
            // await tx.negocio.update({where:{id: negocioId}, data: {almacenamientoUsadoBytes: {increment: diff}}})
            // await tx.asistenteVirtual.update({where:{id:asistenteId}, data:{avatarFileSize: nuevoTamañoBytes}})

            // Simplificación por ahora: solo incrementamos. El borrado ya ocurrió.
            await tx.negocio.update({
                where: { id: negocioId },
                data: { almacenamientoUsadoBytes: { increment: nuevoTamañoBytes } },
            });

            return { urlImagen: nuevaUrlImagen, asistente: asistenteActualizado };
        });

        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
        // También revalidar la lista si el avatar se muestra allí
        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente`);

        const validatedOutput = actualizarAvatarResultSchema.parse({ urlImagen: resultado.urlImagen });
        return { success: true, data: validatedOutput };

    } catch (error) {
        console.error(`Error al actualizar avatar para asistente ${asistenteId}:`, error);
        return { success: false, error: `Error al actualizar avatar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarAvatarAsistenteAction(
    asistenteId: string,
    negocioId: string,
    clienteId: string,
    urlImagenActual: string | null | undefined
): Promise<ActionResult<null>> {
    if (!asistenteId || !negocioId || !clienteId) {
        return { success: false, error: "Faltan IDs de contexto." };
    }

    if (!urlImagenActual) {
        // No hay imagen que eliminar, pero asegurar que la BD esté limpia.
        try {
            await prisma.asistenteVirtual.update({
                where: { id: asistenteId }, data: { urlImagen: null /*, avatarFileSize: 0 // si tuvieras este campo */ }
            });
            return { success: true, data: null };
        } catch (dbError) {
            console.error(`Error limpiando URL en DB (eliminarAvatar) para asistente ${asistenteId}:`, dbError);
            return { success: false, error: "No había imagen, pero falló la sincronización con la BD." };
        }
    }

    try {
        // Necesitamos el tamaño del archivo para descontarlo.
        // Esta es una limitación si no guardamos el tamaño del avatar en AsistenteVirtual.
        // Asumiremos que no lo tenemos y no podemos descontar precisamente.
        // Idealmente, buscaríamos el asistente, obtendríamos su `avatarFileSize`.
        // const asistente = await prisma.asistenteVirtual.findUnique({where: {id: asistenteId}, select: {avatarFileSize: true}});
        // const tamañoBytesAEliminar = asistente?.avatarFileSize || 0;

        await prisma.$transaction(async (tx) => {
            const deleteStorageResult = await eliminarImagenStorage(urlImagenActual);
            if (!deleteStorageResult.success && deleteStorageResult.error && !deleteStorageResult.error.includes("No se pudo determinar la ruta")) {
                // Si el error no es porque no se encontró el archivo, lanzar para rollback
                throw new Error(deleteStorageResult.error);
            }

            await tx.asistenteVirtual.update({
                where: { id: asistenteId },
                data: { urlImagen: null /*, avatarFileSize: 0 // si tuvieras este campo */ },
            });

            // Si tuviéramos tamañoBytesAEliminar y fuera > 0:
            // await tx.negocio.update({
            //     where: { id: negocioId },
            //     data: { almacenamientoUsadoBytes: { decrement: tamañoBytesAEliminar } },
            // });
            // Por ahora, no podemos decrementar con precisión sin el tamaño.
            // Esto es una DEUDA TÉCNICA: el conteo de almacenamiento podría volverse impreciso.
            // Se recomienda añadir `avatarFileSize` al modelo `AsistenteVirtual`.
            console.warn(`DEUDA TÉCNICA: No se pudo decrementar almacenamientoUsadoBytes para negocio ${negocioId} al eliminar avatar de asistente ${asistenteId} por falta de tamaño de archivo guardado.`);

        });

        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistenteId}`);
        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente`);

        return { success: true, data: null };
    } catch (error) {
        console.error(`Error al eliminar avatar para asistente ${asistenteId}:`, error);
        return { success: false, error: `Error al eliminar avatar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
