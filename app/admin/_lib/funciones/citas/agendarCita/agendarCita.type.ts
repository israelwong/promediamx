// Ruta: app/admin/_lib/funciones/agendarCita.type.ts

export interface ExcepcionHorarioBase {
    diaSemana: number; // 0 (domingo) a 6 (sábado)
    horaInicio: string; // Hora de inicio en formato HH:mm
    horaFin: string; // Hora de fin en formato HH:mm
    motivo?: string; // Opcional, motivo de la excepción
}

export interface TipoAgenda {
    id: string; // ID único del tipo de agenda
    nombre: string; // Nombre del tipo de agenda (por ejemplo, "Consulta médica", "Reunión de negocios")
    descripcion?: string; // Descripción opcional del tipo de agenda
    duracionMinutos: number; // Duración estándar en minutos para este tipo de agenda
    requiereConfirmacion: boolean; // Indica si este tipo de agenda requiere confirmación previa
}

// Example fix for type conversion issue
let tipoCitaDeterminado: "presencial" | "virtual" | undefined;
let tipoAgenda: TipoAgenda | undefined;

if (typeof tipoCitaDeterminado === "string") {
    if (tipoAgenda) {
        console.log("Tipo de agenda determinado:", tipoAgenda);
    }
}

/**
 * Argumentos que se esperan de la IA (Gemini) o del frontend
 * para la acción de agendar una cita.
 */
export interface AgendarCitaArgs {
    negocioId: string; // Proporcionado por el contexto del asistente/sistema
    asistenteId?: string; // ID del AsistenteVirtual si él agenda
    leadId?: string;    // Proporcionado por el contexto del lead/conversación

    // Datos extraídos de la interacción con el usuario:
    fecha_hora_deseada?: string;    // Preferencia de fecha/hora del usuario (string para parsear)
    motivo_de_reunion?: string | null;// Se usará como 'asunto' de la Agenda
    tipo_cita_modalidad_preferida?: 'presencial' | 'virtual'; // Preferencia de modalidad del usuario (si el servicio ofrece ambas)
    nombre_contacto?: string;       // Nombre del contacto para la cita
    email_contacto?: string | null;   // Email del contacto
    telefono_contacto?: string | null;// Teléfono del contacto
    servicio_nombre?: string;       // Nombre del servicio/tipo de cita que el usuario desea
}

/**
 * Datos que la función de agendamiento devuelve al dispatcher/controlador.
 */
export interface AgendarCitaData {
    esCitaCreada: boolean;      // true si se creó, false si se requiere clarificación o hubo error manejable
    mensajeParaUsuario: string; // El mensaje a mostrar al usuario
    agendaId?: string | null;         // ID de la cita creada en la tabla Agenda
    meetingUrl?: string | null;    // Para citas virtuales, si se genera
}

/**
 * Configuración del negocio relevante para el agendamiento.
 * Se obtiene del modelo Negocio y se pasa a ejecutarAgendarCitaAction.
 */
export interface ConfiguracionAgendaDelNegocio {
    negocioId: string; // Es el negocioId
    requiereNombre: boolean;
    requiereEmail: boolean;
    requiereTelefono: boolean;
    bufferMinutos: number; // Buffer entre citas en minutos
    aceptaCitasVirtuales: boolean;
    aceptaCitasPresenciales: boolean;
    // Puedes añadir más configuraciones aquí si son necesarias (ej. URL base para meeting links)
}
