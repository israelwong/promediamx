import { z } from 'zod';

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
/**
 * Argumentos que la IA debe proveer para listar los horarios disponibles.
 */
export const ListarHorariosDisponiblesArgsSchema = z.object({
    servicio_nombre: z.string().min(1, "Se necesita el nombre del servicio para buscar horarios."),

    fecha_deseada: z.string().min(1, "Se necesita una fecha para buscar horarios."),
});

export type ListarHorariosDisponiblesArgs = z.infer<typeof ListarHorariosDisponiblesArgsSchema>;

