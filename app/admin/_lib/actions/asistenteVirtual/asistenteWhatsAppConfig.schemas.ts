// app/admin/_lib/actions/asistenteVirtual/asistenteWhatsAppConfig.schemas.ts
import { z } from 'zod';

// Esquema para la entrada de iniciarProcesoConexionWhatsAppAction
export const IniciarConexionWhatsAppInputSchema = z.object({
    asistenteId: z.string().cuid({ message: "ID de asistente inválido." }),
    negocioId: z.string().cuid({ message: "ID de negocio inválido." }),
    clienteId: z.string().cuid({ message: "ID de cliente inválido." }),
    telefonoWhatsAppBusiness: z.string()
        .min(10, "El número de teléfono parece demasiado corto.") // Validación básica
        .regex(/^\+?[1-9]\d{1,14}$/, "Formato de número de teléfono inválido. Debe incluir código de país, ej: +525512345678.")
        .optional()
        .or(z.literal('')), // Permite string vacío también
    oauthRedirectUri: z.string().url({ message: "URL de redirección OAuth inválida." }),
});
export type IniciarConexionWhatsAppInput = z.infer<typeof IniciarConexionWhatsAppInputSchema>;

// Esquema para la salida de iniciarProcesoConexionWhatsAppAction
export const IniciarConexionWhatsAppOutputSchema = z.object({
    metaOAuthUrl: z.string().url(),
});
export type IniciarConexionWhatsAppOutput = z.infer<typeof IniciarConexionWhatsAppOutputSchema>;


// Esquema para la entrada de manejarCallbackWhatsAppOAuthAction (que recibirá el API Route Handler)
// Estos son los parámetros que Meta envía a nuestra URL de callback
export const MetaOAuthCallbackQuerySchema = z.object({
    code: z.string().min(1, "El código de autorización de Meta es requerido."),
    state: z.string().min(1, "El parámetro 'state' es requerido."),
});
export type MetaOAuthCallbackQuery = z.infer<typeof MetaOAuthCallbackQuerySchema>;

// Esquema para el objeto 'state' deserializado que pasamos originalmente
export const WhatsAppOAuthStateSchema = z.object({
    asistenteId: z.string().cuid(),
    negocioId: z.string().cuid(),
    clienteId: z.string().cuid(), // ID del cliente, si lo necesitas
});
export type WhatsAppOAuthState = z.infer<typeof WhatsAppOAuthStateSchema>;


// Esquema para la entrada de desconectarWhatsAppAction
export const DesconectarWhatsAppInputSchema = z.object({
    asistenteId: z.string().cuid({ message: "ID de asistente inválido." }),
});
export type DesconectarWhatsAppInput = z.infer<typeof DesconectarWhatsAppInputSchema>;


// Esquema para datos que esperamos de la API de Meta después de obtener el token
// Esto es para uso interno en manejarCallbackWhatsAppOAuthAction
export const MetaPhoneNumberDataSchema = z.object({
    id: z.string(), // Este es el Phone Number ID
    verified_name: z.string(), // Display Name
    code_verification_status: z.string().optional(),
    display_phone_number: z.string(),
    quality_rating: z.string(), // "GREEN", "YELLOW", "RED", "UNKNOWN"
    // Puede haber más campos, como 'is_official_business_account', etc.
});
export type MetaPhoneNumberData = z.infer<typeof MetaPhoneNumberDataSchema>;

export const MetaUserBusinessAccountSchema = z.object({
    id: z.string(), // Este es el WhatsApp Business Account ID (WABA ID)
    name: z.string().optional(),
    // ... otros campos del WABA
});

export const MetaUserAccountsResponseSchema = z.object({
    data: z.array(MetaUserBusinessAccountSchema),
    // ... paginación si aplica
});

// Esquema para la respuesta de intercambio de token de corta duración
export const ShortLivedTokenResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.string().optional(), // ej: "bearer"
    expires_in: z.number().optional(), // Duración en segundos
});

// Esquema para la respuesta de intercambio de token de larga duración
export const LongLivedTokenResponseSchema = z.object({
    access_token: z.string(),
    token_type: z.string(), // ej: "bearer"
    expires_in: z.number().optional(), // Duración en segundos (suele ser ~60 días)
});
