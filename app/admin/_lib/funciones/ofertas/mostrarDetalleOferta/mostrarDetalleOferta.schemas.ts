// Ruta: app/admin/_lib/funciones/ofertas/mostrarDetalleOferta/mostrarDetalleOferta.schemas.ts
import { z } from 'zod';

// MediaItemSchema se mantiene como lo definiste (image, video, document, audio)
export const MediaItemSchema = z.object({
    tipo: z.enum(['image', 'video', 'document', 'audio']),
    url: z.string().url("La URL de la media no es válida."),
    caption: z.string().optional(),
    filename: z.string().optional(),
});
export type MediaItem = z.infer<typeof MediaItemSchema>;

// Schema para los parámetros que la IA debe proporcionar para ejecutar esta función
// Este schema se usa para validar los 'argsFromIA'
export const EjecutarMostrarDetalleOfertaParamsSchema = z.object({
    ofertaId: z.string().cuid("ID de oferta inválido. Debe ser un CUID.").optional(), // Cambiado de uuid a cuid
    nombre_de_la_oferta: z.string().min(1, "Nombre de la oferta es requerido.").optional(),
}).refine(data => data.ofertaId || data.nombre_de_la_oferta, {
    message: "Se requiere 'ofertaId' o 'nombre_de_la_oferta'.",
    path: ["ofertaId"], // O un path más general como ["_root"] si aplica a la combinación
});
export type EjecutarMostrarDetalleOfertaParams = z.infer<typeof EjecutarMostrarDetalleOfertaParamsSchema>;

// --- Interfaces para el payload del componente de UI en WebChat ---
// Estas son interfaces TypeScript, no schemas Zod, porque definen la estructura
// de un objeto que se pasa al frontend, no se validan aquí con Zod necesariamente.

// Detalle individual (mapeado desde un OfertaDetalle de Prisma)
export interface DetalleAdicionalParaDisplay {
    tituloDetalle: string;
    contenido: string;
    tipoDetalle?: string | null; // Para que el frontend decida cómo mostrarlo (ej. "CONDICION", "BENEFICIO")
    // Podrías añadir aquí media asociada a ESTE detalle si fuera necesario
}

// Video para el display
export interface VideoParaDisplay {
    tipoVideo: 'YOUTUBE' | 'VIMEO' | 'SUBIDO' | 'OTRO_URL'; // Debería coincidir con tu Enum de Prisma si tienes uno
    videoUrl: string;
    titulo?: string | null;
}

// Imagen para el display (puede ser principal o de galería)
export interface ImagenParaDisplay {
    url: string;
    altText?: string | null;
    caption?: string | null;
}

// Payload específico para el componente OfferDisplay en WebChat
export interface OfferDisplayPayloadData {
    id: string;
    nombre: string;
    descripcionGeneral: string | null;
    precioFormateado: string | null; // ej. "$1,250.00 MXN"
    moneda: string | null;           // ej. "MXN"
    // Ya no hay linkPago, codigo, condiciones directas aquí
    objetivos?: string[]; // ej. ["VENTA", "CITA"] (mapeado desde el enum ObjetivoOferta)

    imagenPrincipal?: ImagenParaDisplay | null;
    galeriaImagenes: ImagenParaDisplay[];
    videos: VideoParaDisplay[];
    detallesAdicionales: DetalleAdicionalParaDisplay[]; // Aquí irían las "condiciones" y otros detalles
}

// Estructura del uiComponentPayload que se enviará al WebChat
export interface UiComponentPayloadOfferDisplay {
    componentType: 'OfferDisplay';
    data: OfferDisplayPayloadData;
}