// @/app/admin/_lib/actions/negocio/negocio.schemas.ts
import { z } from 'zod';

export const NegocioEditableCoreSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre del negocio es obligatorio." }).max(100, { message: "El nombre no puede exceder los 100 caracteres." }),
    slogan: z.string().max(150, { message: "El slogan no puede exceder los 150 caracteres." }).nullish(),
    logo: z.string().nullish(), // Este campo se maneja por NegocioImagenLogo, no se incluye en la validación aquí.
    descripcion: z.string().nullish(),
    telefonoLlamadas: z.string().nullish(),
    telefonoWhatsapp: z.string().nullish(),
    email: z.string().email({ message: "Email inválido." }).nullish().or(z.literal('')), // permitir string vacío o null
    direccion: z.string().nullish(),
    googleMaps: z.string().url({ message: "URL de Google Maps inválida." }).nullish().or(z.literal('')),
    paginaWeb: z.string().url({ message: "URL de página web inválida." }).nullish().or(z.literal('')),
    horarioAtencion: z.string().nullish(),
    garantias: z.string().nullish(),
    politicas: z.string().nullish(),
    avisoPrivacidad: z.string().nullish(),
    preguntasFrecuentes: z.string().nullish(),
    objeciones: z.string().nullish(),
    status: z.enum(['activo', 'inactivo']).default('inactivo'),
});

// Esquema para los datos que se envían al actualizar el negocio desde NegocioEditForm
// Este esquema es lo que espera la acción `actualizarDetallesNegocio`
export const ActualizarDetallesNegocioDataSchema = NegocioEditableCoreSchema;

// Tipo inferido para los datos del formulario de edición.
export type NegocioFormData = z.infer<typeof ActualizarDetallesNegocioDataSchema>;

// Si la acción `actualizarDetallesNegocio` devuelve datos específicos en `ActionResult<T>`
// se definiría un esquema para T aquí. Por ahora, parece que solo devuelve success/error.
export const ActualizarNegocioSuccessPayloadSchema = z.object({
    // Podría tener un mensaje o el ID del negocio actualizado si fuera necesario
    // mensaje: z.string() 
});
export type ActualizarNegocioSuccessPayload = z.infer<typeof ActualizarNegocioSuccessPayloadSchema>;

// Esquema para el resultado de la acción de actualizar el logo del negocio.
// El componente cliente principalmente necesita la nueva URL de la imagen.

