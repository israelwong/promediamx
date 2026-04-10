import { z } from 'zod';

// Esquema para la validación de los datos del formulario de creación y edición.
export const ConocimientoItemSchema = z.object({
    preguntaFormulada: z.string().trim().min(5, { message: "La pregunta o título debe tener al menos 5 caracteres." }).max(200, { message: "El título es demasiado largo." }),
    respuesta: z.string().trim().min(10, { message: "La respuesta debe tener al menos 10 caracteres." }),
    categoria: z.string().nullable().optional(),
    estado: z.enum(['PENDIENTE_RESPUESTA', 'RESPONDIDA', 'EN_REVISION', 'OBSOLETA', 'ARCHIVADA']).default('RESPONDIDA'),
});

// Esquema para la entrada de la acción de crear un nuevo ítem.
export const CreateConocimientoItemInputSchema = ConocimientoItemSchema.extend({
    negocioId: z.string().cuid("El ID del negocio es inválido."),
});

// Esquema para la entrada de la acción de actualizar un ítem.
// Es parcial porque se puede actualizar solo un campo a la vez.
export const UpdateConocimientoItemInputSchema = ConocimientoItemSchema.partial();


// Esquema para los datos que se cargan en el formulario de edición.
export const ConocimientoItemParaEditarSchema = ConocimientoItemSchema.extend({
    id: z.string().cuid(),
    // --- CAMPOS ACTUALIZADOS ---
    createdAt: z.date(),
    updatedAt: z.date(),
});


// --- Tipos Inferidos ---
export type CreateConocimientoItemInputType = z.infer<typeof CreateConocimientoItemInputSchema>;
export type UpdateConocimientoItemInputType = z.infer<typeof UpdateConocimientoItemInputSchema>;
export type ConocimientoItemParaEditarType = z.infer<typeof ConocimientoItemParaEditarSchema>;

