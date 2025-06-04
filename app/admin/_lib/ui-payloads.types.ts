// Ruta: app/admin/_lib/ui-payloads.types.ts

// --- Definiciones Comunes para Payloads de UI ---

export interface UiPayloadImage {
    url: string;
    altText?: string | null;
    caption?: string | null;
    isPrincipal?: boolean | null; // Opcional para marcar la imagen principal
}

export interface UiPayloadVideo {
    tipoVideo: 'YOUTUBE' | 'VIMEO' | 'SUBIDO' | 'OTRO_URL'; // Tipos de video que tu frontend puede manejar
    videoUrl: string;
    titulo?: string | null;
    descripcion?: string | null; // Para un caption o descripción
    thumbnailUrl?: string | null; // Opcional, para miniaturas
}

export interface UiPayloadDocument { // Si necesitas mostrar documentos de forma enriquecida
    url: string;
    filename: string;
    titulo?: string | null;
    filetype?: string | null; // ej. 'PDF', 'DOCX'
    size?: string | null; // ej. '2.5MB'
}

export interface UiPayloadOfferDetailItem { // Para un item dentro de la lista de detalles de una oferta
    tituloDetalle: string;
    contenido: string; // Puede ser HTML o Markdown, según cómo lo procese tu frontend
    tipoDetalle?: string | null; // Ej: 'BENEFICIO', 'FAQ', 'CONDICION'
}

// --- Payloads de Datos Específicos por Componente ---

// 1. Para OfferDisplayComponent
export interface OfferDisplayPayloadData {
    id: string;
    nombre: string;
    descripcionGeneral: string | null;
    precioFormateado: string | null;
    moneda: string | null;
    objetivos?: string[]; // ej. ["VENTA", "CITA"]
    imagenPrincipal?: UiPayloadImage | null;
    galeriaImagenes: UiPayloadImage[];
    videos: UiPayloadVideo[];
    detallesAdicionales: UiPayloadOfferDetailItem[]; // Antes llamado listaDetalles
}

export interface UiComponentPayloadOfferDisplay {
    componentType: 'OfferDisplay';
    data: OfferDisplayPayloadData;
}

// 2. Para ActionPromptComponent (botones de acción)
export interface ActionButtonPayload {
    label: string;
    actionType: "CALL_FUNCTION" | "USER_INPUT_EXPECTED" | "OPEN_URL";
    actionName?: string;
    payload?: Record<string, unknown>; // Usar 'any' con precaución, o un tipo más específico si es posible
    url?: string;
    style?: 'primary' | 'secondary' | 'destructive' | 'outline';
}

export interface ActionPromptPayloadData {
    message: string;
    actions: ActionButtonPayload[];
}

export interface UiComponentPayloadActionPrompt {
    componentType: 'ActionPrompt';
    data: ActionPromptPayloadData;
}

// 3. Para StripePaymentLinkComponent
export interface StripePaymentLinkPayloadData {
    checkoutUrl: string;
    buttonText: string;
    message?: string;
}

export interface UiComponentPayloadStripePaymentLink {
    componentType: 'StripePaymentLink';
    data: StripePaymentLinkPayloadData;
}

// --- Tipo Genérico de Unión Discriminada para UiComponentPayload ---
// Esto permite que ChatMessageBubble y otros consumidores manejen diferentes
// tipos de componentes ricos de forma type-safe.
export type UiComponentPayload<TData = unknown> = // TData es un genérico por si hay tipos no listados explícitamente
    | UiComponentPayloadOfferDisplay
    | UiComponentPayloadActionPrompt
    | UiComponentPayloadStripePaymentLink
    // | OtroTipoDeUiComponentPayload ... // Puedes añadir más tipos aquí en el futuro
    // Fallback para tipos no explícitamente definidos en la unión, aunque es mejor ser explícito.
    // Si solo vas a usar los de arriba, puedes omitir este fallback.
    | { componentType: string; data: TData };
