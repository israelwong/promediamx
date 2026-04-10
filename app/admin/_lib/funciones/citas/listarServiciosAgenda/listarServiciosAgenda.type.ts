// Ruta sugerida: app/admin/_lib/funciones/listarServiciosAgenda.type.ts

/**
 * Argumentos para la función de listar servicios de agenda.
 * Inicialmente, solo necesitamos el contexto del negocio.
 */
export interface ListarServiciosAgendaArgs {
    negocioId: string; // Proporcionado por el contexto del asistente/sistema
    // No se esperan otros argumentos del usuario para esta acción
}

/**
 * Estructura de un servicio individual para la respuesta.
 */
export interface ServicioAgendaInfo {
    nombre: string;
    descripcion?: string | null; // Descripción del servicio, si existe
    // Podrías añadir más campos si quieres mostrarlos, ej: duracionMinutos
}

/**
 * Datos que la función de listar servicios devuelve.
 */
export interface ListarServiciosAgendaData {
    servicios: ServicioAgendaInfo[]; // Array de servicios disponibles
    mensajeParaUsuario: string;    // Mensaje a mostrar al usuario
}
