// Ruta actual desde app: admin/_lib/funciones/citas/agendarCita/agendarCita.schemas
import { z } from 'zod';

/**
 * Define los argumentos que la IA debe extraer de la conversación del usuario.
 * Esta versión está simplificada para el flujo directo sin confirmación explícita.
 */
export const AgendarCitaArgsFromAISchema = z.object({
    servicio_nombre: z.string().min(3, "El nombre del servicio es muy corto.").nullable().optional(),
    fecha_hora_deseada: z.string().min(3, "La fecha indicada es muy corta.").nullable().optional(),
    nombre_contacto: z.string().max(100).nullable().optional(),
    email_contacto: z.string().email("El formato del email no es válido.").nullable().optional(),
    telefono_contacto: z.string().max(20).nullable().optional(),
    motivo_de_reunion: z.string().max(500).nullable().optional(),
    ofertaId: z.string().cuid("El ID de la oferta no es válido.").nullable().optional(),
});
export type AgendarCitaArgsFromAI = z.infer<typeof AgendarCitaArgsFromAISchema>;


/**
 * Define la configuración del negocio necesaria para la lógica de agendamiento.
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