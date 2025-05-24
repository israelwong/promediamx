// @/app/admin/_lib/funciones/procesarPagoConStripe.schemas.ts
import { z } from 'zod';

export const ProcesarPagoConStripeArgsSchema = z.object({
    negocioId: z.string().cuid(), // Lo añadirá el dispatcher
    clienteFinalIdStripe: z.string().optional(), // ID del Customer de Stripe del cliente final (si existe)
    emailClienteFinal: z.string().email().optional(), // Para prellenar en Checkout

    // Parámetros que vienen de Gemini
    identificador_item_a_pagar: z.string().min(1, "El identificador del ítem a pagar es requerido."),
    tipo_item_a_pagar: z.enum(['oferta', 'paquete', 'producto_catalogo'], {
        errorMap: () => ({ message: "El tipo de ítem debe ser 'oferta' o 'producto_catalogo'." })
    }),
    // podrías añadir cantidad si fuera relevante
    canalNombre: z.string()
});
export type ProcesarPagoConStripeArgs = z.infer<typeof ProcesarPagoConStripeArgsSchema>;

export const ProcesarPagoConStripeDataSchema = z.object({
    checkoutUrl: z.string().url().nullable(), // URL de la sesión de Stripe Checkout
    mensajeParaUsuario: z.string(),
    errorAlCrearLink: z.boolean().default(false),
});
export type ProcesarPagoConStripeData = z.infer<typeof ProcesarPagoConStripeDataSchema>;
