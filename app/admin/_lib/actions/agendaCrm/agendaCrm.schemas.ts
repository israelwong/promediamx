import { z } from 'zod';
// import { agenteSimpleSchema } from '@/app/admin/_lib/actions/lead/lead.schemas';
import { isValid as isValidDate } from 'date-fns'; // Importar isValid de date-fns

// Tipos de Cita/Tarea permitidos en el formulario
const tipoCitaEnum = z.enum(["Llamada", "Reunion", "Email", "Tarea", "Otro"]);
const statusCitaEnum = z.enum(["pendiente", "completada", "cancelada"]);

export const agenteSimpleSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().nullable(), // El nombre del agente puede ser null según tu schema Prisma
});
export type AgenteSimpleData = z.infer<typeof agenteSimpleSchema>;


// Esquema para una Cita/Tarea existente (basado en tu CitaExistente y modelo Agenda)
export const agendaCrmItemSchema = z.object({
    id: z.string().cuid(),
    leadId: z.string().cuid(),
    negocioId: z.string().cuid().nullable().optional(), // Opcional, pero útil si se necesita
    agenteId: z.string().cuid().nullable(),
    agente: agenteSimpleSchema.nullable().optional(), // Para mostrar el nombre del agente
    asunto: z.string(),
    fecha: z.date(), // Prisma devuelve Date
    descripcion: z.string().nullable().optional(),
    tipo: tipoCitaEnum, // Usar el enum
    meetingUrl: z.string().url().nullable().optional().or(z.literal('')),
    fechaRecordatorio: z.date().nullable().optional(),
    status: statusCitaEnum,
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type AgendaCrmItemData = z.infer<typeof agendaCrmItemSchema>;

// Esquema para los datos necesarios para el formulario de Cita (basado en tu DatosFormularioCita)
export const datosFormularioCitaSchema = z.object({
    crmId: z.string().cuid().nullable(), // Esencial para crear la cita en el CRM correcto
    agentes: z.array(agenteSimpleSchema), // Lista de agentes seleccionables
});
export type DatosFormularioCitaData = z.infer<typeof datosFormularioCitaSchema>;

// Esquema para los parámetros de entrada de listarCitasLeadAction
export const listarCitasLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
});
export type ListarCitasLeadParams = z.infer<typeof listarCitasLeadParamsSchema>;

// Esquema para los parámetros de entrada de obtenerDatosParaFormularioCitaAction
export const obtenerDatosFormularioCitaParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ObtenerDatosFormularioCitaParams = z.infer<typeof obtenerDatosFormularioCitaParamsSchema>;

// Base de campos comunes, ahora esperando Date para las fechas
const citaFormFields = {
    tipo: tipoCitaEnum,
    agenteId: z.string().cuid("Debes seleccionar un agente.")
        .min(1, "Debes seleccionar un agente.")
        .nullable().optional()
        .transform(val => (val === "" || val === "null" ? null : val)), // Permite string vacío o "null" para deseleccionar
    asunto: z.string().min(1, "El asunto es requerido.").max(150, "Asunto muy largo."),
    fecha: z.date({
        required_error: "La fecha y hora son requeridas.",
        invalid_type_error: "Formato de fecha y hora inválido.",
    }),
    descripcion: z.string().nullable().optional().transform(val => (val === "" ? null : val)),
    meetingUrl: z.string().url("URL de reunión inválida.").or(z.literal('')).transform(val => (val === "" ? null : val)).nullable().optional(),
    fechaRecordatorio: z.date({ invalid_type_error: "Formato de recordatorio inválido." }).nullable().optional(),
};

// Schema para NUEVA Cita
export const nuevaCitaFormValidationSchema = z.object(citaFormFields)
    .refine(data => {
        if (data.fechaRecordatorio && data.fecha && isValidDate(data.fechaRecordatorio) && isValidDate(data.fecha)) {
            return data.fechaRecordatorio < data.fecha;
        }
        return true;
    }, {
        message: "El recordatorio debe ser anterior a la fecha de la cita.",
        path: ["fechaRecordatorio"],
    });
export type NuevaCitaFormData = z.infer<typeof nuevaCitaFormValidationSchema>;

// Schema para EDITAR Cita
export const editarCitaFormValidationSchema = z.object({
    ...citaFormFields, // Hereda los campos base (incluyendo fechas como z.date())
    status: statusCitaEnum,
})
    .refine(data => {
        if (data.fechaRecordatorio && data.fecha && isValidDate(data.fechaRecordatorio) && isValidDate(data.fecha)) {
            return data.fechaRecordatorio < data.fecha;
        }
        return true;
    }, {
        message: "El recordatorio debe ser anterior a la fecha de la cita.",
        path: ["fechaRecordatorio"],
    });
export type EditarCitaFormData = z.infer<typeof editarCitaFormValidationSchema>;

// Esquema para los parámetros de entrada de la acción editarCitaLeadAction
export const editarCitaLeadParamsSchema = z.object({
    citaId: z.string().cuid(),
    datos: editarCitaFormValidationSchema,
});
export type EditarCitaLeadParams = z.infer<typeof editarCitaLeadParamsSchema>;

// Esquema para los parámetros de entrada de la acción eliminarCitaLeadAction
export const eliminarCitaLeadParamsSchema = z.object({
    citaId: z.string().cuid(),
});
export type EliminarCitaLeadParams = z.infer<typeof eliminarCitaLeadParamsSchema>;


export const crearCitaLeadParamsSchema = z.object({
    leadId: z.string().cuid(),
    datos: nuevaCitaFormValidationSchema,
    crmId: z.string().cuid().nullable(), // CRM ID opcional, pero útil para crear la cita en el CRM correcto
});
export type CrearCitaLeadParams = z.infer<typeof crearCitaLeadParamsSchema>;


// Esquema para el objeto 'resource' dentro de un evento del calendario
// Basado en cómo se usa en tu modal de CRMAgenda.tsx
export const agendaEventoResourceSchema = z.object({
    id: z.string().cuid(), // ID original del registro Agenda
    tipo: z.string(),      // Ej: "Llamada", "Reunión"
    descripcion: z.string().nullable().optional(),
    status: z.string(),    // Ej: "pendiente", "completada"
    lead: z.object({
        id: z.string().cuid(),
        nombre: z.string().nullable(),
    }).nullable().optional(),
    agente: agenteSimpleSchema.nullable().optional(),
    // Puedes añadir más campos que quieras tener accesibles en el evento
});
export type AgendaEventoResourceData = z.infer<typeof agendaEventoResourceSchema>;

// Esquema para un evento del calendario compatible con react-big-calendar
export const agendaEventoSchema = z.object({
    title: z.string(),
    start: z.date(),
    end: z.date(),
    allDay: z.boolean().optional(),
    resource: agendaEventoResourceSchema.optional(), // Contendrá los datos adicionales
});
export type AgendaEventoData = z.infer<typeof agendaEventoSchema>;

// Esquema para el resultado de la acción que obtiene los eventos de la agenda
export const obtenerEventosAgendaResultSchema = z.object({
    crmId: z.string().cuid().nullable(),
    eventos: z.array(agendaEventoSchema),
});
export type ObtenerEventosAgendaResultData = z.infer<typeof obtenerEventosAgendaResultSchema>;

// Esquema para los parámetros de entrada de listarEventosAgendaAction
export const listarEventosAgendaParamsSchema = z.object({
    negocioId: z.string().cuid(),
    rangeStart: z.date().optional(), // Fechas opcionales para filtrar por rango
    rangeEnd: z.date().optional(),
});
export type ListarEventosAgendaParams = z.infer<typeof listarEventosAgendaParamsSchema>;


// Enum para StatusAgenda (ya lo tenías, lo convertimos a Zod enum)
export const statusAgendaEnum = z.enum([
    "pendiente",
    "completada",
    "cancelada",
    "reagendada",
    "no_asistio"
]);
export type StatusAgenda = z.infer<typeof statusAgendaEnum>;

// Esquema para una Cita/Tarea mostrada en la lista "Citas de Hoy"
// Basado en tu CitaDelDia y el modelo Agenda de Prisma
export const citaDelDiaSchema = z.object({
    id: z.string().cuid(),
    fecha: z.date(), // Será un objeto Date
    asunto: z.string(),
    status: statusAgendaEnum,

    // Campos expandidos para mostrar en la lista y el modal
    leadId: z.string().cuid().nullable().optional(),
    leadNombre: z.string().nullable().optional(),

    tipoOriginal: z.string(), // El campo 'tipo' de la tabla Agenda
    tipoDeCitaNombre: z.string().nullable().optional(), // Del modelo relacionado AgendaTipoCita.nombre

    agenteId: z.string().cuid().nullable().optional(),
    asignadoANombre: z.string().nullable().optional(), // Puede ser nombre de Agente o Asistente

    // Campos adicionales para el modal de detalle
    descripcion: z.string().nullable().optional(),
    meetingUrl: z.string().url().nullable().optional().or(z.literal('')),
    fechaRecordatorio: z.date().nullable().optional(),
    // asistenteId: z.string().cuid().nullable().optional(), // Si necesitas el ID del asistente
});
export type CitaDelDiaData = z.infer<typeof citaDelDiaSchema>;

// Esquema para el resultado de la acción que obtiene las citas del día
export const listarCitasDelDiaResultSchema = z.object({
    // crmId no parece usarse en AgendaLista, pero podría ser útil si el CRM no está configurado
    crmId: z.string().cuid().nullable(),
    citas: z.array(citaDelDiaSchema),
});
export type ListarCitasDelDiaResultData = z.infer<typeof listarCitasDelDiaResultSchema>;

// Esquema para los parámetros de entrada de listarCitasDelDiaAction
export const listarCitasDelDiaParamsSchema = z.object({
    negocioId: z.string().cuid(),
    // La fecha para "hoy" se determinará en el servidor para consistencia
});
export type ListarCitasDelDiaParams = z.infer<typeof listarCitasDelDiaParamsSchema>;

// Para el payload de Supabase Realtime (si lo validas con Zod, opcional)
export const agendaRealtimePayloadSchema = z.object({
    id: z.string().cuid(),
    fecha: z.string().datetime(), // Supabase envía fechas como string ISO
    asunto: z.string(),
    status: z.string(), // Podría ser más permisivo aquí y validar contra el enum después
    // Otros campos que esperas del payload de Supabase que son relevantes
    // Es importante que el modelo Agenda en Prisma tenga el campo 'negocioId' para un filtrado eficiente.
    negocioId: z.string().cuid().nullable().optional(), // ¡CLAVE SI ESTÁ EN LA TABLA AGENDA!
    tipoDeCitaId: z.string().cuid().nullable().optional(),
}).passthrough(); // passthrough() para permitir otros campos no definidos
export type AgendaRealtimePayload = z.infer<typeof agendaRealtimePayloadSchema>;


// Renombrar y modificar el schema de parámetros para la acción de listar citas
export const listarCitasAgendaParamsSchema = z.object({ // Antes listarCitasDelDiaParamsSchema
    negocioId: z.string().cuid(),
    fechaReferencia: z.date(), // La fecha que se usará como base para el día o mes
    tipoRango: z.enum(['dia', 'mes']), // Nuevo: para especificar el rango
});
export type ListarCitasAgendaParams = z.infer<typeof listarCitasAgendaParamsSchema>;

// Renombrar el schema del resultado para consistencia
export const listarCitasAgendaResultSchema = z.object({ // Antes listarCitasDelDiaResultSchema
    crmId: z.string().cuid().nullable(),
    citas: z.array(citaDelDiaSchema),
});
export type ListarCitasAgendaResultData = z.infer<typeof listarCitasAgendaResultSchema>;