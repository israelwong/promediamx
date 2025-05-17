// @/app/admin/_lib/actions/negocio/negocio.schemas.ts
import { z } from 'zod';

// Esquema base para Negocio, reflejando campos escalares editables
// Omitimos 'clienteIdeal', 'terminologia', 'competencia' según la directriz.
// También omitimos campos de relación directa o de gestión separada como 'logo' (manejado por NegocioImagenLogo),
// 'redesSociales', y campos de conteo o automáticos.
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
    // OMITIDOS: competencia, clienteIdeal, terminologia (según directriz)
    preguntasFrecuentes: z.string().nullish(),
    objeciones: z.string().nullish(),
    status: z.enum(['activo', 'inactivo']).default('inactivo'),
    // Campos como 'logo' se manejan por separado y se pueden añadir a un esquema combinado si es necesario para la creación.
    // Para la actualización, 'logo' se gestiona por NegocioImagenLogo y actualiza el campo 'logo' de Negocio directamente.
});

// Esquema para los datos que se envían al actualizar el negocio desde NegocioEditForm
// Este esquema es lo que espera la acción `actualizarDetallesNegocio`
export const ActualizarDetallesNegocioDataSchema = NegocioEditableCoreSchema;

// Tipo inferido para los datos del formulario de edición.
export type NegocioFormData = z.infer<typeof ActualizarDetallesNegocioDataSchema>;

// Esquema para los datos completos del negocio que se devuelven para edición.
// Podría ser más amplio si se incluyen relaciones, pero para el form actual,
// se basa en los campos directos del modelo Negocio.
// Usaremos el tipo `Negocio` de Prisma para la respuesta de `obtenerDetallesNegocioParaEditar`
// por simplicidad, ya que el componente ya lo espera.
// Si necesitáramos una forma específica, crearíamos un `ObtenerDetallesNegocioDataSchema` aquí.

// Si la acción `actualizarDetallesNegocio` devuelve datos específicos en `ActionResult<T>`
// se definiría un esquema para T aquí. Por ahora, parece que solo devuelve success/error.
export const ActualizarNegocioSuccessPayloadSchema = z.object({
    // Podría tener un mensaje o el ID del negocio actualizado si fuera necesario
    // mensaje: z.string() 
});
export type ActualizarNegocioSuccessPayload = z.infer<typeof ActualizarNegocioSuccessPayloadSchema>;