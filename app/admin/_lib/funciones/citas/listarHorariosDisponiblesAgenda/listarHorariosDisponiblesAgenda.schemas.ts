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
    servicio_nombre: z.string({
        required_error: "Se necesita el nombre del servicio para buscar horarios."
    }).min(1, "El nombre del servicio no puede estar vacío."),

    fecha_deseada: z.string({
        required_error: "Se necesita una fecha para buscar horarios."
    }).min(1, "La fecha no puede estar vacía."),
});

export type ListarHorariosDisponiblesArgs = z.infer<typeof ListarHorariosDisponiblesArgsSchema>;

