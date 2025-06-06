// Ruta actual desde app: admin/_lib/funciones/citas/agendarCita/agendarCita.schemas
import { z } from 'zod';

// Esquema Zod para los argumentos que la función 'agendarCita' espera de Gemini
// y que el dispatcher validará.
// Los campos negocioId, asistenteId, y leadId se añadirán en el dispatcher antes de la validación completa
// o se pasarán directamente a la acción de ejecución si esta los espera como parte de su firma principal.
// Por ahora, definimos los campos que Gemini extraería directamente.
export const AgendarCitaArgsFromAISchema = z.object({
    fecha_hora_deseada: z.string({ errorMap: () => ({ message: "Se necesita una fecha y hora para la cita." }) })
        .min(1, "La fecha y hora deseadas son requeridas."),
    servicio_nombre: z.string({ errorMap: () => ({ message: "Se necesita el nombre del servicio para la cita." }) })
        .min(1, "El nombre del servicio es requerido."),
    nombre_contacto: z.string().max(100).nullable().optional(),
    email_contacto: z.string().email("Email de contacto inválido.").max(100).nullable().optional(),
    telefono_contacto: z.string().max(20, "Teléfono muy largo.").nullable().optional(), // Podrías añadir validación de formato telefónico
    motivo_de_reunion: z.string().max(500, "Motivo muy largo.").nullable().optional(),
    tipo_cita_modalidad_preferida: z.enum(['presencial', 'virtual'], { errorMap: () => ({ message: "Modalidad inválida, debe ser 'presencial' o 'virtual'." }) }).nullable().optional(),
});

// Esquema Zod completo para los argumentos que la acción ejecutarAgendarCitaAction espera (incluyendo los de contexto)
export const AgendarCitaArgsSchema = AgendarCitaArgsFromAISchema.extend({
    negocioId: z.string().cuid("ID de negocio inválido."),
    asistenteId: z.string().cuid("ID de asistente inválido.").optional(), // Puede ser opcional si el actor no siempre es un asistente
    leadId: z.string().cuid("ID de lead inválido."),
});
export type AgendarCitaArgs = z.infer<typeof AgendarCitaArgsSchema>;


// Esquema Zod para los datos que devuelve la acción ejecutarAgendarCitaAction
export const AgendarCitaDataSchema = z.object({
    esCitaCreada: z.boolean(),
    mensajeParaUsuario: z.string(),
    agendaId: z.string().cuid().nullable().optional(),
    meetingUrl: z.string().url("URL de reunión inválida.").nullable().optional(),
});
export type AgendarCitaData = z.infer<typeof AgendarCitaDataSchema>;


// Esquema Zod para ConfiguracionAgendaDelNegocio
// Estos son datos que la acción ejecutarAgendarCitaAction recibe, no devuelve.
// Se puede definir aquí para validación si se pasa como un objeto único, o mantener como interfaz.
export const ConfiguracionAgendaDelNegocioSchema = z.object({
    negocioId: z.string().cuid(),
    requiereNombre: z.boolean(),
    requiereEmail: z.boolean(),
    requiereTelefono: z.boolean(),
    bufferMinutos: z.number().int().min(0),
    aceptaCitasVirtuales: z.boolean(),
    aceptaCitasPresenciales: z.boolean(),
});
export type ConfiguracionAgendaDelNegocio = z.infer<typeof ConfiguracionAgendaDelNegocioSchema>;