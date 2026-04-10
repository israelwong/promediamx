import { z } from 'zod';

// Esquema para un CanalCRM (basado en tu modelo Prisma y tipo CanalCRM)
export const canalCrmSchema = z.object({
    id: z.string().cuid(),
    crmId: z.string().cuid(),
    nombre: z.string().min(1, "El nombre es requerido.").max(100, "Nombre muy largo."),
    status: z.string().default('activo'), // Podría ser z.enum(['activo', 'inactivo'])
    orden: z.number().int().nullable().optional(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type CanalCrmData = z.infer<typeof canalCrmSchema>;

// Esquema para el resultado de la acción que obtiene los canales y el crmId
export const obtenerCanalesCrmResultSchema = z.object({
    crmId: z.string().cuid().nullable(), // crmId puede ser null si el CRM no existe para el negocio
    canales: z.array(canalCrmSchema),
});
export type ObtenerCanalesCrmResultData = z.infer<typeof obtenerCanalesCrmResultSchema>;

// Esquema para los parámetros de entrada de listarCanalesCrmAction
export const listarCanalesCrmParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ListarCanalesCrmParams = z.infer<typeof listarCanalesCrmParamsSchema>;

// Esquema para el formulario de creación/edición de Canal (solo nombre y status)
export const canalCrmFormSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio"),
    status: z.string(), // status ahora es requerido
});
export type CanalCrmFormData = z.infer<typeof canalCrmFormSchema>;

// Esquema para los parámetros de entrada de la acción crearCanalCrmAction
export const crearCanalCrmParamsSchema = z.object({
    crmId: z.string().cuid("Se requiere el ID del CRM."),
    nombre: z.string().min(1, "El nombre es obligatorio.").max(50),
    // status se puede tomar del default en el schema o pasarlo explícitamente si el form lo permite
    status: z.string().optional(),
});
export type CrearCanalCrmParams = z.infer<typeof crearCanalCrmParamsSchema>;

// Esquema para los parámetros de entrada de la acción editarCanalCrmAction
export const editarCanalCrmParamsSchema = z.object({
    canalId: z.string().cuid(),
    datos: canalCrmFormSchema, // Reutilizamos el schema del formulario
});
export type EditarCanalCrmParams = z.infer<typeof editarCanalCrmParamsSchema>;

// Esquema para los parámetros de entrada de la acción eliminarCanalCrmAction
export const eliminarCanalCrmParamsSchema = z.object({
    canalId: z.string().cuid(),
});
export type EliminarCanalCrmParams = z.infer<typeof eliminarCanalCrmParamsSchema>;

// Esquema para un ítem en la lista de reordenamiento
export const canalOrdenSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().positive(), // Asumiendo que el orden es 1-based
});

// Esquema para los parámetros de entrada de la acción reordenarCanalesCrmAction
export const reordenarCanalesCrmParamsSchema = z.object({
    crmId: z.string().cuid("Se requiere el ID del CRM."), // Para asegurar que operamos en el CRM correcto
    canalesOrdenados: z.array(canalOrdenSchema), // Array de canales con su nuevo orden
});
export type ReordenarCanalesCrmParams = z.infer<typeof reordenarCanalesCrmParamsSchema>;


export const CanalCRMSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    crmId: z.string().cuid(),
    status: z.string(),
});

export const UpsertCanalCRMSchema = CanalCRMSchema.omit({ id: true, status: true });