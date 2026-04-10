import { z } from 'zod';

// Esquema para los datos que se cargan en el formulario de edición del perfil.
// Contiene solo los campos de identidad y contacto.
export const NegocioProfileSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    slug: z.string().nullable(),
    logo: z.string().url().nullable(),
    slogan: z.string().nullable(),
    telefonoLlamadas: z.string().nullable(),
    telefonoWhatsapp: z.string().nullable(),
    email: z.string().email().nullable(),
    direccion: z.string().nullable(),
    googleMaps: z.string().url().nullable(),
    paginaWeb: z.string().url().nullable(),
    status: z.enum(['activo', 'inactivo']),
});

// Esquema para los datos que el formulario envía al actualizar.
// Todos los campos son opcionales para permitir actualizaciones parciales.
export const UpdateNegocioProfileInputSchema = NegocioProfileSchema.omit({ id: true }).partial();

// Esquema para la verificación de unicidad del slug.
export const VerificarSlugUnicoInputSchema = z.object({
    slug: z.string().min(3, "Debe tener al menos 3 caracteres."),
    negocioIdActual: z.string().cuid(),
});

// --- Tipos Inferidos ---
export type NegocioProfileType = z.infer<typeof NegocioProfileSchema>;
export type UpdateNegocioProfileInputType = z.infer<typeof UpdateNegocioProfileInputSchema>;


// Esquema para los datos que se muestran en el NegocioHeader
export const NegocioHeaderDataSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    // El status de la suscripción se mapea desde el status del negocio
    suscripcionStatus: z.enum(['activa', 'inactiva', 'prueba', 'cancelada']).nullable(),
});
export type NegocioHeaderData = z.infer<typeof NegocioHeaderDataSchema>;

// Esquema para la entrada de la acción de actualizar solo el nombre
export const updateNegocioNombreSchema = z.object({
    nombre: z.string().min(1, "El nombre no puede estar vacío.").max(100, "El nombre es demasiado largo."),
});
export type UpdateNegocioNombreInput = z.infer<typeof updateNegocioNombreSchema>;



export type Negocio = {
    id: string;
    nombre: string;
    // El status puede ser un tipo más estricto si solo hay valores definidos.
    status: 'activo' | 'inactivo' | 'pendiente';
};
