// Ruta: app/admin/_lib/funciones/aceptarOferta.type.ts

/**
 * Argumentos esperados por la función ejecutarAceptarOfertaAction.
 * - negocioId: Proveniente del contexto del asistente.
 * - oferta_id: ID de la oferta que el usuario ha aceptado.
 */
export interface AceptarOfertaArgs {
    negocioId: string;
    oferta_id: string; // ID de la Oferta
    canalNombre?: string; // <-- NUEVO CAMPO para el nombre del canal
}

/**
 * Datos devueltos por la función ejecutarAceptarOfertaAction en caso de éxito.
 */
export interface AceptarOfertaData {
    nombreOferta: string;                 // Nombre de la oferta para confirmación
    linkDePago?: string | null;           // El link de pago si existe
    mensajeSiguientePaso: string;         // Mensaje con el link de pago o los siguientes pasos
}