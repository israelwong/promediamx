import { z } from 'zod';

// Esquema para la información básica de un agente (ya definido)
export const agenteBasicoSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().nullable(),
});
export type AgenteBasicoData = z.infer<typeof agenteBasicoSchema>;

// Esquema para los detalles de una conversación para el panel (ya definido)
export const conversacionDetailsForPanelSchema = z.object({
    id: z.string().cuid(),
    status: z.string(),
    leadId: z.string().cuid().nullable(),
    leadNombre: z.string().nullable(),
    agenteCrmActual: agenteBasicoSchema.nullable(),
});
export type ConversationDetailsForPanelData = z.infer<typeof conversacionDetailsForPanelSchema>;

// Esquema para los parámetros de entrada de obtenerDetallesConversacionAction (ya definido)
export const obtenerDetallesConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
});
export type ObtenerDetallesConversacionParams = z.infer<typeof obtenerDetallesConversacionParamsSchema>;

// Esquema para cada item en la vista previa de la lista de conversaciones (ya definido)
export const conversacionPreviewItemSchema = z.object({
    id: z.string().cuid(),
    leadId: z.string().cuid().nullable().optional(),
    leadName: z.string(),
    lastMessagePreview: z.string(),
    lastMessageTimestamp: z.date(),
    status: z.string(),
    avatarUrl: z.string().url().nullable().optional(),
    canalOrigen: z.enum(['whatsapp', 'webchat', 'otro']).nullable().optional(),
});
export type ConversacionPreviewItemData = z.infer<typeof conversacionPreviewItemSchema>;

// Esquema para los parámetros de entrada de listarConversacionesAction (ya definido)
export const listarConversacionesParamsSchema = z.object({
    negocioId: z.string().cuid(),
    searchTerm: z.string().nullable().optional(),
    filtroStatus: z.enum(['activas', 'archivadas', 'todas']).default('activas'),
    filtroPipelineId: z.string().cuid().nullable().optional(),
});
export type ListarConversacionesParams = z.infer<typeof listarConversacionesParamsSchema>;


// --- NUEVOS ESQUEMAS PARA ChatComponent ---

// Esquema para un item de mensaje de chat (basado en tu ChatMessageItem type)
export const chatMessageItemSchema = z.object({
    id: z.string().cuid(),
    conversacionId: z.string().cuid(),
    role: z.enum(['user', 'assistant', 'agent', 'system']),
    mensaje: z.string().nullable(),
    mediaUrl: z.string().url().nullable().optional(),
    mediaType: z.string().nullable().optional(), // Podrías usar z.enum si los tipos son fijos
    createdAt: z.date(), // Prisma devuelve Date, mantenlo así para evitar conversiones innecesarias
    agenteCrm: agenteBasicoSchema.nullable().optional(),
});
export type ChatMessageItemData = z.infer<typeof chatMessageItemSchema>;

// Esquema para los parámetros de entrada de la acción que obtiene los mensajes
export const obtenerMensajesParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    limit: z.number().int().positive().optional().default(50), // Límite por defecto
    // Podrías añadir `cursor` o `skip` para paginación en el futuro
});
export type ObtenerMensajesParams = z.infer<typeof obtenerMensajesParamsSchema>;

// Esquema para los parámetros de entrada de la acción de enviar un mensaje
export const enviarMensajeParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    mensaje: z.string().min(1, { message: "El mensaje no puede estar vacío." }),
    role: z.enum(['user', 'assistant', 'agent', 'system']), // 'agent' para mensajes desde el panel
    agenteCrmId: z.string().cuid().nullable().optional(), // ID del Agente CRM que envía
    // mediaUrl y mediaType podrían añadirse si se implementa subida de archivos aquí
});
export type EnviarMensajeParams = z.infer<typeof enviarMensajeParamsSchema>;


// Esquema para los parámetros de asignarAgenteConversacionAction
export const asignarAgenteConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    agenteCrmId: z.string().cuid().nullable(), // Puede ser null para desasignar
    nombreAgenteQueAsigna: z.string().nullable().optional(),
});
export type AsignarAgenteConversacionParams = z.infer<typeof asignarAgenteConversacionParamsSchema>;
// Tipo de salida: conversacionDetailsForPanelSchema

// Esquema para los parámetros de pausarAutomatizacionAction y reanudarAutomatizacionAction
export const gestionarPausaAutomatizacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    // currentUserId y currentUserName se obtendrían del lado del servidor (sesión) o se pasarían si es estrictamente necesario
    // Por ahora, asumamos que la action los puede obtener o la lógica de negocio no los requiere para la operación en BD.
    // Si se pasan desde el cliente:
    // agenteIdQueGestiona: z.string().cuid(), // ID del usuario o agente que realiza la acción
    nombreAgenteQueGestiona: z.string().nullable().optional(),
});
export type GestionarPausaAutomatizacionParams = z.infer<typeof gestionarPausaAutomatizacionParamsSchema>;
// Tipo de salida: conversacionDetailsForPanelSchema

// Esquema para los parámetros de archivarConversacionAction
export const archivarConversacionParamsSchema = z.object({
    conversacionId: z.string().cuid(),
    // Similar a pausar/reanudar, los IDs de quien archiva pueden ser manejados en servidor o pasados
    // usuarioIdQueArchiva: z.string().cuid(), 
    // agenteCrmIdQueArchiva: z.string().cuid().nullable().optional(),
    nombreUsuarioQueArchiva: z.string().nullable().optional(),
});
export type ArchivarConversacionParams = z.infer<typeof archivarConversacionParamsSchema>;
// Tipo de salida: ActionResult<null> o un schema básico si devuelve algo.