// Ruta: app/admin/_lib/funciones/citas/confirmarCita/confirmarCita.schemas.ts
import { z } from 'zod';

// Esta función recibe TODOS los datos ya validados, listos para ejecutar.
// Son los mismos que agendarCita, pero aquí son todos requeridos.
export const ConfirmarCitaArgsSchema = z.object({
    servicio_nombre: z.string(),
    fecha_hora_deseada: z.string().datetime({ message: "Se esperaba una fecha en formato ISO para la confirmación." }),
    nombre_contacto: z.string(),
    email_contacto: z.string().email(),
    telefono_contacto: z.string(),
    motivo_de_reunion: z.string().nullable().optional(),
    ofertaId: z.string().cuid().nullable().optional(),
});
export type ConfirmarCitaArgs = z.infer<typeof ConfirmarCitaArgsSchema>;