// Ruta sugerida: app/admin/_lib/funciones/listarHorariosDisponiblesAgenda.type.ts

/**
 * Argumentos que se esperan de la IA (Gemini) o del frontend
 * para la acción de listar horarios disponibles.
 */
export interface ListarHorariosDisponiblesArgs {
    negocioId: string; // Proporcionado por el contexto del asistente/sistema

    // Datos extraídos de la interacción con el usuario (y definidos en la tool de Gemini):
    servicio_nombre_interes: string; // Nombre del servicio específico de interés
    fecha_deseada: string;           // Fecha para la cual se buscan horarios (string para parsear)
}

/**
 * Datos que la función de listar horarios disponibles devuelve al dispatcher/controlador.
 */
export interface ListarHorariosDisponiblesData {
    horariosDisponibles: string[]; // Array de strings con los horarios disponibles (ej: ["10:00 AM", "10:30 AM"])
    mensajeParaUsuario: string;    // Mensaje completo a mostrar al usuario
    servicioConsultado: string;    // Nombre del servicio para el cual se listaron horarios
    fechaConsultada: string;       // Fecha para la cual se listaron horarios (formateada)
}

// No olvides importar ConfiguracionAgendaDelNegocio si la usas directamente aquí,
// aunque es más probable que se use dentro de la función de acción.
// import { ConfiguracionAgendaDelNegocio } from './agendarCita.type';
