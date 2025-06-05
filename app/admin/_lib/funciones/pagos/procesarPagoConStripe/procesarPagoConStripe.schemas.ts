// Ruta: app/admin/_lib/funciones/pagos/procesarPagoConStripe.schemas.ts
import { z } from 'zod';

export const ProcesarPagoConStripeArgsSchema = z.object({
    identificador_item_a_pagar: z.string().min(1, "El identificador del ítem a pagar es requerido."),
    tipo_item_a_pagar: z.enum(['oferta', 'paquete', 'producto_catalogo'], { // 'paquete' y 'producto_catalogo' son para futuro
        errorMap: () => ({ message: "El tipo de ítem debe ser 'oferta', 'paquete' o 'producto_catalogo'." })
    }),
    clienteFinalIdStripe: z.string().optional(), // ID del Customer de Stripe del cliente final (si existe)
    emailClienteFinal: z.string().email("El email del cliente no es válido.").optional(), // Para prellenar en Checkout
    // Opcional: si el usuario pudiera elegir pagar el total o solo el anticipo
    // intencion_de_pago: z.enum(['anticipo', 'total']).optional(),
});
export type ProcesarPagoConStripeArgs = z.infer<typeof ProcesarPagoConStripeArgsSchema>;