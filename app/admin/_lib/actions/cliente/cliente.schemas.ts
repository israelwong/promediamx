import { z } from 'zod';

// Esquema base para los campos editables de un Cliente
// Excluimos campos sensibles o gestionados automáticamente como id, password, createdAt, updatedAt
export const ClienteEditableFieldsSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio.").max(100, "Máximo 100 caracteres."),
    email: z.string().email("Email inválido.").max(100, "Máximo 100 caracteres."),
    telefono: z.string().min(1, "El teléfono es obligatorio.").max(20, "Máximo 20 caracteres."),
    rfc: z.string().max(13, "RFC no puede exceder 13 caracteres.").nullable().optional(),
    curp: z.string().max(18, "CURP no puede exceder 18 caracteres.").nullable().optional(),
    razonSocial: z.string().max(200, "Razón Social no puede exceder 200 caracteres.").nullable().optional(),
    status: z.enum(['activo', 'inactivo', 'archivado']).default('activo'), // Definir los estados permitidos
    stripeCustomerId: z.string().max(100).nullable().optional(),
});

// Esquema para los datos que se envían al actualizar un cliente
// No incluimos todos los campos de Cliente, solo los que el formulario edita.
export const ActualizarClienteInputSchema = ClienteEditableFieldsSchema.partial().extend({
    // Hacemos que ciertos campos sigan siendo requeridos en la actualización si esa es la lógica
    nombre: z.string().min(1, "El nombre es obligatorio.").max(100).optional(), // Puede ser opcional si no siempre se actualiza
    email: z.string().email("Email inválido.").max(100).optional(),
    telefono: z.string().min(1, "El teléfono es obligatorio.").max(20).optional(),
    status: z.enum(['activo', 'inactivo', 'archivado']).optional(), // Status es importante para la acción de archivar también
}).refine(data => Object.keys(data).length > 0, {
    message: "Se requiere al menos un campo para actualizar."
});
export type ActualizarClienteInput = z.infer<typeof ActualizarClienteInputSchema>;


// Esquema para los datos de un Cliente que se cargan para edición/visualización en el formulario
// Incluye campos no editables como ID y fechas para mostrar.
export const ClienteParaEditarSchema = ClienteEditableFieldsSchema.extend({
    id: z.string().cuid(),
    createdAt: z.date().optional(), // Opcional si no siempre lo necesitas en el form
    updatedAt: z.date().optional(),
    // Las relaciones complejas (negocio, contrato, etc.) se omiten aquí, se manejarían por separado.
    // Puedes añadir _count si es necesario para alguna lógica en el form.
    negocio: z.array(z.object({ // Ejemplo si quieres mostrar una lista simple de nombres de negocios
        id: z.string().cuid(),
        nombre: z.string(),
        status: z.string().optional(),
    })).optional(),
});
export type ClienteParaEditar = z.infer<typeof ClienteParaEditarSchema>;

// Esquema para el output de la acción de actualizar (puede ser el cliente completo o un subconjunto)
export const ClienteActualizadoOutputSchema = ClienteParaEditarSchema; // O un schema más simple
export type ClienteActualizadoOutput = z.infer<typeof ClienteActualizadoOutputSchema>;