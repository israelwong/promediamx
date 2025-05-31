// @/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.schemas.ts
import { z } from 'zod';

// @/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.schemas.ts
// import { z } from 'zod';

// Esquema para la salida de la configuración de pagos del negocio
export const NegocioConfiguracionPagoSchema = z.object({
    id: z.string(),
    negocioId: z.string(),
    aceptaPagosOnline: z.boolean(),
    stripeAccountId: z.string().nullable(),
    stripeAccountType: z.string().nullable(),
    stripeOnboardingComplete: z.boolean(),
    stripeChargesEnabled: z.boolean(),
    stripePayoutsEnabled: z.boolean(),
    plataformaProcesaConSuStripe: z.boolean(), // Este campo parece que podría ser más de lógica interna o configuración global
    aceptaOxxoPay: z.boolean().default(false), // Asegurarse que esté y tenga un default
    aceptaMesesSinIntereses: z.boolean(),
    mesesPermitidosMSI: z.array(z.number()).default([]),
    monedaPrincipal: z.string(),
    datosBancariosParaTransferencia: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type NegocioConfiguracionPago = z.infer<typeof NegocioConfiguracionPagoSchema>;

// Esquema para la entrada de la acción para obtener por negocioId
export const GetNegocioConfiguracionPagoInputSchema = z.object({
    negocioId: z.string().cuid({ message: 'ID de negocio inválido.' }),
});

// Esquema para la entrada de la acción de iniciar conexión con Stripe
export const IniciarConexionStripeInputSchema = z.object({
    negocioId: z.string().cuid({ message: 'ID de negocio inválido.' }),
});

// Esquema para la salida exitosa de la acción de iniciar conexión con Stripe
export const IniciarConexionStripeOutputSchema = z.object({
    onboardingUrl: z.string().url({ message: 'URL de onboarding inválida.' }),
    stripeAccountId: z.string(),
});

// --- NUEVO ESQUEMA PARA ACTUALIZAR OPCIONES DE PAGO ---
export const ActualizarOpcionesPagoInputSchema = z.object({
    negocioId: z.string().cuid({ message: "ID de negocio inválido." }),
    aceptaPagosOnline: z.boolean({ required_error: "Debe indicar si acepta pagos online." }),
    aceptaOxxoPay: z.boolean({ required_error: "Debe indicar si acepta OXXO Pay." }),
    aceptaMesesSinIntereses: z.boolean({ required_error: "Debe indicar si acepta Meses sin Intereses." }),
    mesesPermitidosMSI: z.array(z.number().int().min(3).max(24)) // Validar que sean números enteros y dentro de un rango razonable
        .refine(arr => arr.every(val => [3, 6, 9, 12, 18, 24].includes(val)), { // Asegurar que los valores sean de los plazos permitidos
            message: "Los plazos de MSI seleccionados no son válidos."
        })
        .optional() // Si aceptaMSI es false, este array podría estar vacío o no enviarse
        .default([]),
});

export type ActualizarOpcionesPagoInput = z.infer<typeof ActualizarOpcionesPagoInputSchema>;
