import { z } from 'zod';

// --- Esquemas de la Entidad Asistente ---

export const AsistenteConfigWhatsAppDataSchema = z.object({
    id: z.string().cuid(),
    whatsappBusiness: z.string().nullish(),
    phoneNumberId: z.string().nullish(),
    whatsappDisplayName: z.string().nullish(),
    whatsappBusinessAccountId: z.string().nullish(),
    whatsappConnectionStatus: z.string().nullish(),
});
export type AsistenteConfigWhatsAppData = z.infer<typeof AsistenteConfigWhatsAppDataSchema>;

// --- Esquemas para el Flujo de Conexión (OAuth) ---

// Estado que pasamos a Meta y que nos devuelve para mantener el contexto.
export const WhatsAppOAuthStateSchema = z.object({
    asistenteId: z.string().cuid(),
    negocioId: z.string().cuid(),
    clienteId: z.string().cuid(),
});

// Input para la acción que inicia el proceso de conexión.
export const IniciarConexionWhatsAppInputSchema = WhatsAppOAuthStateSchema.extend({
    oauthRedirectUri: z.string().url(),
});

// Output de la acción que inicia el proceso de conexión.
export const IniciarConexionWhatsAppOutputSchema = z.object({
    metaOAuthUrl: z.string().url(),
});
export type IniciarConexionWhatsAppOutput = z.infer<typeof IniciarConexionWhatsAppOutputSchema>;


// --- Esquemas para el Callback de Meta ---

// Parámetros que esperamos recibir de Meta en la URL de callback.
export const MetaOAuthCallbackQuerySchema = z.object({
    code: z.string(),
    state: z.string(),
});

// Respuesta esperada al intercambiar el 'code' por un token de corta duración.
export const ShortLivedTokenResponseSchema = z.object({
    access_token: z.string(),
});

// Respuesta esperada al intercambiar un token de corta por uno de larga duración.
export const LongLivedTokenResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.string(),
    expires_in: z.number(),
});

// Estructura de un número de teléfono según la API de Meta.
export const MetaPhoneNumberDataSchema = z.object({
    id: z.string(),
    verified_name: z.string(),
    display_phone_number: z.string(),
    quality_rating: z.string(),
    is_embedded_signup_number: z.boolean().optional(),
});


// --- Esquemas para Desconexión ---

export const DesconectarWhatsAppInputSchema = z.object({
    asistenteId: z.string().cuid(),
});

