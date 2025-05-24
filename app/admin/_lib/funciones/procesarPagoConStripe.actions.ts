// @/app/admin/_lib/funciones/procesarPagoConStripe.actions.ts
'use server';

import prisma from '../prismaClient';
import { stripe } from '@/app/lib/stripe'; // Tu cliente Stripe
import type Stripe from 'stripe';
import { ActionResult } from '../types';
import {
    ProcesarPagoConStripeArgsSchema,
    // ProcesarPagoConStripeDataSchema, 
    type ProcesarPagoConStripeArgs,
    type ProcesarPagoConStripeData
} from './procesarPagoConStripe.schemas';
import { headers } from 'next/headers'; // Para construir success/cancel URL

const COMISION_PROMEDIA_PORCENTAJE = 0.03; // 3%

async function actualizarTareaEjecutada(
    tareaEjecutadaId: string,
    exito: boolean,
    resultado: unknown // Use unknown instead of any for better type safety
) {
    try {
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: JSON.stringify({ resultado, exito }) },
        });
    } catch (error) {
        console.error(`[procesarPagoConStripe] Error al actualizar TareaEjecutada ${tareaEjecutadaId}:`, error);
    }
}

// export async function ejecutarProcesarPagoConStripeAction(
//     argumentos: ProcesarPagoConStripeArgs,
//     tareaEjecutadaId: string
// ): Promise<ActionResult<ProcesarPagoConStripeData>> {
//     console.log(`[Ejecución Función] Iniciando ejecutarProcesarPagoConStripeAction para Tarea ${tareaEjecutadaId}`);
//     console.log("[Ejecución Función] Argumentos recibidos:", argumentos);

//     const validationResult = ProcesarPagoConStripeArgsSchema.safeParse(argumentos);
//     if (!validationResult.success) {
//         await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: "Argumentos inválidos", issues: validationResult.error.issues });
//         return { success: false, error: "Argumentos inválidos." };
//     }

//     const {
//         negocioId,
//         identificador_item_a_pagar,
//         tipo_item_a_pagar,
//         clienteFinalIdStripe, // ID de Stripe Customer del cliente final
//         emailClienteFinal,     // Email del cliente final
//         canalNombre
//     } = validationResult.data;

//     try {
//         // 1. Obtener configuración de pago del negocio y stripeAccountId
//         const configPago = await prisma.negocioConfiguracionPago.findUnique({
//             where: { negocioId },
//             select: { stripeAccountId: true, aceptaPagosOnline: true, stripeChargesEnabled: true, monedaPrincipal: true },
//         });

//         if (!configPago?.aceptaPagosOnline || !configPago.stripeAccountId || !configPago.stripeChargesEnabled) {
//             const errorMsg = "Los pagos online no están habilitados o configurados correctamente para este negocio.";
//             await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
//             return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: `Lo siento, no es posible procesar pagos para este negocio en este momento. ${errorMsg}`, errorAlCrearLink: true } };
//         }
//         const { stripeAccountId, monedaPrincipal } = configPago;

//         // 2. Obtener detalles del ítem (Producto u Oferta)
//         let nombreItem: string | undefined;
//         let precioCentavos: number | undefined; // Stripe espera el precio en centavos
//         let descripcionItem: string | undefined;

//         if (tipo_item_a_pagar === 'producto_catalogo') {
//             const producto = await prisma.itemCatalogo.findUnique({
//                 where: { id: identificador_item_a_pagar, negocioId: negocioId }, // Asegurar que pertenezca al negocio
//                 select: { nombre: true, precio: true, descripcion: true },
//             });
//             if (!producto) {
//                 const errorMsg = `Producto con ID ${identificador_item_a_pagar} no encontrado.`;
//                 await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
//                 return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: `Lo siento, no pude encontrar el producto que deseas pagar.`, errorAlCrearLink: true } };
//             }
//             nombreItem = producto.nombre;
//             precioCentavos = Math.round(producto.precio * 100);
//             descripcionItem = producto.descripcion?.substring(0, 100); // Limitar descripción

//         } else if (tipo_item_a_pagar === 'oferta') {
//             const oferta = await prisma.oferta.findUnique({
//                 where: { id: identificador_item_a_pagar, negocioId: negocioId },
//                 select: { nombre: true, valor: true, descripcion: true, tipoOferta: true /*, otros campos de oferta */ },
//             });
//             if (!oferta || !oferta.valor) { // Asumimos que 'valor' es el precio de la oferta
//                 const errorMsg = `Oferta con ID ${identificador_item_a_pagar} no encontrada o sin precio definido.`;
//                 await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
//                 return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: `Lo siento, no pude encontrar la oferta que deseas pagar o no tiene un precio definido.`, errorAlCrearLink: true } };
//             }
//             nombreItem = oferta.nombre;
//             precioCentavos = Math.round(oferta.valor * 100); // 'valor' de la oferta es el precio
//             descripcionItem = oferta.descripcion?.substring(0, 100);

//         } else {
//             const errorMsg = `Tipo de ítem '${tipo_item_a_pagar}' no soportado.`;
//             await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
//             return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: errorMsg, errorAlCrearLink: true } };
//         }

//         if (!nombreItem || precioCentavos === undefined || precioCentavos <= 0) {
//             const errorMsg = "No se pudo determinar el nombre o precio del ítem a pagar.";
//             await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
//             return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: errorMsg, errorAlCrearLink: true } };
//         }

//         // 3. Calcular comisión de ProMedia
//         const comisionProMediaCentavos = Math.round(precioCentavos * COMISION_PROMEDIA_PORCENTAJE);

//         // 4. Construir URLs de éxito y cancelación
//         const headersObj = await headers();
//         const host = headersObj.get('host') || 'localhost:3000';
//         const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
//         const baseAppUrl = `${protocol}://${host}`;
//         // TODO: Crear páginas de éxito/cancelación más amigables, quizás en la vitrina
//         const successUrl = `${baseAppUrl}/pago/exito?session_id={CHECKOUT_SESSION_ID}`;
//         const cancelUrl = `${baseAppUrl}/pago/cancelado`;

//         // 5. Crear la Sesión de Stripe Checkout
//         const sessionParams: Stripe.Checkout.SessionCreateParams = {
//             payment_method_types: ['card'],
//             line_items: [{
//                 price_data: {
//                     currency: monedaPrincipal.toLowerCase(),
//                     product_data: {
//                         name: nombreItem,
//                         description: descripcionItem,
//                         // images: [url_imagen_producto_si_la_tienes],
//                     },
//                     unit_amount: precioCentavos,
//                 },
//                 quantity: 1,
//             }],
//             mode: 'payment',
//             success_url: successUrl,
//             cancel_url: cancelUrl,
//             metadata: {
//                 promedia_negocio_id: negocioId,
//                 promedia_item_id: identificador_item_a_pagar,
//                 promedia_item_tipo: tipo_item_a_pagar,
//                 promedia_tarea_ejecutada_id: tareaEjecutadaId,
//             },
//             // Para aplicar la comisión a la cuenta conectada
//             payment_intent_data: {
//                 application_fee_amount: comisionProMediaCentavos,
//                 // Esto asume que el cargo se hace en la cuenta de la plataforma
//                 // y luego se transfiere el resto a la cuenta conectada.
//                 transfer_data: {
//                     destination: stripeAccountId,
//                 },
//             },
//         };

//         // Si ya tienes un Stripe Customer ID para el cliente final, úsalo
//         if (clienteFinalIdStripe) {
//             sessionParams.customer = clienteFinalIdStripe;
//         } else if (emailClienteFinal) {
//             // Si no hay ID de cliente pero sí email, Stripe puede crear/usar un cliente basado en el email
//             sessionParams.customer_email = emailClienteFinal;
//         }

//         // Si prefieres hacer cargos directos en la cuenta conectada (requiere que configures 'application_fee_percent'
//         // globalmente en tu plataforma o que el Stripe Account ID se pase en el header de la API call):
//         // const checkoutSession = await stripe.checkout.sessions.create(sessionParams, { stripeAccount: stripeAccountId });
//         // En este caso, `application_fee_percent` (3%) se habría configurado al crear la sesión
//         // y no se usaría `payment_intent_data.application_fee_amount` ni `transfer_data`.
//         // Para el ejemplo, usaremos el flujo de `application_fee_amount` que es más explícito aquí.

//         const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

//         if (!checkoutSession.url) {
//             const errorMsg = "Stripe no devolvió una URL de checkout.";
//             await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
//             return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: `Lo siento, hubo un problema al generar el link de pago. ${errorMsg}`, errorAlCrearLink: true } };
//         }

//         //! Si el canal es Web Chat, puedes enviar un mensaje más estilizado
//         let mensajeSiguientePaso = "";
//         if (canalNombre?.toLowerCase() === 'web chat' || canalNombre?.toLowerCase() === 'webchat') {
//             mensajeSiguientePaso = `¡Listo! Puedes completar tu compra haciendo clic aquí: <a href="${checkoutSession.url}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">Ir al pago seguro</a>. Avísame si tienes algún problema.`;
//         }

//         await actualizarTareaEjecutada(tareaEjecutadaId, true, { checkoutUrl: checkoutSession.url, sessionId: checkoutSession.id });
//         const resultado: ProcesarPagoConStripeData = {
//             checkoutUrl: checkoutSession.url,
//             mensajeParaUsuario: mensajeSiguientePaso || `¡Listo! Puedes completar tu compra haciendo clic aquí: ${checkoutSession.url}. Avísame si tienes algún problema.`,

//             errorAlCrearLink: false,
//         };
//         return { success: true, data: resultado };

//     } catch (error: unknown) {
//         console.error("[Ejecución Función] Error al crear sesión de Stripe Checkout:", error);
//         let errorMessage = "Error desconocido de Stripe";
//         let errorType = undefined;
//         if (typeof error === "object" && error !== null) {
//             if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
//                 errorMessage = (error as { message: string }).message;
//             }
//             if ("type" in error && typeof (error as { type?: unknown }).type === "string") {
//                 errorType = (error as { type: string }).type;
//             }
//         }
//         await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMessage });
//         let userMessage = "Lo siento, ocurrió un error inesperado al intentar procesar tu pago.";
//         if (errorType === 'StripeCardError') { // Ejemplo de manejo de error específico de Stripe
//             userMessage = `Hubo un problema con la tarjeta: ${errorMessage}. Por favor, intenta con otra.`;
//         }
//         return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: userMessage, errorAlCrearLink: true } };
//     }
// }


export async function ejecutarProcesarPagoConStripeAction(
    argumentos: ProcesarPagoConStripeArgs,
    tareaEjecutadaId: string
): Promise<ActionResult<ProcesarPagoConStripeData>> {
    console.log(`[Ejecución Función] Iniciando ejecutarProcesarPagoConStripeAction para Tarea ${tareaEjecutadaId}`);
    console.log("[Ejecución Función] Argumentos recibidos:", argumentos);

    const validationResult = ProcesarPagoConStripeArgsSchema.safeParse(argumentos);
    if (!validationResult.success) {
        await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: "Argumentos inválidos", issues: validationResult.error.issues });
        return { success: false, error: "Argumentos inválidos." };
    }

    const {
        negocioId,
        identificador_item_a_pagar,
        tipo_item_a_pagar,
        clienteFinalIdStripe,
        emailClienteFinal,
        canalNombre, // Asegúrate de que este argumento se esté pasando desde el dispatcher
    } = validationResult.data;

    try {
        // Paso 0: Obtener el slug del negocio
        const negocioConSlug = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { slug: true, nombre: true } // Seleccionar nombre para mensajes de error
        });

        if (!negocioConSlug || !negocioConSlug.slug) {
            const errorMsg = `Negocio con ID ${negocioId} no encontrado o no tiene un slug configurado.`;
            console.error(`[procesarPagoConStripe] ${errorMsg}`);
            await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
            return {
                success: true, // La función se ejecutó, pero no pudo proceder
                data: {
                    checkoutUrl: null,
                    mensajeParaUsuario: `Lo siento, hay un problema de configuración para procesar el pago para "${negocioConSlug?.nombre || 'este negocio'}". Por favor, contacta a soporte.`,
                    errorAlCrearLink: true
                }
            };
        }
        const slugDelNegocio = negocioConSlug.slug;

        // 1. Obtener configuración de pago del negocio y stripeAccountId
        const configPago = await prisma.negocioConfiguracionPago.findUnique({
            where: { negocioId },
            select: { stripeAccountId: true, aceptaPagosOnline: true, stripeChargesEnabled: true, monedaPrincipal: true, aceptaMesesSinIntereses: true },
        });

        if (!configPago?.aceptaPagosOnline || !configPago.stripeAccountId || !configPago.stripeChargesEnabled) {
            const errorMsg = "Los pagos online no están habilitados o configurados correctamente para este negocio.";
            await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
            return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: `Lo siento, no es posible procesar pagos para este negocio en este momento. Razón: Pagos no activos.`, errorAlCrearLink: true } };
        }
        const { stripeAccountId, monedaPrincipal, aceptaMesesSinIntereses } = configPago;

        // 2. Obtener detalles del ítem (Producto u Oferta o Paquete)
        let nombreItem: string | undefined;
        let precioCentavos: number | undefined;
        let descripcionItem: string | undefined;
        const lineItemImages: string[] = [];


        if (tipo_item_a_pagar === 'producto_catalogo') {
            const producto = await prisma.itemCatalogo.findUnique({
                where: { id: identificador_item_a_pagar, negocioId: negocioId },
                select: { nombre: true, precio: true, descripcion: true, galeria: { select: { imageUrl: true }, take: 1 } },
            });
            if (!producto) { /* ... manejo de error ... */
                const errorMsg = `Producto con ID ${identificador_item_a_pagar} no encontrado.`;
                await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
                return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: `Lo siento, no pude encontrar el producto que deseas pagar.`, errorAlCrearLink: true } };
            }
            nombreItem = producto.nombre;
            precioCentavos = Math.round(producto.precio * 100);
            descripcionItem = producto.descripcion?.substring(0, 200); // Stripe tiene límites
            if (producto.galeria.length > 0 && producto.galeria[0].imageUrl) {
                lineItemImages.push(producto.galeria[0].imageUrl);
            }
        } else if (tipo_item_a_pagar === 'oferta') {
            const oferta = await prisma.oferta.findUnique({
                where: { id: identificador_item_a_pagar, negocioId: negocioId },
                select: { nombre: true, valor: true, descripcion: true, OfertaGaleria: { select: { imageUrl: true }, take: 1 } },
            });
            if (!oferta || !oferta.valor) { /* ... manejo de error ... */
                const errorMsg = `Oferta con ID ${identificador_item_a_pagar} no encontrada o sin precio definido.`;
                await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
                return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: `Lo siento, no pude encontrar la oferta que deseas pagar o no tiene un precio definido.`, errorAlCrearLink: true } };
            }
            nombreItem = oferta.nombre;
            precioCentavos = Math.round(oferta.valor * 100);
            descripcionItem = oferta.descripcion?.substring(0, 200);
            if (oferta.OfertaGaleria.length > 0 && oferta.OfertaGaleria[0].imageUrl) {
                lineItemImages.push(oferta.OfertaGaleria[0].imageUrl);
            }
        } else if (tipo_item_a_pagar === 'paquete') {
            const paquete = await prisma.negocioPaquete.findUnique({
                where: { id: identificador_item_a_pagar, negocioId: negocioId },
                select: { nombre: true, precio: true, descripcionCorta: true, galeria: { select: { imageUrl: true }, take: 1 } }
            });
            if (!paquete) {
                const errorMsg = `Paquete con ID ${identificador_item_a_pagar} no encontrado.`;
                await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
                return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: `Lo siento, no pude encontrar el paquete que deseas pagar.`, errorAlCrearLink: true } };
            }
            nombreItem = paquete.nombre;
            precioCentavos = Math.round(paquete.precio * 100);
            descripcionItem = paquete.descripcionCorta?.substring(0, 200);
            if (paquete.galeria.length > 0 && paquete.galeria[0].imageUrl) {
                lineItemImages.push(paquete.galeria[0].imageUrl);
            }
        }
        else { /* ... manejo de error tipo_item_a_pagar no soportado ... */
            const errorMsg = `Tipo de ítem '${tipo_item_a_pagar}' no soportado para el pago.`;
            await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
            return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: errorMsg, errorAlCrearLink: true } };
        }

        if (!nombreItem || precioCentavos === undefined || precioCentavos <= 0) {
            const errorMsg = "No se pudo determinar el nombre o precio del ítem a pagar.";
            await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
            return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: errorMsg, errorAlCrearLink: true } };
        }

        const comisionProMediaCentavos = Math.round(precioCentavos * COMISION_PROMEDIA_PORCENTAJE);

        const headersObj = await headers();
        const host = headersObj.get('x-forwarded-host') || headersObj.get('host') || 'localhost:3000';
        const protocol = host.startsWith('localhost') ? 'http' : 'https';
        const baseAppUrl = `${protocol}://${host}`;

        // Usar el slugDelNegocio en las URLs
        const successUrl = `${baseAppUrl}/vd/${slugDelNegocio}/checkout/success?session_id={CHECKOUT_SESSION_ID}`;
        const cancelUrl = `${baseAppUrl}/vd/${slugDelNegocio}/checkout/cancel`;

        const sessionParams: Stripe.Checkout.SessionCreateParams = {
            payment_method_types: ['card'],
            line_items: [{
                price_data: {
                    currency: monedaPrincipal.toLowerCase(),
                    product_data: {
                        name: nombreItem,
                        description: descripcionItem,
                        ...(lineItemImages.length > 0 && { images: lineItemImages }),
                    },
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
            },
            payment_intent_data: {
                application_fee_amount: comisionProMediaCentavos,
                transfer_data: {
                    destination: stripeAccountId,
                },
            },
        };

        if (aceptaMesesSinIntereses) {
            sessionParams.payment_method_options = {
                card: {
                    installments: {
                        enabled: true,
                    },
                },
            };
        }

        if (clienteFinalIdStripe) {
            sessionParams.customer = clienteFinalIdStripe;
        } else if (emailClienteFinal) {
            sessionParams.customer_email = emailClienteFinal;
        }

        const checkoutSession = await stripe.checkout.sessions.create(sessionParams);

        if (!checkoutSession.url) {
            const errorMsg = "Stripe no devolvió una URL de checkout.";
            await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMsg });
            return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: `Lo siento, hubo un problema al generar el link de pago. ${errorMsg}`, errorAlCrearLink: true } };
        }

        await actualizarTareaEjecutada(tareaEjecutadaId, true, { checkoutUrl: checkoutSession.url, sessionId: checkoutSession.id });

        let mensajeConEnlace = `¡Perfecto! Aquí tienes tu enlace para completar el pago de "${nombreItem}": `;
        if (canalNombre?.toLowerCase().includes('webchat')) { // Usar canalNombre pasado en argumentos
            mensajeConEnlace += `<a href="${checkoutSession.url}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">Pagar ahora de forma segura</a>. Avísame si tienes algún problema.`;
        } else {
            mensajeConEnlace += checkoutSession.url;
        }

        const resultado: ProcesarPagoConStripeData = {
            checkoutUrl: checkoutSession.url,
            mensajeParaUsuario: mensajeConEnlace,
            errorAlCrearLink: false,
        };
        return { success: true, data: resultado };

    } catch (error: unknown) {
        console.error("[Ejecución Función] Error al crear sesión de Stripe Checkout:", error);
        let errorMessage = "Error desconocido de Stripe";
        let errorType: string | undefined = undefined;
        if (typeof error === "object" && error !== null) {
            if ("message" in error && typeof (error as { message?: unknown }).message === "string") {
                errorMessage = (error as { message: string }).message;
            }
            if ("type" in error && typeof (error as { type?: unknown }).type === "string") {
                errorType = (error as { type: string }).type;
            }
        }
        await actualizarTareaEjecutada(tareaEjecutadaId, false, { error: errorMessage });
        let userMessage = "Lo siento, ocurrió un error inesperado al intentar procesar tu pago.";
        if (errorType === 'StripeCardError') {
            userMessage = `Hubo un problema con la tarjeta: ${errorMessage}. Por favor, intenta con otra.`;
        } else if (errorMessage) {
            // Para otros errores de Stripe, el mensaje puede ser útil
            userMessage = `Error de Stripe: ${errorMessage}`;
        }
        return { success: true, data: { checkoutUrl: null, mensajeParaUsuario: userMessage, errorAlCrearLink: true } };
    }
}