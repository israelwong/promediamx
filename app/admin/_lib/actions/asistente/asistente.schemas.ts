import { z } from 'zod';

// Esquema base con todas las propiedades de un AsistenteVirtual.
export const baseAsistenteSchema = z.object({
    id: z.string().cuid(),
    negocioId: z.string().cuid({ message: "Se requiere el ID del negocio." }),
    nombre: z.string().min(3, { message: "El nombre debe tener al menos 3 caracteres." }),
    descripcion: z.string().nullable(),
    status: z.enum(['activo', 'inactivo', 'archivado']),
    urlImagen: z.string().url().nullable(),

    // Campos de Configuración de WhatsApp
    whatsappBusinessAccountId: z.string().nullable(),
    phoneNumberId: z.string().nullable(),
    token: z.string().nullable(),
    whatsappConnectionStatus: z.enum([
        "NO_CONECTADO",
        "CONECTADO",
        "ERROR_CONFIGURACION",
        "REQUIERE_REAUTENTICACION"
    ]).nullable(),
    whatsappDisplayName: z.string().nullable(),
    whatsappQualityRating: z.enum(["GREEN", "YELLOW", "RED", "UNKNOWN"]).nullable(),
});

// 1. Esquema para CREAR un asistente (flujo implícito)
// Solo necesita el ID del negocio y el nombre del negocio para generar un nombre por defecto.
export const createAsistenteImplícitoSchema = z.object({
    negocioId: z.string().cuid(),
    nombreNegocio: z.string(),
});

// 2. Esquema para ACTUALIZAR la configuración de WhatsApp
export const updateWhatsAppConfigSchema = baseAsistenteSchema.pick({
    whatsappBusinessAccountId: true,
    phoneNumberId: true,
    token: true,
}).partial(); // Todos los campos son opcionales para la actualización

// 3. Esquema para los datos que se cargan en el componente de configuración
export const asistenteParaWhatsAppConfigSchema = baseAsistenteSchema.pick({
    id: true,
    negocioId: true,
    nombre: true,
    whatsappBusinessAccountId: true,
    phoneNumberId: true,
    whatsappConnectionStatus: true,
    whatsappDisplayName: true,
    whatsappQualityRating: true,
    // El token no se envía al cliente por seguridad
});

// --- TIPOS INFERIDOS ---
export type CreateAsistenteImplícitoInput = z.infer<typeof createAsistenteImplícitoSchema>;
export type UpdateWhatsAppConfigInput = z.infer<typeof updateWhatsAppConfigSchema>;
export type AsistenteParaWhatsAppConfig = z.infer<typeof asistenteParaWhatsAppConfigSchema>;
