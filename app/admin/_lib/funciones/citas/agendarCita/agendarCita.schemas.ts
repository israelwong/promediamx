// RUTA: app/admin/_lib/funciones/citas/agendarCita/agendarCita.schemas.ts
import { z } from 'zod';

/**
 * Define los argumentos que la IA nos enviará.
 * Refleja exactamente los parámetros definidos en la TareaFuncion.
 */
export const AgendarCitaArgsFromAISchema = z.object({
    // CAMBIO: Usamos z.coerce.boolean() para que convierta automáticamente
    // valores como "true" o 1 a un booleano.
    iniciar_nuevo_flujo: z.coerce.boolean().nullable().optional(),

    // ... el resto de los parámetros se mantienen igual ...
    servicio_nombre: z.string().min(3, "El nombre del servicio es muy corto.").nullable().optional(),
    fecha_hora_deseada: z.string().min(3, "La fecha indicada es muy corta.").nullable().optional(),
    motivo_de_reunion: z.string().max(500).nullable().optional(),
    oferta_id: z.string().cuid("El ID de la oferta no es válido.").nullable().optional(),
    tipo_cita_modalidad_preferida: z.enum(['presencial', 'virtual']).nullable().optional(),
    nombre_contacto: z.string().max(100).nullable().optional(),
    email_contacto: z.string().email("El formato del email no es válido.").nullable().optional(),
    telefono_contacto: z.string().max(20).nullable().optional(),
});
export type AgendarCitaArgsFromAI = z.infer<typeof AgendarCitaArgsFromAISchema>;


/**
 * Define la configuración del negocio necesaria para la lógica de agendamiento.
 * (Este schema se mantiene igual, es para uso interno).
 */
export const ConfiguracionAgendaDelNegocioSchema = z.object({
    requiereNombre: z.boolean(),
    requiereEmail: z.boolean(),
    requiereTelefono: z.boolean(),
    bufferMinutos: z.number().int().min(0),
    aceptaCitasVirtuales: z.boolean(),
    aceptaCitasPresenciales: z.boolean(),
});
export type ConfiguracionAgendaDelNegocio = z.infer<typeof ConfiguracionAgendaDelNegocioSchema>;