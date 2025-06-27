// @/app/admin/_lib/actions/negocio/negocio.actions.ts
'use server';
import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import { Prisma } from '@prisma/client';
import { revalidatePath } from 'next/cache';
import slugify from 'slugify';

import {
    // createNegocioSchema,
    negocioConDetallesSchema,
} from './negocio.schemas';
import type { NegocioConDetalles } from './negocio.schemas';

import {
    ActualizarNegocioInputSchema,
    ObtenerDetallesNegocioInputSchema,
    type NegocioDetallesParaEditar, // Para el tipo de retorno de obtener
    NegocioDetallesParaEditarSchema, // Para validar la salida de obtener
    VerificarSlugUnicoInputSchema,
    type VerificarSlugUnicoOutput,
    negocioHeaderDataSchema,
    UpdateNegocioNombreInput,
    updateNegocioNombreSchema,
    NegocioHeaderData
} from './negocio.schemas';

import type { Negocio as PrismaNegocioType } from '@prisma/client'; // Para claridad
import { z } from 'zod'; // Asegúrate de tener Zod instalado: npm install zod


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
        });

        if (!negocio) return null;
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


export async function getNegociosPorClienteIdConDetalles(
    clienteId: string
): Promise<ActionResult<NegocioConDetalles[]>> {
    if (!clienteId) {
        return { success: false, error: "El ID del cliente es requerido." };
    }
    try {
        const negociosData = await prisma.negocio.findMany({
            where: { clienteId: clienteId },
            select: {
                id: true,
                nombre: true,
                status: true,
                _count: {
                    select: { AsistenteVirtual: true, Catalogo: true }
                },
                AsistenteVirtual: {
                    where: { status: 'activo' },
                    select: {
                        // El código original referenciaba precioBase, lo incluimos
                        // precioBase: true, // Descomentar si el campo existe en el schema.prisma
                        AsistenteTareaSuscripcion: {
                            where: { status: 'activo' },
                            select: { montoSuscripcion: true, status: true }
                        }
                    }
                }
            }
        });

        // Validamos los datos de salida con nuestro esquema Zod
        const validationResult = z.array(negocioConDetallesSchema).safeParse(negociosData);
        if (!validationResult.success) {
            console.error("Error Zod en getNegociosPorClienteIdConDetalles:", validationResult.error.flatten());
            return { success: false, error: "Formato de datos de negocios inesperado." };
        }

        return { success: true, data: validationResult.data };

    } catch (error) {
        console.error(`Error al obtener negocios para el cliente ${clienteId}:`, error);
        return { success: false, error: "No se pudieron cargar los negocios." };
    }
}

/**
 * Crea un nuevo negocio para un cliente.
 */
// export async function createNegocio(input: CreateNegocioInput): Promise<ActionResult<NegocioConDetalles>> {
//     const validationResult = createNegocioSchema.safeParse(input);
//     if (!validationResult.success) {
//         return { success: false, error: "Datos de entrada inválidos.", validationErrors: validationResult.error.flatten().fieldErrors };
//     }

//     const { nombre, clienteId } = validationResult.data;
//     const slug = await generarSlugUnico(nombre);

//     try {
//         const nuevoNegocio = await prisma.negocio.create({
//             data: {
//                 nombre,
//                 clienteId,
//                 slug,
//                 status: 'activo',
//             },
//             // Incluimos los mismos campos que la lista para una respuesta consistente
//             select: {
//                 id: true,
//                 nombre: true,
//                 status: true,
//                 _count: { select: { AsistenteVirtual: true, Catalogo: true } },
//                 AsistenteVirtual: {
//                     select: {
//                         // precioBase: true, // Descomentar si existe en el modelo
//                         AsistenteTareaSuscripcion: {
//                             select: {
//                                 montoSuscripcion: true,
//                                 status: true,
//                             }
//                         }
//                     }
//                 }
//             }
//         });

//         revalidatePath(`/admin/clientes/${clienteId}`);
//         return { success: true, data: nuevoNegocio };

//     } catch (error) {
//         console.error("Error creando negocio:", error);
//         return { success: false, error: "No se pudo crear el negocio." };
//     }
// }


// --- Helpers y otras acciones (pueden mantenerse para uso futuro) ---
export async function generarSlugUnico(nombreNegocio: string, negocioIdActual?: string): Promise<string> {
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

// Esquema simple para la creación del negocio desde la UI
const createNegocioInputSchema = z.object({
    nombre: z.string().min(1, "El nombre del negocio es obligatorio."),
    clienteId: z.string().cuid("ID de cliente inválido."),
});

type CreateNegocioInput = z.infer<typeof createNegocioInputSchema>;



export async function createNegocioAndSetupEnvironment(
    input: CreateNegocioInput
): Promise<ActionResult<PrismaNegocioType>> {
    const validation = createNegocioInputSchema.safeParse(input);
    if (!validation.success) {
        return { success: false, error: "Datos inválidos", validationErrors: validation.error.flatten().fieldErrors };
    }
    const { nombre, clienteId } = validation.data;

    try {
        const resultado = await prisma.$transaction(async (tx) => {
            console.log("Iniciando transacción para crear nuevo negocio y su entorno...");

            // 1. Crear el Negocio
            const negocioCreado = await tx.negocio.create({
                data: { nombre, clienteId, status: 'activo' }
            });
            console.log(`Paso 1: Negocio "${negocioCreado.nombre}" creado.`);

            // 2. Crear el CRM
            const crmCreado = await tx.cRM.create({
                data: { negocioId: negocioCreado.id, status: 'activo' }
            });
            console.log(`Paso 2: CRM creado.`);

            // 3. Crear el Pipeline por defecto
            const pipelineStages = [
                { nombre: 'Nuevo', orden: 1 }, { nombre: 'Seguimiento', orden: 2 },
                { nombre: 'Agendado', orden: 3 }, { nombre: 'Ganado', orden: 4 }, { nombre: 'Perdido', orden: 5 },
            ];
            await tx.pipelineCRM.createMany({
                data: pipelineStages.map(stage => ({ ...stage, crmId: crmCreado.id }))
            });
            console.log(`Paso 3: Pipeline por defecto creado.`);

            // 4. Crear el Asistente Virtual
            const asistenteCreado = await tx.asistenteVirtual.create({
                data: {
                    nombre: `Asistente para ${negocioCreado.nombre}`,
                    negocioId: negocioCreado.id,
                    status: 'activo',
                    version: 1.0,
                    whatsappConnectionStatus: 'NO_CONECTADO',
                }
            });
            console.log(`Paso 4: Asistente Virtual creado.`);

            // 5. Vincular Asistente a tareas
            const tareasActivas = await tx.tarea.findMany({ where: { status: 'activo' } });
            if (tareasActivas.length > 0) {
                await tx.asistenteTareaSuscripcion.createMany({
                    data: tareasActivas.map(tarea => ({
                        asistenteVirtualId: asistenteCreado.id,
                        tareaId: tarea.id,
                        status: 'activo',
                    }))
                });
                console.log(`Paso 5: Asistente vinculado a ${tareasActivas.length} tareas.`);
            }

            return { negocioCreado };
        });

        revalidatePath(`/admin/clientes/${clienteId}`);
        return { success: true, data: resultado.negocioCreado };

    } catch (error) {
        console.error("Error en la transacción de creación de negocio:", error);
        return { success: false, error: "Ocurrió un error al crear el negocio." };
    }
}


/**
 * ARCHIVAR (Soft Delete): Cambia el estado del negocio a 'inactivo'.
 * Esta es la opción segura y recomendada para producción.
 * @param negocioId - El ID del negocio a archivar.
 * @param clienteId - El ID del cliente para revalidar la ruta correcta.
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
 * Usar con extrema precaución. Solo para desarrollo.
 * @param negocioId - El ID del negocio a eliminar.
 * @param clienteId - El ID del cliente para revalidar la ruta correcta.
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
            // Error específico si la eliminación en cascada está restringida (ej. por transacciones)
            if (error.code === 'P2014' || (error.meta?.field_name as string)?.includes('NegocioToNegocioTransaccion')) {
                return { success: false, error: "No se puede eliminar el negocio porque tiene transacciones registradas. Esta es una medida de seguridad." };
            }
        }
        return { success: false, error: "Ocurrió un error al eliminar el negocio." };
    }
}



export async function obtenerDatosHeaderNegocio(negocioId: string): Promise<ActionResult<NegocioHeaderData>> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                id: true,
                nombre: true,
                // Los campos de suscripción se simulan como en tu código original
                AsistenteVirtual: {
                    select: {
                        // precioBase: true, // Descomentar si el campo existe en el schema.prisma
                        AsistenteTareaSuscripcion: {
                            where: { status: 'activo' },
                            select: { montoSuscripcion: true, status: true }
                        }
                    }
                }
            }
        });

        if (!negocio) {
            return { success: false, error: "Negocio no encontrado." };
        }

        // Simulación de datos de suscripción para la UI
        const dataSimulada = {
            ...negocio,
            suscripcionStatus: 'activa' as const,
            estadoPago: 'pagado' as const,
            fechaProximoPago: new Date(new Date().setMonth(new Date().getMonth() + 1)),
        };

        const validation = negocioHeaderDataSchema.safeParse(dataSimulada);
        if (!validation.success) {
            console.error("Error de validación Zod en obtenerDatosHeaderNegocio:", validation.error);
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
 * @param negocioId - El ID del negocio a actualizar.
 * @param input - Un objeto con el nuevo nombre validado.
 * @returns Un resultado de éxito o error.
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

        // La revalidación de la ruta la maneja el cliente con router.refresh() para una experiencia más fluida.
        return { success: true, data: null };
    } catch (error) {
        console.error("Error al actualizar el nombre del negocio:", error);
        return { success: false, error: "No se pudo actualizar el nombre." };
    }
}

