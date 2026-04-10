import { z } from 'zod';

// Esquema para la salida de la acción de subir/actualizar icono
export const TareaIconoActualizadoOutputSchema = z.object({
    iconoUrl: z.string().url("La URL del icono no es válida.").nullable(), // Puede ser null si se elimina
});
export type TareaIconoActualizadoOutput = z.infer<typeof TareaIconoActualizadoOutputSchema>;

// No se necesitan esquemas de input complejos para las acciones si FormData se maneja directamente
// y el ID se pasa como argumento.