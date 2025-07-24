// Ejemplo en: @/app/admin/_lib/crmCampoPersonalizado.actions.ts
'use server';
import prisma from '../prismaClient'; // Ajusta ruta
import { CRMCampoPersonalizado } from '../types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Obtener Campos Personalizados para un CRM (ordenados) ---
// export async function obtenerCamposPersonalizadosCRM(negocioId: string): Promise<CRMCampoPersonalizado[]> {
//     if (!negocioId) return [];
//     try {
//         // Obtener el crmId a partir del negocioId
//         const crm = await prisma.cRM.findUnique({
//             where: { negocioId },
//             select: { id: true },
//         });

//         if (!crm) {
//             console.error(`No se encontró un CRM para el negocioId ${negocioId}`);
//             return [];
//         }

//         const campos = await prisma.cRMCampoPersonalizado.findMany({
//             where: { crmId: crm.id },
//             orderBy: { orden: 'asc' },
//         });
//         return campos as CRMCampoPersonalizado[];
//     } catch (error) {
//         console.error(`Error fetching custom fields for negocioId ${negocioId}:`, error);
//         throw new Error('No se pudieron obtener los campos personalizados.');
//     }
// }

// // --- Crear un nuevo Campo Personalizado ---
// export async function crearCampoPersonalizadoCRM(
//     // Incluir todos los campos necesarios
//     data: Pick<CRMCampoPersonalizado, 'crmId' | 'nombre' | 'nombreCampo' | 'tipo' | 'requerido'> & { etiquetaUI?: string } // Añadir etiquetaUI si la separas de nombre
// ): Promise<{ success: boolean; data?: CRMCampoPersonalizado; error?: string }> {
//     try {
//         if (!data.crmId || !data.nombre?.trim() || !data.tipo) {
//             return { success: false, error: "crmId, nombre y tipo son requeridos." };
//         }
//         // Validar tipo (opcional pero recomendado)
//         const tiposValidos = ['texto', 'numero', 'fecha', 'booleano', 'seleccion_simple', 'seleccion_multiple']; // Añadir más si es necesario
//         if (!tiposValidos.includes(data.tipo)) {
//             return { success: false, error: `Tipo de dato inválido: ${data.tipo}` };
//         }

//         // Validar nombre único por CRM (identificador interno si lo usas)
//         const existingName = await prisma.cRMCampoPersonalizado.findFirst({
//             where: { crmId: data.crmId, nombre: data.nombre.trim() } // Usar 'nombre' o 'identificador'
//         });
//         if (existingName) {
//             return { success: false, error: `Ya existe un campo con el nombre '${data.nombre}' para este CRM.` };
//         }


//         const ultimoOrden = await prisma.cRMCampoPersonalizado.aggregate({
//             _max: { orden: true },
//             where: { crmId: data.crmId },
//         });
//         const nuevoOrden = (ultimoOrden._max.orden ?? 0) + 1;

//         const newCampo = await prisma.cRMCampoPersonalizado.create({
//             data: {
//                 crmId: data.crmId,
//                 nombre: data.nombre.trim(), // Este sería el identificador interno si los separas
//                 nombreCampo: data.nombreCampo?.trim() || data.nombre.trim(), // Si usas un campo separado para la UIº
//                 tipo: data.tipo,
//                 requerido: data.requerido || false,
//                 orden: nuevoOrden,
//                 status: 'activo',
//                 // opciones: data.opciones // Si manejas opciones para selects
//             },
//         });
//         return { success: true, data: newCampo as CRMCampoPersonalizado };
//     } catch (error) {
//         console.error('Error creating custom field:', error);
//         // Manejar P2002 si tienes un índice unique en nombre/identificador + crmId
//         return { success: false, error: (error as Error).message || "Error desconocido al crear campo." };
//     }
// }

// // --- Editar un Campo Personalizado ---
// export async function editarCampoPersonalizadoCRM(
//     id: string,
//     // Permitir editar etiquetaUI, tipo, requerido, status (nombre/identificador usualmente no se edita)
//     data: Partial<Pick<CRMCampoPersonalizado, 'nombre' | 'nombreCampo' | 'tipo' | 'requerido' | 'status'>> & { etiquetaUI?: string }
// ): Promise<{ success: boolean; data?: CRMCampoPersonalizado; error?: string }> {
//     try {
//         if (!id) return { success: false, error: "ID de campo no proporcionado." };

//         const dataToUpdate: Prisma.CRMCampoPersonalizadoUpdateInput = {};
//         // if (data.etiquetaUI !== undefined) dataToUpdate.etiquetaUI = data.etiquetaUI.trim(); // Si usas etiquetaUI separada
//         if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim(); // Si permites editar nombre (¡cuidado!)
//         if (data.nombreCampo !== undefined && data.nombreCampo !== null) dataToUpdate.nombreCampo = data.nombreCampo.trim(); // Si usas nombreCampo separado
//         if (data.tipo !== undefined) dataToUpdate.tipo = data.tipo;
//         if (data.requerido !== undefined) dataToUpdate.requerido = data.requerido;
//         if (data.status !== undefined) dataToUpdate.status = data.status;
//         // if (data.opciones !== undefined) dataToUpdate.opciones = data.opciones; // Si manejas opciones

//         if (Object.keys(dataToUpdate).length === 0) {
//             return { success: false, error: "No hay datos para actualizar." };
//         }
//         // Validar tipo si se cambia
//         if (data.tipo && !['texto', 'numero', 'fecha', 'booleano'].includes(data.tipo)) {
//             return { success: false, error: `Tipo de dato inválido: ${data.tipo}` };
//         }

//         const updatedCampo = await prisma.cRMCampoPersonalizado.update({
//             where: { id },
//             data: dataToUpdate,
//         });
//         return { success: true, data: updatedCampo as CRMCampoPersonalizado };
//     } catch (error) {
//         console.error(`Error updating custom field ${id}:`, error);
//         return { success: false, error: (error as Error).message || "Error desconocido al editar campo." };
//     }
// }

// // --- Eliminar un Campo Personalizado ---
// export async function eliminarCampoPersonalizadoCRM(id: string): Promise<{ success: boolean; error?: string }> {
//     try {
//         if (!id) return { success: false, error: "ID de campo no proporcionado." };
//         // La eliminación solo borra la definición, no los datos en Lead.jsonParams
//         await prisma.cRMCampoPersonalizado.delete({ where: { id } });
//         return { success: true };
//     } catch (error) {
//         console.error(`Error deleting custom field ${id}:`, error);
//         return { success: false, error: (error as Error).message || "Error desconocido al eliminar campo." };
//     }
// }

// // --- Ordenar Campos Personalizados ---
// export async function ordenarCamposPersonalizadosCRM(items: { id: string; orden: number }[]): Promise<{ success: boolean; error?: string }> {
//     if (!items || items.length === 0) return { success: true };
//     try {
//         const updatePromises = items.map(item =>
//             prisma.cRMCampoPersonalizado.update({ // Usar el nombre correcto del modelo
//                 where: { id: item.id },
//                 data: { orden: item.orden },
//             })
//         );
//         await prisma.$transaction(updatePromises);
//         return { success: true };
//     } catch (error) {
//         console.error("Error updating custom field order:", error);
//         return { success: false, error: (error as Error).message || "Error desconocido al ordenar campos." };
//     }
// }

//!

// --- Tipo de Retorno para obtenerCamposPersonalizadosCRM ---
interface ObtenerCamposResult {
    success: boolean;
    data?: {
        crmId: string | null; // Devolvemos el crmId encontrado
        campos: CRMCampoPersonalizado[];
    } | null;
    error?: string;
}

/**
 * Obtiene el ID del CRM asociado a un negocio y todos sus campos personalizados.
 * @param negocioId - El ID del negocio.
 * @returns Objeto con crmId y la lista de campos personalizados.
 */
export async function obtenerCamposPersonalizadosCRM(negocioId: string): Promise<ObtenerCamposResult> {
    if (!negocioId) {
        return { success: false, error: "ID de negocio no proporcionado." };
    }
    try {
        // Obtener el crmId y los campos directamente en una consulta
        const negocioConCRM = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                CRM: { // Selecciona el CRM relacionado
                    select: {
                        id: true, // Obtiene el ID del CRM
                        CampoPersonalizado: { // Incluye los campos personalizados asociados al CRM
                            orderBy: { orden: 'asc' }, // Ordena los campos
                        }
                    }
                }
            },
        });

        const crmId = negocioConCRM?.CRM?.id ?? null;
        // Asegura que el tipo coincida, incluso si es un array vacío
        const campos = (negocioConCRM?.CRM?.CampoPersonalizado ?? []) as CRMCampoPersonalizado[];

        // Devuelve éxito, incluyendo crmId (puede ser null si no hay CRM) y los campos
        return {
            success: true,
            data: {
                crmId: crmId,
                campos: campos
            }
        };

    } catch (error) {
        console.error(`Error fetching custom fields for negocio ${negocioId}:`, error);
        // Devuelve un error genérico en caso de fallo
        return { success: false, error: 'No se pudieron obtener los campos personalizados.' };
    }
}


/**
* Crea un nuevo campo personalizado para un CRM específico.
* @param data - Datos del campo a crear (crmId, nombre, nombreCampo, tipo, requerido).
* @returns Objeto con el resultado de la operación y el campo creado si tuvo éxito.
*/
export async function crearCampoPersonalizadoCRM(
    data: Pick<CRMCampoPersonalizado, 'crmId' | 'nombre' | 'nombreCampo' | 'tipo' | 'requerido'>
): Promise<{ success: boolean; data?: CRMCampoPersonalizado; error?: string }> {
    try {
        // Validaciones iniciales de datos requeridos
        if (!data.crmId || !data.nombre?.trim() || !data.nombreCampo?.trim() || !data.tipo) {
            return { success: false, error: "crmId, nombre, nombreCampo y tipo son requeridos." };
        }

        // Validar formato de nombreCampo (solo letras minúsculas, números y guiones bajos)
        if (!/^[a-z0-9_]+$/.test(data.nombreCampo.trim())) {
            return { success: false, error: "El Nombre Interno (ID) solo puede contener letras minúsculas, números y guiones bajos (_)." };
        }

        // Validar tipo de dato permitido
        const tiposValidos = ['texto', 'numero', 'fecha', 'booleano']; // Añade más si los soportas
        if (!tiposValidos.includes(data.tipo)) {
            return { success: false, error: `Tipo de dato inválido: ${data.tipo}` };
        }

        // Calcular el siguiente orden dentro del CRM específico
        const ultimoOrden = await prisma.cRMCampoPersonalizado.aggregate({
            _max: { orden: true },
            where: { crmId: data.crmId },
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? 0) + 1;

        // Intentar crear el campo en la base de datos
        const newCampo = await prisma.cRMCampoPersonalizado.create({
            data: {
                crmId: data.crmId,
                nombre: data.nombre.trim(),
                nombreCampo: data.nombreCampo.trim(), // Usar el nombreCampo validado
                tipo: data.tipo,
                requerido: data.requerido ?? false, // Asegurar valor booleano
                orden: nuevoOrden,
                status: 'activo', // Status por defecto
            },
        });
        // Devolver éxito y el campo creado
        return { success: true, data: newCampo as CRMCampoPersonalizado };

    } catch (error) {
        console.error('Error creating custom field:', error);
        // Manejo específico para errores de unicidad (P2002)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Determinar qué campo causó el conflicto basado en los índices unique del schema
            if (Array.isArray(error.meta?.target) && error.meta.target.includes('nombreCampo')) {
                return { success: false, error: `El Nombre Interno (ID) '${data.nombreCampo}' ya existe para este CRM.` };
            }
            if (Array.isArray(error.meta?.target) && error.meta.target.includes('nombre')) {
                return { success: false, error: `El Nombre Visible '${data.nombre}' ya existe para este CRM.` };
            }
            // Error genérico si no se puede determinar el campo exacto
            return { success: false, error: `Ya existe un campo con un nombre o ID similar.` };
        }
        // Devolver error genérico para otros fallos
        return { success: false, error: (error as Error).message || "Error desconocido al crear campo." };
    }
}

/**
* Edita un campo personalizado existente. No permite editar 'nombreCampo'.
* @param id - ID del campo a editar.
* @param data - Datos a actualizar (nombre, tipo, requerido, status).
* @returns Objeto con el resultado de la operación y el campo actualizado si tuvo éxito.
*/
export async function editarCampoPersonalizadoCRM(
    id: string,
    // La firma ahora excluye explícitamente 'nombreCampo'
    data: Partial<Pick<CRMCampoPersonalizado, 'nombre' | 'tipo' | 'requerido' | 'status'>>
): Promise<{ success: boolean; data?: CRMCampoPersonalizado; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de campo no proporcionado." };

        // Construir objeto con los datos a actualizar
        const dataToUpdate: Prisma.CRMCampoPersonalizadoUpdateInput = {};
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim();
        if (data.tipo !== undefined) dataToUpdate.tipo = data.tipo;
        if (data.requerido !== undefined) dataToUpdate.requerido = data.requerido;
        if (data.status !== undefined) dataToUpdate.status = data.status;

        // Verificar si hay datos para actualizar
        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }

        // Validar tipo de dato si se está cambiando
        if (data.tipo && !['texto', 'numero', 'fecha', 'booleano'].includes(data.tipo)) {
            return { success: false, error: `Tipo de dato inválido: ${data.tipo}` };
        }

        // Intentar actualizar el campo
        const updatedCampo = await prisma.cRMCampoPersonalizado.update({
            where: { id },
            data: dataToUpdate,
        });
        // Devolver éxito y el campo actualizado
        return { success: true, data: updatedCampo as CRMCampoPersonalizado };

    } catch (error) {
        console.error(`Error updating custom field ${id}:`, error);
        // Manejo específico para error de unicidad en 'nombre' si se edita
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            if (Array.isArray(error.meta?.target) && error.meta.target.includes('nombre')) {
                return { success: false, error: `El Nombre Visible '${data.nombre}' ya existe para este CRM.` };
            }
            return { success: false, error: `Ya existe un campo con un nombre similar.` };
        }
        // Devolver error genérico para otros fallos
        return { success: false, error: (error as Error).message || "Error desconocido al editar campo." };
    }
}

/**
* Elimina un campo personalizado por su ID.
* @param id - ID del campo a eliminar.
* @returns Objeto indicando el éxito o fracaso de la operación.
*/
export async function eliminarCampoPersonalizadoCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de campo no proporcionado." };

        // Intentar eliminar el campo
        await prisma.cRMCampoPersonalizado.delete({ where: { id } });
        // Devolver éxito
        return { success: true };

    } catch (error) {
        console.error(`Error deleting custom field ${id}:`, error);
        // Manejo específico para error de restricción de clave foránea (P2003/P2014)
        // Esto ocurre si el campo está siendo referenciado por TareaCampoPersonalizado
        if (error instanceof Prisma.PrismaClientKnownRequestError && (error.code === 'P2003' || error.code === 'P2014')) {
            return { success: false, error: "No se puede eliminar el campo porque está siendo utilizado por una o más Tareas." };
        }
        // Devolver error genérico para otros fallos
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar campo." };
    }
}

/**
* Actualiza el orden de múltiples campos personalizados.
* @param items - Array de objetos con id y nuevo orden para cada campo.
* @returns Objeto indicando el éxito o fracaso de la operación.
*/
export async function ordenarCamposPersonalizadosCRM(items: { id: string; orden: number }[]): Promise<{ success: boolean; error?: string }> {
    // Validar entrada
    if (!items || !Array.isArray(items)) {
        return { success: false, error: "Datos de ordenamiento inválidos." };
    }
    if (items.length === 0) {
        return { success: true }; // Nada que ordenar
    }

    try {
        // Crear promesas de actualización para cada item
        const updatePromises = items.map(item => {
            if (!item.id || typeof item.orden !== 'number') {
                throw new Error(`Item de ordenamiento inválido: ${JSON.stringify(item)}`);
            }
            return prisma.cRMCampoPersonalizado.update({
                where: { id: item.id },
                data: { orden: item.orden },
            });
        });
        // Ejecutar todas las actualizaciones en una transacción
        await prisma.$transaction(updatePromises);
        // Devolver éxito
        return { success: true };
    } catch (error) {
        console.error("Error updating custom field order:", error);
        // Devolver error genérico
        return { success: false, error: (error as Error).message || "Error desconocido al ordenar campos." };
    }
}