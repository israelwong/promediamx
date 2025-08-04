// Ruta: app/admin/_lib/crmAgenda.type.ts

// Importar tipos base si son necesarios desde tu archivo global, ej: Lead, Agente
// import { Lead, Agente } from './types'; 

// Enum para el estado de la agenda, basado en tu schema
export enum StatusAgenda {
    PENDIENTE = "PENDIENTE",
    COMPLETADA = "COMPLETADA",
    CANCELADA = "CANCELADA",
    REAGENDADA = "REAGENDADA",
    NO_ASISTIO = "NO_ASISTIO"
}

// Tipo para representar una cita en la lista del widget
export interface CitaDelDia {
    id: string;
    fecha: Date; // Fecha y hora completas de la cita
    asunto: string;
    status: StatusAgenda;

    leadNombre: string | null;
    leadId?: string; // Opcional, para posible navegación o acciones

    tipoDeCitaNombre: string | null;
    tipoDeCitaLimiteConcurrencia?: number | null; // Del modelo AgendaTipoCita

    // Quién atiende/está asignado (puede ser agente o asistente)
    asignadoANombre: string | null;
    asignadoATipo?: 'agente' | 'asistente' | null; // Para diferenciar si es necesario

    // Campos para el modal de detalles
    descripcion?: string | null;
    meetingUrl?: string | null;
    fechaRecordatorio?: Date | null;
    // Podrías añadir más campos del modelo Agenda aquí si son necesarios para el modal
}

// Tipo para el resultado de la server action que obtiene las citas del día
// Reutilizando la estructura de ActionResult que ya usas.
export interface ObtenerCitasDelDiaResult {
    success: boolean;
    data?: CitaDelDia[];
    error?: string;
}
