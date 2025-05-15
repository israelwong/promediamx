// app/admin/_lib/funciones/reagendarCita.type.ts

/**
 * Argumentos que se esperan de la IA (Gemini) para la acción de reagendar cita.
 */
export interface ReagendarCitaArgs {
    // Para identificar la cita original
    cita_id_original?: string | null;
    detalle_cita_original_para_reagendar?: string | null; // Para búsqueda textual si no hay ID

    // Para el nuevo horario
    nueva_fecha_hora_deseada?: string | null; // Preferencia de nueva fecha/hora del usuario

    // Para el flujo de confirmación final del reagendamiento
    confirmacion_usuario_reagendar?: boolean | null;

    // Opcional: si la IA lo extrae y se quiere actualizar el Lead.
    // Normalmente, para un reagendamiento, estos datos se toman de la cita original o del Lead.
    nombre_contacto?: string | null;
    email_contacto?: string | null;
    telefono_contacto?: string | null;

    // Contexto necesario para la acción (provisto por el dispatcher)
    leadId: string;
    asistenteVirtualId: string;
    // negocioId podría ser útil si las citas no siempre están ligadas a un lead específico
    servicio_nombre?: string | null; // Nombre del servicio para el que se reagenda la cita
}

/**
 * Detalles de la cita original para mostrar al usuario para confirmación o selección.
 * Incluye todos los datos de contacto y detalles relevantes.
 */
export interface CitaOriginalDetalles {
    id: string;
    fechaHoraOriginal: string; // Formateada amigablemente
    asuntoOriginal: string;
    modalidadOriginal?: string | null;
    nombreContactoOriginal?: string | null;
    emailContactoOriginal?: string | null;
    telefonoContactoOriginal?: string | null;
    // Para referencia interna al procesar
    fechaOriginalObj?: Date;
    tipoDeCitaIdOriginal?: string;
    duracionMinutosOriginal?: number;
}

/**
 * Datos que la función de reagendamiento devuelve al dispatcher.
 */
export interface ReagendarCitaData {
    mensajeParaUsuario: string;
    reagendamientoRealizado: boolean;
    citaReagendadaId?: string | null; // ID de la cita después de ser reagendada (sigue siendo el mismo ID)

    // Para el flujo de identificación de la cita original
    requiereIdentificarCitaOriginal?: boolean; // Si la IA debe pedir detalles para encontrar la cita
    requiereConfirmarCitaOriginal?: boolean; // Si la IA debe pedir confirmación para una cita original específica
    citaOriginalParaConfirmar?: CitaOriginalDetalles | null;
    listaCitasOriginalesParaElegir?: CitaOriginalDetalles[] | null;

    // Para el flujo de selección de nuevo horario
    requiereNuevaFechaHora?: boolean; // Si la IA debe pedir la nueva fecha/hora

    // Para la confirmación final del nuevo slot
    requiereConfirmarNuevoSlot?: boolean; // Si la IA debe pedir confirmación para el nuevo horario propuesto
    nuevoSlotPropuesto?: { // Incluye detalles de la cita original con el nuevo horario
        fechaHoraNueva: string; // Nueva fecha/hora formateada
        // Se repiten los detalles de la cita original para claridad en la confirmación
        id: string;
        asunto: string;
        modalidad?: string | null;
        nombreContacto?: string | null;
        emailContacto?: string | null;
        telefonoContacto?: string | null;
    } | null;
}

// ActorInfo (si no la tienes global, puedes definirla aquí o importarla)
// export interface ActorInfo {
//     type: ChangedByType;
//     id: string | null;
// }