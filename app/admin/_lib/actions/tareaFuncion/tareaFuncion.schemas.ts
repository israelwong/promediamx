import { z } from 'zod';

// Esquema para actualizar la descripción de una TareaFuncion
export const ActualizarDescripcionTareaFuncionInputSchema = z.object({
    descripcion: z.string().max(3000, "La descripción no puede exceder los 3000 caracteres.").nullable(), // Permitir descripciones largas, puede ser null si se quiere borrar
});
export type ActualizarDescripcionTareaFuncionInput = z.infer<typeof ActualizarDescripcionTareaFuncionInputSchema>;

// Esquema para los datos básicos de TareaFuncion que podríamos necesitar en la UI
// (aparte de los parámetros, que se manejan por separado)
export const TareaFuncionSimpleSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(), // El nombre camelCase, manejado por TareaEditLayout y la acción de actualizar Tarea
    descripcion: z.string().nullable(), // La descripción para la IA
    // tareaId: z.string().cuid(), // Ya está en el modelo Prisma
});
export type TareaFuncionSimple = z.infer<typeof TareaFuncionSimpleSchema>;