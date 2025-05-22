import { z } from 'zod';

// Esquema para los argumentos que la acción ejecutarMostrarOfertasAction espera.
// Gemini no extrae argumentos para esta función específica; el negocioId se añade en el dispatcher.
export const MostrarOfertasArgsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
    // No se esperan otros argumentos de la IA para esta función en particular.
});
export type MostrarOfertasArgs = z.infer<typeof MostrarOfertasArgsSchema>;

// Esquema para la información resumida de una oferta
export const OfertaResumenSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    // descripcion: z.string().nullable().optional(), // Opcional, si decides incluirlo
});
export type OfertaResumen = z.infer<typeof OfertaResumenSchema>;

// Esquema para los datos que devuelve la acción ejecutarMostrarOfertasAction
export const MostrarOfertasDataSchema = z.object({
    ofertasEncontradas: z.array(OfertaResumenSchema),
    mensajeRespuesta: z.string(),
});
export type MostrarOfertasData = z.infer<typeof MostrarOfertasDataSchema>;