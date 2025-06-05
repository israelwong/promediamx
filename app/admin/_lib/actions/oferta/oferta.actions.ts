"use server";

import prisma from '@/app/admin/_lib/prismaClient'; // Asegúrate que la ruta a tu prismaClient sea correcta
import {
    EditarOfertaInputSchema,
    EditarOfertaDataInputType,
    OfertaParaEditarFormType,
    OfertaCompletaParaManagerType,
    OfertaCompletaParaManagerSchema,
    CrearOfertaDataInputType,
    CrearOfertaInputSchema,
    CrearOfertaSimplificadoInputSchema, // Nuevo schema para creación simplificada
    type CrearOfertaSimplificadoDataInputType,
    UpdateOfertaDetalleInputSchema,
    type UpdateOfertaDetalleInputType,
    OfertaDetalleCompletoSchema,
    type OfertaDetalleCompletoType,
    OfertaCompletaParaEdicionSchema,

} from './oferta.schemas';

import { revalidatePath } from 'next/cache';
import { ActionResult } from '@/app/admin/_lib/types';
import { OfertaParaListaSchema, OfertaParaListaType } from './oferta.schemas';
import { z } from 'zod';
import {
    Prisma,
    TipoPagoOferta,
    TipoPagoOferta as PrismaTipoPagoOferta,
    TipoAnticipoOferta as PrismaTipoAnticipoOferta,
    IntervaloRecurrenciaOferta as PrismaIntervaloRecurrenciaOferta,
    ObjetivoOferta as PrismaObjetivoOferta
} from '@prisma/client'; // Asegúrate de que este tipo esté disponible en tu Prisma Client

// Helper para la ruta de revalidación
const getPathToOfertaList = (clienteId: string, negocioId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`;
const getPathToOfertaEditPage = (clienteId: string, negocioId: string, ofertaId: string) =>
    `${getPathToOfertaList(clienteId, negocioId)}/${ofertaId}`;


const getPathToOfertaEdicionPage = (clienteId: string, negocioId: string, ofertaId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`;
const getPathToOfertaDetalleEdicionPage = (clienteId: string, negocioId: string, ofertaId: string, ofertaDetalleId: string) =>
    `${getPathToOfertaEdicionPage(clienteId, negocioId, ofertaId)}/editar/${ofertaDetalleId}`;

// Helper para redondear a 2 decimales
function roundToTwoDecimals(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}


export async function obtenerOfertasNegocio(
    negocioId: string
): Promise<ActionResult<OfertaParaListaType[]>> {
    // ... (código del artefacto oferta_actions_v1 sin cambios funcionales)
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
    try {
        const ofertasDb = await prisma.oferta.findMany({
            where: { negocioId: negocioId },
            select: {
                id: true, nombre: true, descripcion: true, fechaInicio: true,
                fechaFin: true, status: true,
                OfertaGaleria: { orderBy: { orden: 'asc' }, take: 1, select: { imageUrl: true } }
            },
            orderBy: { fechaInicio: 'desc' },
        });
        const ofertasParaLista = ofertasDb.map(oferta => ({
            ...oferta,
            status: oferta.status as OfertaParaListaType['status'],
            imagenPortadaUrl: oferta.OfertaGaleria?.[0]?.imageUrl || null,
        }));
        const validationResults = ofertasParaLista.map(of => OfertaParaListaSchema.safeParse(of));
        const validOfertas: OfertaParaListaType[] = [];
        validationResults.forEach((res, index) => {
            if (res.success) validOfertas.push(res.data);
            else console.warn(`Datos de oferta inválidos para ID ${ofertasDb[index]?.id}:`, res.error.flatten());
        });
        return { success: true, data: validOfertas };
    } catch (error) {
        console.error(`Error fetching ofertas for negocio ${negocioId}:`, error);
        return { success: false, error: "Error al obtener las ofertas del negocio." };
    }
}

export async function eliminarOferta(ofertaId: string, clienteId: string, negocioId: string): Promise<{ success: boolean; error?: string }> {
    try {
        // Opcional: Verificar permiso del usuario
        // await verificarPermisoUsuario({ negocioId: negocioId });

        // Verificar que la oferta exista y pertenezca al negocio
        const ofertaExistente = await prisma.oferta.findFirst({
            where: { id: ofertaId, negocioId: negocioId }
        });
        if (!ofertaExistente) {
            return { success: false, error: "Oferta no encontrada o no tiene permiso para eliminarla." };
        }

        // Considerar la eliminación en cascada de archivos en Supabase Storage si hay documentos/imágenes.
        // Esto podría hacerse aquí o mediante hooks de Prisma si la lógica es compleja.
        // Por ahora, nos enfocamos en la DB.

        await prisma.oferta.delete({
            where: { id: ofertaId },
        });
        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
        return { success: true };
    } catch (error) {
        console.error("Error al eliminar oferta:", error);
        return { success: false, error: "No se pudo eliminar la oferta." };
    }
}

export async function agregarDocumentoOfertaAction(
    ofertaId: string,
    negocioId: string, // Para permisos y actualizar contador de almacenamiento
    documentoData: { documentoUrl: string; documentoNombre?: string; documentoTipo?: string; documentoTamanoBytes?: number; descripcion?: string; orden?: number }
): Promise<{ success: boolean; data?: unknown; error?: string }> {
    // 1. Validar input con Zod schema para DocumentoOfertaInput
    // 2. Verificar permisos
    // 3. Crear el registro OfertaDocumento en DB, asociado a ofertaId
    // 4. Actualizar Negocio.almacenamientoUsadoBytes incrementando documentoTamanoBytes
    // 5. RevalidatePath
    // 6. Retornar resultado
    console.log("Action conceptual: agregarDocumentoOfertaAction", ofertaId, documentoData);
    // Simulando éxito para el ejemplo del formulario
    await new Promise(resolve => setTimeout(resolve, 500)); // Simular delay
    return { success: true, data: { id: "doc_" + Math.random().toString(36).substring(7), ...documentoData, createdAt: new Date() } };
}

export async function eliminarDocumentoOfertaAction(
    ofertaId: string,
    negocioId: string, // Para permisos y actualizar contador
    documentoId: string
): Promise<{ success: boolean; error?: string }> {
    // 1. Verificar permisos
    // 2. Obtener el OfertaDocumento para saber su tamaño y url del archivo
    // 3. Eliminar el archivo de Supabase Storage usando documentoUrl
    // 4. Eliminar el registro OfertaDocumento de la DB
    // 5. Actualizar Negocio.almacenamientoUsadoBytes decrementando el tamaño del documento eliminado
    // 6. RevalidatePath
    // 7. Retornar resultado
    console.log("Action conceptual: eliminarDocumentoOfertaAction", ofertaId, documentoId);
    // Simulando éxito
    await new Promise(resolve => setTimeout(resolve, 500));
    return { success: true };
}

export async function obtenerOfertaPorIdFull(
    ofertaId: string,
    negocioIdVerificar: string
): Promise<{ success: boolean; data?: OfertaCompletaParaManagerType; error?: string }> {
    try {
        const ofertaFromDb = await prisma.oferta.findUnique({
            where: { id: ofertaId, negocioId: negocioIdVerificar },
            include: {
                OfertaGaleria: { orderBy: { orden: 'asc' } },
                videos: { orderBy: { orden: 'asc' } }, // Este es el nombre de la relación en tu Prisma Schema para OfertaVideos
                documentosOferta: { orderBy: { orden: 'asc' } },
            }
        });

        if (!ofertaFromDb) {
            return { success: false, error: "Oferta no encontrada o no pertenece al negocio." };
        }

        // Validar y transformar los datos de la DB contra nuestro Zod schema
        // Esto asegura que los tipos (especialmente enums y fechas) sean correctos.
        const validationResult = OfertaCompletaParaManagerSchema.safeParse(ofertaFromDb);

        if (!validationResult.success) {
            console.error("Error de validación de datos de oferta desde DB:", validationResult.error.flatten());
            // Podrías querer loguear validationResult.error.issues para más detalle
            return { success: false, error: "Los datos de la oferta recuperados son inválidos o tienen un formato inesperado." };
        }

        return { success: true, data: validationResult.data };

    } catch (error) {
        console.error("Error en obtenerOfertaPorIdFull:", error);
        if (error instanceof z.ZodError) { // Esto es por si el safeParse mismo fallara de forma inesperada
            return { success: false, error: "Error de Zod al procesar datos de la oferta." }
        }
        return { success: false, error: "Error al obtener la información completa de la oferta." };
    }
}

export async function crearOferta(
    negocioId: string,
    clienteId: string,
    input: CrearOfertaDataInputType
): Promise<ActionResult<{ id: string; nombre: string }>> {
    if (!negocioId || !clienteId) {
        return { success: false, error: "IDs de negocio y cliente son requeridos." };
    }

    const validationResult = CrearOfertaInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("Error de validación Zod al crear oferta:", validationResult.error.flatten());
        return {
            success: false,
            error: "Datos de entrada inválidos.",
            // Asegurar que errorDetails sea del tipo correcto
            errorDetails: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
        };
    }
    const data = validationResult.data;

    try {
        const nuevaOferta = await prisma.oferta.create({
            data: {
                negocioId: negocioId,
                nombre: data.nombre,
                descripcion: data.descripcion, // Zod ya lo transformó a null si era ""
                precio: data.precio,           // Será number o null
                tipoPago: data.tipoPago,
                intervaloRecurrencia: data.tipoPago === 'RECURRENTE' ? data.intervaloRecurrencia : null,
                objetivos: data.objetivos,
                fechaInicio: data.fechaInicio, // Zod asegura que es Date
                fechaFin: data.fechaFin,     // Zod asegura que es Date
                status: data.status,           // Zod ya puso el default si no venía
            },
            select: {
                id: true,
                nombre: true,
                fechaInicio: true,
                fechaFin: true,
                status: true,
                createdAt: true,
                updatedAt: true,
                negocioId: true,
                descripcion: true,
                precio: true,
                tipoPago: true,
                intervaloRecurrencia: true,
                objetivos: true,
                tipoAnticipo: true,
                porcentajeAnticipo: true,
                anticipo: true,
            }
        });

        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
        return { success: true, data: nuevaOferta };

    } catch (error: unknown) {
        console.error("Error en crearOferta:", error);
        return { success: false, error: "No se pudo crear la oferta en la base de datos." };
    }
}

export async function crearOfertaAction(
    negocioId: string,
    clienteId: string,
    input: CrearOfertaSimplificadoDataInputType
): Promise<ActionResult<{ id: string; nombre: string }>> {
    if (!negocioId || !clienteId) {
        return { success: false, error: "IDs de negocio y cliente son requeridos." };
    }

    const validationResult = CrearOfertaSimplificadoInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("[crearOfertaAction] Error de validación Zod:", validationResult.error.flatten());
        return {
            success: false,
            error: "Datos de entrada inválidos para crear la oferta.",
            errorDetails: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
        };
    }
    const data = validationResult.data;

    let dbTipoAnticipo: PrismaTipoAnticipoOferta | null = null;
    let dbPorcentajeAnticipo: number | null = null;
    let dbAnticipoMonto: number | null = null;

    // Lógica más estricta para anticipos:
    // Solo se procesan anticipos si tipoPago es UNICO y se han proporcionado
    // tanto el tipoAnticipo como un valorAnticipo válido.
    if (
        data.tipoPago === PrismaTipoPagoOferta.UNICO &&
        data.tipoAnticipo && // Se seleccionó un tipo de anticipo
        data.valorAnticipo != null && // Se ingresó un valor para el anticipo
        data.valorAnticipo > 0 // El valor del anticipo es positivo
    ) {
        // data.tipoAnticipo es el valor del ZodEnum (ej. "PORCENTAJE" o "MONTO_FIJO")
        // Lo casteamos al Enum de Prisma
        const tipoAnticipoPrisma = data.tipoAnticipo as PrismaTipoAnticipoOferta;

        if (tipoAnticipoPrisma === PrismaTipoAnticipoOferta.PORCENTAJE) {
            if (data.precio != null && data.precio > 0 && data.valorAnticipo >= 1 && data.valorAnticipo <= 99) {
                dbTipoAnticipo = PrismaTipoAnticipoOferta.PORCENTAJE;
                dbPorcentajeAnticipo = data.valorAnticipo; // data.valorAnticipo es el porcentaje
                dbAnticipoMonto = roundToTwoDecimals(data.precio * (data.valorAnticipo / 100));
            } else {
                // Si el porcentaje es inválido o no hay precio, no se guarda nada del anticipo.
                console.warn("[crearOfertaAction] Anticipo por porcentaje inválido o sin precio. No se guardarán datos de anticipo.");
            }
        } else if (tipoAnticipoPrisma === PrismaTipoAnticipoOferta.MONTO_FIJO) {
            // Validar que el monto fijo no sea mayor o igual al precio total (si el precio existe)
            if (data.precio != null && data.precio > 0 && data.valorAnticipo >= data.precio) {
                console.warn("[crearOfertaAction] Anticipo fijo es mayor o igual al precio. No se guardarán datos de anticipo.");
                // En este caso, podrías devolver un error de validación específico al usuario
                // return { success: false, error: "El monto de anticipo fijo no puede ser mayor o igual al precio total."};
            } else {
                dbTipoAnticipo = PrismaTipoAnticipoOferta.MONTO_FIJO;
                dbAnticipoMonto = data.valorAnticipo; // data.valorAnticipo es el monto fijo
                dbPorcentajeAnticipo = null;
            }
        }
    }
    // Si no se cumplen las condiciones anteriores, dbTipoAnticipo, dbPorcentajeAnticipo, y dbAnticipoMonto permanecerán null.

    const fechaInicioDefault = new Date();
    fechaInicioDefault.setUTCHours(0, 0, 0, 0);
    const fechaFinDefault = new Date(fechaInicioDefault);
    fechaFinDefault.setFullYear(fechaInicioDefault.getFullYear() + 1);

    try {
        const nuevaOferta = await prisma.oferta.create({
            data: {
                negocioId: negocioId,
                nombre: data.nombre,
                descripcion: data.descripcion,
                objetivos: data.objetivos as PrismaObjetivoOferta[],

                tipoPago: data.tipoPago as PrismaTipoPagoOferta,
                precio: data.precio,
                intervaloRecurrencia: data.tipoPago === PrismaTipoPagoOferta.RECURRENTE
                    ? data.intervaloRecurrencia as PrismaIntervaloRecurrenciaOferta
                    : null,

                tipoAnticipo: dbTipoAnticipo, // Será null si no se cumplieron las condiciones
                porcentajeAnticipo: dbPorcentajeAnticipo, // Será null si no aplica
                anticipo: dbAnticipoMonto, // Será null si no aplica

                fechaInicio: fechaInicioDefault,
                fechaFin: fechaFinDefault,
                status: 'borrador',
            },
            select: {
                id: true,
                nombre: true,
            }
        });

        if (clienteId && negocioId) {
            revalidatePath(getPathToOfertaList(clienteId, negocioId));
        } else {
            revalidatePath('/admin/ofertas');
        }

        console.log("[crearOfertaAction] Oferta creada exitosamente:", nuevaOferta);
        return { success: true, data: nuevaOferta };

    } catch (error: unknown) {
        console.error("[crearOfertaAction] Error al crear la oferta:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002') {
                return { success: false, error: "Ya existe una oferta con un identificador similar." };
            }
            return { success: false, error: `Error de base de datos: ${error.message}` };
        }
        return { success: false, error: "No se pudo crear la oferta en la base de datos." };
    }
}


export async function obtenerOfertaDetallePorIdAction(
    ofertaDetalleId: string,
    ofertaIdVerificar: string
): Promise<ActionResult<OfertaDetalleCompletoType>> {
    if (!ofertaDetalleId || !ofertaIdVerificar) {
        return { success: false, error: "IDs requeridos faltantes para obtener detalle." };
    }
    try {
        const detalle = await prisma.ofertaDetalle.findUnique({
            where: { id: ofertaDetalleId, ofertaId: ofertaIdVerificar },
            include: {
                galeriaDetalle: { orderBy: { orden: 'asc' } },
                videoDetalle: true,
                documentosDetalle: { orderBy: { orden: 'asc' } },
            }
        });

        if (!detalle) return { success: false, error: "Detalle de oferta no encontrado." };

        const validationResult = OfertaDetalleCompletoSchema.safeParse(detalle);
        if (!validationResult.success) {
            console.error("Error Zod al parsear OfertaDetalle en obtener:", validationResult.error.flatten());
            return { success: false, error: "Formato de datos del detalle de oferta inválido." };
        }
        return { success: true, data: validationResult.data };
    } catch (error) {
        console.error("Error en obtenerOfertaDetallePorIdAction:", error);
        return { success: false, error: "No se pudo obtener el detalle de la oferta." };
    }
}

export async function updateOfertaDetalleAction(
    ofertaDetalleId: string, // ID del detalle a actualizar
    input: UpdateOfertaDetalleInputType,
    clienteId: string,
    negocioId: string,
    ofertaId: string
): Promise<ActionResult<OfertaDetalleCompletoType>> { // Devolver el tipo completo
    const validationResult = UpdateOfertaDetalleInputSchema.safeParse(input);
    if (!validationResult.success) {
        return {
            success: false,
            error: "Datos de entrada inválidos para actualizar detalle.",
            errorDetails: validationResult.error.flatten().fieldErrors,
        };
    }
    const data = validationResult.data;

    try {
        const detalleExistente = await prisma.ofertaDetalle.findFirst({
            where: {
                id: ofertaDetalleId,
                ofertaId: ofertaId, // Asegurar que pertenece a la oferta correcta
                oferta: { negocioId: negocioId } // Y al negocio correcto
            }
        });
        if (!detalleExistente) {
            return { success: false, error: "Detalle de oferta no encontrado o no modificable." };
        }

        const detalleActualizado = await prisma.ofertaDetalle.update({
            where: { id: ofertaDetalleId },
            data: {
                tituloDetalle: data.tituloDetalle,
                contenido: data.contenido,
                tipoDetalle: data.tipoDetalle,
                palabrasClave: data.palabrasClave,
                estadoContenido: data.estadoContenido,
                // 'orden' no se actualiza desde este formulario
            },
            include: {
                galeriaDetalle: true, videoDetalle: true, documentosDetalle: true,
            }
        });

        const parsedData = OfertaDetalleCompletoSchema.parse(detalleActualizado);

        revalidatePath(getPathToOfertaEdicionPage(clienteId, negocioId, ofertaId));
        revalidatePath(getPathToOfertaDetalleEdicionPage(clienteId, negocioId, ofertaId, ofertaDetalleId));

        return { success: true, data: parsedData };

    } catch (error) {
        console.error("Error en updateOfertaDetalleAction:", error);
        return { success: false, error: "No se pudo actualizar el detalle de la oferta." };
    }
}


// Acción para cargar TODOS los datos de una oferta para el formulario de edición
export async function obtenerOfertaParaEdicionAction(
    ofertaId: string,
    negocioIdVerificar: string
): Promise<ActionResult<OfertaParaEditarFormType>> {
    if (!ofertaId || !negocioIdVerificar) {
        return { success: false, error: "IDs de oferta y negocio son requeridos." };
    }
    try {
        const ofertaFromDb = await prisma.oferta.findUnique({
            where: { id: ofertaId, negocioId: negocioIdVerificar },
            // No necesitamos incluir multimedia aquí, se gestionará en otras pestañas/componentes
        });

        if (!ofertaFromDb) {
            return { success: false, error: "Oferta no encontrada o no pertenece al negocio." };
        }

        // Parsear con el schema que espera el formulario, incluyendo todos los campos
        const validationResult = OfertaCompletaParaEdicionSchema.safeParse(ofertaFromDb);
        if (!validationResult.success) {
            console.error("Error Zod al parsear oferta para edición:", validationResult.error.flatten());
            return { success: false, error: "Formato de datos de la oferta inválido." };
        }
        return { success: true, data: validationResult.data };

    } catch (error) {
        console.error("Error en obtenerOfertaParaEdicionAction:", error);
        return { success: false, error: "Error al obtener los datos de la oferta para edición." };
    }
}

export async function editarOfertaAction(
    ofertaId: string,
    clienteId: string, // Usado para revalidatePath, si aplica
    negocioId: string,
    input: EditarOfertaDataInputType // Este tipo ya es el inferido de EditarOfertaInputSchema
): Promise<ActionResult<OfertaParaEditarFormType | null>> { // Devolver null en caso de error de búsqueda

    // La validación Zod ya debería haber ocurrido en el componente que llama a esta acción
    // o al inicio de la acción si 'input' no está pre-validado.
    // Para robustez, re-validamos aquí.
    const validationResult = EditarOfertaInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("[editarOfertaAction] Error de validación Zod:", validationResult.error.flatten());
        return {
            success: false,
            error: "Datos de entrada inválidos.",
            errorDetails: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
            data: null,
        };
    }
    const data = validationResult.data;

    try {
        const ofertaExistente = await prisma.oferta.findFirst({
            where: { id: ofertaId, negocioId: negocioId }
        });
        if (!ofertaExistente) {
            return { success: false, error: "Oferta no encontrada o no tiene permiso para editarla.", data: null };
        }

        // --- Lógica Refactorizada para Campos de Anticipo ---
        let dbTipoAnticipoFinal: PrismaTipoAnticipoOferta | null = null;
        let dbPorcentajeAnticipoFinal: number | null = null;
        let dbAnticipoMontoFinal: number | null = null; // Renombrado para claridad (este es el monto calculado o fijo)

        if (data.tipoPago === TipoPagoOferta.UNICO) { // Usar Enum de Prisma directamente si es posible
            if (data.tipoAnticipo) { // Si se ha seleccionado un tipo de anticipo
                dbTipoAnticipoFinal = data.tipoAnticipo as PrismaTipoAnticipoOferta; // Asumir que data.tipoAnticipo ya es del tipo Enum Prisma o compatible

                if (data.tipoAnticipo === PrismaTipoAnticipoOferta.PORCENTAJE) {
                    if (data.porcentajeAnticipo != null && data.precio != null) {
                        dbPorcentajeAnticipoFinal = data.porcentajeAnticipo;
                        dbAnticipoMontoFinal = roundToTwoDecimals(data.precio * (data.porcentajeAnticipo / 100));
                    } else {
                        // Si es tipo PORCENTAJE pero falta el porcentaje o el precio, invalidar anticipo
                        dbTipoAnticipoFinal = null;
                    }
                } else if (data.tipoAnticipo === PrismaTipoAnticipoOferta.MONTO_FIJO) {
                    if (data.anticipo != null) { // 'anticipo' en Zod es el monto fijo
                        dbAnticipoMontoFinal = data.anticipo;
                        dbPorcentajeAnticipoFinal = null; // Asegurar que el porcentaje sea null
                    } else {
                        // Si es tipo MONTO_FIJO pero falta el monto, invalidar anticipo
                        dbTipoAnticipoFinal = null;
                    }
                }
            }
            // Si no se selecciona data.tipoAnticipo, todos los campos de anticipo permanecerán null (su valor inicial)
        }
        // Si tipoPago no es UNICO, todos los campos de anticipo permanecen null

        // --- Fin Lógica Refactorizada para Campos de Anticipo ---

        await prisma.oferta.update({
            where: { id: ofertaId },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                precio: data.precio,
                tipoPago: data.tipoPago as TipoPagoOferta, // Cast si data.tipoPago es string y no enum
                intervaloRecurrencia: data.tipoPago === TipoPagoOferta.RECURRENTE ? data.intervaloRecurrencia : null,
                objetivos: data.objetivos as PrismaObjetivoOferta[], // Asegurar compatibilidad de tipo

                tipoAnticipo: dbTipoAnticipoFinal,
                porcentajeAnticipo: dbPorcentajeAnticipoFinal,
                anticipo: dbAnticipoMontoFinal, // Guardar el monto calculado o fijo aquí

                fechaInicio: data.fechaInicio,
                fechaFin: data.fechaFin,
                status: data.status,
            },
        });

        // Volver a obtener la oferta con todas las relaciones necesarias para OfertaCompletaParaEdicionSchema
        const ofertaActualizadaConDetalles = await prisma.oferta.findUnique({
            where: { id: ofertaId },
            include: { // Asegúrate que este include coincida con lo que OfertaCompletaParaEdicionSchema espera
                negocio: { select: { id: true, nombre: true } }, // Ejemplo, ajusta según necesites
                // Aquí deberías incluir las relaciones que espera OfertaCompletaParaEdicionSchema
                // como CategoriaTarea (si aplica a Oferta), tareaFuncion (si aplica), etc.
                // Para el ejemplo, asumiré que el schema de edición no necesita tantas relaciones profundas.
                // SI tu OfertaCompletaParaEdicionSchema espera relaciones como 'CategoriaTarea'
                // o '_count', esas relaciones deben estar en este 'include' o el select.
                // Basado en el schema Zod que me diste, el select para una oferta (no tarea) sería:
                // No incluye CategoriaTarea, tareaFuncion, etiquetas, canalesSoportados, _count
                // por lo que un select más simple podría ser suficiente si OfertaCompletaParaEdicionSchema
                // realmente solo espera campos escalares y 'objetivos'.
            }
        });

        if (!ofertaActualizadaConDetalles) {
            console.error("[editarOfertaAction] Error: No se pudo re-obtener la oferta actualizada.");
            return { success: false, error: "Oferta actualizada, pero hubo un error al recargar sus datos.", data: null };
        }

        // Adaptar y parsear la oferta actualizada para que coincida con OfertaCompletaParaEdicionSchema
        // Esto puede requerir un mapeo si los tipos de Prisma (ej. enums como strings) no coinciden directamente
        // con lo que espera el schema Zod (ej. Zod enums).
        // Por ahora, haremos un parse directo asumiendo compatibilidad o que el schema maneja la coerción.
        const parsedData = OfertaCompletaParaEdicionSchema.safeParse(ofertaActualizadaConDetalles);

        if (!parsedData.success) {
            console.error("[editarOfertaAction] Error Zod al parsear oferta actualizada para retorno:", parsedData.error.flatten());
            // Loguea parsedData.error para ver el detalle del fallo de Zod
            return { success: false, error: "Oferta actualizada, pero los datos no pudieron ser validados para el formulario.", data: null, errorDetails: parsedData.error.flatten().fieldErrors as Record<string, string[]> };
        }

        // Revalidar rutas relevantes
        if (clienteId && negocioId) { // Solo revalidar si tenemos los IDs
            revalidatePath(getPathToOfertaList(clienteId, negocioId));
            revalidatePath(getPathToOfertaEditPage(clienteId, negocioId, ofertaId));
        } else {
            revalidatePath('/admin/ofertas'); // Ruta genérica si no hay clienteId/negocioId
            revalidatePath(`/admin/ofertas/editar/${ofertaId}`);
        }

        return { success: true, data: parsedData.data };

    } catch (error: unknown) {
        console.error("[editarOfertaAction] Error al actualizar la oferta:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return { success: false, error: "Error al actualizar: La oferta no fue encontrada.", data: null };
            }
            // Manejar otros errores de Prisma si es necesario
        }
        return { success: false, error: `Error desconocido al actualizar la oferta: ${error instanceof Error ? error.message : String(error)}`, data: null };
    }
}

