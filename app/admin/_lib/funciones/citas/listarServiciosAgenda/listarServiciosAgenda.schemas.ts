import { z } from 'zod';

// Esquema para los argumentos que la acción ejecutarListarServiciosAgendaAction espera.
// Gemini no extrae argumentos para esta función; el negocioId se añade en el dispatcher.
export const ListarServiciosAgendaArgsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
    // No se esperan otros argumentos de la IA para esta acción.
});
export type ListarServiciosAgendaArgs = z.infer<typeof ListarServiciosAgendaArgsSchema>;

// Esquema para la información resumida de un servicio/tipo de cita de la agenda
export const ServicioAgendaInfoSchema = z.object({
    nombre: z.string(),
    descripcion: z.string().max(500, "La descripción del servicio es muy larga.").nullable().optional(),
    // Podrías añadir más campos si son devueltos por la acción y necesarios en la respuesta,
    // ej: duracionMinutos: z.number().int().positive().nullable().optional(),
});
export type ServicioAgendaInfo = z.infer<typeof ServicioAgendaInfoSchema>;

// Esquema para los datos que devuelve la acción ejecutarListarServiciosAgendaAction
export const ListarServiciosAgendaDataSchema = z.object({
    servicios: z.array(ServicioAgendaInfoSchema),
    mensajeParaUsuario: z.string(),
});
export type ListarServiciosAgendaData = z.infer<typeof ListarServiciosAgendaDataSchema>;