// @/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.schemas.ts
import { z } from 'zod';

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
    plataformaProcesaConSuStripe: z.boolean(),
    aceptaMesesSinIntereses: z.boolean(),
    mesesPermitidosMSI: z.array(z.number()).default([]),
    monedaPrincipal: z.string(),
    datosBancariosParaTransferencia: z.string().nullable(), // Añadido por si se quiere mostrar
    createdAt: z.date(),
    updatedAt: z.date(),
});

export type NegocioConfiguracionPago = z.infer<typeof NegocioConfiguracionPagoSchema>;

// Esquema para la entrada de la acción (si fuera necesario, ej. para obtener por negocioId)
export const GetNegocioConfiguracionPagoInputSchema = z.object({
    negocioId: z.string().cuid({ message: 'ID de negocio inválido.' }),
});

// --- NUEVOS ESQUEMAS PARA iniciarConexionStripeAction ---
// Esquema para la entrada de la acción de iniciar conexión con Stripe
export const IniciarConexionStripeInputSchema = z.object({
    negocioId: z.string().cuid({ message: 'ID de negocio inválido.' }),
    // Opcional: podrías pasar el email del negocio si no quieres buscarlo en la acción
    // emailNegocio: z.string().email().optional(), 
});

// Esquema para la salida exitosa de la acción de iniciar conexión con Stripe
export const IniciarConexionStripeOutputSchema = z.object({
    onboardingUrl: z.string().url({ message: 'URL de onboarding inválida.' }),
    stripeAccountId: z.string(), // Devolvemos el ID por si se acaba de crear
});