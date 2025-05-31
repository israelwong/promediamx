// Propuesta para: pages/api/stripe/webhooks.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { stripe } from '@/app/lib/stripe'; // Tu cliente Stripe inicializado desde lib/stripe.ts
import prisma from '@/app/admin/_lib/prismaClient'; // Tu cliente Prisma
import { EnviarConfirmacionPagoInput } from '@/app/admin/_lib/actions/email//email.schemas'; // Tu esquema de validación
import { enviarCorreoConfirmacionPagoAction } from '@/app/admin/_lib/actions/email/email.actions'; // Tu acción de envío

// Necesitas leer el cuerpo raw para la verificación de la firma
export const config = {
    api: {
        bodyParser: false,
    },
};

async function buffer(readable: NodeJS.ReadableStream) {
    const chunks = [];
    for await (const chunk of readable) {
        chunks.push(typeof chunk === 'string' ? Buffer.from(chunk) : chunk);
    }
    return Buffer.concat(chunks);
}

const STRIPE_WEBHOOK_SECRET = process.env.STRIPE_WEBHOOK_SECRET;

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).end('Method Not Allowed');
    }

    if (!STRIPE_WEBHOOK_SECRET) {
        console.error('[Webhook Stripe] STRIPE_WEBHOOK_SECRET no está configurado.');
        return res.status(500).json({ error: 'Error de configuración del servidor.' });
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(buf.toString(), sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`[Webhook Stripe] Error al verificar la firma: ${errorMessage}`);
        return res.status(400).json({ error: `Error de Webhook: ${errorMessage}` });
    }

    // Manejar el evento
    console.log(`[Webhook Stripe] Evento recibido: ${event.type}`);

    switch (event.type) {
        case 'account.updated':
            const account = event.data.object as Stripe.Account;
            console.log(`[Webhook Stripe] 'account.updated' recibido para cuenta: ${account.id}`);
            console.log('[Webhook Stripe] Detalles de la cuenta:', {
                id: account.id,
                charges_enabled: account.charges_enabled,
                payouts_enabled: account.payouts_enabled,
                details_submitted: account.details_submitted,
            });

            try {
                const negocioConfig = await prisma.negocioConfiguracionPago.findUnique({
                    where: { stripeAccountId: account.id },
                });

                if (negocioConfig) {
                    await prisma.negocioConfiguracionPago.update({
                        where: { id: negocioConfig.id },
                        data: {
                            stripeChargesEnabled: account.charges_enabled ?? false,
                            stripePayoutsEnabled: account.payouts_enabled ?? false,
                            stripeOnboardingComplete: account.details_submitted ?? false,
                        },
                    });
                    console.log(`[Webhook Stripe] Configuración de pagos actualizada para stripeAccountId: ${account.id}`);
                } else {
                    console.warn(`[Webhook Stripe] 'account.updated': No se encontró NegocioConfiguracionPago para stripeAccountId: ${account.id}`);
                }
            } catch (dbError) {
                console.error(`[Webhook Stripe] 'account.updated': Error al actualizar la base de datos:`, dbError);
                return res.status(500).json({ error: 'Error interno del servidor al procesar webhook account.updated.' });
            }
            break;

        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            console.log(`[Webhook Stripe] 'checkout.session.completed' recibido para sesión: ${session.id}, estado de pago: ${session.payment_status}`);

            // Solo procesar aquí si el pago es síncrono y ya está 'paid'
            // Los pagos asíncronos (OXXO, SPEI) se manejarán con 'checkout.session.async_payment_succeeded'
            if (session.payment_status === 'paid') {
                console.log(`[Webhook Stripe] 'checkout.session.completed' (síncrono pagado) para sesión: ${session.id}`);
                // El resto de la lógica es la misma que para async_payment_succeeded
                // Podrías refactorizar esto a una función helper si quieres evitar duplicación
                await procesarPagoExitoso(session, res, 'checkout.session.completed'); // Pasamos res para poder responder dentro
            } else {
                console.log(`[Webhook Stripe] 'checkout.session.completed': Sesión ${session.id} con estado ${session.payment_status}. Esperando evento de pago asíncrono si aplica.`);
            }
            break;

        // --- NUEVO CASE PARA PAGOS ASÍNCRONOS EXITOSOS ---
        case 'checkout.session.async_payment_succeeded':
            const asyncSuccessfulSession = event.data.object as Stripe.Checkout.Session;
            console.log(`[Webhook Stripe] 'checkout.session.async_payment_succeeded' recibido para sesión: ${asyncSuccessfulSession.id}`);
            // Aquí el pago ya se confirmó para métodos como OXXO o SPEI
            await procesarPagoExitoso(asyncSuccessfulSession, res, 'checkout.session.async_payment_succeeded'); // Pasamos res
            break;

        // --- NUEVO CASE PARA PAGOS ASÍNCRONOS FALLIDOS ---
        case 'checkout.session.async_payment_failed':
            const asyncFailedSession = event.data.object as Stripe.Checkout.Session;
            console.log(`[Webhook Stripe] 'checkout.session.async_payment_failed' recibido para sesión: ${asyncFailedSession.id}`);
            // Aquí podrías:
            // 1. Loguear el fallo.
            // 2. Actualizar un registro de transacción en tu BD a un estado 'FALLIDA' (si creaste uno en estado 'PENDIENTE').
            // 3. Notificar al negocio o al cliente si es apropiado.
            // Por ahora, solo logueamos:
            console.warn(`[Webhook Stripe] Pago asíncrono fallido para sesión: ${asyncFailedSession.id}. Estado de pago: ${asyncFailedSession.payment_status}`);
            // No necesitas hacer nada más si no tienes un registro previo que actualizar.
            break;

        // --- NUEVO CASE PARA CAPACIDADES DE CUENTA ACTUALIZADAS ---
        case 'capability.updated':
            const capability = event.data.object as Stripe.Capability;
            const accountIdForCapability = typeof capability.account === 'string' ? capability.account : capability.account.id;
            console.log(`[Webhook Stripe] 'capability.updated' recibido para cuenta: ${accountIdForCapability}, capacidad: ${capability.id}, estado: ${capability.status}`);

            try {
                const negocioConfig = await prisma.negocioConfiguracionPago.findUnique({
                    where: { stripeAccountId: accountIdForCapability },
                });

                if (negocioConfig) {
                    const updateData: Partial<import("@prisma/client").NegocioConfiguracionPago> = {}; // Usar el tipo de Prisma aquí
                    if (capability.id === 'oxxo_payments') {
                        // updateData.stripeOxxoCapabilityStatus = capability.status; // Asumiendo que tienes este campo
                        // Si quieres que 'aceptaOxxoPay' se actualice basado en la capacidad de Stripe:
                        updateData.aceptaOxxoPay = capability.status === 'active';
                    }
                    // Añadir lógica similar para otras capacidades si es necesario, ej. transfer_payments para SPEI
                    // if (capability.id === 'transfer_payments') { ... }

                    if (Object.keys(updateData).length > 0) {
                        await prisma.negocioConfiguracionPago.update({
                            where: { id: negocioConfig.id },
                            data: updateData,
                        });
                        console.log(`[Webhook Stripe] Capacidad ${capability.id} actualizada a '${capability.status}' para stripeAccountId: ${accountIdForCapability}`);
                    } else {
                        console.log(`[Webhook Stripe] Capacidad ${capability.id} actualizada, pero no requiere cambios en nuestra BD para ${accountIdForCapability}.`);
                    }
                } else {
                    console.warn(`[Webhook Stripe] 'capability.updated': No se encontró NegocioConfiguracionPago para stripeAccountId: ${accountIdForCapability} al actualizar capacidad ${capability.id}.`);
                }
            } catch (dbError) {
                console.error(`[Webhook Stripe] 'capability.updated': Error al actualizar capacidad ${capability.id} en DB:`, dbError);
                // No devolver 500 aquí necesariamente, ya que podría ser un evento informativo.
                // Pero si la actualización es crítica, considera un 500.
            }
            break;

        default:
            console.log(`[Webhook Stripe] Evento no manejado recibido: ${event.type}`);
    }

    // Devolver una respuesta 200 a Stripe para todos los eventos manejados o no (a menos que haya un error crítico arriba)
    if (!res.headersSent) { // Solo responder si no se ha respondido ya (ej. en procesarPagoExitoso)
        res.status(200).json({ received: true });
    }
}


// --- FUNCIÓN HELPER PARA PROCESAR PAGOS EXITOSOS ---
async function procesarPagoExitoso(
    session: Stripe.Checkout.Session,
    res: NextApiResponse, // Para poder responder a Stripe desde aquí si es necesario
    eventType: string // Para logging
) {
    const negocioId = session.metadata?.promedia_negocio_id;

    if (!negocioId) {
        console.error(`[Webhook Stripe - ${eventType}] Falta promedia_negocio_id en metadata para session ${session.id}`);
        // Devolvemos 200 a Stripe para que no reintente, pero logueamos el error.
        if (!res.headersSent) res.status(200).json({ received: true, error: "Falta metadata del negocio." });
        return;
    }

    let referenciaProcesadorId: string | null = null;
    if (session.payment_intent) {
        referenciaProcesadorId = typeof session.payment_intent === 'string'
            ? session.payment_intent
            : session.payment_intent.id;
    }
    if (!referenciaProcesadorId) {
        referenciaProcesadorId = session.id; // Fallback al ID de la sesión
    }

    try {
        const existingTransaction = await prisma.negocioTransaccion.findUnique({
            where: { referenciaProcesador: referenciaProcesadorId },
        });

        if (existingTransaction) {
            console.log(`[Webhook Stripe - ${eventType}] Transacción para referenciaProcesador ${referenciaProcesadorId} ya existe. Omitiendo.`);
            if (!res.headersSent) res.status(200).json({ received: true, message: "Evento ya procesado (transacción existente)." });
            return;
        }

        const montoBrutoCentavos = session.amount_total || 0;
        const montoBruto = montoBrutoCentavos / 100;
        const moneda = (session.currency || 'mxn').toUpperCase();
        const COMISION_PROMEDIA_PORCENTAJE = 0.03;
        const comisionPlataforma = parseFloat((montoBruto * COMISION_PROMEDIA_PORCENTAJE).toFixed(2));
        const comisionProcesadorPago = 0; // Para MVP
        const montoNetoRecibido = parseFloat((montoBruto - comisionPlataforma - comisionProcesadorPago).toFixed(2));
        const concepto = session.line_items?.data[0]?.description || (session.mode === 'subscription' ? 'Suscripción' : 'Pago online');
        const metodoPago = session.payment_method_types?.[0] || 'desconocido';

        await prisma.negocioTransaccion.create({
            data: {
                negocioId: negocioId,
                fechaTransaccion: new Date(session.created * 1000),
                concepto: concepto,
                montoBruto: montoBruto,
                moneda: moneda,
                comisionProcesadorPago: comisionProcesadorPago,
                comisionPlataforma: comisionPlataforma,
                montoNetoRecibido: montoNetoRecibido,
                metodoPagoUtilizado: metodoPago.toUpperCase().replace(/_/g, ' '),
                referenciaProcesador: referenciaProcesadorId,
                emailComprador: session.customer_details?.email || session.customer_email,
                nombreComprador: session.customer_details?.name,
                estado: 'COMPLETADA',
                origenPagoId: session.metadata?.promedia_producto_id || session.metadata?.promedia_oferta_id,
                origenPagoTipo: session.metadata?.promedia_origen_tipo,
                metadata: session.metadata as Record<string, string> | undefined,
            },
        });
        console.log(`[Webhook Stripe - ${eventType}] Transacción registrada para negocio ${negocioId}, sesión: ${session.id}`);

        const negocioParaCorreo = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { nombre: true, logo: true, email: true, slug: true } // Añadido slug
        });

        if (negocioParaCorreo) {
            const inputCorreo: EnviarConfirmacionPagoInput = {
                emailComprador: session.customer_details?.email || session.customer_email || '',
                nombreComprador: session.customer_details?.name,
                nombreNegocio: negocioParaCorreo.nombre,
                logoNegocioUrl: negocioParaCorreo.logo,
                emailRespuestaNegocio: negocioParaCorreo.email || `soporte@${new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://promedia.mx').hostname}`,
                conceptoPrincipal: concepto,
                montoPagado: montoBruto,
                moneda: moneda,
                idTransaccionStripe: referenciaProcesadorId,
                // linkDetallesPedidoEnVitrina: negocioParaCorreo.slug ? `${process.env.NEXT_PUBLIC_APP_URL}/vd/${negocioParaCorreo.slug}/pedidos/ID_TRANSACCION_AQUI` : undefined,
            };
            Object.keys(inputCorreo).forEach(key => (inputCorreo as Record<string, unknown>)[key] === undefined && delete (inputCorreo as Record<string, unknown>)[key]);

            if (inputCorreo.emailComprador) {
                await enviarCorreoConfirmacionPagoAction(inputCorreo);
                console.log(`[Webhook Stripe - ${eventType}] Correo de confirmación enviado para sesión ${session.id}.`);
            } else {
                console.warn(`[Webhook Stripe - ${eventType}] No se pudo enviar correo de confirmación para sesión ${session.id} porque falta emailComprador.`);
            }
        }
    } catch (dbError) {
        console.error(`[Webhook Stripe - ${eventType}] Error al procesar la transacción en DB para sesión ${session.id}:`, dbError);
        if (!res.headersSent) res.status(500).json({ error: 'Error interno del servidor al procesar transacción.' });
        return; // Salir de la función helper en caso de error
    }

    // Si todo fue bien dentro de esta función helper, respondemos a Stripe aquí
    if (!res.headersSent) {
        res.status(200).json({ received: true });
    }
}

