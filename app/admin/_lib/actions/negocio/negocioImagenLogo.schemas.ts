// @/app/admin/_lib/actions/negocio/negocioImagenLogo.schemas.ts
import { z } from 'zod';

// Esquema para los parámetros de actualizarImagenLogoNegocio (negocioId se pasa como argumento directo)
// La validación del archivo (tamaño, tipo) se hace principalmente en el cliente y luego en el servidor al procesar FormData.
// No hay un esquema Zod directo para un objeto File, pero sí para sus metadatos si se enviaran.

// Esquema para la respuesta exitosa de actualizarImagenLogoNegocio
export const ActualizarImagenLogoDataSchema = z.object({
    imageUrl: z.string().url({ message: "La URL de la imagen no es válida." }),
    // logoTamañoBytes: z.number().int().nonnegative().optional(), // Tamaño del logo en bytes, opcional
    // Podríamos añadir almacenamientoUsadoBytes si quisiéramos devolverlo
});
export type ActualizarImagenLogoData = z.infer<typeof ActualizarImagenLogoDataSchema>;

// Esquema para los parámetros de eliminarImagenLogoNegocio (negocioId se pasa como argumento directo)

// No se necesita un esquema de datos específico para la respuesta de eliminarImagenLogoNegocio si solo devuelve success/error.

// Exportar un esquema para posibles errores al actualizar la imagen del logo
export const ActualizarImagenLogoErrorSchema = z.object({
    error: z.string(),
});
export type ActualizarImagenLogoError = z.infer<typeof ActualizarImagenLogoErrorSchema>;

export const actualizarLogoNegocioResultSchema = z.object({
    imageUrl: z.string().url(),
    // Podríamos incluir logoTamañoBytes si la UI lo necesitara, pero usualmente no es el caso.
});
export type ActualizarLogoNegocioResultData = z.infer<typeof actualizarLogoNegocioResultSchema>;