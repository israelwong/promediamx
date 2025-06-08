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
    // Datos del Destinatario (quien agendó)
    emailDestinatario: z.string().email("Email del destinatario inválido."),
    nombreDestinatario: z.string().nullable().optional(),

    // Datos del Negocio
    nombreNegocio: z.string().min(1, "El nombre del negocio es requerido."),
    logoNegocioUrl: z.string().url("URL de logo inválida").nullable().optional(),
    emailRespuestaNegocio: z.string().email("Email de respuesta del negocio inválido."),

    // Datos de la Cita
    nombreServicio: z.string().min(1, "El nombre del servicio es requerido."),
    fechaHoraCita: z.date({ errorMap: () => ({ message: "Se requiere un objeto Date válido para la fecha de la cita." }) }),
    modalidadCita: z.enum(['presencial', 'virtual']),

    // Opcionales según modalidad
    direccionNegocio: z.string().nullable().optional(), // Para citas presenciales
    meetingUrl: z.string().url("URL de reunión inválida.").nullable().optional(), // Para citas virtuales
});
export type EnviarConfirmacionCitaInput = z.infer<typeof EnviarConfirmacionCitaInputSchema>;

// Datos para enviar un correo de cancelación de cita
export const EnviarCancelacionCitaInputSchema = z.object({
    emailDestinatario: z.string().email(),
    nombreDestinatario: z.string().nullable().optional(),
    nombreNegocio: z.string(),
    nombreServicio: z.string(),
    fechaHoraCitaOriginal: z.string(), // Pasaremos la fecha ya formateada
    emailRespuestaNegocio: z.string().email("Email de respuesta del negocio inválido."),

});
export type EnviarCancelacionCitaInput = z.infer<typeof EnviarCancelacionCitaInputSchema>;