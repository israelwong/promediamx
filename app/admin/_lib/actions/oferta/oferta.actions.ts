// Sugerencia de Ruta: @/app/admin/_lib/actions/oferta/oferta.actions.ts
'use server';

// import prisma from '@/app/admin/_lib/prismaClient'; // Ajustado para nueva estructura
// import { ActionResult } from '@/app/admin/_lib/types'; // Ajustado para nueva estructura
// import { Prisma, Oferta as PrismaOferta } from '@prisma/client';
// import { revalidatePath } from 'next/cache';
// import { eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions';
// import { llamarGeminiParaMejorarTexto, llamarGeminiMultimodalParaGenerarDescripcion } from '@/scripts/gemini/gemini.actions';

// import {
//     OfertaParaListaSchema,
//     type OfertaParaListaType,
//     CrearOfertaBasicaDataSchema,
//     type CrearOfertaBasicaData,
//     EditarOfertaDataSchema,
//     type EditarOfertaData,
//     // OfertaCompletaSchema // Si se usa para obtenerOfertaPorId
// } from './oferta.schemas'; // Importar desde el archivo de schemas local

// Helper para la ruta de revalidación
// const getPathToOfertasLista = (clienteId: string, negocioId: string) => {
//     return `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`;
// };
// const getPathToOfertaDetalle = (clienteId: string, negocioId: string, ofertaId: string) => {
//     return `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`;
// };


// export async function obtenerOfertasNegocio(
//     negocioId: string
// ): Promise<ActionResult<OfertaParaListaType[]>> {
//     if (!negocioId) {
//         return { success: false, error: "ID de negocio no proporcionado." };
//     }
//     try {
//         const ofertasDb = await prisma.oferta.findMany({
//             where: { negocioId: negocioId },
//             select: {
//                 id: true,
//                 nombre: true,
//                 descripcion: true,
//                 fechaInicio: true,
//                 fechaFin: true,
//                 status: true,
//                 codigo: true,
//                 tipoOferta: true,
//                 OfertaGaleria: {
//                     orderBy: { orden: 'asc' },
//                     take: 1,
//                     select: { imageUrl: true }
//                 }
//             },
//             orderBy: { fechaInicio: 'desc' },
//         });

//         const ofertasParaLista = ofertasDb.map(oferta => ({
//             ...oferta,
//             // Asegurar que los campos sean compatibles con OfertaParaListaSchema
//             // Prisma devuelve Date, Zod espera Date.
//             // Si status o tipoOferta no son enums en Prisma, el schema Zod los validará.
//             status: oferta.status as OfertaParaListaType['status'], // Cast si es necesario o validar
//             tipoOferta: oferta.tipoOferta as OfertaParaListaType['tipoOferta'], // Cast si es necesario o validar
//             imagenPortadaUrl: oferta.OfertaGaleria?.[0]?.imageUrl || null,
//         }));

//         // Validar cada oferta con el schema Zod
//         const validationResults = ofertasParaLista.map(of => OfertaParaListaSchema.safeParse(of));
//         const validOfertas: OfertaParaListaType[] = [];
//         const validationErrors: string[] = [];

//         validationResults.forEach((res, index) => {
//             if (res.success) {
//                 validOfertas.push(res.data);
//             } else {
//                 console.warn(`Datos de oferta inválidos para ID ${ofertasDb[index]?.id}:`, res.error.flatten());
//                 // Acumular errores para posible feedback
//                 validationErrors.push(`Oferta ${ofertasDb[index]?.nombre || index + 1}: ${res.error.flatten().formErrors.join(', ')}`);
//             }
//         });

//         if (validationErrors.length > 0 && validOfertas.length !== ofertasDb.length) {
//             // Podrías decidir si devolver solo las válidas o un error general
//             console.warn("Algunas ofertas no pasaron la validación Zod:", validationErrors);
//         }

//         return { success: true, data: validOfertas };

//     } catch (error) {
//         console.error(`Error fetching ofertas for negocio ${negocioId}:`, error);
//         return { success: false, error: "Error al obtener las ofertas del negocio." };
//     }
// }

// --- OTRAS ACCIONES (Mantener stubs o refactorizar después) ---

// export async function obtenerOfertaPorId(
//     ofertaId: string,
//     // clienteId: string, // Para revalidación si esta página tiene mutaciones
//     // negocioId: string
// ): Promise<ActionResult<PrismaOferta | null>> { // Devolver tipo Prisma por ahora
//     if (!ofertaId) return { success: false, error: "ID de oferta no proporcionado." };
//     try {
//         const oferta = await prisma.oferta.findUnique({
//             where: { id: ofertaId },
//             // Incluir relaciones necesarias para el formulario de edición
//             // include: { ItemCatalogoOferta: { include: { itemCatalogo: {select: {id:true, nombre:true}}}}, OfertaGaleria: {orderBy: {orden: 'asc'}}}
//         });
//         if (!oferta) return { success: false, error: "Oferta no encontrada." };
//         return { success: true, data: oferta };
//     } catch (error) {
//         console.error(`Error fetching oferta ${ofertaId}:`, error);
//         return { success: false, error: "Error al obtener detalles de la oferta." };
//     }
// }

// export async function crearOferta(
//     negocioId: string,
//     clienteId: string, // Para revalidación
//     data: CrearOfertaBasicaData
// ): Promise<ActionResult<{ id: string }>> {
//     if (!negocioId || !clienteId) return { success: false, error: "IDs de contexto faltantes." };

//     const validationResult = CrearOfertaBasicaDataSchema.safeParse(data);
//     if (!validationResult.success) {
//         return { success: false, error: "Datos de creación inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
//     }
//     const { nombre, descripcion } = validationResult.data;

//     try {
//         const defaultTipo = 'GENERAL';
//         const defaultFechaInicio = new Date(); defaultFechaInicio.setHours(0, 0, 0, 0);
//         const defaultFechaFin = new Date(defaultFechaInicio); defaultFechaFin.setDate(defaultFechaInicio.getDate() + 7); defaultFechaFin.setHours(23, 59, 59, 999);
//         const defaultStatus = 'inactivo';

//         const nuevaOferta = await prisma.oferta.create({
//             data: {
//                 negocio: { connect: { id: negocioId } },
//                 nombre: nombre,
//                 descripcion: descripcion,
//                 tipoOferta: defaultTipo,
//                 fechaInicio: defaultFechaInicio,
//                 fechaFin: defaultFechaFin,
//                 status: defaultStatus,
//             },
//             select: { id: true }
//         });

//         revalidatePath(getPathToOfertasLista(clienteId, negocioId));
//         return { success: true, data: { id: nuevaOferta.id } };
//     } catch (error) {
//         console.error("Error creando oferta:", error);
//         return { success: false, error: "No se pudo crear la oferta." };
//     }
// }

// export async function editarOferta(
//     ofertaId: string,
//     clienteId: string, // Para revalidación
//     negocioId: string, // Para revalidación
//     data: EditarOfertaData // Tipo Zod
// ): Promise<ActionResult<PrismaOferta>> {
//     if (!ofertaId || !clienteId || !negocioId) return { success: false, error: "IDs faltantes." };

//     const validationResult = EditarOfertaDataSchema.safeParse(data);
//     if (!validationResult.success) {
//         return { success: false, error: "Datos de edición inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
//     }
//     const validData = validationResult.data;

//     try {
//         const ofertaActualizada = await prisma.oferta.update({
//             where: { id: ofertaId, negocioId: negocioId }, // Asegurar scope
//             data: {
//                 nombre: validData.nombre,
//                 descripcion: validData.descripcion,
//                 tipoOferta: validData.tipoOferta,
//                 valor: validData.tipoOferta === 'DESCUENTO_PORCENTAJE' || validData.tipoOferta === 'DESCUENTO_MONTO' ? validData.valor : null,
//                 codigo: validData.tipoOferta === 'CODIGO_PROMOCIONAL' ? validData.codigo?.toUpperCase() : null,
//                 fechaInicio: validData.fechaInicio,
//                 fechaFin: validData.fechaFin,
//                 status: validData.status,
//                 condiciones: validData.condiciones,
//                 linkPago: validData.linkPago,
//             },
//         });

//         revalidatePath(getPathToOfertasLista(clienteId, negocioId));
//         revalidatePath(getPathToOfertaDetalle(clienteId, negocioId, ofertaId));
//         return { success: true, data: ofertaActualizada };
//     } catch (error) {
//         console.error(`Error editando oferta ${ofertaId}:`, error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError) {
//             if (error.code === 'P2002' && validData.codigo) return { success: false, error: "El código promocional ya está en uso." };
//             if (error.code === 'P2025') return { success: false, error: "Oferta no encontrada." };
//         }
//         return { success: false, error: "No se pudo actualizar la oferta." };
//     }
// }

// export async function eliminarOferta(
//     ofertaId: string,
//     clienteId: string, // Para revalidación
//     negocioId: string  // Para revalidación
// ): Promise<ActionResult<void>> {
//     if (!ofertaId || !clienteId || !negocioId) return { success: false, error: "IDs faltantes." };
//     try {
//         const ofertaConGaleria = await prisma.oferta.findUnique({
//             where: { id: ofertaId, negocioId: negocioId },
//             select: { OfertaGaleria: { select: { imageUrl: true } } }
//         });
//         if (!ofertaConGaleria) return { success: false, error: "Oferta no encontrada." };

//         if (ofertaConGaleria.OfertaGaleria.length > 0) {
//             const deletePromises = ofertaConGaleria.OfertaGaleria.map(img => eliminarImagenStorage(img.imageUrl));
//             await Promise.allSettled(deletePromises);
//         }
//         await prisma.oferta.delete({ where: { id: ofertaId } });
//         revalidatePath(getPathToOfertasLista(clienteId, negocioId));
//         return { success: true };
//     } catch (error) {
//         console.error(`Error eliminando oferta ${ofertaId}:`, error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return { success: true, error: "La oferta ya había sido eliminada." };
//         return { success: false, error: "No se pudo eliminar la oferta." };
//     }
// }

// // Las acciones de IA se pueden refactorizar de manera similar usando schemas Zod para sus inputs si es necesario.
// export async function mejorarDescripcionOfertaIA(
//     ofertaId: string,
//     descripcionActual: string | null | undefined
// ): Promise<ActionResult<{ sugerencia: string }>> {
//     // ... (implementación existente, considerar validación de inputs con Zod)
//     if (!ofertaId || !descripcionActual?.trim()) return { success: false, error: "Datos insuficientes." };
//     // ... resto de la lógica
//     return { success: false, error: "Función IA no implementada completamente." }; // Placeholder
// }

// export async function generarDescripcionOfertaIA(
//     ofertaId: string
// ): Promise<ActionResult<{ sugerencia: string }>> {
//     // ... (implementación existente, considerar validación de inputs con Zod)
//     if (!ofertaId) return { success: false, error: "ID de oferta no proporcionado." };
//     // ... resto de la lógica
//     return { success: false, error: "Función IA no implementada completamente." }; // Placeholder
// }









// Sugerencia de Ruta: @/app/admin/_lib/actions/oferta/oferta.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma, Oferta as PrismaOferta } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import { eliminarImagenStorage } from '@/app/admin/_lib/imageHandler.actions';
import { llamarGeminiParaMejorarTexto, llamarGeminiMultimodalParaGenerarDescripcion } from '@/scripts/gemini/gemini.actions';

import {
    OfertaParaListaSchema,
    type OfertaParaListaType,
    CrearOfertaBasicaDataSchema,
    type CrearOfertaBasicaData,
    EditarOfertaDataSchema, // Schema para la entrada de editarOferta
    type EditarOfertaData,
    OfertaParaEditarSchema, // Schema para la salida de obtenerOfertaPorId
    type OfertaParaEditarType
} from './oferta.schemas';

const getPathToOfertasLista = (clienteId: string, negocioId: string) => {
    return `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`;
};
const getPathToOfertaDetalle = (clienteId: string, negocioId: string, ofertaId: string) => {
    return `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`;
};

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
                fechaFin: true, status: true, codigo: true, tipoOferta: true,
                OfertaGaleria: { orderBy: { orden: 'asc' }, take: 1, select: { imageUrl: true } }
            },
            orderBy: { fechaInicio: 'desc' },
        });
        const ofertasParaLista = ofertasDb.map(oferta => ({
            ...oferta,
            status: oferta.status as OfertaParaListaType['status'],
            tipoOferta: oferta.tipoOferta as OfertaParaListaType['tipoOferta'],
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

export async function crearOferta(
    negocioId: string, clienteId: string, data: CrearOfertaBasicaData
): Promise<ActionResult<{ id: string }>> {
    // ... (código del artefacto oferta_actions_v1 sin cambios funcionales)
    if (!negocioId || !clienteId) return { success: false, error: "IDs de contexto faltantes." };
    const validationResult = CrearOfertaBasicaDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos de creación inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const { nombre, descripcion } = validationResult.data;
    try {
        const defaultTipo = 'GENERAL';
        const defaultFechaInicio = new Date(); defaultFechaInicio.setHours(0, 0, 0, 0);
        const defaultFechaFin = new Date(defaultFechaInicio); defaultFechaFin.setDate(defaultFechaInicio.getDate() + 7); defaultFechaFin.setHours(23, 59, 59, 999);
        const defaultStatus = 'inactivo';
        const nuevaOferta = await prisma.oferta.create({
            data: {
                negocio: { connect: { id: negocioId } }, nombre, descripcion,
                tipoOferta: defaultTipo, fechaInicio: defaultFechaInicio,
                fechaFin: defaultFechaFin, status: defaultStatus,
            },
            select: { id: true }
        });
        revalidatePath(getPathToOfertasLista(clienteId, negocioId));
        return { success: true, data: { id: nuevaOferta.id } };
    } catch (error) {
        console.error("Error creando oferta:", error);
        return { success: false, error: "No se pudo crear la oferta." };
    }
}

// --- OBTENER OFERTA POR ID PARA EDICIÓN (REFACTORIZADA) ---
export async function obtenerOfertaPorId(
    ofertaId: string,
    negocioId: string // Para asegurar que la oferta pertenece al negocio
): Promise<ActionResult<OfertaParaEditarType | null>> {
    if (!ofertaId) return { success: false, error: "ID de oferta no proporcionado." };
    if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };

    try {
        const oferta = await prisma.oferta.findUnique({
            where: { id: ofertaId, negocioId: negocioId }, // Asegurar scope
            // Seleccionar campos necesarios para OfertaParaEditarSchema
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                tipoOferta: true,
                valor: true,
                codigo: true,
                fechaInicio: true,
                fechaFin: true,
                status: true,
                condiciones: true,
                linkPago: true,
                negocioId: true,
                createdAt: true,
                updatedAt: true,
                // Si necesitas más campos o relaciones para el form, añádelos aquí
            }
        });

        if (!oferta) {
            return { success: false, error: "Oferta no encontrada o no pertenece a este negocio." };
        }

        // Validar la salida con Zod
        const validationResult = OfertaParaEditarSchema.safeParse(oferta);
        if (!validationResult.success) {
            console.error("Error de validación Zod en obtenerOfertaPorId:", validationResult.error.flatten());
            return { success: false, error: "Datos de la oferta con formato inesperado." };
        }

        return { success: true, data: validationResult.data };
    } catch (error) {
        console.error(`Error obteniendo oferta ${ofertaId}:`, error);
        return { success: false, error: "Error al obtener los detalles de la oferta." };
    }
}

// --- EDITAR OFERTA (REFACTORIZADA) ---
export async function editarOferta(
    ofertaId: string,
    clienteId: string,
    negocioId: string,
    data: EditarOfertaData // Tipo Zod para la entrada
): Promise<ActionResult<PrismaOferta>> { // Devolver el tipo Prisma completo
    if (!ofertaId || !clienteId || !negocioId) return { success: false, error: "IDs faltantes." };

    const validationResult = EditarOfertaDataSchema.safeParse(data);
    if (!validationResult.success) {
        return { success: false, error: "Datos de edición inválidos.", errorDetails: validationResult.error.flatten().fieldErrors };
    }
    const validData = validationResult.data;

    try {
        // Asegurar que la oferta que se va a editar pertenece al negocio correcto
        const ofertaExistente = await prisma.oferta.findFirst({
            where: { id: ofertaId, negocioId: negocioId }
        });
        if (!ofertaExistente) {
            return { success: false, error: "Oferta no encontrada o no pertenece a este negocio." };
        }

        const ofertaActualizada = await prisma.oferta.update({
            where: { id: ofertaId },
            data: {
                nombre: validData.nombre,
                descripcion: validData.descripcion,
                tipoOferta: validData.tipoOferta,
                // Zod refine ya validó la lógica de valor y código según tipoOferta
                valor: validData.valor,
                codigo: validData.codigo,
                fechaInicio: validData.fechaInicio,
                fechaFin: validData.fechaFin,
                status: validData.status,
                condiciones: validData.condiciones,
                linkPago: validData.linkPago,
            },
        });

        revalidatePath(getPathToOfertasLista(clienteId, negocioId));
        revalidatePath(getPathToOfertaDetalle(clienteId, negocioId, ofertaId));
        return { success: true, data: ofertaActualizada };
    } catch (error) {
        console.error(`Error editando oferta ${ofertaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && validData.codigo) return { success: false, error: "El código promocional ya está en uso." };
            if (error.code === 'P2025') return { success: false, error: "Oferta no encontrada para actualizar." };
        }
        return { success: false, error: "No se pudo actualizar la oferta." };
    }
}

// --- ELIMINAR OFERTA (ya refactorizada, se mantiene) ---
export async function eliminarOferta(
    ofertaId: string, clienteId: string, negocioId: string
): Promise<ActionResult<void>> {
    // ... (código del artefacto oferta_actions_v1 sin cambios funcionales significativos)
    if (!ofertaId || !clienteId || !negocioId) return { success: false, error: "IDs faltantes." };
    try {
        const ofertaConGaleria = await prisma.oferta.findUnique({
            where: { id: ofertaId, negocioId: negocioId },
            select: { OfertaGaleria: { select: { imageUrl: true } } }
        });
        if (!ofertaConGaleria) return { success: false, error: "Oferta no encontrada." };
        if (ofertaConGaleria.OfertaGaleria.length > 0) {
            const deletePromises = ofertaConGaleria.OfertaGaleria.map(img => eliminarImagenStorage(img.imageUrl));
            await Promise.allSettled(deletePromises);
        }
        await prisma.oferta.delete({ where: { id: ofertaId } });
        revalidatePath(getPathToOfertasLista(clienteId, negocioId));
        revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}`); // Revalidar página del negocio
        return { success: true };
    } catch (error) {
        console.error(`Error eliminando oferta ${ofertaId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') return { success: true, error: "La oferta ya había sido eliminada." };
        return { success: false, error: "No se pudo eliminar la oferta." };
    }
}

// --- ACCIONES IA (se mantienen, podrían usar schemas Zod para sus inputs si se desea más adelante) ---
export async function mejorarDescripcionOfertaIA(
    ofertaId: string, descripcionActual: string | null | undefined
): Promise<ActionResult<{ sugerencia: string }>> {
    // ... (código del artefacto oferta_actions_v1)
    if (!ofertaId || !descripcionActual?.trim()) return { success: false, error: "Datos insuficientes." };
    try {
        const oferta = await prisma.oferta.findUnique({ where: { id: ofertaId }, select: { nombre: true, tipoOferta: true, valor: true, codigo: true, condiciones: true } });
        if (!oferta) return { success: false, error: "Oferta no encontrada." };
        const promptContexto = `Oferta: ${oferta.nombre}, Tipo: ${oferta.tipoOferta}${oferta.valor ? `, Valor: ${oferta.valor}` : ''}${oferta.codigo ? `, Código: ${oferta.codigo}` : ''}${oferta.condiciones ? `. Condiciones: ${oferta.condiciones}` : ''}.`;
        const promptMejora = `Eres un copywriter experto. Mejora la siguiente descripción de oferta (máx 150 caracteres), manteniendo la información esencial. Contexto: ${promptContexto}. Descripción actual: "${descripcionActual.trim()}"\n\nDescripción Mejorada:`;
        const descripcionMejorada = await llamarGeminiParaMejorarTexto(promptMejora);
        if (!descripcionMejorada) throw new Error("La IA no generó sugerencia.");
        return { success: true, data: { sugerencia: descripcionMejorada.trim() } };
    } catch (error) {
        console.error(`Error en mejorarDescripcionOfertaIA (${ofertaId}):`, error);
        return { success: false, error: `Error IA: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

export async function generarDescripcionOfertaIA(
    ofertaId: string
): Promise<ActionResult<{ sugerencia: string }>> {
    // ... (código del artefacto oferta_actions_v1)
    if (!ofertaId) return { success: false, error: "ID de oferta no proporcionado." };
    try {
        const ofertaConPortada = await prisma.oferta.findUnique({ where: { id: ofertaId }, select: { nombre: true, tipoOferta: true, valor: true, codigo: true, condiciones: true, fechaInicio: true, fechaFin: true, OfertaGaleria: { orderBy: { orden: 'asc' }, take: 1, select: { imageUrl: true } } } });
        if (!ofertaConPortada) return { success: false, error: "Oferta no encontrada." };
        const imageUrl = ofertaConPortada.OfertaGaleria?.[0]?.imageUrl;
        if (!imageUrl) return { success: false, error: "La oferta no tiene imagen de portada." };
        const inicioStr = ofertaConPortada.fechaInicio.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
        const finStr = ofertaConPortada.fechaFin.toLocaleDateString('es-MX', { day: 'numeric', month: 'long' });
        const promptTexto = `Eres un copywriter. Observa la imagen y usa la info para generar una descripción atractiva (máx 300 chars) para esta oferta:\n- Nombre: ${ofertaConPortada.nombre}\n- Tipo: ${ofertaConPortada.tipoOferta}\n${ofertaConPortada.valor ? `- Valor: ${ofertaConPortada.valor}${ofertaConPortada.tipoOferta.includes('PORCENTAJE') ? '%' : '$'}\n` : ''}${ofertaConPortada.codigo ? `- Código: ${ofertaConPortada.codigo}\n` : ''}- Vigencia: Del ${inicioStr} al ${finStr}\n${ofertaConPortada.condiciones ? `- Condiciones: ${ofertaConPortada.condiciones}\n` : ''}Descripción generada:`;
        const descripcionGenerada = await llamarGeminiMultimodalParaGenerarDescripcion(promptTexto, imageUrl);
        if (typeof descripcionGenerada !== 'string' || !descripcionGenerada.trim()) throw new Error("La IA no generó descripción.");
        return { success: true, data: { sugerencia: descripcionGenerada.trim() } };
    } catch (error) {
        console.error(`Error generando descripción IA para oferta ${ofertaId}:`, error);
        return { success: false, error: `Error IA: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}
