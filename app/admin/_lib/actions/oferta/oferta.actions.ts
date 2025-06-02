"use server";

import prisma from '@/app/admin/_lib/prismaClient'; // Asegúrate que la ruta a tu prismaClient sea correcta
import {
    EditarOfertaInputSchema,
    EditarOfertaDataInputType,
    OfertaParaEditarFormType,
    // TipoPagoOfertaType,
    // IntervaloRecurrenciaOfertaType,
    // OfertaStatusType,
    OfertaCompletaParaManagerType,
    OfertaCompletaParaManagerSchema,
    CrearOfertaDataInputType,
    CrearOfertaInputSchema,
    CrearOfertaSimplificadoInputSchema, // Nuevo schema para creación simplificada
    type CrearOfertaSimplificadoDataInputType,
    TipoAnticipoOfertaZodEnum, // Para verificar el tipo de anticipo
    UpdateOfertaDetalleInputSchema,
    type UpdateOfertaDetalleInputType,
    OfertaDetalleCompletoSchema,
    type OfertaDetalleCompletoType,
    OfertaCompletaParaEdicionSchema,
    TipoPagoOfertaEnumSchema,
} from './oferta.schemas';
import { revalidatePath } from 'next/cache';
import { ActionResult } from '@/app/admin/_lib/types';
import { OfertaParaListaSchema, OfertaParaListaType } from './oferta.schemas';
import { z } from 'zod';

// Helper para la ruta de revalidación
const getPathToOfertaList = (clienteId: string, negocioId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`;
const getPathToOfertaEditPage = (clienteId: string, negocioId: string, ofertaId: string) =>
    `${getPathToOfertaList(clienteId, negocioId)}/${ofertaId}`;


const getPathToOfertaEdicionPage = (clienteId: string, negocioId: string, ofertaId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`;
const getPathToOfertaDetalleEdicionPage = (clienteId: string, negocioId: string, ofertaId: string, ofertaDetalleId: string) =>
    `${getPathToOfertaEdicionPage(clienteId, negocioId, ofertaId)}/editar/${ofertaDetalleId}`;


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

// export async function obtenerOfertaPorId(
//     ofertaId: string,
//     negocioIdVerificar: string
// ): Promise<{ success: boolean; data?: OfertaParaEditarFormType; error?: string }> {
//     try {
//         const oferta = await prisma.oferta.findUnique({
//             where: { id: ofertaId, negocioId: negocioIdVerificar },
//             select: { // Seleccionar solo los campos necesarios para ESTE formulario
//                 id: true,
//                 nombre: true,
//                 descripcion: true,
//                 precio: true,
//                 tipoPago: true,
//                 intervaloRecurrencia: true,
//                 fechaInicio: true,
//                 fechaFin: true,
//                 status: true,
//             }
//         });

//         if (!oferta) {
//             return { success: false, error: "Oferta no encontrada o no pertenece al negocio." };
//         }
//         // Asegurar que los enums tengan valores válidos o defaults
//         return {
//             success: true,
//             data: {
//                 ...oferta,
//                 negocioId: negocioIdVerificar, // Asegurar que el negocioId esté presente
//                 tipoPago: oferta.tipoPago as TipoPagoOfertaType, // Castear si es necesario o asegurar que el tipo de DB coincida
//                 intervaloRecurrencia: oferta.intervaloRecurrencia as IntervaloRecurrenciaOfertaType | null,
//                 status: oferta.status as OfertaStatusType,
//                 objetivos: (oferta as { objetivos?: OfertaParaEditarFormType['objetivos'] }).objetivos ?? [], // Asegúrate de que la propiedad objetivos esté presente
//             }
//         };
//     } catch (error) {
//         console.error("Error en obtenerOfertaPorId:", error);
//         return { success: false, error: "Error al obtener la oferta." };
//     }
// }

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

// La acción editarOferta y las demás no cambian su firma por esta corrección.
// export async function editarOferta(
//     ofertaId: string,
//     clienteId: string,
//     negocioId: string,
//     input: EditarOfertaDataInputType
// ): Promise<{ success: boolean; data?: OfertaParaEditarFormType; error?: string; errorDetails?: Record<string, string[]> }> {
//     const validationResult = EditarOfertaInputSchema.safeParse(input);
//     if (!validationResult.success) {
//         return {
//             success: false,
//             error: "Datos de entrada inválidos.",
//             errorDetails: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
//         };
//     }
//     const data = validationResult.data;

//     try {
//         const ofertaExistente = await prisma.oferta.findFirst({
//             where: { id: ofertaId, negocioId: negocioId }
//         });
//         if (!ofertaExistente) {
//             return { success: false, error: "Oferta no encontrada o no tiene permiso para editarla." };
//         }

//         const ofertaActualizada = await prisma.oferta.update({
//             where: { id: ofertaId },
//             data: {
//                 nombre: data.nombre,
//                 descripcion: data.descripcion,
//                 precio: data.precio,
//                 tipoPago: data.tipoPago,
//                 intervaloRecurrencia: data.tipoPago === 'RECURRENTE' ? data.intervaloRecurrencia : null,
//                 fechaInicio: data.fechaInicio,
//                 fechaFin: data.fechaFin,
//                 status: data.status,
//             },
//         });

//         revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
//         revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`);
//         return {
//             success: true,
//             data: {
//                 ...ofertaActualizada,
//                 tipoPago: (ofertaActualizada.tipoPago ?? "UNICO") as TipoPagoOfertaType,
//                 intervaloRecurrencia: ofertaActualizada.intervaloRecurrencia as IntervaloRecurrenciaOfertaType | null,
//                 status: ofertaActualizada.status as OfertaStatusType,
//                 objetivos: ofertaActualizada.objetivos as OfertaParaEditarFormType['objetivos'],
//                 negocioId: ofertaActualizada.negocioId,
//             }
//         };

//     } catch (error) {
//         console.error("Error en editarOferta:", error);
//         return { success: false, error: "Error al actualizar la oferta." };
//     }
// }


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

export async function crearOfertaAction( // Renombrar si prefieres, o sobrecargar con nuevo tipo
    negocioId: string,
    clienteId: string,
    input: CrearOfertaSimplificadoDataInputType
): Promise<ActionResult<{ id: string; nombre: string }>> { // Devolvemos el ID y nombre
    if (!negocioId || !clienteId) {
        return { success: false, error: "IDs de negocio y cliente son requeridos." };
    }

    const validationResult = CrearOfertaSimplificadoInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("Error de validación al crear oferta (simplificado):", validationResult.error.flatten());
        return {
            success: false,
            error: "Datos de entrada inválidos.",
            errorDetails: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
        };
    }
    const data = validationResult.data;

    // Calcular campos de anticipo para la DB
    let dbAnticipo: number | null = null;
    let dbPorcentajeAnticipo: number | null = null;
    let dbTipoAnticipo: string | null = data.tipoAnticipo || null; // Será 'PORCENTAJE' o 'MONTO_FIJO' o null

    if (data.tipoPago === 'UNICO' && data.tipoAnticipo && data.valorAnticipo) {
        if (data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.PORCENTAJE) {
            dbPorcentajeAnticipo = data.valorAnticipo; // Guardamos el porcentaje
            if (data.precio) { // Solo calculamos el monto si hay precio total
                dbAnticipo = (data.precio * data.valorAnticipo) / 100;
            }
        } else if (data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO) {
            dbAnticipo = data.valorAnticipo; // Guardamos el monto fijo
            dbPorcentajeAnticipo = null; // Aseguramos que porcentaje sea null
        }
    } else { // Si no es UNICO con anticipo, o no se proporcionaron valores de anticipo
        dbTipoAnticipo = null;
    }


    // Defaults para campos no presentes en el formulario simplificado
    const fechaInicioDefault = new Date();
    fechaInicioDefault.setUTCHours(0, 0, 0, 0);
    const fechaFinDefault = new Date(fechaInicioDefault);
    fechaFinDefault.setFullYear(fechaInicioDefault.getFullYear() + 1); // Por ejemplo, 1 año de vigencia

    try {
        const nuevaOferta = await prisma.oferta.create({
            data: {
                negocioId: negocioId,
                nombre: data.nombre,
                descripcion: data.descripcion,
                objetivos: data.objetivos,

                // Precios y pagos
                tipoPago: data.tipoPago,
                precio: data.precio,
                intervaloRecurrencia: data.tipoPago === 'RECURRENTE' ? data.intervaloRecurrencia : null,

                // Campos de Anticipo para la DB
                tipoAnticipo: dbTipoAnticipo,
                porcentajeAnticipo: dbPorcentajeAnticipo,
                anticipo: dbAnticipo,

                // Campos con Default asignado por la action
                fechaInicio: fechaInicioDefault,
                fechaFin: fechaFinDefault,
                status: 'borrador', // O 'inactivo'
            },
            select: { // Devolver solo lo necesario
                id: true,
                nombre: true,
            }
        });

        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
        return { success: true, data: nuevaOferta };

    } catch (error: unknown) {
        console.error("Error en crearOfertaAction (simplificado):", error);
        // ... (tu manejo de errores de Prisma existente)
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


export async function editarOfertaAction( // Renombrar o asegurar que esta sea la que se usa
    ofertaId: string,
    clienteId: string,
    negocioId: string,
    input: EditarOfertaDataInputType
): Promise<ActionResult<OfertaParaEditarFormType>> { // Devolver el objeto actualizado
    const validationResult = EditarOfertaInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("Error de validación Zod al editar oferta:", validationResult.error.flatten());
        return {
            success: false,
            error: "Datos de entrada inválidos.",
            errorDetails: validationResult.error.flatten().fieldErrors as Record<string, string[]>,
        };
    }
    const data = validationResult.data;

    try {
        const ofertaExistente = await prisma.oferta.findFirst({
            where: { id: ofertaId, negocioId: negocioId }
        });
        if (!ofertaExistente) {
            return { success: false, error: "Oferta no encontrada o no tiene permiso para editarla." };
        }

        // Lógica para calcular y preparar campos de anticipo para la DB
        let dbAnticipoFinal: number | null = null;
        let dbPorcentajeAnticipoFinal: number | null = null;
        let dbTipoAnticipoFinal: string | null = data.tipoAnticipo || null;

        if (data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO && data.tipoAnticipo && data.precio != null) {
            if (data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.PORCENTAJE && data.porcentajeAnticipo != null) {
                dbPorcentajeAnticipoFinal = data.porcentajeAnticipo;
                dbAnticipoFinal = (data.precio * data.porcentajeAnticipo) / 100;
            } else if (data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO && data.anticipo != null) {
                dbAnticipoFinal = data.anticipo; // 'anticipo' del schema Zod representa el monto fijo
                dbPorcentajeAnticipoFinal = null;
            } else { // Si hay tipo de anticipo pero no el valor correspondiente, o no hay precio
                dbTipoAnticipoFinal = null; // Invalidar el tipo de anticipo si falta data
                dbPorcentajeAnticipoFinal = null;
                dbAnticipoFinal = null;
            }
        } else { // Si no es PAGO_UNICO o no hay tipoAnticipo, limpiar campos de anticipo
            dbTipoAnticipoFinal = null;
            dbPorcentajeAnticipoFinal = null;
            dbAnticipoFinal = null;
        }

        const ofertaActualizada = await prisma.oferta.update({
            where: { id: ofertaId },
            data: {
                nombre: data.nombre,
                descripcion: data.descripcion,
                // codigo: data.codigo, // Si decides incluirlo
                precio: data.precio,
                tipoPago: data.tipoPago,
                intervaloRecurrencia: data.tipoPago === 'RECURRENTE' ? data.intervaloRecurrencia : null,
                objetivos: data.objetivos,

                tipoAnticipo: dbTipoAnticipoFinal,
                porcentajeAnticipo: dbPorcentajeAnticipoFinal,
                anticipo: dbAnticipoFinal,

                fechaInicio: data.fechaInicio,
                fechaFin: data.fechaFin,
                status: data.status,
            },
        });

        // Parsear la data actualizada con el schema que espera el formulario para asegurar consistencia
        const parsedData = OfertaCompletaParaEdicionSchema.parse(ofertaActualizada);

        revalidatePath(getPathToOfertaList(clienteId, negocioId));
        revalidatePath(getPathToOfertaEditPage(clienteId, negocioId, ofertaId));

        return { success: true, data: parsedData };

    } catch (error: unknown) {
        console.error("Error en editarOfertaAction:", error);
        // ... (manejo de errores de Prisma como lo tenías)
        return { success: false, error: "Error al actualizar la oferta." };
    }
}