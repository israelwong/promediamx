import { z } from 'zod';

// Esquema para los argumentos que la acción ejecutarInformarHorarioAction espera.
// 'negocioId' es añadido por el dispatcher.
// 'diaEspecifico' y 'verificarAbiertoAhora' son opcionales y la IA podría extraerlos en el futuro
// si se actualiza la definición de la herramienta.
export const InformarHorarioArgsSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
    diaEspecifico: z.string().min(1, "El día específico no puede estar vacío si se proporciona.").nullable().optional(),
    verificarAbiertoAhora: z.boolean().optional(),
});
export type InformarHorarioArgs = z.infer<typeof InformarHorarioArgsSchema>;

// Esquema para los datos que devuelve la acción ejecutarInformarHorarioAction
export const InformarHorarioDataSchema = z.object({
    respuestaHorario: z.string(), // El texto formateado con la información del horario
    // Podríamos añadir más campos estructurados si fueran útiles para el frontend o la IA
    // por ejemplo:
    // horariosRegulares: z.array(z.object({ dias: z.string(), horario: z.string() })).optional(),
    // excepcionesNoLaborables: z.array(z.object({ fecha: z.string(), descripcion: z.string().nullable() })).optional(),
});
export type InformarHorarioData = z.infer<typeof InformarHorarioDataSchema>;