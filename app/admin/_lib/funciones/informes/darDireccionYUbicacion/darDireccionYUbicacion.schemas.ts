import { z } from 'zod';

// Esquema para los argumentos que la acción ejecutarDarDireccionAction espera.
// Gemini no extrae argumentos para esta función; el negocioId se añade en el dispatcher.
export const DarDireccionArgsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
    // No se esperan otros argumentos de la IA para esta acción.
});
export type DarDireccionArgs = z.infer<typeof DarDireccionArgsSchema>;

// Esquema para los datos que devuelve la acción ejecutarDarDireccionAction
export const DarDireccionDataSchema = z.object({
    direccionEncontrada: z.string().max(500, "Dirección demasiado larga.").nullable(), // Permitir que sea null si no existe
    googleMapsUrl: z.string().url("URL de Google Maps inválida.").max(500, "URL de Google Maps demasiado larga.").nullable(), // Permitir que sea null si no existe
    mensajeRespuesta: z.string(),
});
export type DarDireccionData = z.infer<typeof DarDireccionDataSchema>;