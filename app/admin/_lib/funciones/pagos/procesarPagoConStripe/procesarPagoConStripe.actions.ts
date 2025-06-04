// Ruta: app/admin/_lib/funciones/pagos/procesarPagoConStripe.actions.ts
'use server';

import prisma from '../../../prismaClient';
import { stripe } from '@/app/lib/stripe'; // Tu cliente Stripe
import type Stripe from 'stripe';
import type { ActionResult } from '../../../types';
import type { FullExecutionFunctionContext, FunctionResponsePayload } from '../../../dispatcher/dispatcher.types';
import { ProcesarPagoConStripeArgsSchema } from './procesarPagoConStripe.schemas';
import { headers } from 'next/headers';

const COMISION_PROMEDIA_PORCENTAJE = 0.03; // 3%

export async function ejecutarProcesarPagoConStripeAction(
    argsFromIA: Record<string, unknown>,
    context: FullExecutionFunctionContext
): Promise<ActionResult<FunctionResponsePayload | null>> {
    const actionName = "ejecutarProcesarPagoConStripeAction";
    const { tareaEjecutadaId, negocioId, canalNombre, idiomaLocale, monedaNegocio: fallbackMoneda, leadId } = context;

    console.log(`[${actionName}] Iniciando. TareaId: ${tareaEjecutadaId}`);
    console.log(`[${actionName}] Args de IA (brutos):`, argsFromIA);
    console.log(`[${actionName}] Contexto recibido:`, { negocioId, canalNombre, idiomaLocale, fallbackMoneda, leadId });

    const validationResult = ProcesarPagoConStripeArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        const errorMsg = "Argumentos de IA inválidos para procesarPagoConStripe.";
        console.warn(`[${actionName}] ${errorMsg}`, validationResult.error.flatten().fieldErrors);
        const userMessage = "Para procesar el pago, necesito algunos detalles más o la información proporcionada no es correcta. ¿Podrías verificar los datos del ítem a pagar?";
        return {
            success: true, // La función manejó la situación
            data: { content: userMessage, media: null, uiComponentPayload: null, aiContextData: { validationError: true, errors: validationResult.error.flatten().fieldErrors } },
            error: errorMsg,
            validationErrors: validationResult.error.flatten().fieldErrors
        };
    }

    const {
        identificador_item_a_pagar,
        tipo_item_a_pagar,
        clienteFinalIdStripe,
        emailClienteFinal,
    } = validationResult.data;
    console.log(`[${actionName}] Args validados:`, validationResult.data);

    try {
        console.log(`[${actionName}] Obteniendo datos del negocio: ${negocioId}`);
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
        console.log(`[${actionName}] Datos del negocio obtenidos:`, negocioData ? { slug: negocioData.slug, nombre: negocioData.nombre, hasConfigPago: !!negocioData.configuracionPago } : "Negocio no encontrado");

        if (!negocioData?.slug) {
            const errorMsg = `Negocio ${negocioId} no encontrado o sin slug.`;
            console.error(`[${actionName}] ${errorMsg}`);
            return { success: true, data: { content: `Lo siento, hay un problema de configuración para procesar el pago para "${negocioData?.nombre || 'este negocio'}". Contacta a soporte. (Ref: SLG_NF)`, media: null, uiComponentPayload: null, aiContextData: { errorType: "CONFIG_NEGOCIO", message: errorMsg } } };
        }
        const { slug: slugDelNegocio, configuracionPago: configPago } = negocioData;

        if (!configPago?.aceptaPagosOnline || !configPago.stripeAccountId || !configPago.stripeChargesEnabled) {
            const errorMsg = "Pagos online no habilitados o configurados para este negocio.";
            console.error(`[${actionName}] ${errorMsg} Config:`, configPago);
            return { success: true, data: { content: `Lo siento, no es posible procesar pagos para este negocio en este momento. (Ref: PAY_INACTIVE)`, media: null, uiComponentPayload: null, aiContextData: { errorType: "CONFIG_PAGO", message: errorMsg } } };
        }
        const { stripeAccountId, monedaPrincipal, aceptaMesesSinIntereses } = configPago;
        const monedaFinal = (monedaPrincipal || fallbackMoneda || "MXN").toLowerCase();
        console.log(`[${actionName}] Configuración de pago: stripeAccountId=${stripeAccountId}, moneda=${monedaFinal}, MSI=${aceptaMesesSinIntereses}`);

        let nombreItem: string | undefined;
        let precioNumerico: number | undefined;
        let descripcionItem: string | undefined;
        const lineItemImages: string[] = [];

        console.log(`[${actionName}] Obteniendo detalles del ítem: tipo=${tipo_item_a_pagar}, id=${identificador_item_a_pagar}`);
        if (tipo_item_a_pagar === 'producto_catalogo') {
            // ... (lógica para producto_catalogo)
        } else if (tipo_item_a_pagar === 'oferta') {
            const oferta = await prisma.oferta.findUnique({
                where: { id: identificador_item_a_pagar, negocioId: negocioId }, // Asegurar que la oferta pertenece al negocio
                select: { nombre: true, precio: true, descripcion: true, OfertaGaleria: { select: { imageUrl: true }, orderBy: { orden: 'asc' }, take: 1 } },
            });
            console.log(`[${actionName}] Datos de la oferta obtenidos:`, oferta);
            if (!oferta || oferta.precio === null || oferta.precio === undefined) {
                return { success: true, data: { content: `Lo siento, no pude encontrar la oferta "${identificador_item_a_pagar}" o no tiene un precio definido.`, media: null, uiComponentPayload: null, aiContextData: { errorType: "ITEM_NO_ENCONTRADO", tipo: "oferta" } } };
            }
            nombreItem = oferta.nombre;
            precioNumerico = oferta.precio;
            descripcionItem = oferta.descripcion?.substring(0, 200);
            if (oferta.OfertaGaleria?.[0]?.imageUrl) lineItemImages.push(oferta.OfertaGaleria[0].imageUrl);
        } else if (tipo_item_a_pagar === 'paquete') {
            // ... (lógica para paquete)
        } else {
            return { success: true, data: { content: `Tipo de ítem '${tipo_item_a_pagar}' no soportado para el pago.`, media: null, uiComponentPayload: null, aiContextData: { errorType: "TIPO_ITEM_INVALIDO" } } };
        }

        if (!nombreItem || precioNumerico === undefined || precioNumerico <= 0) {
            console.error(`[${actionName}] Nombre o precio inválido para el ítem: nombre=${nombreItem}, precio=${precioNumerico}`);
            return { success: true, data: { content: "No se pudo determinar el nombre o el precio (debe ser mayor a 0) del ítem a pagar.", media: null, uiComponentPayload: null, aiContextData: { errorType: "PRECIO_INVALIDO" } } };
        }
        const precioCentavos = Math.round(precioNumerico * 100);
        const comisionProMediaCentavos = Math.round(precioCentavos * COMISION_PROMEDIA_PORCENTAJE);
        console.log(`[${actionName}] Item: "${nombreItem}", Precio: ${precioNumerico} (${precioCentavos} centavos), Comisión: ${comisionProMediaCentavos} centavos`);

        const headersObj = await headers();
        const hostHeader = headersObj.get('x-forwarded-host') || headersObj.get('host');
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const defaultHost = process.env.NODE_ENV === 'production' ? process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL : 'localhost:3000';
        const finalHost = hostHeader || defaultHost;
        const baseAppUrl = `${protocol}://${finalHost}`;
        console.log(`[${actionName}] Base App URL construida: ${baseAppUrl}`);

        const successUrl = `${baseAppUrl}/vd/${slugDelNegocio}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseAppUrl}/vd/${slugDelNegocio}/checkout/cancel`;
        console.log(`[${actionName}] Success URL: ${successUrl}`);
        console.log(`[${actionName}] Cancel URL: ${cancelUrl}`);

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: monedaFinal,
                    product_data: { name: nombreItem, description: descripcionItem, images: lineItemImages.length > 0 ? lineItemImages : undefined },
                    unit_amount: precioCentavos,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: {
                promedia_negocio_id: negocioId,
                promedia_item_id: identificador_item_a_pagar,
                promedia_item_tipo: tipo_item_a_pagar,
                promedia_tarea_ejecutada_id: tareaEjecutadaId,
                promedia_lead_id: leadId,
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

        console.log(`[${actionName}] Creando sesión de Stripe Checkout con params:`, JSON.stringify(sessionParams, null, 2).substring(0, 1000) + "..."); // Loguear params, cuidado con info sensible si es muy detallado
        const checkoutSession = await stripe.checkout.sessions.create(sessionParams);
        console.log(`[${actionName}] Sesión de Stripe Checkout creada. ID: ${checkoutSession.id}, URL: ${checkoutSession.url ? 'Sí' : 'No'}`);

        if (!checkoutSession.url) {
            console.error(`[${actionName}] Stripe no devolvió una URL de checkout. Respuesta:`, checkoutSession);
            throw new Error("Stripe no devolvió una URL de checkout.");
        }

        let mensajeConEnlace = `¡Perfecto! Aquí tienes tu enlace para completar el pago de "${nombreItem}":\n${checkoutSession.url}`;
        type UiPayload = {
            componentType: string;
            data: {
                checkoutUrl: string;
                buttonText: string;
                message: string;
            };
        };
        let uiPayload: UiPayload | null = null;

        if (canalNombre?.toLowerCase().includes('webchat')) {
            mensajeConEnlace = `¡Perfecto! Tu enlace para el pago de "${nombreItem}" está listo.`;
            uiPayload = {
                componentType: 'StripePaymentLink',
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
            uiComponentPayload: uiPayload,
            aiContextData: { // Contexto para la IA
                pagoIniciado: true,
                ofertaId: tipo_item_a_pagar === 'oferta' ? identificador_item_a_pagar : undefined,
                itemPagadoNombre: nombreItem,
                checkoutUrl: checkoutSession.url,
                stripeSessionId: checkoutSession.id
            }
        };
        console.log(`[${actionName}] Éxito. Devolviendo payload:`, JSON.stringify(responsePayload, null, 2).substring(0, 500) + "...");
        return { success: true, data: responsePayload };

    } catch (error: unknown) {
        console.error(`[${actionName}] Error CRÍTICO al crear sesión de Stripe Checkout:`, error);
        let errorMessage = "Error desconocido al procesar el pago con Stripe.";
        if (error instanceof Error) errorMessage = error.message;
        else if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') errorMessage = error.message;

        return {
            success: true, // Aún success: true porque la función "manejó" el error y tiene un mensaje para el usuario
            data: {
                content: `Lo siento, ocurrió un error al intentar generar tu enlace de pago: ${errorMessage}. Por favor, intenta de nuevo más tarde o contacta a soporte. (Ref: STRIPE_ERR)`,
                media: null,
                uiComponentPayload: null,
                aiContextData: { error: true, errorType: "STRIPE_API_ERROR", errorMessage: errorMessage, inputArgs: argsFromIA }
            },
            error: `Error Stripe: ${errorMessage}` // Para log interno en TareaEjecutada
        };
    }
}
