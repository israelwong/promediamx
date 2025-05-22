import { z } from 'zod';

// Esquema para los argumentos que la acción ejecutarListarHorariosDisponiblesAction espera.
// 'negocioId' es añadido por el dispatcher/contexto.
// 'servicio_nombre_interes' y 'fecha_deseada' son los que se esperan de Gemini.
export const ListarHorariosDisponiblesArgsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
    servicio_nombre_interes: z.string().min(1, "El nombre del servicio de interés es requerido."),
    fecha_deseada: z.string().min(1, "La fecha deseada es requerida."),
});
export type ListarHorariosDisponiblesArgs = z.infer<typeof ListarHorariosDisponiblesArgsSchema>;

// Esquema para los datos que devuelve la acción ejecutarListarHorariosDisponiblesAction
export const ListarHorariosDisponiblesDataSchema = z.object({
    horariosDisponibles: z.array(z.string()), // Array de strings con los horarios (ej: "10:00 AM")
    mensajeParaUsuario: z.string(),
    servicioConsultado: z.string(),
    fechaConsultada: z.string(), // Fecha formateada como string
});
export type ListarHorariosDisponiblesData = z.infer<typeof ListarHorariosDisponiblesDataSchema>;

// Recordatorio: El tipo ConfiguracionAgendaDelNegocio se usa en la acción
// y ya habíamos propuesto un schema Zod para él en 'agendarCita.schemas.ts'.
// Podrías importarlo aquí si lo necesitas, o directamente en la acción.
// import { type ConfiguracionAgendaDelNegocio } from './agendarCita.schemas';