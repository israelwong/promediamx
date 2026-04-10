// app/admin/_lib/funciones/cancelarCita.type.ts

import { ChangedByType } from '@prisma/client'; // Asumiendo que ChangedByType se usa para el historial

/**
 * Argumentos que se esperan de la IA (Gemini) o del frontend
 * para la acción de cancelar una cita.
 */
export interface CancelarCitaArgs {
    // Para identificar la cita
    cita_id_cancelar?: string | null;
    detalle_cita_para_cancelar?: string | null; // Para búsqueda textual si no hay ID

    // Para el flujo de confirmación
    confirmacion_usuario_cancelar?: boolean | null; // true si el usuario confirma, false si rechaza, null si aún no se pide

    // Opcional
    motivo_cancelacion?: string | null;

    // Contexto necesario para la acción (el dispatcher los debe proveer)
    leadId: string;
    asistenteVirtualId: string; // Para registrar quién (qué asistente) está mediando la cancelación
    // Se podría añadir negocioId si la búsqueda de citas no se limita solo al leadId
}

/**
 * Detalles de una cita para mostrar al usuario para confirmación o selección.
 */
export interface CitaDetalleParaCancelar {
    id: string;
    fechaHora: string; // Formateada amigablemente
    asunto: string;    // O nombre del servicio
    modalidad?: string | null;
    // Podrías añadir más detalles si son útiles para el usuario (ej. ubicación si es presencial)
}

/**
 * Datos que la función de cancelación de cita devuelve al dispatcher/controlador.
 */
export interface CancelarCitaData {
    mensajeParaUsuario: string;          // El mensaje que la IA debe decir al usuario.
    cancelacionRealizada: boolean;       // true si la cancelación fue exitosa en el backend.
    citaCanceladaId?: string | null;     // ID de la cita que se canceló.
    requiereConfirmacion?: boolean;      // true si la IA necesita pedir confirmación para una cita específica.
    citaParaConfirmar?: CitaDetalleParaCancelar | null; // Detalles de la cita a confirmar.
    listaCitasParaElegir?: CitaDetalleParaCancelar[] | null; // Si hay múltiples citas para que elija.
}

/**
 * Información del actor que realiza la acción (para AgendaHistorial).
 */
export interface ActorInfo {
    type: ChangedByType;
    id: string | null;
}