import { z } from 'zod';

// Schema para crear un OfertaDetalle
export const CreateOfertaDetalleInputSchema = z.object({
    ofertaId: z.string().cuid({ message: "ID de oferta inválido." }),
    tituloDetalle: z.string().min(3, "Título debe tener al menos 3 caracteres.").max(255),
    contenido: z.string().min(10, "Contenido debe tener al menos 10 caracteres."),
    tipoDetalle: z.string().max(100).nullable().optional(),
    palabrasClave: z.array(z.string()).default([]),
    orden: z.number().int().optional(),
    estadoContenido: z.string().max(50).default("PUBLICADO"),
    resolverPreguntaId: z.string().cuid().nullable().optional(),
});
export type CreateOfertaDetalleInputType = z.infer<typeof CreateOfertaDetalleInputSchema>;


const BaseMultimediaItemSchema = z.object({ // Schema base para multimedia
    id: z.string(),
    orden: z.number().int().nullable().optional(),
    createdAt: z.date(),
    tamanoBytes: z.number().int().positive().nullable().optional(),
});

const DetalleGaleriaItemSchema = BaseMultimediaItemSchema.extend({
    imageUrl: z.string().url(),
    altText: z.string().nullable().optional(),
    descripcion: z.string().nullable().optional(),
});
const DetalleVideoItemSchema = BaseMultimediaItemSchema.extend({
    videoUrl: z.string().url(),
    tipoVideo: z.string().nullable().optional(),
    tituloVideo: z.string().nullable().optional(),
    descripcionVideo: z.string().nullable().optional(),
});
const DetalleDocumentoItemSchema = BaseMultimediaItemSchema.extend({
    documentoUrl: z.string().url(),
    documentoNombre: z.string().nullable().optional(),
    documentoTipo: z.string().nullable().optional(),
    descripcion: z.string().nullable().optional(),
});

// --- NUEVO: Schema para la CREACIÓN BÁSICA de un OfertaDetalle ---
export const CrearOfertaDetalleBasicoInputSchema = z.object({
    ofertaId: z.string().cuid({ message: "ID de oferta inválido para el detalle." }),
    tituloDetalle: z.string().min(3, "El título debe tener al menos 3 caracteres.").max(255),
    contenido: z.string().min(10, "El contenido debe tener al menos 10 caracteres."),
    // Opcional: si esta creación básica también puede resolver una pregunta pendiente
    resolverPreguntaId: z.string().cuid().nullable().optional(),
});
export type CrearOfertaDetalleBasicoInputType = z.infer<typeof CrearOfertaDetalleBasicoInputSchema>;








// --- Schema para ACTUALIZAR un OfertaDetalle (usado por OfertaDetalleForm.tsx en modo edición) ---
// Este schema define los campos que SÍ se editan a través de este formulario.
export const UpdateOfertaDetalleInputSchema = z.object({
    // 'id' del OfertaDetalle se pasa como parámetro a la action, no en el payload del form.
    tituloDetalle: z.string().min(3, "Título debe tener al menos 3 caracteres.").max(255),
    contenido: z.string().min(10, "Contenido debe tener al menos 10 caracteres."),
    tipoDetalle: z.string().max(100).nullable().optional().transform(val => val === '' ? null : val),
    palabrasClave: z.array(z.string()).default([]),
    estadoContenido: z.string().min(1, "El estado es requerido."), // No default aquí, el form debe proveerlo
    // 'orden' no se edita desde este formulario.
});
export type UpdateOfertaDetalleInputType = z.infer<typeof UpdateOfertaDetalleInputSchema>;

// --- Schema para el item en la LISTA de OfertaDetalle (usado por OfertaDetalleListado.tsx) ---
export const OfertaDetalleListItemSchema = z.object({
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    tituloDetalle: z.string(),
    contenidoExtracto: z.string().optional(),
    orden: z.number().int().nullable().optional(),
    estadoContenido: z.string(),
    updatedAt: z.date(),
    _count: z.object({
        galeriaDetalle: z.number().optional(),
        videoDetalle: z.number().optional(),
        documentosDetalle: z.number().optional(),
    }).optional(),
});
export type OfertaDetalleListItemType = z.infer<typeof OfertaDetalleListItemSchema>;

// --- Schema para el OfertaDetalle COMPLETO (usado para cargar `initialData` en el form de edición) ---
export const OfertaDetalleCompletoSchema = UpdateOfertaDetalleInputSchema.extend({ // Base es el schema de Update
    id: z.string().cuid(),
    ofertaId: z.string().cuid(),
    orden: z.number().int().nullable().optional(), // 'orden' se carga para info, pero no se re-envía desde este form

    // Campos informativos o gestionados por otras lógicas
    preguntaOriginalUsuario: z.string().nullable().optional(),
    creadoPorHumano: z.boolean().optional(), // No editable aquí
    notificacionEnviada: z.boolean().optional(), // No editable aquí
    createdAt: z.date(),
    updatedAt: z.date(),

    // Multimedia (se carga para pasar a los managers de multimedia en la Columna 2)
    galeriaDetalle: z.array(DetalleGaleriaItemSchema).optional().default([]),
    videoDetalle: DetalleVideoItemSchema.nullable().optional(),
    documentosDetalle: z.array(DetalleDocumentoItemSchema).optional().default([]),
});
export type OfertaDetalleCompletoType = z.infer<typeof OfertaDetalleCompletoSchema>;