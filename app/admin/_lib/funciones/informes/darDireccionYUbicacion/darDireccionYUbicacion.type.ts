// Ruta: app/admin/_lib/funciones/darDireccionYUbicacion.type.ts

/**
 * Argumentos esperados por la función ejecutarDarDireccionAction.
 * Principalmente necesita el ID del negocio para buscar la información.
 */
export interface DarDireccionArgs {
    // Parámetros extraídos por la IA (si aplica, aunque aquí no son estrictamente necesarios para la lógica)
    // motivo?: string; // Ejemplo: "para visitar la tienda", "para enviar un paquete"

    // --- Información de Contexto (Pasada por el Dispatcher) ---
    negocioId: string; // ID del Negocio cuya dirección se busca
}

/**
 * Datos devueltos por la función ejecutarDarDireccionAction en caso de éxito.
 * Incluye la dirección, el link de Google Maps y un mensaje formateado.
 */
export interface DarDireccionData {
    direccionEncontrada: string | null;   // La dirección física (puede ser null si no está registrada)
    googleMapsUrl: string | null;         // La URL de Google Maps (puede ser null)
    mensajeRespuesta: string;             // Mensaje formateado para enviar al usuario
}