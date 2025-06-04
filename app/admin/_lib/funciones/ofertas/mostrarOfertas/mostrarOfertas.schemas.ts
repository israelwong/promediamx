// import { z } from 'zod';

// // Esquema para los argumentos que la acción ejecutarMostrarOfertasAction espera.
// // Gemini no extrae argumentos para esta función específica; el negocioId se añade en el dispatcher.
// export const MostrarOfertasArgsSchema = z.object({
//     negocioId: z.string().cuid("ID de negocio inválido."),
//     // No se esperan otros argumentos de la IA para esta función en particular.
// });
// export type MostrarOfertasArgs = z.infer<typeof MostrarOfertasArgsSchema>;

// // Esquema para la información resumida de una oferta
// export const OfertaResumenSchema = z.object({
//     id: z.string().cuid(),
//     nombre: z.string(),
//     // descripcion: z.string().nullable().optional(), // Opcional, si decides incluirlo
// });
// export type OfertaResumen = z.infer<typeof OfertaResumenSchema>;

// // Esquema para los datos que devuelve la acción ejecutarMostrarOfertasAction
// export const MostrarOfertasDataSchema = z.object({
//     ofertasEncontradas: z.array(OfertaResumenSchema),
//     mensajeRespuesta: z.string(),
// });
// export type MostrarOfertasData = z.infer<typeof MostrarOfertasDataSchema>;


// Ruta: app/admin/_lib/funciones/ofertas/mostrarOfertas/mostrarOfertas.schemas.ts
import { z } from 'zod';

// Esquema para los argumentos que la IA podría pasar (en este caso, ninguno).
// La acción usará context.negocioId.
export const MostrarOfertasArgsSchema = z.object({
    // No se esperan argumentos específicos de la IA para esta función.
    // Podríamos añadir filtros opcionales en el futuro si es necesario, ej:
    // categoriaOferta: z.string().optional(),
    // palabraClave: z.string().optional(),
}).strict(); // .strict() asegura que no lleguen propiedades inesperadas de la IA.
export type MostrarOfertasArgs = z.infer<typeof MostrarOfertasArgsSchema>;

// Esquema para la información resumida de una oferta que se devuelve en la lista
export const OfertaResumenSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    // Podrías añadir una descripción breve si es relevante para la lista:
    // descripcionCorta: z.string().nullable().optional(),
    // O el precio formateado si todas las ofertas listadas deben mostrarlo:
    // precioFormateado: z.string().nullable().optional(),
});
export type OfertaResumen = z.infer<typeof OfertaResumenSchema>;

// Esquema para los datos internos que la acción prepara ANTES de formatear la salida final.
// Este schema ya no será el tipo de retorno directo de la acción principal,
// sino una estructura intermedia que usa la acción.
export const PrepararMostrarOfertasDataSchema = z.object({
    ofertasEncontradas: z.array(OfertaResumenSchema),
    mensajeRespuestaParaUsuario: z.string(), // Mensaje de texto para el usuario (WhatsApp o fallback)
    // Opcional: si quieres un payload específico para WebChat
    // uiPayloadParaWebChat: z.record(z.string(), z.any()).nullable().optional(),
});
export type PrepararMostrarOfertasData = z.infer<typeof PrepararMostrarOfertasDataSchema>;