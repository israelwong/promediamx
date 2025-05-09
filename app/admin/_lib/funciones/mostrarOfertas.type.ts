// Ruta: app/admin/_lib/funciones/mostrarOfertas.type.ts

/**
 * Argumentos esperados por la función ejecutarMostrarOfertasAction.
 * El negocioId es crucial para saber de qué negocio listar las ofertas.
 * No se esperan parámetros adicionales extraídos por la IA de la consulta inicial del usuario.
 */
export interface MostrarOfertasArgs {
    negocioId: string; // ID del Negocio cuyas ofertas se van a listar
}

/**
 * Representa la información resumida de una oferta que se mostrará en la lista inicial.
 */
export interface OfertaResumen {
    id: string;
    nombre: string;
    // Podrías añadir aquí un campo como 'descripcionCorta' o 'tipoOferta' si quieres mostrar algo más que el nombre.
    // Por ejemplo: descripcion?: string | null;
}

/**
 * Datos devueltos por la función ejecutarMostrarOfertasAction en caso de éxito.
 * Incluye la lista de ofertas resumidas y el mensaje formateado para el usuario.
 */
export interface MostrarOfertasData {
    ofertasEncontradas: OfertaResumen[]; // Lista de ofertas resumidas
    mensajeRespuesta: string;           // Mensaje formateado para enviar al usuario
}