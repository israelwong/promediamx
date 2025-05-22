import { z } from 'zod';

// Esquema para los argumentos que la acción ejecutarMostrarDetalleOfertaAction espera.
// 'negocioId' y 'canalNombre' se añaden en el dispatcher o en la acción misma,
// 'nombre_de_la_oferta' es lo que se espera de Gemini.
export const MostrarDetalleOfertaArgsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
    nombre_de_la_oferta: z.string().min(1, "El nombre o identificador de la oferta es requerido."),
    canalNombre: z.string().nullable().optional(), // Nombre del canal para formateo de respuesta
});
export type MostrarDetalleOfertaArgs = z.infer<typeof MostrarDetalleOfertaArgsSchema>;

// Esquema para una imagen de la oferta
export const ImagenOfertaSchema = z.object({
    imageUrl: z.string().url("URL de imagen inválida."),
    altText: z.string().nullable().optional(),
    descripcion: z.string().nullable().optional(),
});
export type ImagenOferta = z.infer<typeof ImagenOfertaSchema>;

// Esquema para los detalles completos de una oferta
export const OfertaDetalladaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable().optional(),
    tipoOferta: z.string(), // Podría ser un z.enum si tienes tipos fijos
    valor: z.number().nullable().optional(),
    codigo: z.string().nullable().optional(),
    fechaInicio: z.date(),
    fechaFin: z.date(),
    condiciones: z.string().nullable().optional(),
    imagenes: z.array(ImagenOfertaSchema),
    // videos: z.array(VideoOfertaSchema).optional(), // Omitido por ahora
});
export type OfertaDetallada = z.infer<typeof OfertaDetalladaSchema>;

// Esquema para los datos que devuelve la acción ejecutarMostrarDetalleOfertaAction
export const MostrarDetalleOfertaDataSchema = z.object({
    oferta: OfertaDetalladaSchema.nullable(), // Puede ser null si no se encuentra
    mensajeRespuesta: z.string(),
});
export type MostrarDetalleOfertaData = z.infer<typeof MostrarDetalleOfertaDataSchema>;