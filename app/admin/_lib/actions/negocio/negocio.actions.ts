'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import slugify from 'slugify';
import { Prisma } from '@prisma/client';

import {
    NegocioProfileSchema,
    UpdateNegocioProfileInputSchema,
    VerificarSlugUnicoInputSchema,
    NegocioHeaderData,
    UpdateNegocioNombreInput,
    NegocioHeaderDataSchema,
    updateNegocioNombreSchema,
} from './negocio.schemas';

import type {
    NegocioProfileType,
    UpdateNegocioProfileInputType,
} from './negocio.schemas';

/**
 * Genera un slug único a partir del nombre de un negocio, 
 * verificando en la base de datos para evitar colisiones.
 */
async function generarSlugUnico(nombreNegocio: string, negocioIdActual?: string): Promise<string> {
    let baseSlug = slugify(nombreNegocio, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
    if (!baseSlug) baseSlug = `negocio-${Date.now().toString().slice(-5)}`;

    let slugFinal = baseSlug;
    let contador = 1;
    while (true) {
        const negocioExistente = await prisma.negocio.findUnique({
            where: { slug: slugFinal },
            select: { id: true }
        });

        if (!negocioExistente || (negocioIdActual && negocioExistente.id === negocioIdActual)) {
            break;
        }

        slugFinal = `${baseSlug}-${contador}`;
        contador++;
    }
    return slugFinal;
}


/**
 * Obtiene los datos del perfil de un negocio para el formulario de edición.
 * Si el negocio no tiene un slug, genera uno sugerido.
 */
export async function getNegocioProfileForEdit(negocioId: string): Promise<ActionResult<NegocioProfileType>> {
    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                id: true, nombre: true, slug: true, logo: true, slogan: true,
                telefonoLlamadas: true, telefonoWhatsapp: true, email: true,
                direccion: true, googleMaps: true, paginaWeb: true, status: true,
            }
        });

        if (!negocio) {
            return { success: false, error: "Negocio no encontrado." };
        }

        // Si el negocio no tiene slug, generar uno sugerido sobre la marcha
        if (!negocio.slug) {
            negocio.slug = await generarSlugUnico(negocio.nombre);
        }

        const validation = NegocioProfileSchema.safeParse(negocio);
        if (!validation.success) {
            console.error("Error Zod en getNegocioProfileForEdit:", validation.error.flatten());
            return { success: false, error: "Los datos del perfil del negocio son inconsistentes." };
        }
        return { success: true, data: validation.data };

    } catch {
        return { success: false, error: "Error al cargar el perfil del negocio." };
    }
}

/**
 * Actualiza el perfil de un negocio, manejando inteligentemente la actualización del slug.
 */
export async function updateNegocioProfile(
    negocioId: string,
    input: UpdateNegocioProfileInputType
): Promise<ActionResult<NegocioProfileType>> {

    const validation = UpdateNegocioProfileInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos de entrada inválidos.", validationErrors: validation.error.flatten().fieldErrors };
    }

    const validatedData = validation.data;

    try {
        const negocioActual = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { nombre: true, slug: true }
        });

        if (!negocioActual) {
            return { success: false, error: "Negocio no encontrado." };
        }

        const dataToUpdate: Prisma.NegocioUpdateInput = { ...validatedData };

        // Lógica de actualización del slug
        const nombreCambiado = validatedData.nombre && validatedData.nombre !== negocioActual.nombre;
        const slugManualCambiado = validatedData.slug && validatedData.slug !== negocioActual.slug;
        const necesitaSlugNuevo = !negocioActual.slug && validatedData.nombre;

        if (nombreCambiado || slugManualCambiado || necesitaSlugNuevo) {
            console.log("Detectado cambio de nombre o slug, regenerando...");
            dataToUpdate.slug = await generarSlugUnico(validatedData.slug || validatedData.nombre!, negocioId);
        }

        const updatedNegocio = await prisma.negocio.update({
            where: { id: negocioId },
            data: dataToUpdate,
        });

        revalidatePath(`/admin/clientes/`); // Revalidar una ruta general
        revalidatePath(`/vd/${updatedNegocio.slug}`); // Revalidar vitrina digital

        return await getNegocioProfileForEdit(negocioId);

    } catch (error) {
        console.error("Error al actualizar el perfil del negocio:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            return { success: false, error: "El 'slug' (URL amigable) ya está en uso. Intenta con un nombre o slug diferente." };
        }
        return { success: false, error: "No se pudo actualizar el perfil." };
    }
}

/**
 * Verifica si un slug es único en la base de datos, excluyendo el negocio actual.
 */
export async function verifySlugUniqueness(input: z.infer<typeof VerificarSlugUnicoInputSchema>): Promise<ActionResult<{ isUnique: boolean, suggestion?: string }>> {
    try {
        const { slug, negocioIdActual } = input;

        const existing = await prisma.negocio.findUnique({
            where: { slug: slug },
            select: { id: true }
        });

        if (existing && existing.id !== negocioIdActual) {
            const suggestion = `${slug}-${Math.random().toString(36).substring(2, 6)}`;
            return { success: true, data: { isUnique: false, suggestion } };
        }

        return { success: true, data: { isUnique: true } };
    } catch {
        return { success: false, error: "Error al verificar el slug." };
    }
}




/**
 * Obtiene los datos necesarios para mostrar en la cabecera del negocio.
 */
export async function obtenerDatosHeaderNegocio(negocioId: string): Promise<ActionResult<NegocioHeaderData>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { id: true, nombre: true, status: true }
        });

        if (!negocio) {
            return { success: false, error: "Negocio no encontrado." };
        }

        // Mapea el status del negocio al 'suscripcionStatus' que espera el header
        const dataParaValidar = {
            ...negocio,
            suscripcionStatus: negocio.status === 'activo' ? 'activa' : 'inactiva',
        };

        const validation = NegocioHeaderDataSchema.safeParse(dataParaValidar);
        if (!validation.success) {
            console.error("Error Zod en obtenerDatosHeaderNegocio:", validation.error);
            return { success: false, error: "Los datos del negocio tienen un formato inesperado." };
        }

        return { success: true, data: validation.data };

    } catch (error) {
        console.error("Error al obtener datos de la cabecera del negocio:", error);
        return { success: false, error: "Error al cargar los datos de la cabecera." };
    }
}

/**
 * Actualiza únicamente el nombre de un negocio.
 */
export async function actualizarNombreNegocio(negocioId: string, input: UpdateNegocioNombreInput): Promise<ActionResult<null>> {
    const validation = updateNegocioNombreSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Nombre inválido.", validationErrors: validation.error.flatten().fieldErrors };
    }

    try {
        await prisma.negocio.update({
            where: { id: negocioId },
            data: { nombre: validation.data.nombre },
        });

        revalidatePath(`/admin/clientes`); // Revalidar una ruta general
        return { success: true, data: null };
    } catch (error) {
        console.error("Error al actualizar el nombre:", error);
        return { success: false, error: "No se pudo actualizar el nombre." };
    }
}

/**
 * ARCHIVAR (Soft Delete): Cambia el estado del negocio a 'inactivo'.
 */
export async function archiveNegocio(negocioId: string, clienteId: string): Promise<ActionResult<null>> {
    if (!negocioId || !clienteId) {
        return { success: false, error: "Se requieren los IDs de negocio y cliente." };
    }
    try {
        await prisma.negocio.update({
            where: { id: negocioId },
            data: { status: 'inactivo' },
        });
        revalidatePath(`/admin/clientes/${clienteId}`);
        return { success: true, data: null };
    } catch (error) {
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
            return { success: false, error: "No se encontró el negocio para archivar." };
        }
        return { success: false, error: "Ocurrió un error al archivar el negocio." };
    }
}

/**
 * ELIMINAR DEFINITIVAMENTE: Borra un negocio y sus datos asociados en cascada.
 */
export async function deleteNegocioDefinitivamente(negocioId: string, clienteId: string): Promise<ActionResult<null>> {
    if (!negocioId || !clienteId) {
        return { success: false, error: "Se requieren los IDs de negocio y cliente." };
    }
    try {
        await prisma.negocio.delete({
            where: { id: negocioId },
        });
        revalidatePath(`/admin/clientes/${clienteId}`);
        return { success: true, data: null };
    } catch (error) {
        console.error("Error al eliminar negocio:", error);
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            if (error.code === 'P2025') {
                return { success: false, error: "No se encontró el negocio para eliminar." };
            }
            if (error.code === 'P2014') {
                return { success: false, error: "No se puede eliminar el negocio porque tiene datos relacionados protegidos." };
            }
        }
        return { success: false, error: "Ocurrió un error al eliminar el negocio." };
    }
}




export async function getMensajeBienvenida(negocioId: string) {
    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { mensajeBienvenida: true },
        });
        return { success: true, data: negocio?.mensajeBienvenida || '' };
    } catch {
        return { success: false, error: "No se pudo cargar el mensaje." };
    }
}

/**
 * Actualiza el mensaje de bienvenida de un negocio.
 */
export async function updateMensajeBienvenida(negocioId: string, mensaje: string) {
    const schema = z.string().min(10, "El mensaje debe tener al menos 10 caracteres.");
    const validation = schema.safeParse(mensaje);

    if (!validation.success) {
        return { success: false, error: validation.error.flatten().formErrors[0] };
    }

    try {
        await prisma.negocio.update({
            where: { id: negocioId },
            data: { mensajeBienvenida: validation.data },
        });
        revalidatePath(`/admin/ruta/a/la/configuracion`); // Ajusta esta ruta
        return { success: true, message: "Mensaje de bienvenida guardado." };
    } catch {
        return { success: false, error: "No se pudo guardar el mensaje." };
    }
}