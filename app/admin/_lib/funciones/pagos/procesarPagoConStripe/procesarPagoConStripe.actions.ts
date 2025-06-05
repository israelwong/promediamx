// Ruta: app/admin/_lib/funciones/pagos/procesarPagoConStripe.actions.ts
'use server';

import prisma from '../../../prismaClient';
import { stripe } from '@/app/lib/stripe';
import type Stripe from 'stripe';
import type { ActionResult } from '../../../types';
import type { FullExecutionFunctionContext, FunctionResponsePayload } from '../../../dispatcher/dispatcher.types';
import { ProcesarPagoConStripeArgsSchema } from './procesarPagoConStripe.schemas';
import { headers } from 'next/headers';
import { TipoAnticipoOferta, TipoPagoOferta } from '@prisma/client'; // Importar Enums de Prisma

const COMISION_PROMEDIA_PORCENTAJE = 0.03; // 3%

// Helper para redondear a 2 decimales (para cálculos de moneda antes de pasar a centavos)
function roundToTwoDecimals(num: number): number {
    return Math.round((num + Number.EPSILON) * 100) / 100;
}

export async function ejecutarProcesarPagoConStripeAction(
    argsFromIA: Record<string, unknown>,
    context: FullExecutionFunctionContext
): Promise<ActionResult<FunctionResponsePayload | null>> {
    const actionName = "ejecutarProcesarPagoConStripeAction";
    const { tareaEjecutadaId, negocioId, canalNombre, idiomaLocale, monedaNegocio: fallbackMoneda, leadId } = context;

    // console.log(`[${actionName}] Iniciando. TareaId: ${tareaEjecutadaId}, Args:`, argsFromIA);

    const validationResult = ProcesarPagoConStripeArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        const errorMsg = "Argumentos de IA inválidos para procesarPagoConStripe.";
        console.warn(`[${actionName}] ${errorMsg}`, validationResult.error.flatten().fieldErrors);
        const userMessage = "Para procesar el pago, necesito algunos detalles más o la información proporcionada no es correcta.";
        return {
            success: true,
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

        let nombreItem: string | undefined;
        let precioTotalItem: number | undefined;
        let descripcionItem: string | undefined;
        const lineItemImages: string[] = [];
        let esPagoDeAnticipo = false;
        let montoAnticipoCalculado: number | undefined;
        let itemDescriptionForStripe = "";

        if (tipo_item_a_pagar === 'oferta') {
            const oferta = await prisma.oferta.findUnique({
                where: { id: identificador_item_a_pagar, negocioId: negocioId },
                select: {
                    nombre: true, precio: true, descripcion: true,
                    tipoPago: true, tipoAnticipo: true, porcentajeAnticipo: true, anticipo: true,
                    OfertaGaleria: { select: { imageUrl: true }, orderBy: { orden: 'asc' }, take: 1 }
                },
            });

            if (!oferta || oferta.precio === null || oferta.precio === undefined) {
                return { success: true, data: { content: `Lo siento, no pude encontrar la oferta "${identificador_item_a_pagar}" o no tiene un precio definido.`, media: null, uiComponentPayload: null, aiContextData: { errorType: "OFERTA_SIN_PRECIO" } } };
            }
            nombreItem = oferta.nombre;
            precioTotalItem = oferta.precio;
            descripcionItem = oferta.descripcion ?? undefined; // Usaremos esto para la descripción en Stripe

            // Lógica para determinar monto a cobrar (anticipo o total)
            if (oferta.tipoPago === TipoPagoOferta.UNICO) {
                if (oferta.tipoAnticipo === TipoAnticipoOferta.MONTO_FIJO && oferta.anticipo && oferta.anticipo > 0) {
                    montoAnticipoCalculado = oferta.anticipo;
                    esPagoDeAnticipo = true;
                    itemDescriptionForStripe = `Anticipo para: ${nombreItem}. Total: ${precioTotalItem.toFixed(2)} ${monedaFinal.toUpperCase()}.`;
                } else if (oferta.tipoAnticipo === TipoAnticipoOferta.PORCENTAJE && oferta.porcentajeAnticipo && oferta.porcentajeAnticipo > 0) {
                    montoAnticipoCalculado = roundToTwoDecimals(precioTotalItem * (oferta.porcentajeAnticipo / 100));
                    esPagoDeAnticipo = true;
                    itemDescriptionForStripe = `Anticipo (${oferta.porcentajeAnticipo}%) para: ${nombreItem}. Total: ${precioTotalItem.toFixed(2)} ${monedaFinal.toUpperCase()}.`;
                }
            }
            // Si no es UNICO con anticipo, o si es RECURRENTE, se cobra el precioTotalItem como primer pago/pago único
            if (!esPagoDeAnticipo) {
                itemDescriptionForStripe = descripcionItem || nombreItem;
            }

            if (oferta.OfertaGaleria?.[0]?.imageUrl) lineItemImages.push(oferta.OfertaGaleria[0].imageUrl);

        } else if (tipo_item_a_pagar === 'paquete' || tipo_item_a_pagar === 'producto_catalogo') {
            // Aquí iría tu lógica para obtener precio y nombre de paquetes o productos
            // Por ahora, asumimos que no tienen anticipos y se cobra el precio total.
            // Ejemplo simplificado:
            if (tipo_item_a_pagar === 'producto_catalogo') {
                const producto = await prisma.itemCatalogo.findUnique({ where: { id: identificador_item_a_pagar, negocioId: negocioId }, select: { nombre: true, precio: true, descripcion: true } });
                if (!producto || producto.precio === null) return { /* ... error ... */ success: true, data: { content: "Producto no encontrado o sin precio.", media: null, uiComponentPayload: null } };
                nombreItem = producto.nombre; precioTotalItem = producto.precio; descripcionItem = producto.descripcion ?? undefined;
                itemDescriptionForStripe = descripcionItem || nombreItem;
            } else { // paquete
                const paquete = await prisma.negocioPaquete.findUnique({ where: { id: identificador_item_a_pagar, negocioId: negocioId }, select: { nombre: true, precio: true, descripcionCorta: true } });
                if (!paquete || paquete.precio === null) return { /* ... error ... */ success: true, data: { content: "Paquete no encontrado o sin precio.", media: null, uiComponentPayload: null } };
                nombreItem = paquete.nombre; precioTotalItem = paquete.precio; descripcionItem = paquete.descripcionCorta ?? undefined;
                itemDescriptionForStripe = descripcionItem || nombreItem;
            }
        } else {
            return { success: true, data: { content: `Tipo de ítem '${tipo_item_a_pagar}' no soportado.`, media: null, uiComponentPayload: null, aiContextData: { errorType: "TIPO_ITEM_INVALIDO" } } };
        }

        const montoACobrar = esPagoDeAnticipo && montoAnticipoCalculado !== undefined ? montoAnticipoCalculado : precioTotalItem;

        if (!nombreItem || montoACobrar === undefined || montoACobrar <= 0) {
            return { success: true, data: { content: "No se pudo determinar el nombre o el monto a pagar (debe ser mayor a 0).", media: null, uiComponentPayload: null, aiContextData: { errorType: "MONTO_INVALIDO" } } };
        }
        const precioCentavos = Math.round(montoACobrar * 100);
        const comisionProMediaCentavos = Math.round(precioCentavos * COMISION_PROMEDIA_PORCENTAJE);

        const headersObj = await headers();
        const hostHeader = headersObj.get('x-forwarded-host') || headersObj.get('host');
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const defaultHost = process.env.NODE_ENV === 'production' ? process.env.VERCEL_URL || process.env.NEXT_PUBLIC_APP_URL : 'localhost:3000';
        const finalHost = hostHeader || defaultHost;
        const baseAppUrl = `${protocol}://${finalHost}`;

        const successUrl = `${baseAppUrl}/vd/${slugDelNegocio}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseAppUrl}/vd/${slugDelNegocio}/checkout/cancel`;

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: monedaFinal,
                    product_data: {
                        name: nombreItem,
                        description: itemDescriptionForStripe.substring(0, 1000), // Stripe tiene límite en descripción
                        images: lineItemImages.length > 0 ? lineItemImages : undefined
                    },
                    unit_amount: precioCentavos,
                },
                quantity: 1,
            }],
            mode: 'payment',
            success_url: successUrl,
            cancel_url: cancelUrl,
            metadata: { /* ... (tu metadata) ... */
                promedia_negocio_id: negocioId,
                promedia_item_id: identificador_item_a_pagar,
                promedia_item_tipo: tipo_item_a_pagar,
                promedia_tarea_ejecutada_id: tareaEjecutadaId,
                promedia_lead_id: leadId,
                promedia_es_anticipo: esPagoDeAnticipo.toString(),
                promedia_monto_total_oferta: precioTotalItem?.toString() ?? "0",
            },
            payment_intent_data: {
                application_fee_amount: comisionProMediaCentavos,
                transfer_data: { destination: stripeAccountId },
            },
        };

        if (aceptaMesesSinIntereses && !esPagoDeAnticipo) { // MSI usualmente para pago total
            sessionParams.payment_method_options = { card: { installments: { enabled: true } } };
        }
        if (clienteFinalIdStripe) sessionParams.customer = clienteFinalIdStripe;
        else if (emailClienteFinal) sessionParams.customer_email = emailClienteFinal;

        const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

        if (!checkoutSession.url) {
            throw new Error("Stripe no devolvió una URL de checkout.");
        }

        let mensajeParaUsuario = `¡Perfecto! Aquí tienes el enlace para ${esPagoDeAnticipo ? 'el anticipo' : 'el pago'} de "${nombreItem}":\n${checkoutSession.url}`;
        if (esPagoDeAnticipo && precioTotalItem) {
            mensajeParaUsuario += `\n(Monto total de la oferta: ${new Intl.NumberFormat(idiomaLocale || 'es-MX', { style: "currency", currency: monedaFinal }).format(precioTotalItem)})`;
        }

        let uiPayload: Record<string, unknown> | null = null;
        if (canalNombre?.toLowerCase().includes('webchat')) {
            mensajeParaUsuario = `Tu enlace para ${esPagoDeAnticipo ? 'el anticipo' : 'el pago'} de "${nombreItem}" está listo.`;
            if (esPagoDeAnticipo && precioTotalItem) {
                mensajeParaUsuario += ` Monto total de la oferta: ${new Intl.NumberFormat(idiomaLocale || 'es-MX', { style: "currency", currency: monedaFinal }).format(precioTotalItem)}.`;
            }
            uiPayload = {
                componentType: 'StripePaymentLink',
                data: {
                    checkoutUrl: checkoutSession.url,
                    buttonText: `${esPagoDeAnticipo ? 'Pagar Anticipo de' : 'Pagar'} ${new Intl.NumberFormat(idiomaLocale || 'es-MX', { style: "currency", currency: monedaFinal }).format(montoACobrar)} Ahora`,
                    message: `Serás redirigido a Stripe para completar tu pago de forma segura.${esPagoDeAnticipo && precioTotalItem ? ` Monto total de la oferta: ${new Intl.NumberFormat(idiomaLocale || 'es-MX', { style: "currency", currency: monedaFinal }).format(precioTotalItem)}.` : ''}`
                }
            };
        }

        const responsePayload: FunctionResponsePayload = {
            content: mensajeParaUsuario,
            media: null,
            uiComponentPayload: uiPayload,
            aiContextData: {
                pagoIniciado: true,
                esAnticipo: esPagoDeAnticipo,
                montoCobrado: montoACobrar,
                montoTotalOferta: precioTotalItem,
                ofertaId: tipo_item_a_pagar === 'oferta' ? identificador_item_a_pagar : undefined,
                itemPagadoNombre: nombreItem,
                checkoutUrl: checkoutSession.url,
                stripeSessionId: checkoutSession.id
            }
        };
        return { success: true, data: responsePayload };

    } catch (error: unknown) {
        // ... (tu manejo de error, igual que antes)
        console.error(`[${actionName}] Error CRÍTICO al crear sesión de Stripe Checkout:`, error);
        let errorMessage = "Error desconocido al procesar el pago con Stripe.";
        if (error instanceof Error) errorMessage = error.message;
        else if (typeof error === 'object' && error && 'message' in error && typeof error.message === 'string') errorMessage = error.message;

        return {
            success: true,
            data: {
                content: `Lo siento, ocurrió un error al intentar generar tu enlace de pago: ${errorMessage}. Por favor, intenta de nuevo más tarde o contacta a soporte. (Ref: STRIPE_ERR_GEN)`,
                media: null, uiComponentPayload: null,
                aiContextData: { error: true, errorType: "STRIPE_API_ERROR", errorMessage: errorMessage, inputArgs: argsFromIA }
            },
            error: `Error Stripe: ${errorMessage}`
        };
    }
}
