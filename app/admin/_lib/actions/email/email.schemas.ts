// app/admin/_lib/actions/email/email.schemas.ts
import { z } from 'zod';

// Datos que la acción necesita para enviar una confirmación de pago
export const EnviarConfirmacionPagoInputSchema = z.object({
    // Datos del Comprador
    emailComprador: z.string().email("Email del comprador inválido."),
    nombreComprador: z.string().nullable().optional(),

    // Datos del Negocio (para personalizar el correo)
    nombreNegocio: z.string().min(1, "El nombre del negocio es requerido."),
    logoNegocioUrl: z.string().url().nullable().optional(), // URL del logo del negocio
    emailRespuestaNegocio: z.string().email("Email de respuesta del negocio inválido."), // Para el campo "Reply-To"

    // Datos de la Transacción
    conceptoPrincipal: z.string().min(1, "El concepto del pago es requerido."), // Ej: "Suscripción Plan Premium", "Producto XYZ"
    montoPagado: z.number().positive("El monto pagado debe ser positivo."),
    moneda: z.string().min(3, "La moneda es requerida (ej. MXN, USD).").max(3),
    idTransaccionStripe: z.string().optional(), // Referencia de Stripe

    // Datos de ProMedia (para el footer o personalización)
    // nombrePlataforma: z.string().default("ProMedia"),
    // urlPlataforma: z.string().url().optional(),

    // Opcional: Link directo a la vitrina o página de "mis pedidos" del negocio
    linkDetallesPedidoEnVitrina: z.string().url().nullable().optional(),
});
export type EnviarConfirmacionPagoInput = z.infer<typeof EnviarConfirmacionPagoInputSchema>;


// Datos que la acción necesita para enviar una confirmación de CITA

export const EnviarConfirmacionCitaInputSchema = z.object({
    emailDestinatario: z.string().email(),
    nombreDestinatario: z.string(),
    nombreNegocio: z.string(),
    logoNegocioUrl: z.string().url().optional(),
    nombreServicio: z.string(),
    fechaHoraCita: z.date(),
    emailRespuestaNegocio: z.string().email(),

    // --- CAMPOS MEJORADOS Y NUEVOS ---
    detallesAdicionales: z.string().optional(), // Para "Colegio: Albatros", etc.
    modalidadCita: z.enum(['presencial', 'virtual']).optional(), // Hacemos el tipo más estricto
    ubicacionCita: z.string().optional(), // Dirección para citas presenciales
    googleMapsUrl: z.string().url().optional(), // Link de Google Maps para presenciales
    linkReunionVirtual: z.string().url().optional(), // Link de Zoom/Meet para virtuales
    linkCancelar: z.string().url().optional(),
    linkReagendar: z.string().url().optional(),
    duracionCitaMinutos: z.number().optional()
});
export type EnviarConfirmacionCitaInput = z.infer<typeof EnviarConfirmacionCitaInputSchema>;

export const EnviarCancelacionCitaInputSchema = z.object({
    emailDestinatario: z.string().email(),
    nombreDestinatario: z.string(),
    nombreNegocio: z.string(),
    nombreServicio: z.string(),
    fechaHoraCitaOriginal: z.string(), // La fecha ya formateada de la cita que se canceló
    linkAgendarNuevaCita: z.string().url(), // El link de WhatsApp para agendar de nuevo
    emailRespuestaNegocio: z.string().email(),
});
export type EnviarCancelacionCitaInput = z.infer<typeof EnviarCancelacionCitaInputSchema>;

export const EnviarReagendamientoCitaInputSchema = z.object({
    emailDestinatario: z.string().email(),
    nombreDestinatario: z.string(),
    nombreNegocio: z.string(),
    nombreServicio: z.string(),
    fechaHoraOriginal: z.date(),
    fechaHoraNueva: z.date(),
    emailRespuestaNegocio: z.string().email(),
    linkCancelar: z.string().url().optional(),
    linkReagendar: z.string().url().optional(),
});
export type EnviarReagendamientoCitaInput = z.infer<typeof EnviarReagendamientoCitaInputSchema>;