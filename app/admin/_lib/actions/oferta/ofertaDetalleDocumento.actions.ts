'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { subirImagenStorage as subirArchivoStorage, eliminarImagenStorage as eliminarArchivoStorage } from '@/app/admin/_lib/imageHandler.actions'; // Reutilizando

import {
    OfertaDetalleDocumentoItemSchema,
    type OfertaDetalleDocumentoItemType,
    ActualizarDetallesDocumentoDetalleSchema,
    type ActualizarDetallesDocumentoDetalleData,
    ReordenarDocumentosDetalleSchema,
    type ReordenarDocumentosDetalleData
} from './ofertaDetalleDocumento.schemas'; // Asegúrate que la ruta sea correcta

const MAX_DOCUMENTS_PER_DETALLE = 3; // Límite de ejemplo para documentos por detalle
const MAX_DOC_SIZE_MB_DETALLE = 10; // Límite de tamaño por documento de detalle

// Helper para la ruta de revalidación (página de edición del OFERTA DETALLE)
const getPathToOfertaDetalleEdicion = (clienteId: string, negocioId: string, ofertaId: string, ofertaDetalleId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}/editar/${ofertaDetalleId}`;

export async function obtenerDocumentosDetalleOfertaAction(
    ofertaDetalleId: string // Ahora es ofertaDetalleId
): Promise<ActionResult<OfertaDetalleDocumentoItemType[]>> {
    if (!ofertaDetalleId) return { success: false, error: "ID de detalle de oferta requerido." };
    try {
        const documentosDb = await prisma.ofertaDetalleDocumento.findMany({
            where: { ofertaDetalleId: ofertaDetalleId }, // Cambiado
            orderBy: { orden: 'asc' },
        });
        const parseResults = documentosDb.map(doc => OfertaDetalleDocumentoItemSchema.safeParse(doc));
        const validDocumentos: OfertaDetalleDocumentoItemType[] = [];
        parseResults.forEach((res, index) => {
            if (res.success) {
                validDocumentos.push(res.data);
            } else {
                console.warn(`Datos de documento de detalle inválidos para ID ${documentosDb[index]?.id}:`, res.error.flatten());
            }
        });
        return { success: true, data: validDocumentos };
    } catch (error) {
        console.error("Error en obtenerDocumentosDetalleOfertaAction:", error);
        return { success: false, error: "No se pudieron obtener los documentos del detalle de oferta." };
    }
}

export async function agregarDocumentoADetalleOfertaAction(
    ofertaDetalleId: string, // ownerEntityId
    negocioId: string,
    clienteId: string,
    ofertaId: string, // Necesario para el path de storage y revalidación
    formData: FormData
): Promise<ActionResult<OfertaDetalleDocumentoItemType>> {
    if (!ofertaDetalleId || !negocioId || !clienteId || !ofertaId) {
        return { success: false, error: "Faltan IDs de contexto." };
    }

    const file = formData.get('file') as File | null;
    if (!file) return { success: false, error: "Archivo no encontrado en FormData." };

    if (file.size > MAX_DOC_SIZE_MB_DETALLE * 1024 * 1024) {
        return { success: false, error: `El archivo excede el límite de ${MAX_DOC_SIZE_MB_DETALLE}MB.` };
    }
    // Aquí podrías añadir validación de tipos de archivo específicos para documentos
    // const allowedDocTypes = ['application/pdf', 'application/msword', ...];
    // if (!allowedDocTypes.includes(file.type)) { /* ... error ... */ }

    try {
        const count = await prisma.ofertaDetalleDocumento.count({ where: { ofertaDetalleId: ofertaDetalleId } });
        if (count >= MAX_DOCUMENTS_PER_DETALLE) {
            return { success: false, error: `Límite de ${MAX_DOCUMENTS_PER_DETALLE} documentos por detalle alcanzado.` };
        }

        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const uniqueFileName = `${Date.now()}_det_doc_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        // Ruta de almacenamiento más específica:
        const filePath = `Negocios/${negocioId}/Ofertas/${ofertaId}/Detalles/${ofertaDetalleId}/Documentos/${uniqueFileName}`;

        const uploadResult = await subirArchivoStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir documento." };
        }

        const tamanoBytes = file.size;
        const ultimoItem = await prisma.ofertaDetalleDocumento.findFirst({
            where: { ofertaDetalleId: ofertaDetalleId }, orderBy: { orden: 'desc' }, select: { orden: true }
        });
        const nuevoOrden = (ultimoItem?.orden ?? -1) + 1;

        const [dbRecord] = await prisma.$transaction([
            prisma.ofertaDetalleDocumento.create({ // Cambiado
                data: {
                    ofertaDetalleId: ofertaDetalleId, // Cambiado
                    documentoUrl: uploadResult.publicUrl,
                    documentoNombre: file.name,
                    documentoTipo: file.type,
                    documentoTamanoBytes: tamanoBytes,
                    orden: nuevoOrden,
                }
            }),
            prisma.negocio.update({
                where: { id: negocioId },
                data: { almacenamientoUsadoBytes: { increment: tamanoBytes } },
            })
        ]);

        const validationResult = OfertaDetalleDocumentoItemSchema.parse(dbRecord);
        revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
        return { success: true, data: validationResult };

    } catch (error: unknown) {
        console.error(`Error en agregarDocumentoADetalleOfertaAction (${ofertaDetalleId}):`, error);
        return { success: false, error: `Error al añadir documento al detalle: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarDetallesDocumentoDetalleAction(
    documentoId: string, // ID del OfertaDetalleDocumentoItem
    clienteId: string,
    negocioId: string,
    ofertaId: string,      // Para revalidación
    ofertaDetalleId: string, // Para scope y revalidación
    data: ActualizarDetallesDocumentoDetalleData
): Promise<ActionResult<OfertaDetalleDocumentoItemType>> {
    if (!documentoId) return { success: false, error: "Falta ID de documento." };

    const validation = ActualizarDetallesDocumentoDetalleSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { documentoNombre, descripcion } = validation.data;

    try {
        const docExistente = await prisma.ofertaDetalleDocumento.findFirst({ // Cambiado
            where: { id: documentoId, ofertaDetalleId: ofertaDetalleId } // Verificación de pertenencia
        });
        if (!docExistente) return { success: false, error: "Documento no encontrado o no pertenece a este detalle." };

        const dataToUpdate: Prisma.OfertaDetalleDocumentoUpdateInput = {}; // Cambiado
        if (documentoNombre !== undefined) dataToUpdate.documentoNombre = documentoNombre;
        if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;

        if (Object.keys(dataToUpdate).length === 0) {
            const parsedCurrent = OfertaDetalleDocumentoItemSchema.parse(docExistente);
            return { success: true, data: parsedCurrent, error: "No hay detalles para actualizar." };
        }

        const docActualizado = await prisma.ofertaDetalleDocumento.update({ // Cambiado
            where: { id: documentoId }, data: dataToUpdate,
        });

        const parsedUpdated = OfertaDetalleDocumentoItemSchema.parse(docActualizado);
        revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
        return { success: true, data: parsedUpdated };
    } catch (error: unknown) {
        console.error(`Error actualizando detalles de documento de detalle ${documentoId}:`, error);
        return { success: false, error: `Error al actualizar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarDocumentoDeDetalleOfertaAction(
    documentoId: string,
    negocioId: string,
    clienteId: string,
    ofertaId: string,      // Para revalidación
    ofertaDetalleId: string  // Para scope y revalidación
): Promise<ActionResult<void>> {
    if (!documentoId || !negocioId) return { success: false, error: "Faltan IDs." };
    try {
        const documento = await prisma.ofertaDetalleDocumento.findUnique({ // Cambiado
            where: { id: documentoId, ofertaDetalleId: ofertaDetalleId }, // Verificación de pertenencia
            select: { documentoUrl: true, documentoTamanoBytes: true }
        });
        if (!documento) return { success: false, error: "Documento no encontrado." };

        await prisma.$transaction(async (tx) => {
            await tx.ofertaDetalleDocumento.delete({ where: { id: documentoId } }); // Cambiado
            if (documento.documentoUrl) {
                await eliminarArchivoStorage(documento.documentoUrl);
            }
            if (documento.documentoTamanoBytes && documento.documentoTamanoBytes > 0) {
                await tx.negocio.update({
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { decrement: documento.documentoTamanoBytes } },
                });
            }
        });
        revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
        return { success: true };
    } catch (error: unknown) {
        console.error(`Error eliminando documento de detalle ${documentoId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
            return { success: true }; // Ya fue eliminado
        }
        return { success: false, error: `Error al eliminar: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarOrdenDocumentosDetalleOfertaAction(
    ofertaDetalleId: string, // ownerEntityId
    negocioId: string,
    clienteId: string,
    ofertaId: string, // Para revalidación
    ordenes: ReordenarDocumentosDetalleData // Tipo de datos específico
): Promise<ActionResult<void>> {
    if (!ofertaDetalleId) return { success: false, error: "ID de detalle de oferta requerido." };

    const validation = ReordenarDocumentosDetalleSchema.safeParse(ordenes);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de orden inválidos.",
            errorDetails: Object.fromEntries(
                Object.entries(validation.error.flatten().fieldErrors)
                    .filter(([v]) => Array.isArray(v))
                    .map(([k, v]) => [String(k), v ?? []])
            ) as Record<string, string[]>
        };
    }
    const ordenesValidadas = validation.data;
    if (ordenesValidadas.length === 0 && ordenes.length > 0) {
        return { success: false, error: "Formato de datos de orden inválido." };
    }
    if (ordenesValidadas.length === 0) return { success: true };


    try {
        await prisma.$transaction(
            ordenesValidadas.map((doc: { id: string; orden: number }) =>
                prisma.ofertaDetalleDocumento.update({ // Cambiado
                    where: { id: doc.id, ofertaDetalleId: ofertaDetalleId }, // Verificación de pertenencia
                    data: { orden: doc.orden },
                })
            )
        );
        revalidatePath(getPathToOfertaDetalleEdicion(clienteId, negocioId, ofertaId, ofertaDetalleId));
        return { success: true };
    } catch (error) {
        console.error(`Error actualizando orden documentos de detalle ${ofertaDetalleId}:`, error);
        return { success: false, error: `Error al guardar orden: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}