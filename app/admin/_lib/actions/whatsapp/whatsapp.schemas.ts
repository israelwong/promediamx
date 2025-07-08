// app/admin/_lib/actions/whatsapp/whatsapp.schemas.ts
import { z } from 'zod';
import { ChatMessageItemSchema } from '@/app/admin/_lib/schemas/sharedCommon.schemas';

// =========================================================================
// ESQUEMA REFACTORIZADO PARA EL INPUT DE LA ACCIÓN PRINCIPAL
// =========================================================================
// Este esquema ahora soporta una estructura de mensaje más rica,
// permitiendo al webhook pasar no solo texto, sino también interacciones
// de botones, listas, etc., de una forma estandarizada.
// =========================================================================
export const WhatsAppMessageInputSchema = z.union([
    z.object({
        type: z.literal('text'),
        content: z.string().min(1, "El contenido del texto no puede estar vacío."),
    }),
    z.object({
        type: z.literal('interactive'),
        data: z.object({
            type: z.enum(['button_reply', 'list_reply']),
            reply: z.object({
                id: z.string(),
                title: z.string(),
                description: z.string().optional(),
            }),
        }),
    }),
    z.object({
        type: z.enum(['image', 'audio', 'document', 'video']),
        media: z.object({
            id: z.string(),
            mime_type: z.string(),
            caption: z.string().optional(),
        }),
    }),
]);
export type WhatsAppMessageInput = z.infer<typeof WhatsAppMessageInputSchema>;


export const ProcesarMensajeWhatsAppInputSchema = z.object({
    negocioPhoneNumberId: z.string().min(1, "Phone Number ID del negocio es requerido."),
    usuarioWaId: z.string().min(1, "WhatsApp ID del usuario es requerido."),
    nombrePerfilUsuario: z.string().nullable().optional(),

    // El campo `mensajeUsuario` ahora es `mensaje` y usa el esquema flexible de arriba.
    mensaje: WhatsAppMessageInputSchema,

    messageIdOriginal: z.string().optional(),
});
export type ProcesarMensajeWhatsAppInput = z.infer<typeof ProcesarMensajeWhatsAppInputSchema>;



// =========================================================================
// SIN CAMBIOS EN LOS SIGUIENTES ESQUEMAS. Se mantienen como estaban.
// =========================================================================

export const ProcesarMensajeWhatsAppOutputSchema = z.object({
    conversationId: z.string().cuid(),
    interaccionUsuarioId: z.string().cuid(),
    leadId: z.string().cuid(),
    mensajeUsuarioGuardado: ChatMessageItemSchema.optional(),
    mensajeAsistenteGuardado: ChatMessageItemSchema.optional(),
});
export type ProcesarMensajeWhatsAppOutput = z.infer<typeof ProcesarMensajeWhatsAppOutputSchema>;

export const EnviarMensajeWhatsAppApiInputSchema = z.object({
    destinatarioWaId: z.string().min(1, "WAID del destinatario es requerido."),
    negocioPhoneNumberIdEnvia: z.string().min(1, "Phone Number ID del remitente (negocio) es requerido."),
    tokenAccesoAsistente: z.string().min(1, "Token de acceso del asistente es requerido."),
    tipoMensaje: z.enum(['text', 'image', 'video', 'document', 'audio']).default('text'),
    mensajeTexto: z.string().optional(),
    mediaUrl: z.string().url("Se requiere una URL válida para la media.").optional(),
    caption: z.string().max(1024, "La descripción no puede exceder 1024 caracteres.").optional(),
    filename: z.string().optional(),
})
    .refine(data => {
        if (data.tipoMensaje === 'text') {
            return !!data.mensajeTexto && data.mensajeTexto.trim() !== '';
        }
        return true;
    }, { message: "Se requiere 'mensajeTexto' para mensajes de tipo 'text'.", path: ['mensajeTexto'] })
    .refine(data => {
        if (['image', 'video', 'document', 'audio'].includes(data.tipoMensaje)) {
            return !!data.mediaUrl;
        }
        return true;
    }, { message: "Se requiere 'mediaUrl' para mensajes de tipo media.", path: ['mediaUrl'] });

export type EnviarMensajeWhatsAppApiInput = z.infer<typeof EnviarMensajeWhatsAppApiInputSchema>;

export type AsistenteContext = {
    id: string;
    nombre: string;
    umbralSimilitud?: number; // Umbral de confianza para la búsqueda semántica
    conocimientoActivado: boolean;
    negocio: {
        id: string;
        nombre: string;
        CRM: {
            id: string;
        } | null;
    } | null;
};

export type FsmContext = {
    conversacionId: string;
    leadId: string;
    asistente: AsistenteContext;
    mensaje: WhatsAppMessageInput;
    usuarioWaId: string;
    negocioPhoneNumberId: string;
};

// Tipos específicos para los datos que guarda cada tarea en el contexto
export type AgendarCitaContext = {
    servicioId?: string;
    servicioNombre?: string;
    fechaHora?: string;
    fechaParcial?: string; // Fecha parcial en formato ISO String

    // --- PROPIEDAD AÑADIDA ---
    camposPersonalizados?: { [campoId: string]: string };
    ultimoCampoPedidoId?: string;
    email?: string;
    disponibilidadConfirmada?: boolean;
};

export type CancelarCitaContext = {
    citaIdParaCancelar?: string;
    // ✅ MODIFICACIÓN: Guardamos un objeto más rico
    posiblesCitasParaCancelar?: Record<number, {
        id: string;
        asunto: string;
        fecha: Date; // Guardamos la fecha real
        fechaFormateada: string; // Y también la versión para mostrar
    }>;
    citaSeleccionadaParaConfirmar?: string;
};

export type ReagendarCitaContext = {
    citaOriginalId?: string;
    citaOriginalAsunto?: string;
    citaOriginalFecha?: Date | string;
    citaOriginalTipoDeCitaId?: string;

    // Para guardar la nueva fecha mientras se pide la hora
    nuevaFechaParcial?: { año: number; mes: number; dia: number };
    nuevaFechaHora?: string; // La nueva fecha y hora completas en formato ISO

    // Para manejar la selección si hay múltiples citas
    citasEncontradas?: { id: string; asunto: string; fecha: Date; tipoDeCitaId: string | null }[];
};