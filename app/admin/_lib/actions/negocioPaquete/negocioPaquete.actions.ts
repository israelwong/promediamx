// Ruta: app/admin/_lib/actions/negocioPaquete/negocioPaquete.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import {
    NegocioPaqueteCreado,
    NegocioPaqueteListItem,
    NegocioPaqueteParaEditar,
    CrearNegocioPaqueteSchema,
    CrearNegocioPaqueteData,
    ActualizarNegocioPaqueteData,
    ActualizarNegocioPaqueteSchema,
    ActualizarItemsDePaqueteData,
    ActualizarItemsDePaqueteSchema,
    ItemCatalogoParaSeleccion,
    ReordenarPaquetesData,
    ReordenarPaquetesSchema,

} from './negocioPaquete.schemas';
import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client'; // Importar tipos de Prisma para errores
import { eliminarImagenStorage } from '@/app/admin/_lib/unused/imageHandler.actions'; // Asumiendo que tienes esta función para eliminar imágenes de Supabase Storage


const getPathToPaqueteEdicion = (clienteId: string, negocioId: string, paqueteId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/paquetes/${paqueteId}/editar`;

const getPathToListaPaquetes = (clienteId: string, negocioId: string) =>
    `/admin/clientes/${clienteId}/negocios/${negocioId}/paquetes`;

export async function crearNegocioPaqueteAction(
    negocioId: string,
    clienteId: string,
    data: CrearNegocioPaqueteData
): Promise<ActionResult<NegocioPaqueteCreado>> {
    if (!negocioId) return { success: false, error: "El ID del negocio es requerido." };
    const validation = CrearNegocioPaqueteSchema.safeParse(data);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { nombre, descripcionCorta, descripcion, precio, linkPago, negocioPaqueteCategoriaId } = validation.data;
    try {
        const ultimoPaquete = await prisma.negocioPaquete.findFirst({
            where: { negocioId }, orderBy: { orden: 'desc' }, select: { orden: true }
        });
        const proximoOrden = (ultimoPaquete?.orden ?? -1) + 1;
        const nuevoPaquete = await prisma.negocioPaquete.create({
            data: {
                nombre,
                descripcionCorta: descripcionCorta || null,
                descripcion: descripcion || null,
                precio,
                linkPago: linkPago || null,
                negocioId: negocioId,
                negocioPaqueteCategoriaId: negocioPaqueteCategoriaId || null,
                orden: proximoOrden,
                status: 'activo',
            },
            select: { /* ... campos de NegocioPaqueteCreadoSchema ... */
                id: true, nombre: true, descripcionCorta: true, descripcion: true, precio: true, linkPago: true, orden: true, status: true, negocioId: true, negocioPaqueteCategoriaId: true, createdAt: true, updatedAt: true,
            }
        });
        revalidatePath(getPathToListaPaquetes(clienteId, negocioId));
        return { success: true, data: nuevoPaquete };
    } catch (error: unknown) {
        console.error("Error crearNegocioPaqueteAction:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const target = error.meta?.target as string[] | undefined;
            if (target && target.includes('nombre')) { // Asumiendo unique(negocioId, nombre)
                return { success: false, error: "Ya existe un paquete con este nombre para este negocio." };
            }
        }
        return { success: false, error: "No se pudo crear el paquete." };
    }
}

// --- Acción para listar (del paso anterior, la mantenemos) ---
// --- ACCIÓN ACTUALIZADA: Para listar paquetes con más información ---
export async function obtenerPaquetesPorNegocioAction(
    negocioId: string
): Promise<ActionResult<NegocioPaqueteListItem[]>> {

    console.log("obtenerPaquetesPorNegocioAction", negocioId);
    if (!negocioId) return { success: false, error: "El ID del negocio es requerido." };
    try {
        const paquetesFromDb = await prisma.negocioPaquete.findMany({
            where: { negocioId: negocioId },
            select: {
                id: true,
                nombre: true,
                descripcionCorta: true,
                precio: true,
                orden: true,
                status: true,
                createdAt: true,
                linkPago: true,
                negocioPaqueteCategoria: { select: { id: true, nombre: true } },
                galeria: {
                    select: { imageUrl: true },
                    orderBy: { orden: 'asc' },
                    take: 1,
                },
                _count: {
                    select: {
                        videos: true,
                        // galeria: true, // Podríamos usar esto si solo necesitamos el conteo
                    }
                }
            },
            orderBy: [{ orden: 'asc' }, { nombre: 'asc' }]
        });

        const paquetesTyped: NegocioPaqueteListItem[] = paquetesFromDb.map(p => ({
            id: p.id,
            nombre: p.nombre,
            descripcionCorta: p.descripcionCorta,
            precio: p.precio,
            orden: p.orden,
            status: p.status,
            createdAt: p.createdAt,
            negocioPaqueteCategoria: p.negocioPaqueteCategoria ?? undefined,
            linkPagoConfigurado: !!p.linkPago,
            // Para tieneGaleria, verificamos si la consulta de 'galeria' (que toma 1) devolvió algo.
            // O si prefieres usar el conteo: p._count.galeria > 0 (necesitarías añadir 'galeria' al _count.select)
            tieneGaleria: p.galeria.length > 0,
            tieneVideo: p._count.videos > 0,
            imagenPortadaUrl: p.galeria.length > 0 ? p.galeria[0].imageUrl : null,
        }));
        return { success: true, data: paquetesTyped };
    } catch (error) {
        console.error("Error al obtener paquetes por negocio:", error);
        return { success: false, error: "No se pudieron obtener los paquetes." };
    }
}

// --- ACCIÓN NUEVA: Para actualizar el orden de los paquetes ---
export async function actualizarOrdenPaquetesAction(
    negocioId: string,
    clienteId: string,
    ordenes: ReordenarPaquetesData
): Promise<ActionResult<void>> {
    if (!negocioId) return { success: false, error: "ID de negocio requerido." };

    const validation = ReordenarPaquetesSchema.safeParse(ordenes);
    if (!validation.success) {
        return {
            success: false,
            error: "Datos de orden inválidos.",
            errorDetails: Object.fromEntries(
                Object.entries(validation.error.flatten().fieldErrors)
                    .filter(([v]) => Array.isArray(v) && v !== undefined)
            ) as Record<string, string[]>
        };
    }

    try {
        await prisma.$transaction(
            validation.data.map((paq) =>
                prisma.negocioPaquete.update({
                    where: { id: paq.id, negocioId: negocioId },
                    data: { orden: paq.orden },
                })
            )
        );
        revalidatePath(getPathToListaPaquetes(clienteId, negocioId));
        return { success: true };
    } catch (error) {
        console.error(`Error actualizando orden de paquetes para negocio ${negocioId}:`, error);
        return { success: false, error: `Error al guardar orden: ${error instanceof Error ? error.message : 'Desconocido'}` };
    }
}

// --- NUEVA: Acción para obtener un paquete específico para edición ---
export async function obtenerNegocioPaqueteParaEditarAction(
    paqueteId: string
): Promise<ActionResult<NegocioPaqueteParaEditar>> {
    if (!paqueteId) return { success: false, error: "El ID del paquete es requerido." };
    try {
        const paquete = await prisma.negocioPaquete.findUnique({
            where: { id: paqueteId },
            select: {
                id: true,
                nombre: true,
                descripcionCorta: true,
                descripcion: true,
                precio: true,
                linkPago: true,
                status: true,
                negocioPaqueteCategoriaId: true,
            }
     