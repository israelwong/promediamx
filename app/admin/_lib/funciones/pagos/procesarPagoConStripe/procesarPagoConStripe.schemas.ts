// Ruta: app/admin/_lib/funciones/pagos/procesarPagoConStripe.schemas.ts
import { z } from 'zod';

// Esquema para los argumentos que la IA debe proporcionar.
// negocioId y canalNombre se obtendrán del FullExecutionFunctionContext.
export const ProcesarPagoConStripeArgsSchema = z.object({
    identificador_item_a_pagar: z.string().min(1, "El identificador del ítem a pagar es requerido."),
    tipo_item_a_pagar: z.enum(['oferta', 'paquete', 'producto_catalogo'], {
        errorMap: () => ({ message: "El tipo de ítem debe ser 'oferta', 'paquete' o 'producto_catalogo'." })
    }),
    clienteFinalIdStripe: z.string().optional(), // ID del Customer de Stripe del cliente final (si existe)
    emailClienteFinal: z.string().email("El email del cliente no es válido.").optional(), // Para prellenar en Checkout
    // cantidad: z.number().int().min(1).optional(), // Podrías añadir cantidad si fuera relevante
});
export type ProcesarPagoConStripeArgs = z.infer<typeof ProcesarPagoConStripeArgsSchema>;

// Este schema describe el payload de datos que la acción prepara internamente
// ANTES de formatearlo como FunctionResponsePayload.
// Podría ser útil si la lógica de formateo para WhatsApp vs WebChat es compleja.
// Por ahora, la acción construirá FunctionResponsePayload directamente.
// Si se necesitara, se podría llamar ProcesarPagoConStripeInternalDataSchema.
/*
export const ProcesarPagoConStripeInternalDataSchema = z.object({
    checkoutUrl: z.string().url().nullable(),
    mensajeParaUsuario: z.string(),
    errorAlCrearLink: z.boolean().default(false),
});
export type ProcesarPagoConStripeInternalData = z.infer<typeof ProcesarPagoConStripeInternalDataSchema>;
*/