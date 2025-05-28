// app/admin/_lib/funciones/mostrarDetalleOferta.schemas.ts
import { z } from 'zod';

// Esquema para un item de media (imagen, video, documento)
export const MediaItemSchema = z.object({
    tipo: z.enum(['image', 'video', 'document', 'audio']), // Tipo de media
    url: z.string().url("La URL de la media no es válida."),     // URL pública del archivo
    caption: z.string().optional(), // Descripción/caption para la media (especialmente útil para imágenes/videos)
    filename: z.string().optional(), // Nombre de archivo, principalmente para documentos
});
export type MediaItem = z.infer<typeof MediaItemSchema>;

// Esquema para los argumentos de entrada de la función mostrarDetalleOferta
export const MostrarDetalleOfertaArgsSchema = z.object({
    negocioId: z.string().cuid("El ID del negocio no es válido."),
    nombre_de_la_oferta: z.string().min(1, "El nombre de la oferta es requerido."), // Puede ser ID o nombre textual
    canalNombre: z.string().optional().nullable(), // Nombre del canal original de la conversación

    // Agrega aquí otros campos que Gemini podría pasar o que necesites
    // por ejemplo, si el usuario ya había interactuado o si hay un contexto específico.
});
export type MostrarDetalleOfertaArgs = z.infer<typeof MostrarDetalleOfertaArgsSchema>;

// Esquema para la estructura de una oferta detallada (datos que devuelve la función)
export const OfertaDetalladaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    tipoOferta: z.string(),
    valor: z.number().nullable(),
    codigo: z.string().nullable(),
    fechaInicio: z.date(),
    fechaFin: z.date(),
    condiciones: z.string().nullable(),
    imagenes: z.array(z.object({ // Podría ser un MediaItemSchema más genérico si las ofertas tuvieran videos/docs también
        imageUrl: z.string().url(),
        altText: z.string().nullable(),
        descripcion: z.string().nullable()
    })).optional().nullable(),
    linkPago: z.string().url().nullable(),
    // Puedes añadir más campos si son relevantes para mostrar el detalle
});
export type OfertaDetallada = z.infer<typeof OfertaDetalladaSchema>;

// Esquema para los datos de salida de la función ejecutarMostrarDetalleOfertaAction
export const MostrarDetalleOfertaDataSchema = z.object({
    ofertaEncontrada: OfertaDetalladaSchema.nullable(),
    mensajeRespuesta: z.string(), // El mensaje de texto principal para el usuario
    mediaItems: z.array(MediaItemSchema).nullable(), // Array de items de media para enviar por separado
});
export type MostrarDetalleOfertaData = z.infer<typeof MostrarDetalleOfertaDataSchema>;


// Schema para los parámetros que la IA debe proporcionar para ejecutar esta función
export const EjecutarMostrarDetalleOfertaParamsSchema = z.object({
    ofertaId: z.string().uuid("ID de oferta inválido. Debe ser un UUID.").optional(), // HACER OPCIONAL
    nombre_de_la_oferta: z.string().min(1, "Nombre de la oferta es requerido.").optional(), // AÑADIR Y HACER OPCIONAL
}).refine(data => data.ofertaId || data.nombre_de_la_oferta, {
    message: "Se requiere 'ofertaId' o 'nombre_de_la_oferta'.",
    path: ["ofertaId"], // O path general
});
export type EjecutarMostrarDetalleOfertaParams = z.infer<typeof EjecutarMostrarDetalleOfertaParamsSchema>;

// NOTA: MediaItemSchema y el schema para FunctionResponseData (que tiene content y media)
// se importarán desde el archivo global de schemas de conversación, por ejemplo:
// import { MediaItemSchema, FunctionResponseMediaDataSchema } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';