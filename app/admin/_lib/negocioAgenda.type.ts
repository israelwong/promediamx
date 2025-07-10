// Ruta: app/admin/_lib/negocioAgenda.type.ts

import {
    Negocio,
    AgendaTipoCita,
} from '@prisma/client' // O desde '@prisma/client'

// --- Enum DiaSemana (basado en tu schema Prisma) ---
export enum DiaSemana {
    LUNES = "LUNES",
    MARTES = "MARTES",
    MIERCOLES = "MIERCOLES",
    JUEVES = "JUEVES",
    VIERNES = "VIERNES",
    SABADO = "SABADO",
    DOMINGO = "DOMINGO"
}

// --- Tipo HorarioAtencion (basado en tu schema Prisma) ---
export interface HorarioAtencionBase {
    id?: string; // Opcional si se crea nuevo, Prisma lo genera
    negocioId: string; // Requerido para asociarlo
    dia: DiaSemana;
    horaInicio: string; // Formato "HH:MM"
    horaFin: string;    // Formato "HH:MM"
    // 'negocio' es una relación en Prisma, no se incluye aquí para el input o datos de UI simples.
}

// --- Tipo ExcepcionHorario (basado en tu schema Prisma) ---
export interface ExcepcionHorarioBase {
    id?: string; // Opcional si se crea nuevo
    negocioId: string; // Requerido para asociarlo
    fecha: string; // Para la UI y envío a la action, la action lo convertirá a DateTime
    esDiaNoLaborable: boolean;
    horaInicio: string | null; // Opcional, formato "HH:MM"
    horaFin: string | null;    // Opcional, formato "HH:MM"
    descripcion: string | null; // Opcional
    // 'negocio' es una relación en Prisma.
}

// Tipo para los datos completos de configuración de la agenda de un negocio
// export type NegocioAgendaConfig = Pick<
//     Negocio,
//     'id' |
//     'aceptaCitasPresenciales' |
//     'aceptaCitasVirtuales' |
//     'requiereTelefonoParaCita' |
//     'requiereEmailParaCita' |
//     'metodosPagoTexto'
// > & {
//     agendaTiposCita: AgendaTipoCita[]; // Asumiendo que AgendaTipoCita de './types' es correcto
//     horariosAtencion: HorarioAtencionBase[]; // Usando el tipo actualizado
//     excepcionesHorario: ExcepcionHorarioBase[]; // Usando el tipo actualizado
// };

// --- Tipos para AgendaTipoCita ---
// Asumiendo que AgendaTipoCita de './types' ya tiene: id, nombre, descripcion?, duracionMinutos?, esVirtual, esPresencial, negocioId
export type TipoCitaInput = Pick<AgendaTipoCita, 'nombre'> & Partial<Pick<AgendaTipoCita, 'descripcion' | 'duracionMinutos' | 'esVirtual' | 'esPresencial' | 'limiteConcurrencia'>>;


export interface TipoCitaParaTabla extends AgendaTipoCita {
    // Añadimos un campo adicional para diferenciarlo del supertipo
    agendasAsociadasCount?: number; // Ejemplo: conteo de agendas asociadas
}

// --- Tipos para HorarioAtencion ---
// El estado de la UI para los horarios semanales podría ser un array de este tipo.
// Se diferencia de HorarioAtencionBase en que 'estaAbierto' es un campo de UI,
// y 'horaInicio'/'horaFin' pueden ser null si no está abierto.
export interface HorarioSemanalUI {
    id?: string; // El ID del registro HorarioAtencion si existe
    diaSemanaNumero: number; // 0 (Domingo) a 6 (Sábado) para lógica de JS
    diaSemanaNombre: DiaSemana; // El enum para la BD
    estaAbierto: boolean;
    horaInicio: string | null; // Formato "HH:MM"
    horaFin: string | null;    // Formato "HH:MM"
}

// --- Tipos para ExcepcionHorario ---
export type ExcepcionHorarioInput = Omit<ExcepcionHorarioBase, 'id' | 'negocioId'>;

export interface ExcepcionHorarioParaTabla extends ExcepcionHorarioBase {
    formattedFecha?: string; // Ejemplo: fecha formateada para mostrar en la tabla
}

// --- Tipo para actualizar las preferencias generales de agenda en Negocio ---
// Si los campos no existen en el modelo Negocio de Prisma, define una interfaz personalizada:
export interface PreferenciasAgendaNegocioInput {
    aceptaCitasPresenciales: boolean;
    aceptaCitasVirtuales: boolean;
    requiereTelefonoParaCita: boolean;
    requiereEmailParaCita: boolean;
    metodosPagoTexto: string;
}

// Tipo de resultado estándar para acciones (si no lo tienes global)
export interface AgendaActionResult<T = null> {
    success: boolean;
    data?: T;
    error?: string | null;
    errorFields?: { [key: string]: string }; // Para errores de validación por campo
}




// --- Tipo para los datos completos de configuración (revisado por si se usa en la nueva action) ---
export type NegocioAgendaConfig = Pick<
    Negocio,
    'id'
> & {
    aceptaCitasPresenciales: boolean;
    aceptaCitasVirtuales: boolean;
    requiereTelefonoParaCita: boolean;
    requiereEmailParaCita: boolean;
    metodosPagoTexto: string;
    agendaTiposCita: AgendaTipoCita[];
    horariosAtencion: HorarioAtencionBase[];
    excepcionesHorario: ExcepcionHorarioBase[];
};

// --- NUEVOS TIPOS PARA EL WIDGET DE RESUMEN ---
export interface PreferenciasGeneralesSummary {
    aceptaPresenciales: boolean;
    aceptaVirtuales: boolean;
    requiereTelefono: boolean;
    requiereEmail: boolean;
    metodosPagoDefinidos: boolean; // True si metodosPagoTexto tiene contenido
}

export interface AgendaConfigSummary {
    preferencias?: PreferenciasGeneralesSummary; // Será undefined si no hay datos de negocio
    totalTiposCita: number;
    horariosDefinidos: boolean; // True si al menos un día de HorarioAtencionBase tiene horas
    totalExcepciones: number;
    configuracionIniciada: boolean; // True si alguna sección tiene datos o preferencias básicas están seteadas
}