// Ruta: app/admin/_lib/funciones/agendarCitaPresencial.type.ts

/**
 * Argumentos esperados por la función ejecutarAgendarCitaAction.
 * Incluye parámetros estándar de la función y campos personalizados relevantes.
 * La IA debería extraer estos valores de la conversación.
 */
export interface AgendarCitaArgs {
    // Parámetros estándar de la función (pueden coincidir con campos del Lead)
    nombre_contacto?: string;
    email_contacto?: string;
    telefono_contacto?: string;
    fecha_hora?: string; // Formato ISO 8601 o similar esperado de la IA
    motivo_de_reunion?: string;

    // Campos personalizados del CRM que la TAREA podría requerir 
    // (los nombres aquí deben coincidir con los `nombreCampo` de CRMCampoPersonalizado
    // o los nombres que la IA use consistentemente).
    // Ejemplo:
    servicio_interes?: string;
    // presupuesto?: number;

    // --- Información de Contexto (Pasada por el Dispatcher) ---
    leadId: string; // ID del Lead al que se asociará la cita y se actualizarán los datos
    // agenteIdPredeterminado?: string; // Opcional: Si se quiere asignar un agente específico
}

/**
 * Datos devueltos por la función ejecutarAgendarCitaAction en caso de éxito.
 */
export interface ResultadoAgendamiento {
    citaId: string;         // ID de la cita creada en la tabla Agenda
    fechaConfirmada: Date;  // Fecha/Hora confirmada de la cita
    mensajeConfirmacion: string; // Mensaje para mostrar al usuario
}

