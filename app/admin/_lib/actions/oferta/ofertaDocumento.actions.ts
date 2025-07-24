'use server';

import prisma from '@/app/admin/_lib/prismaClient'; // Ajusta tu ruta a prismaClient
import { ActionResult } from '@/app/admin/_lib/types'; // Asumo que tienes este tipo
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
// Asumimos que estas funciones existen y son genéricas para cualquier archivo
import { subirImagenStorage as subirArchivoStorage, eliminarImagenStorage as eliminarArchivoStorage } from '@/app/admin/_lib/unused/imageHandler.actions'; // Reutilizando/adaptando imageHandler
// import { z } from 'zod';

import {
    OfertaDocumentoItemSchema,
    type OfertaDocumentoItemType,
    ActualizarDetallesDocumentoOfertaSchema,
    type ActualizarDetallesDocumentoOfertaData,
    ReordenarDocumentosOfertaSchema,
    type ReordenarDocumentosOfertaData
} from './ofertaDocumento.schemas';

const MAX_DOCUMENTS_PER_OFERTA = 5; // Límite de ejemplo
const MAX_DOC_SIZE_MB = 10; // Límite de tamaño por documento

// Helper para la ruta de revalidación (página de edición de la oferta)
const getPathToOfertaEdicion = (clienteId: string, negocioId: string, ofertaId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`; // Ajustar si es necesario

export async function obtenerDocumentosOfertaAction(
    ofertaId: string
): Promise<ActionResult<OfertaDocumentoItemType[]>> {
    if (!ofertaId) return { success: false, error: "ID de oferta requerido." };
    try {
        const documentosDb = await prisma.ofertaDocumento.findMany({
            where: { ofertaId: ofertaId },
            orderBy: { orden: 'asc' },
        });
        // Validar cada documento con el schema
        const parseResults = documentosDb.map(doc => OfertaDocumentoItemSchema.safeParse(doc));
        const validDocumentos: OfertaDocumentoItemType[] = [];
        parseResults.forEach((res, index) => {
            if (res.success) {
                validDocumentos.push(res.data);
            } else {
                console.warn(`Datos de documento de oferta inválidos para ID ${documentosDb[index]?.id}:`, res.error.flatten());
            }
        });
        return { success: true, data: validDocumentos };
    } catch (error) {
        console.error("Error en obtenerDocumentosOfertaAction:", error);
        return { success: false, error: "No se pudieron obtener los documentos de la oferta." };
    }
}

export async function agregarDocumentoAOfertaAction(
    ofertaId: string,
    negocioId: string,
    clienteId: string,
    formData: FormData
): Promise<ActionResult<OfertaDocumentoItemType>> {
    if (!ofertaId || !negocioId || !clienteId) {
        return { success: false, error: "Faltan IDs de contexto." };
    }

    const file = formData.get('file') as File | null;
    if (!file) return { success: false, error: "Archivo no encontrado en FormData." };

    if (file.size > MAX_DOC_SIZE_MB * 1024 * 1024) {
        return { success: false, error: `El archivo excede el límite de ${MAX_DOC_SIZE_MB}MB.` };
    }
    // Puedes añadir una lista de tipos de archivo permitidos aquí si es necesario
    // const allowedDocTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'];
    // if (!allowedDocTypes.includes(file.type)) {
    //     return { success: false, error: 'Tipo de archivo no permitido para documentos.' };
    // }

    try {
        const count = await prisma.ofertaDocumento.count({ where: { ofertaId: ofertaId } });
        if (count >= MAX_DOCUMENTS_PER_OFERTA) {
            return { success: false, error: `Límite de ${MAX_DOCUMENTS_PER_OFERTA} documentos alcanzado.` };
        }

        const fileExtension = file.name.split('.').pop()?.toLowerCase() || 'bin';
        const uniqueFileName = `${Date.now()}_doc_${Math.random().toString(36).substring(2, 9)}.${fileExtension}`;
        const filePath = `Negocios/${negocioId}/Ofertas/${ofertaId}/Documentos/${uniqueFileName}`;

        // Usar la función genérica de subida de archivos
        const uploadResult = await subirArchivoStorage(file, filePath);
        if (!uploadResult.success || !uploadResult.publicUrl) {
            return { success: false, error: uploadResult.error || "Error al subir documento." };
        }

        const tamanoBytes = file.size;
        const ultimoItem = await prisma.ofertaDocumento.findFirst({
            where: { ofertaId: ofertaId }, orderBy: { orden: 'desc' }, select: { orden: true }
        });
        const nuevoOrden = (ultimoItem?.orden ?? -1) + 1;

        const [dbRecord] = await prisma.$transaction([
            prisma.ofertaDocumento.create({
                data: {
                    ofertaId: ofertaId,
                    documentoUrl: uploadResult.publicUrl,
                    documentoNombre: file.name, // Guardar nombre original
                    documentoTipo: file.type,
                    documentoTamanoBytes: tamanoBytes,
                    orden: nuevoOrden,
                }
            }),
            prisma.negocio.update({ // Actualizar contador de almacenamiento
                where: { id: negocioId },
                data: { almacenamientoUsadoBytes: { increment: tamanoBytes } },
            })
        ]);

        const validationResult = OfertaDocumentoItemSchema.parse(dbRecord); // Validar contra el schema

        revalidatePath(getPathToOfertaEdicion(clienteId, negocioId, ofertaId));
        return { success: true, data: validationResult };

    } catch (error: unknown) {
        console.error(`Error en agregarDocumentoAOfertaAction (${ofertaId}):`, error);
        return { success: false, error: `Error al añadir documento: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarDetallesDocumentoOfertaAction(
    documentoId: string,
    clienteId: string, negocioId: string, ofertaId: string,
    data: ActualizarDetallesDocumentoOfertaData // Ya viene validado y transformado por el schema
): Promise<ActionResult<OfertaDocumentoItemType>> {
    if (!documentoId) return { success: false, error: "Falta ID de documento." };

    const validation = ActualizarDetallesDocumentoOfertaSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { documentoNombre, descripcion } = validation.data;

    try {
        const docExistente = await prisma.ofertaDocumento.findFirst({
            where: { id: documentoId, ofertaId: ofertaId } // Asegurar que pertenece a la oferta
        });
        if (!docExistente) return { success: false, error: "Documento no encontrado o no pertenece a esta oferta." };

        const dataToUpdate: Prisma.OfertaDocumentoUpdateInput = {};
        if (documentoNombre !== undefined) dataToUpdate.documentoNombre = documentoNombre;
        if (descripcion !== undefined) dataToUpdate.descripcion = descripcion;

        if (Object.keys(dataToUpdate).length === 0) {
            const parsedCurrent = OfertaDocumentoItemSchema.parse(docExistente);
            return { success: true, data: parsedCurrent, error: "No hay detalles para actualizar." };
        }

        const docActualizado = await prisma.ofertaDocumento.update({
            where: { id: documentoId }, data: dataToUpdate,
        });

        const parsedUpdated = OfertaDocumentoItemSchema.parse(docActualizado);
        revalidatePath(getPathToOfertaEdicion(clienteId, negocioId, ofertaId));
        return { success: true, data: parsedUpdated };
    } catch (error: unknown) {
        // ... (manejo de error similar a la galería)
        console.error(`Error actualizando detalles de documento ${documentoId}:`, error);
        return { success: false, error: `Error al actualizar detalles: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function eliminarDocumentoDeOfertaAction(
    documentoId: string, negocioId: string, clienteId: string, ofertaId: string
): Promise<ActionResult<void>> {
    if (!documentoId || !negocioId) return { success: false, error: "Faltan IDs requeridos." };
    try {
        const documento = await prisma.ofertaDocumento.findUnique({
            where: { id: documentoId, ofertaId: ofertaId }, // Asegurar que pertenece a la oferta
            select: { documentoUrl: true, documentoTamanoBytes: true }
        });
        if (!documento) return { success: false, error: "Documento no encontrado." };

        await prisma.$transaction(async (tx) => {
            await tx.ofertaDocumento.delete({ where: { id: documentoId } });
            if (documento.documentoUrl) {
                // Usar la función genérica de eliminación de archivos
                const delRes = await eliminarArchivoStorage(documento.documentoUrl);
                if (!delRes.success) console.warn(`Error eliminando de Storage (${documento.documentoUrl}): ${delRes.error}`);
            }
            if (documento.documentoTamanoBytes && documento.documentoTamanoBytes > 0) {
                await tx.negocio.update({ // Actualizar contador de almacenamiento
                    where: { id: negocioId },
                    data: { almacenamientoUsadoBytes: { decrement: documento.documentoTamanoBytes } },
                });
            }
        });
        revalidatePath(getPathToOfertaEdicion(clienteId, negocioId, ofertaId));
        return { success: true };
    } catch (error: unknown) {
        // ... (manejo de error similar a la galería)
        console.error(`Error eliminando documento ${documentoId}:`, error);
        return { success: false, error: `Error al eliminar documento: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function actualizarOrdenDocumentosOfertaAction(
    ofertaId: string, negocioId: string, clienteId: string,
    ordenes: ReordenarDocumentosOfertaData // Ya viene validado por el schema
): Promise<ActionResult<void>> {
    if (!ofertaId) return { success: false, error: "ID de oferta requerido." };

    const validation = ReordenarDocumentosOfertaSchema.safeParse(ordenes);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de orden inválidos.",
            errorDetails: Object.fromEntries(
                Object.entries(validation.error.flatten().fieldErrors)
                    .map(([key, value]) => [String(key), value ?? []])
            ) as Record<string, string[]>
        };
    }
    const ordenesValidadas = validation.data;
    if (ordenesValidadas.length === 0) return { success: true }; // Nada que hacer

    try {
        await prisma.$transaction(
            ordenesValidadas.map((doc) =>
                prisma.ofertaDocumento.update({
                    where: { id: doc.id, ofertaId: ofertaId }, // Asegurar que el doc pertenece a la oferta
                    data: { orden: doc.orden },
                })
            )
        );
        revalidatePath(getPathToOfertaEdicion(clienteId, negocioId, ofertaId));
        return { success: true };
    } catch (error) {
        // ... (manejo de error similar a la galería)
        console.error(`Error actualizando orden de documentos para oferta ${ofertaId}:`, error);
        return { success: false, error: `Error al guardar orden: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}