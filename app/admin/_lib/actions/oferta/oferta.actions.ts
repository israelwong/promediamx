"use server";

import prisma from '@/app/admin/_lib/prismaClient'; // Asegúrate que la ruta a tu prismaClient sea correcta
import {
    EditarOfertaInputSchema,
    EditarOfertaDataInputType,
    OfertaParaEditarFormType,
    OfertaCompletaParaEdicionSchema,
    type OfertaCreadaOutputType, // Usaremos este tipo para el retorno
    CrearOfertaSuperSimplificadoDataInputType,
    CrearOfertaSuperSimplificadoInputSchema,
    OfertaCompletaParaManagerType,
    OfertaCompletaParaManagerSchema,
} from './oferta.schemas';

import { revalidatePath } from 'next/cache';
import { ActionResult } from '@/app/admin/_lib/types';
import { OfertaParaListaSchema, OfertaParaListaType } from './oferta.schemas';
import { z } from 'zod';
import {
    Prisma,
    TipoPagoOferta,
    EstadoOferta,
    // TipoAnticipoOferta as PrismaTipoAnticipoOferta,
    // ObjetivoCitaTipoEnum as PrismaObjetivoCitaTipo,
    TipoPagoOferta as PrismaTipoPagoOfertaEnum,
    TipoAnticipoOferta as PrismaTipoAnticipoOfertaEnum,
    ObjetivoOferta as PrismaObjetivoOfertaEnum,
    ObjetivoCitaTipoEnum as PrismaObjetivoCitaTipoEnum
} from '@prisma/client'; // Asegúrate de que este tipo esté disponible en tu Prisma Client

const getPathToOfertaList = (clienteId: string, negocioId: string) => `/admin/clientes/${clienteId}/negocios/${negocioId}/ofertas`;
const getPathToOfertaEditPage = (clienteId: string, negocioId: string, ofertaId: string) => `/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`;


// Helper para redondear a 2 decimales
function roundToTwoDecimals(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
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

export async function crearOfertaAction( // Nombre de la acción se mantiene
    negocioId: string,
    clienteId: string, // Para revalidatePath
    input: CrearOfertaSuperSimplificadoDataInputType
): Promise<ActionResult<OfertaCreadaOutputType>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio es requerido." };
    }

    const validationResult = CrearOfertaSuperSimplificadoInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("[crearOfertaAction] Error de validación Zod (super simplificado):", validationResult.error.flatten());
        return {
            success: false,
            error: "Datos de entrada inválidos para crear la oferta.",
            errorDetails: validationResult.error.flatten().fieldErrors,
        };
    }
    const data = validationResult.data; // Solo tiene nombre y descripción

    // --- Valores por defecto para una oferta recién creada (super simplificada) ---
    const fechaInicioDefault = new Date();
    fechaInicioDefault.setUTCHours(0, 0, 0, 0);

    const fechaFinDefault = new Date(fechaInicioDefault);
    fechaFinDefault.setFullYear(fechaInicioDefault.getFullYear() + 1); // 1 año de vigencia por defecto

    try {
        const nuevaOferta = await prisma.oferta.create({
            data: {
                negocioId: negocioId,
                nombre: data.nombre,
                descripcion: data.descripcion, // Será null si el input fue ""

                // --- Establecer todos los demás campos a valores por defecto o null ---
                objetivos: [], // Array vacío de PrismaObjetivoOferta. El usuario los define al editar.

                tipoPago: TipoPagoOferta.UNICO, // Default a Pago Único
                precio: null, // Sin precio por defecto
                intervaloRecurrencia: null,

                // Campos de Anticipo: todos null por defecto
                tipoAnticipo: null,
                porcentajeAnticipo: null,
                anticipo: null,

                // Campos de Objetivo Cita: todos null por defecto
                objetivoCitaTipo: null,
                objetivoCitaFecha: null,
                objetivoCitaServicioId: null,
                objetivoCitaUbicacion: null,
                objetivoCitaDuracionMinutos: null,

                // Campos con Default asignado aquí
                fechaInicio: fechaInicioDefault,
                fechaFin: fechaFinDefault,
                status: EstadoOferta.BORRADOR, // CORREGIDO: Usar el alias importado
            },
            select: { // Devolver ID y nombre para la redirección
                id: true,
                nombre: true,
            }
        });

        if (clienteId && negocioId) {
            revalidatePath(getPathToOfertaList(clienteId, negocioId));
        } else {
            revalidatePath('/admin/ofertas');
        }

        console.log("[crearOfertaAction] Oferta (super simplificada) creada exitosamente:", nuevaOferta);
        return { success: true, data: nuevaOferta };

    } catch (error: unknown) {
        console.error("[crearOfertaAction] Error al crear la oferta (super simplificada):", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2002' && (error.meta?.target as string[])?.includes('nombre') && (error.meta?.target as string[])?.includes('negocioId')) {
                return { success: false, error: `Ya existe una oferta con el nombre "${data.nombre}" para este negocio.` };
            }
            // Considerar un log más genérico para P2002 si el target no es específico o es diferente
            if (error.code === 'P2002') {
                return { success: false, error: `Ya existe una oferta con un identificador similar (Nombre u otro campo único).` };
            }
            return { success: false, error: `Error de base de datos al crear la oferta: ${error.message}` };
        }
        return { success: false, error: "No se pudo crear la oferta en la base de datos." };
    }
}


export async function obtenerOfertasNegocio(
    negocioId: string
): Promise<ActionResult<OfertaParaListaType[]>> {
    if (!negocioId) {
        return { success: false, error: "ID de Negocio no proporcionado." };
    }

    try {
        const ofertasDb = await prisma.oferta.findMany({
            where: {
                negocioId: negocioId,
                // Podrías añadir filtros adicionales aquí si es necesario, ej: status: 'activo'
                // o si la base de datos pudiera tener status en minúsculas y quieres filtrar por "activo"
                // podrías usar: OR: [{ status: 'activo' }, { status: 'ACTIVO' }]
                // pero lo ideal es que los datos en BD sean consistentes.
            },
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                status: true, // Prisma devolverá el string del enum tal como está en la BD
                fechaInicio: true,
                fechaFin: true,
                OfertaGaleria: {
                    select: { imageUrl: true },
                    orderBy: { orden: 'asc' },
                    take: 1,
                },
            },
            orderBy: {
                createdAt: 'desc',
            },
        });

        // Mapear y validar los datos para que coincidan con OfertaParaListaType
        const ofertasParaLista = ofertasDb.map(o => {
            const imagenPortada = o.OfertaGaleria && o.OfertaGaleria.length > 0 ? o.OfertaGaleria[0].imageUrl : null;

            // Normalizar el status a MAYÚSCULAS antes de pasarlo al schema Zod
            // y asegurar que sea un valor válido del enum PrismaEstadoOferta.
            // Si o.status es null o undefined, toUpperCase() fallaría.
            let statusNormalizado: EstadoOferta;
            const statusDesdeDb = o.status;

            if (typeof statusDesdeDb === 'string') {
                const upperStatus = statusDesdeDb.toUpperCase();
                // Verificar si el valor en mayúsculas es un miembro válido del enum
                if (Object.values(EstadoOferta).includes(upperStatus as EstadoOferta)) {
                    statusNormalizado = upperStatus as EstadoOferta;
                } else {
                    console.warn(`[obtenerOfertasNegocio] Status '${statusDesdeDb}' inválido para oferta ID ${o.id}. Usando BORRADOR como fallback.`);
                    statusNormalizado = EstadoOferta.BORRADOR; // O un default seguro
                }
            } else {
                console.warn(`[obtenerOfertasNegocio] Status es null o undefined para oferta ID ${o.id}. Usando BORRADOR como fallback.`);
                statusNormalizado = EstadoOferta.BORRADOR; // Fallback si status no es un string
            }

            return {
                id: o.id,
                nombre: o.nombre,
                descripcion: o.descripcion,
                status: statusNormalizado, // Usar el status normalizado
                fechaInicio: o.fechaInicio,
                fechaFin: o.fechaFin,
                imagenPortadaUrl: imagenPortada,
            };
        });

        // Validar el array completo con Zod
        // El tipo OfertaParaListaType ya espera que status sea del tipo EstadoOferta (la unión de strings)
        const validationResult = z.array(OfertaParaListaSchema).safeParse(ofertasParaLista);
        if (!validationResult.success) {
            console.error("[obtenerOfertasNegocio] Error Zod al parsear ofertas para lista:", validationResult.error.flatten());
            // Loguear los datos que fallaron la validación para más detalle
            // console.error("Datos que fallaron:", JSON.stringify(ofertasParaLista.filter((_, index) => validationResult.error.issues.some(issue => issue.path[0] === index)), null, 2));
            return { success: false, error: "Error al procesar los datos de las ofertas. Verifique la consola del servidor." };
        }

        return { success: true, data: validationResult.data };

    } catch (error: unknown) {
        console.error("[obtenerOfertasNegocio] Error al obtener ofertas:", error);
        return { success: false, error: "No se pudieron cargar las ofertas del negocio." };
    }
}







// --- Acción para Obtener Datos de Oferta para Edición ---
export async function obtenerOfertaParaEdicionAction(
    ofertaId: string,
    negocioId: string
): Promise<ActionResult<OfertaParaEditarFormType | null>> {
    if (!ofertaId || !negocioId) {
        return { success: false, error: "Se requieren IDs de oferta y negocio.", data: null };
    }
    try {
        const ofertaDb = await prisma.oferta.findUnique({
            where: { id: ofertaId, negocioId: negocioId },
            // Seleccionar todos los campos necesarios para OfertaCompletaParaEdicionSchema
            // incluyendo relaciones si el schema los espera (ej. objetivoCitaServicio si se añade)
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                precio: true,
                tipoPago: true,
                intervaloRecurrencia: true,
                objetivos: true,
                tipoAnticipo: true,
                porcentajeAnticipo: true,
                anticipo: true,
                objetivoCitaTipo: true,
                objetivoCitaFecha: true,
                objetivoCitaServicioId: true,
                objetivoCitaUbicacion: true,
                objetivoCitaDuracionMinutos: true,
                fechaInicio: true,
                fechaFin: true,
                status: true,
                negocioId: true,
                createdAt: true,
                updatedAt: true,
                // Ejemplo de relación si se necesitara:
                // objetivoCitaServicio: { select: { id: true, nombre: true } },
            }
        });

        if (!ofertaDb) {
            return { success: false, error: "Oferta no encontrada o no pertenece a este negocio.", data: null };
        }

        // Validar/transformar los datos de la DB con el schema que espera el formulario
        const parsedData = OfertaCompletaParaEdicionSchema.safeParse(ofertaDb);

        if (!parsedData.success) {
            console.error("[obtenerOfertaParaEdicionAction] Error Zod al parsear datos de DB:", parsedData.error.flatten());
            console.log("Datos que fallaron la validación:", ofertaDb); // Para depurar
            return { success: false, error: "Los datos de la oferta recuperados son inconsistentes. Contacte a soporte.", data: null, errorDetails: parsedData.error.flatten().fieldErrors };
        }
        return { success: true, data: parsedData.data };

    } catch (error: unknown) {
        console.error("[obtenerOfertaParaEdicionAction] Error:", error);
        return { success: false, error: `Error al cargar la oferta: ${error instanceof Error ? error.message : String(error)}`, data: null };
    }
}

// --- Acción para Editar/Actualizar Oferta ---
// --- Acción para Editar/Actualizar Oferta ---
export async function editarOfertaAction(
    ofertaId: string,
    clienteId: string,
    negocioId: string,
    input: EditarOfertaDataInputType
): Promise<ActionResult<OfertaParaEditarFormType | null>> {

    const validationResult = EditarOfertaInputSchema.safeParse(input);
    if (!validationResult.success) {
        console.error("[editarOfertaAction] Error de validación Zod:", validationResult.error.flatten().fieldErrors);
        return {
            success: false,
            error: "Datos de entrada inválidos.",
            errorDetails: validationResult.error.flatten().fieldErrors,
            data: null,
        };
    }
    const data = validationResult.data;

    try {
        const ofertaExistente = await prisma.oferta.findUnique({
            where: { id: ofertaId, negocioId: negocioId }
        });
        if (!ofertaExistente) {
            return { success: false, error: "Oferta no encontrada o no tiene permiso para editarla.", data: null };
        }

        let dbTipoAnticipoFinal: PrismaTipoAnticipoOfertaEnum | null = null;
        let dbPorcentajeAnticipoFinal: number | null = null;
        let dbAnticipoMontoFinal: number | null = null;

        if (data.tipoPago === PrismaTipoPagoOfertaEnum.UNICO) {
            if (data.tipoAnticipo) {
                dbTipoAnticipoFinal = data.tipoAnticipo; // Ya es del tipo Prisma enum gracias a Zod
                if (data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.PORCENTAJE) {
                    if (data.porcentajeAnticipo != null && data.precio != null && data.precio > 0) {
                        dbPorcentajeAnticipoFinal = data.porcentajeAnticipo;
                        dbAnticipoMontoFinal = roundToTwoDecimals(data.precio * (data.porcentajeAnticipo / 100));
                    } else {
                        dbTipoAnticipoFinal = null; // Invalidar si falta precio o porcentaje
                    }
                } else if (data.tipoAnticipo === PrismaTipoAnticipoOfertaEnum.MONTO_FIJO) {
                    if (data.anticipo != null) {
                        dbAnticipoMontoFinal = data.anticipo;
                        dbPorcentajeAnticipoFinal = null;
                    } else {
                        dbTipoAnticipoFinal = null; // Invalidar si falta monto
                    }
                }
            }
        }

        // Limpiar campos de cita si CITA no es un objetivo
        const esObjetivoCita = data.objetivos.includes(PrismaObjetivoOfertaEnum.CITA);

        const dataToUpdate: Prisma.OfertaUpdateInput = {
            nombre: data.nombre,
            descripcion: data.descripcion,
            precio: data.precio,
            tipoPago: data.tipoPago,
            intervaloRecurrencia: data.tipoPago === PrismaTipoPagoOfertaEnum.RECURRENTE ? data.intervaloRecurrencia : null,
            objetivos: data.objetivos,
            tipoAnticipo: dbTipoAnticipoFinal,
            porcentajeAnticipo: dbPorcentajeAnticipoFinal,
            anticipo: dbAnticipoMontoFinal,
            fechaInicio: data.fechaInicio,
            fechaFin: data.fechaFin,
            status: data.status,
            // Campos de Cita
            objetivoCitaTipo: esObjetivoCita ? data.objetivoCitaTipo : null,
            objetivoCitaFecha: esObjetivoCita && data.objetivoCitaTipo === PrismaObjetivoCitaTipoEnum.DIA_ESPECIFICO ? data.objetivoCitaFecha : null,
            objetivoCitaServicio: esObjetivoCita && data.objetivoCitaServicioId
                ? { connect: { id: data.objetivoCitaServicioId } }
                : undefined,
            objetivoCitaUbicacion: esObjetivoCita ? data.objetivoCitaUbicacion : null,
            objetivoCitaDuracionMinutos: esObjetivoCita ? data.objetivoCitaDuracionMinutos : null,
        };

        await prisma.oferta.update({
            where: { id: ofertaId },
            data: dataToUpdate,
        });

        // Re-obtener para devolver el tipo completo y actualizado
        const ofertaActualizadaParaRetorno = await obtenerOfertaParaEdicionAction(ofertaId, negocioId);

        if (!ofertaActualizadaParaRetorno.success || !ofertaActualizadaParaRetorno.data) {
            return { success: false, error: "Oferta actualizada, pero error al recargar sus datos.", data: null };
        }

        if (clienteId && negocioId) {
            revalidatePath(getPathToOfertaList(clienteId, negocioId));
            revalidatePath(getPathToOfertaEditPage(clienteId, negocioId, ofertaId));
        } else {
            revalidatePath('/admin/ofertas');
            revalidatePath(`/admin/ofertas/editar/${ofertaId}`);
        }

        return { success: true, data: ofertaActualizadaParaRetorno.data };

    } catch (error: unknown) {
        console.error("[editarOfertaAction] Error al actualizar la oferta:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "Error al actualizar: La oferta no fue encontrada.", data: null };
        }
        return { success: false, error: `Error desconocido al actualizar la oferta: ${error instanceof Error ? error.message : String(error)}`, data: null };
    }
}


// --- Acción para Obtener Datos de Oferta para el MANAGER (incluye multimedia) ---
export async function obtenerOfertaParaManagerAction( // Renombrada para claridad
    ofertaId: string,
    negocioId: string
): Promise<ActionResult<OfertaCompletaParaManagerType | null>> {
    if (!ofertaId || !negocioId) {
        return { success: false, error: "Se requieren IDs de oferta y negocio.", data: null };
    }
    try {
        const ofertaDb = await prisma.oferta.findUnique({
            where: { id: ofertaId, negocioId: negocioId },
            include: {
                // Relaciones que OfertaCompletaParaManagerSchema espera:
                OfertaGaleria: { orderBy: { orden: 'asc' } },
                videos: { orderBy: { orden: 'asc' } }, // Nombre de relación en Prisma
                documentosOferta: { orderBy: { orden: 'asc' } }, // Nombre de relación en Prisma
                // Si necesitas el nombre del servicio para objetivoCitaServicioId en el form:
                // objetivoCitaServicio: { select: { id: true, nombre: true, duracionMinutos: true } },
            }
        });

        if (!ofertaDb) {
            return { success: false, error: "Oferta no encontrada o no pertenece a este negocio.", data: null };
        }

        // Mapear los campos de Prisma a lo que espera OfertaCompletaParaManagerSchema si hay diferencias
        // Por ejemplo, Prisma devuelve Date objects, Zod espera Date objects (bien).
        // Los enums de Prisma son strings, z.nativeEnum los maneja bien.
        // La estructura de las relaciones debe coincidir.
        const dataParaValidar = {
            ...ofertaDb,
            // Asegurar que los arrays de relaciones existan, incluso si están vacíos, para el schema Zod
            OfertaGaleria: ofertaDb.OfertaGaleria || [],
            videos: ofertaDb.videos || [],
            documentosOferta: ofertaDb.documentosOferta || [],
            // Mapear explícitamente si es necesario, ej:
            // objetivoCitaServicio: ofertaDb.objetivoCitaServicio ? { ... } : null,
        };

        const validationResult = OfertaCompletaParaManagerSchema.safeParse(dataParaValidar);

        if (!validationResult.success) {
            console.error("[obtenerOfertaParaManagerAction] Error Zod al parsear datos de DB:", validationResult.error.flatten().fieldErrors);
            console.log("Datos que fallaron la validación en obtenerOfertaParaManagerAction:", dataParaValidar);
            return { success: false, error: "Los datos de la oferta recuperados son inconsistentes. Revise la consola del servidor.", data: null, errorDetails: validationResult.error.flatten().fieldErrors };
        }
        return { success: true, data: validationResult.data };

    } catch (error: unknown) {
        console.error("[obtenerOfertaParaManagerAction] Error:", error);
        return { success: false, error: `Error al cargar la oferta para el manager: ${error instanceof Error ? error.message : String(error)}`, data: null };
    }
}
