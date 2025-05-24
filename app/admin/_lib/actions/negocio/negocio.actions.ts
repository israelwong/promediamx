// @/app/admin/_lib/actions/negocio/negocio.actions.ts
'use server';
import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import slugify from 'slugify';

import {
    ActualizarNegocioInputSchema,
    ObtenerDetallesNegocioInputSchema,
    type NegocioDetallesParaEditar, // Para el tipo de retorno de obtener
    NegocioDetallesParaEditarSchema, // Para validar la salida de obtener
    VerificarSlugUnicoInputSchema,
    type VerificarSlugUnicoOutput,
} from './negocio.schemas';

import type { Negocio as PrismaNegocioType } from '@prisma/client'; // Para claridad
import { z } from 'zod'; // Asegúrate de tener Zod instalado: npm install zod


export async function generarSlugUnico(nombreNegocio: string, negocioIdActual?: string): Promise<string> {
    let baseSlug = slugify(nombreNegocio, { lower: true, strict: true, remove: /[*+~.()'"!:@]/g });
    if (!baseSlug) { // Si el nombre solo tenía caracteres especiales
        baseSlug = `negocio-${Date.now().toString().slice(-5)}`;
    }

    let slugFinal = baseSlug;
    let contador = 1;

    while (true) {
        const negocioExistente = await prisma.negocio.findUnique({
            where: { slug: slugFinal },
            select: { id: true }
        });

        // Si no existe, o si existe pero es el mismo negocio que estamos actualizando, el slug es válido.
        if (!negocioExistente || (negocioIdActual && negocioExistente.id === negocioIdActual)) {
            break;
        }

        // Si el slug ya existe y pertenece a otro negocio, genera uno nuevo.
        slugFinal = `${baseSlug}-${contador}`;
        contador++;
    }
    return slugFinal;
}

// --- Acción: obtenerDetallesNegocioParaEditar (Actualizada para incluir slug) ---
export async function obtenerDetallesNegocioParaEditar(
    negocioId: string
): Promise<PrismaNegocioType | null> { // Devuelve el tipo Prisma directamente o null
    const validation = ObtenerDetallesNegocioInputSchema.safeParse({ negocioId });
    if (!validation.success) {
        console.error("Error de validación en obtenerDetallesNegocioParaEditar:", validation.error.flatten());
        // Podrías lanzar un error o devolver null según tu manejo de errores preferido
        return null;
    }

    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            // No es necesario un select complejo si NegocioDetallesParaEditarSchema
            // se basa en NegocioFormDataSchema y este ya tiene los campos deseados.
            // Prisma devolverá todos los campos escalares por defecto.
        });

        if (!negocio) return null;

        // Validar la salida (opcional pero recomendado si quieres transformar o asegurar el tipo)
        // const parsedNegocio = NegocioDetallesParaEditarSchema.safeParse(negocio);
        // if (!parsedNegocio.success) {
        //     console.error("Error Zod al parsear datos de negocio para editar:", parsedNegocio.error.flatten());
        //     return null; // O manejar el error de otra forma
        // }
        // return parsedNegocio.data;

        return negocio; // Devolver el objeto Prisma directamente

    } catch (error) {
        console.error(`Error al obtener detalles del negocio ${negocioId}:`, error);
        return null;
    }
}



// --- Acción: actualizarDetallesNegocio (Actualizada para manejar slug) ---
export async function actualizarDetallesNegocio(
    negocioId: string,
    data: unknown // Recibe unknown para validar con Zod aquí
): Promise<ActionResult<NegocioDetallesParaEditar>> {
    const validationInput = ActualizarNegocioInputSchema.safeParse(data);
    if (!validationInput.success) {
        return { success: false, error: "Datos de entrada inválidos.", errorDetails: validationInput.error.flatten().fieldErrors };
    }

    const validatedData = validationInput.data;

    try {
        const negocioActual = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { nombre: true, slug: true } // Solo necesitamos el nombre y slug actual para la lógica del slug
        });

        if (!negocioActual) {
            return { success: false, error: "Negocio no encontrado." };
        }

        let slugParaGuardar = negocioActual.slug; // Por defecto, mantener el slug actual

        // Si se proporciona un nuevo nombre, o si se proporciona un nuevo slug,
        // o si el negocio no tiene slug y se proporciona un nombre, regenerar/validar slug.
        if (validatedData.nombre && validatedData.nombre !== negocioActual.nombre) {
            // El nombre cambió, generar nuevo slug basado en el nuevo nombre
            console.log(`[actualizarDetallesNegocio] Nombre cambió de "${negocioActual.nombre}" a "${validatedData.nombre}". Regenerando slug.`);
            slugParaGuardar = await generarSlugUnico(validatedData.nombre, negocioId);
        } else if (validatedData.slug && validatedData.slug !== negocioActual.slug) {
            // El usuario proveyó un slug diferente, verificar y usarlo si es único
            console.log(`[actualizarDetallesNegocio] Slug proporcionado manualmente: "${validatedData.slug}". Verificando unicidad.`);
            const slugVerificado = await generarSlugUnico(validatedData.slug, negocioId); // generarSlugUnico también verifica
            if (slugVerificado !== validatedData.slug.toLowerCase()) {
                // Esto podría pasar si el slug manual tenía caracteres no permitidos o ya existía y se le añadió sufijo.
                // Podrías devolver un error específico o usar el sugerido.
                console.warn(`[actualizarDetallesNegocio] Slug manual "${validatedData.slug}" fue modificado a "${slugVerificado}" para asegurar unicidad/formato.`);
            }
            slugParaGuardar = slugVerificado;
        } else if (!negocioActual.slug && validatedData.nombre) {
            // No hay slug actual, pero hay un nombre (podría ser el mismo o nuevo), generar slug
            console.log(`[actualizarDetallesNegocio] Negocio sin slug, generando a partir del nombre: "${validatedData.nombre}".`);
            slugParaGuardar = await generarSlugUnico(validatedData.nombre, negocioId);
        }

        const dataToUpdate: Prisma.NegocioUpdateInput = { ...validatedData };
        if (slugParaGuardar) { // Solo actualizar si tenemos un slug válido
            dataToUpdate.slug = slugParaGuardar;
        }


        const negocioActualizado = await prisma.negocio.update({
            where: { id: negocioId },
            data: dataToUpdate,
        });

        // Revalidar el path de la vitrina si el slug cambió
        if (negocioActualizado.slug && negocioActual.slug !== negocioActualizado.slug) {
            if (negocioActual.slug) revalidatePath(`/vd/${negocioActual.slug}`);
            revalidatePath(`/vd/${negocioActualizado.slug}`);
        }
        // Revalidar también la página de edición
        // Asumiendo que clienteId se puede obtener de alguna manera o no es crucial para revalidatePath aquí
        // revalidatePath(`/admin/clientes/[clienteId]/negocios/${negocioId}/editar`);


        const parsedData = NegocioDetallesParaEditarSchema.safeParse(negocioActualizado);
        if (!parsedData.success) {
            console.error("Error Zod al parsear datos de negocio actualizado:", parsedData.error.flatten());
            return { success: false, error: "Error al procesar datos del negocio actualizado." };
        }
        return { success: true, data: parsedData.data };

    } catch (error) {
        console.error(`Error al actualizar el negocio ${negocioId}:`, error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // El error P2002 usualmente es por campos únicos. Si el slug falló la verificación de generarSlugUnico,
            // no debería llegar aquí, pero es una salvaguarda.
            if ((error.meta?.target as string[])?.includes('slug')) {
                return { success: false, error: "El 'slug' (URL amigable) generado ya está en uso. Intenta con un nombre de negocio ligeramente diferente o ajusta el slug manualmente." };
            }
        }
        return { success: false, error: 'No se pudo actualizar el negocio.' };
    }
}

// --- NUEVA Acción: verificarSlugUnicoAction ---
export async function verificarSlugUnicoAction(
    input: z.infer<typeof VerificarSlugUnicoInputSchema>
): Promise<ActionResult<VerificarSlugUnicoOutput>> {
    const validation = VerificarSlugUnicoInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos de entrada inválidos.", errorDetails: validation.error.flatten().fieldErrors };
    }
    const { slug, negocioIdActual } = validation.data;

    // Validar formato del slug con la regex del schema (opcional, Zod ya lo hace en el cliente si se usa useForm)
    const slugFormatRegex = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;
    if (!slugFormatRegex.test(slug)) {
        return { success: true, data: { esUnico: false, sugerencia: "Formato de slug inválido. Usa solo minúsculas, números y guiones." } };
    }


    try {
        const negocioExistente = await prisma.negocio.findUnique({
            where: { slug: slug },
            select: { id: true }
        });

        if (negocioExistente && negocioExistente.id !== negocioIdActual) {
            // El slug existe y NO pertenece al negocio que se está editando
            // Generar una sugerencia
            const sugerenciaSlug = await generarSlugUnico(slug, negocioIdActual); // Le pasamos el slug actual para que intente con sufijos
            return { success: true, data: { esUnico: false, sugerencia: sugerenciaSlug } };
        }

        // El slug no existe, o existe pero pertenece al negocio actual
        return { success: true, data: { esUnico: true } };

    } catch (error) {
        console.error(`Error al verificar slug "${slug}":`, error);
        return { success: false, error: "Error al verificar la disponibilidad del slug." };
    }
}
