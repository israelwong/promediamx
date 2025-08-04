// RUTA: app/admin/_lib/funciones/citas/confirmarCita/confirmarCita.schemas.ts
'use server';
import { z } from 'zod';

export const ConfirmarCitaArgsSchema = z.object({
    servicio_nombre: z.string(),

    // --- CORRECCIÓN FINAL ---
    // En lugar de validar el string, pre-procesamos el valor para convertirlo en
    // un objeto Date y luego validamos que sea una fecha válida. Es más robusto.
    fecha_hora_deseada: z.preprocess((arg) => {
        if (typeof arg == "string" || arg instanceof Date) return new Date(arg);
    }, z.date({ error: "La fecha proporcionada no es válida." })),

    email_contacto: z.string().email(),
    nombre_contacto: z.string().nullable().optional(),
    telefono_contacto: z.string().nullable().optional(),
    motivo_de_reunion: z.string().nullable().optional(),
    oferta_id: z.string().cuid().nullable().optional(),
});
export type ConfirmarCitaArgs = z.infer<typeof ConfirmarCitaArgsSchema>;