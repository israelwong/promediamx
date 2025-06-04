// Ruta: app/admin/_lib/funciones/pagos/procesarPagoConStripe.actions.ts
'use server';

import prisma from '../../../prismaClient';
import { stripe } from '@/app/lib/stripe'; // Tu cliente Stripe
import type Stripe from 'stripe';
import type { ActionResult } from '../../../types';
import type { FullExecutionFunctionContext, FunctionResponsePayload } from '../../../dispatcher/dispatcher.types'; // Ajusta ruta
import { ProcesarPagoConStripeArgsSchema } from './procesarPagoConStripe.schemas';
import { headers } from 'next/headers'; // Para construir success/cancel URL
// import { type MediaItem } from '../../../actions/conversacion/conversacion.schemas'; // No se usa media aquí

const COMISION_PROMEDIA_PORCENTAJE = 0.03; // 3%

export async function ejecutarProcesarPagoConStripeAction(
    argsFromIA: Record<string, unknown>,
    context: FullExecutionFunctionContext
): Promise<ActionResult<FunctionResponsePayload | null>> {
    const actionName = "ejecutarProcesarPagoConStripeAction";
    console.log(`[${actionName}] Iniciando. TareaId: ${context.tareaEjecutadaId}`);
    console.log(`[${actionName}] Args de IA:`, argsFromIA);

    const validationResult = ProcesarPagoConStripeArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        console.warn(`[${actionName}] Error de validación de argsFromIA:`, validationResult.error.flatten().fieldErrors);
        const userMessage = "Para procesar el pago, necesito algunos detalles más o la información proporcionada no es correcta. ¿Podrías verificar los datos del producto u oferta?";
        return {
            success: true, // La función manejó la situación
            data: { content: userMessage, media: null, uiComponentPayload: null },
            error: "Argumentos de IA inválidos para procesarPagoConStripe.",
            validationErrors: validationResult.error.flatten().fieldErrors
        };
    }

    const {
        identificador_item_a_pagar,
        tipo_item_a_pagar,
        clienteFinalIdStripe,
        emailClienteFinal,
    } = validationResult.data;

    const { negocioId, canalNombre, idiomaLocale, monedaNegocio: fallbackMoneda } = context;

    // El helper actualizarTareaEjecutada ya no se usa aquí; el dispatcher lo maneja.

    try {
        const negocioData = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: {
                slug: true,
                nombre: true,
                configuracionPago: {
                    select: { stripeAccountId: true, aceptaPagosOnline: true, stripeChargesEnabled: true, monedaPrincipal: true, aceptaMesesSinIntereses: true }
                }
            }
        });

        if (!negocioData?.slug) {
            return { success: true, data: { content: `Lo siento, hay un problema de configuración para procesar el pago para "${negocioData?.nombre || 'este negocio'}". Contacta a soporte. (Error: SLG_NFD)`, media: null, uiComponentPayload: null } };
        }
        const { slug: slugDelNegocio, configuracionPago: configPago } = negocioData;

        if (!configPago?.aceptaPagosOnline || !configPago.stripeAccountId || !configPago.stripeChargesEnabled) {
            return { success: true, data: { content: "Lo siento, los pagos online no están habilitados o configurados correctamente para este negocio.", media: null, uiComponentPayload: null } };
        }
        const { stripeAccountId, monedaPrincipal, aceptaMesesSinIntereses } = configPago;
        const monedaFinal = (monedaPrincipal || fallbackMoneda || "MXN").toLowerCase();

        let nombreItem: string | undefined;
        let precioNumerico: number | undefined; // Usaremos este para el cálculo
        let descripcionItem: string | undefined;
        const lineItemImages: string[] = [];

        if (tipo_item_a_pagar === 'producto_catalogo') {
            const producto = await prisma.itemCatalogo.findUnique({
                where: { id: identificador_item_a_pagar, negocioId: negocioId },
                select: { nombre: true, precio: true, descripcion: true, galeria: { select: { imageUrl: true }, orderBy: { orden: 'asc' }, take: 1 } },
            });
            if (!producto || producto.precio === null || producto.precio === undefined) {
                return { success: true, data: { content: `Lo siento, no pude encontrar el producto "${identificador_item_a_pagar}" o no tiene un precio definido.`, media: null, uiComponentPayload: null } };
            }
            nombreItem = producto.nombre;
            precioNumerico = producto.precio;
            descripcionItem = producto.descripcion?.substring(0, 200);
            if (producto.galeria?.[0]?.imageUrl) lineItemImages.push(producto.galeria[0].imageUrl);
        } else if (tipo_item_a_pagar === 'oferta') {
            const oferta = await prisma.oferta.findUnique({
                where: { id: identificador_item_a_pagar, negocioId: negocioId },
                select: { nombre: true, precio: true, descripcion: true, OfertaGaleria: { select: { imageUrl: true }, orderBy: { orden: 'asc' }, take: 1 } },
            });
            if (!oferta || oferta.precio === null || oferta.precio === undefined) { // Usar oferta.precio
                return { success: true, data: { content: `Lo siento, no pude encontrar la oferta "${identificador_item_a_pagar}" o no tiene un precio definido.`, media: null, uiComponentPayload: null } };
            }
            nombreItem = oferta.nombre;
            precioNumerico = oferta.precio; // Usar oferta.precio
            descripcionItem = oferta.descripcion?.substring(0, 200);
            if (oferta.OfertaGaleria?.[0]?.imageUrl) lineItemImages.push(oferta.OfertaGaleria[0].imageUrl);
        } else if (tipo_item_a_pagar === 'paquete') {
            const paquete = await prisma.negocioPaquete.findUnique({
                where: { id: identificador_item_a_pagar, negocioId: negocioId },
                select: { nombre: true, precio: true, descripcionCorta: true, galeria: { select: { imageUrl: true }, orderBy: { orden: 'asc' }, take: 1 } }
            });
            if (!paquete || paquete.precio === null || paquete.precio === undefined) {
                return { success: true, data: { content: `Lo siento, no pude encontrar el paquete "${identificador_item_a_pagar}" o no tiene un precio definido.`, media: null, uiComponentPayload: null } };
            }
            nombreItem = paquete.nombre;
            precioNumerico = paquete.precio;
            descripcionItem = paquete.descripcionCorta?.substring(0, 200);
            if (paquete.galeria?.[0]?.imageUrl) lineItemImages.push(paquete.galeria[0].imageUrl);
        } else {
            return { success: true, data: { content: `Tipo de ítem '${tipo_item_a_pagar}' no soportado para el pago.`, media: null, uiComponentPayload: null } };
        }

        if (!nombreItem || precioNumerico === undefined || precioNumerico <= 0) {
            return { success: true, data: { content: "No se pudo determinar el nombre o el precio (debe ser mayor a 0) del ítem a pagar.", media: null, uiComponentPayload: null } };
        }
        const precioCentavos = Math.round(precioNumerico * 100);
        const comisionProMediaCentavos = Math.round(precioCentavos * COMISION_PROMEDIA_PORCENTAJE);

        const headersObj = await headers(); // Esto solo funciona en Server Components/Route Handlers, no en Server Actions llamadas desde cliente directamente.
        // Para Server Actions, considera pasar baseAppUrl desde el cliente o construirla de otra forma.
        // Por ahora, mantendré la lógica, pero es un punto de atención para Server Actions.
        const host = headersObj.get('x-forwarded-host') || headersObj.get('host') || process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        const protocol = host.startsWith('localhost') ? 'http' : 'https'; // Simplificado, NEXT_PUBLIC_APP_URL debería tener el protocolo
        const baseAppUrl = process.env.NEXT_PUBLIC_APP_URL || `${protocol}://${host}`;


        const successUrl = `${baseAppUrl}/vd/${slugDelNegocio}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseAppUrl}/vd/${slugDelNegocio}/checkout/cancel`;

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'], // Podrías añadir 'oxxo' aquí si está configurado
            line_items: [{
                price_data: {
                    currency: monedaFinal,
                    product_data: { name: nombreItem, description: descripcionItem, images: lineItemImages.length > 0 ? lineItemImages : undefined },
                    unit_amount: precioCentavos,
                },
                quantity: 1,
            }],
            mode: 'payment', // Para pagos únicos. Cambiar a 'subscription' para recurrentes.
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                promedia_negocio_id: negocioId,
                promedia_item_id: identificador_item_a_pagar,
                promedia_item_tipo: tipo_item_a_pagar,
                promedia_tarea_ejecutada_id: context.tareaEjecutadaId, // Usar del contexto
                promedia_lead_id: context.leadId,
            },
            payment_intent_data: {
                application_fee_amount: comisionProMediaCentavos,
                transfer_data: { destination: stripeAccountId },
            },
        };

        if (aceptaMesesSinIntereses) {
            sessionParams.payment_method_options = { card: { installments: { enabled: true } } };
        }
        if (clienteFinalIdStripe) sessionParams.customer = clienteFinalIdStripe;
        else if (emailClienteFinal) sessionParams.customer_email = emailClienteFinal;

        const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

        if (!checkoutSession.url) {
            throw new Error("Stripe no devolvió una URL de checkout.");
        }

        let mensajeConEnlace = `¡Perfecto! Aquí tienes tu enlace para completar el pago de "${nombreItem}":\n${checkoutSession.url}`;
        let uiPayload: Record<string, unknown> | null = null;

        if (canalNombre?.toLowerCase().includes('webchat')) {
            mensajeConEnlace = `¡Perfecto! Tu enlace para el pago de "${nombreItem}" está listo.`; // Mensaje más corto para WebChat si hay UI
            uiPayload = {
                componentType: 'StripePaymentLink', // O 'ActionButton', etc.
                data: {
                    checkoutUrl: checkoutSession.url,
                    buttonText: `Pagar ${new Intl.NumberFormat(idiomaLocale || 'es-MX', { style: "currency", currency: monedaFinal }).format(precioNumerico)} Ahora`,
                    message: `Serás redirigido a Stripe para completar tu pago de forma segura.`
                }
            };
        }

        const responsePayload: FunctionResponsePayload = {
            content: mensajeConEnlace,
            media: null,
            uiComponentPayload: uiPayload
        };
        return { success: true, data: responsePayload };

    } catch (error: unknown) {
        console.error(`[${actionName}] Error al crear sesión de Stripe Checkout:`, error);
        let errorMessage = "Error desconocido al procesar el pago con Stripe.";
        if (error instanceof Error) errorMessage = error.message;
        else if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') errorMessage = error.message;

        return {
            success: true, // La función se "ejecutó" pero resultó en un error que se comunica al usuario
            data: {
                content: `Lo siento, ocurrió un error al intentar generar tu enlace de pago: ${errorMessage}. Por favor, intenta de nuevo más tarde o contacta a soporte.`,
                media: null,
                uiComponentPayload: null
            },
            error: `Error Stripe: ${errorMessage}` // Para log interno en TareaEjecutada
        };
    }
}