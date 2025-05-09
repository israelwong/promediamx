// Ruta: app/admin/_lib/funciones/mostrarDetalleOferta.type.ts

/**
 * Argumentos esperados por la función ejecutarMostrarDetalleOfertaAction.
 * - negocioId: Proveniente del contexto del asistente.
 * - identificadorOferta: Texto extraído por la IA de la solicitud del usuario,
 * que puede ser un ID, nombre exacto o parcial de la oferta.
 */
export interface MostrarDetalleOfertaArgs {
    negocioId: string;
    nombre_de_la_oferta: string; // Nombre, ID o frase que identifique la oferta
    canalNombre?: string; // <-- NUEVO CAMPO para el nombre del canal

}

/**
 * Representa una imagen de la galería de una oferta.
 */
export interface ImagenOferta {
    imageUrl: string;
    altText?: string | null;
    descripcion?: string | null;
}

/**
 * Representa los detalles completos de una oferta específica.
 */
export interface OfertaDetallada {
    id: string;
    nombre: string;
    descripcion?: string | null;
    tipoOferta: string;
    valor?: number | null;
    codigo?: string | null;
    fechaInicio: Date;
    fechaFin: Date;
    condiciones?: string | null;
    imagenes: ImagenOferta[]; // Galería de imágenes de la oferta
}

/**
 * Datos devueltos por la función ejecutarMostrarDetalleOfertaAction.
 * Incluye la oferta detallada (si se encontró) y el mensaje formateado para el usuario.
 */
export interface MostrarDetalleOfertaData {
    oferta?: OfertaDetallada | null; // La oferta detallada o null si no se encontró
    mensajeRespuesta: string;       // Mensaje formateado para enviar al usuario
}