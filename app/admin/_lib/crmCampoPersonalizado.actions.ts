// Ejemplo en: @/app/admin/_lib/crmCampoPersonalizado.actions.ts
'use server';
import prisma from './prismaClient'; // Ajusta ruta
import { CRMCampoPersonalizado } from './types'; // Ajusta ruta
import { Prisma } from '@prisma/client';

// --- Obtener Campos Personalizados para un CRM (ordenados) ---
export async function obtenerCamposPersonalizadosCRM(crmId: string): Promise<CRMCampoPersonalizado[]> {
    if (!crmId) return [];
    try {
        const campos = await prisma.cRMCampoPersonalizado.findMany({ // Asegúrate que el nombre del modelo sea correcto
            where: { crmId: crmId },
            orderBy: { orden: 'asc' },
        });
        return campos as CRMCampoPersonalizado[];
    } catch (error) {
        console.error(`Error fetching custom fields for CRM ${crmId}:`, error);
        throw new Error('No se pudieron obtener los campos personalizados.');
    }
}

// --- Crear un nuevo Campo Personalizado ---
export async function crearCampoPersonalizadoCRM(
    // Incluir todos los campos necesarios
    data: Pick<CRMCampoPersonalizado, 'crmId' | 'nombre' | 'nombreCampo' | 'tipo' | 'requerido'> & { etiquetaUI?: string } // Añadir etiquetaUI si la separas de nombre
): Promise<{ success: boolean; data?: CRMCampoPersonalizado; error?: string }> {
    try {
        if (!data.crmId || !data.nombre?.trim() || !data.tipo) {
            return { success: false, error: "crmId, nombre y tipo son requeridos." };
        }
        // Validar tipo (opcional pero recomendado)
        const tiposValidos = ['texto', 'numero', 'fecha', 'booleano', 'seleccion_simple', 'seleccion_multiple']; // Añadir más si es necesario
        if (!tiposValidos.includes(data.tipo)) {
            return { success: false, error: `Tipo de dato inválido: ${data.tipo}` };
        }

        // Validar nombre único por CRM (identificador interno si lo usas)
        const existingName = await prisma.cRMCampoPersonalizado.findFirst({
            where: { crmId: data.crmId, nombre: data.nombre.trim() } // Usar 'nombre' o 'identificador'
        });
        if (existingName) {
            return { success: false, error: `Ya existe un campo con el nombre '${data.nombre}' para este CRM.` };
        }


        const ultimoOrden = await prisma.cRMCampoPersonalizado.aggregate({
            _max: { orden: true },
            where: { crmId: data.crmId },
        });
        const nuevoOrden = (ultimoOrden._max.orden ?? 0) + 1;

        const newCampo = await prisma.cRMCampoPersonalizado.create({
            data: {
                crmId: data.crmId,
                nombre: data.nombre.trim(), // Este sería el identificador interno si los separas
                nombreCampo: data.nombreCampo?.trim() || data.nombre.trim(), // Si usas un campo separado para la UIº
                tipo: data.tipo,
                requerido: data.requerido || false,
                orden: nuevoOrden,
                status: 'activo',
                // opciones: data.opciones // Si manejas opciones para selects
            },
        });
        return { success: true, data: newCampo as CRMCampoPersonalizado };
    } catch (error) {
        console.error('Error creating custom field:', error);
        // Manejar P2002 si tienes un índice unique en nombre/identificador + crmId
        return { success: false, error: (error as Error).message || "Error desconocido al crear campo." };
    }
}

// --- Editar un Campo Personalizado ---
export async function editarCampoPersonalizadoCRM(
    id: string,
    // Permitir editar etiquetaUI, tipo, requerido, status (nombre/identificador usualmente no se edita)
    data: Partial<Pick<CRMCampoPersonalizado, 'nombre' | 'nombreCampo' | 'tipo' | 'requerido' | 'status'>> & { etiquetaUI?: string }
): Promise<{ success: boolean; data?: CRMCampoPersonalizado; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de campo no proporcionado." };

        const dataToUpdate: Prisma.CRMCampoPersonalizadoUpdateInput = {};
        // if (data.etiquetaUI !== undefined) dataToUpdate.etiquetaUI = data.etiquetaUI.trim(); // Si usas etiquetaUI separada
        if (data.nombre !== undefined) dataToUpdate.nombre = data.nombre.trim(); // Si permites editar nombre (¡cuidado!)
        if (data.nombreCampo !== undefined && data.nombreCampo !== null) dataToUpdate.nombreCampo = data.nombreCampo.trim(); // Si usas nombreCampo separado
        if (data.tipo !== undefined) dataToUpdate.tipo = data.tipo;
        if (data.requerido !== undefined) dataToUpdate.requerido = data.requerido;
        if (data.status !== undefined) dataToUpdate.status = data.status;
        // if (data.opciones !== undefined) dataToUpdate.opciones = data.opciones; // Si manejas opciones

        if (Object.keys(dataToUpdate).length === 0) {
            return { success: false, error: "No hay datos para actualizar." };
        }
        // Validar tipo si se cambia
        if (data.tipo && !['texto', 'numero', 'fecha', 'booleano'].includes(data.tipo)) {
            return { success: false, error: `Tipo de dato inválido: ${data.tipo}` };
        }

        const updatedCampo = await prisma.cRMCampoPersonalizado.update({
            where: { id },
            data: dataToUpdate,
        });
        return { success: true, data: updatedCampo as CRMCampoPersonalizado };
    } catch (error) {
        console.error(`Error updating custom field ${id}:`, error);
        return { success: false, error: (error as Error).message || "Error desconocido al editar campo." };
    }
}

// --- Eliminar un Campo Personalizado ---
export async function eliminarCampoPersonalizadoCRM(id: string): Promise<{ success: boolean; error?: string }> {
    try {
        if (!id) return { success: false, error: "ID de campo no proporcionado." };
        // La eliminación solo borra la definición, no los datos en Lead.jsonParams
        await prisma.cRMCampoPersonalizado.delete({ where: { id } });
        return { success: true };
    } catch (error) {
        console.error(`Error deleting custom field ${id}:`, error);
        return { success: false, error: (error as Error).message || "Error desconocido al eliminar campo." };
    }
}

// --- Ordenar Campos Personalizados ---
export async function ordenarCamposPersonalizadosCRM(items: { id: string; orden: number }[]): Promise<{ success: boolean; error?: string }> {
    if (!items || items.length === 0) return { success: true };
    try {
        const updatePromises = items.map(item =>
            prisma.cRMCampoPersonalizado.update({ // Usar el nombre correcto del modelo
                where: { id: item.id },
                data: { orden: item.orden },
            })
        );
        await prisma.$transaction(updatePromises);
        return { success: true };
    } catch (error) {
        console.error("Error updating custom field order:", error);
        return { success: false, error: (error as Error).message || "Error desconocido al ordenar campos." };
    }
}

// --- Tipo CRMCampoPersonalizado (Asegúrate que coincida con tu schema) ---
/*
export interface CRMCampoPersonalizado {
    id: string;
    crmId: string;
    crm?: CRM | null;
    nombre: string; // O identificador
    // etiquetaUI?: string; // Si separas label de identificador
    tipo: string; // texto, numero, fecha, booleano, seleccion_simple, etc.
    requerido: boolean;
    // opciones?: string | null; // Para selects
    orden?: number | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}
*/