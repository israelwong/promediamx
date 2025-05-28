// Sugerencia de ubicación: @/app/admin/_lib/ui-payloads.types.ts
// O dentro de @/app/admin/_lib/schemas/sharedCommon.schemas.ts

// Importar el tipo de video compartido si aún no está globalmente accesible
// import { type SharedTipoVideoType } from './sharedCommon.schemas'; // Ajusta la ruta

// Estructura para una imagen dentro del payload de UI
export interface UiPayloadImage {
    url: string;
    altText?: string | null;
    caption?: string | null;
    isPrincipal?: boolean | null; // Para destacar una imagen
}

// Estructura para un video dentro del payload de UI
export interface UiPayloadVideo {
    tipoVideo: 'YOUTUBE' | 'VIMEO' | 'SUBIDO' | 'OTRO_URL'; // Debería usar tu SharedTipoVideoType
    videoUrl: string;
    titulo?: string | null;
    descripcion?: string | null; // Para un caption o descripción debajo del video
    thumbnailUrl?: string | null; // Opcional, para mostrar una miniatura antes de cargar el video/iframe
}

// Estructura para un documento dentro del payload de UI
export interface UiPayloadDocument {
    url: string;
    filename: string; // Nombre del archivo para la descarga
    titulo?: string | null; // Título descriptivo del documento
    filetype?: string | null; // ej. 'PDF', 'DOCX'
    size?: string | null; // ej. '2.5MB'
}

// Estructura para un detalle adicional (FAQ, beneficio, etc.)
export interface UiPayloadOfferDetailItem {
    tituloDetalle: string;
    contenido: string;
    tipoDetalle?: string | null; // 'BENEFICIO', 'FAQ', 'CONDICION', etc.
}

// Los datos específicos para el componente OfferDisplay
export interface OfferDisplayPayloadData {
    id: string; // ID de la oferta
    nombre: string;
    descripcionGeneral: string | null;
    precioFormateado: string | null;
    moneda: string | null;
    condiciones: string | null;
    linkPago?: string | null;

    // Podríamos tener una imagen principal separada o marcar una dentro de la galería
    imagenPrincipal?: UiPayloadImage | null;
    galeriaImagenes: UiPayloadImage[]; // Siempre un array, puede estar vacío

    videos: UiPayloadVideo[]; // Siempre un array, puede estar vacío

    // Para otros detalles como FAQs, beneficios (si no se manejan de otra forma)
    listaDetalles: UiPayloadOfferDetailItem[]; // Siempre un array, puede estar vacío

    // Podríamos incluso añadir Call to Actions (CTAs) si es necesario
    // callToActions?: Array<{
    //   label: string;
    //   actionType: 'LINK' | 'FUNCTION_CALL' | 'ADD_TO_CART'; // Define los tipos de acción
    //   payload: string | { functionName: string; args: Record<string, any> }; // URL, o nombre de función y args
    //   style?: 'primary' | 'secondary' | 'outline';
    // }>;
}

// La estructura genérica para cualquier payload de UI que envíe el backend
export interface UiComponentPayload<T_Data = Record<string, unknown>> {
    componentType: string; // Ej: 'OfferDisplay', 'ProductList', 'PackageCarousel'
    data: T_Data;
}

// Un tipo específico para el payload de OfferDisplay
export type OfferDisplayUiPayload = UiComponentPayload<OfferDisplayPayloadData>;