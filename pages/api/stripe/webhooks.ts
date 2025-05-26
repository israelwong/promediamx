// Propuesta para: pages/api/stripe/webhooks.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import Stripe from 'stripe';
import { stripe } from '@/app/lib/stripe'; // Tu cliente Stripe inicializado desde lib/stripe.ts
import prisma from '@/app/admin/_lib/prismaClient'; // Tu cliente Prisma
import { EnviarConfirmacionPagoInput } from '@/app/admin/_lib/actions/email//email.schemas'; // Tu esquema de validación
import { enviarCorreoConfirmacionPagoAction } from '@/app/admin/_lib/actions/email//email.actions'; // Tu esquema de validación


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

// Asegúrate de tener esta variable de entorno configurada
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
        console.error('STRIPE_WEBHOOK_SECRET no está configurado.');
        return res.status(500).json({ error: 'Error de configuración del servidor.' });
    }

    const buf = await buffer(req);
    const sig = req.headers['stripe-signature'] as string;

    let event: Stripe.Event;

    try {
        event = stripe.webhooks.constructEvent(buf.toString(), sig, STRIPE_WEBHOOK_SECRET);
    } catch (err: unknown) {
        const errorMessage = err instanceof Error ? err.message : String(err);
        console.error(`Webhook de Stripe: Error al verificar la firma: ${errorMessage}`);
        return res.status(400).json({ error: `Error de Webhook: ${errorMessage}` });
    }

    // Manejar el evento
    switch (event.type) {
        case 'account.updated':
            const account = event.data.object as Stripe.Account;
            console.log(`[Pages Router Webhook] 'account.updated' recibido para la cuenta: ${account.id}`);
            console.log('[Pages Router Webhook] Detalles de la cuenta:', {
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
                    console.log(`[Pages Router Webhook] Configuración de pagos actualizada para stripeAccountId: ${account.id}`);
                } else {
                    console.warn(`[Pages Router Webhook] 'account.updated': No se encontró NegocioConfiguracionPago para stripeAccountId: ${account.id}`);
                }
            } catch (dbError) {
                console.error(`[Pages Router Webhook] 'account.updated': Error al actualizar la base de datos:`, dbError);
                return res.status(500).json({ error: 'Error interno del servidor al procesar el webhook.' });
            }
            break;

        case 'checkout.session.completed':
            const session = event.data.object as Stripe.Checkout.Session;
            console.log(`[Webhook] 'checkout.session.completed' recibido para la sesión: ${session.id}`);

            if (session.payment_status === 'paid') {
                // const negocioId = 'cm9z1igbu0001guuswr4pd58b' //!prueba
                const negocioId = session.metadata?.promedia_negocio_id;

                if (!negocioId) {
                    console.error(`[Webhook] 'checkout.session.completed': Falta promedia_negocio_id en metadata para session ${session.id}`);
                    return res.status(200).json({ received: true, error: "Falta metadata del negocio." });
                }

                try {
                    const montoBrutoCentavos = session.amount_total || 0;
                    const montoBruto = montoBrutoCentavos / 100;
                    const moneda = (session.currency || 'mxn').toUpperCase();

                    // Comisión de ProMedia: siempre calculada como 3% del monto bruto.
                    const COMISION_PROMEDIA_PORCENTAJE = 0.03; // 3%
                    const comisionPlataforma = parseFloat((montoBruto * COMISION_PROMEDIA_PORCENTAJE).toFixed(2));

                    // Comisión del procesador de pagos (Stripe): Para MVP, la registramos como 0.
                    const comisionProcesadorPago = 0;

                    const montoNetoRecibido = parseFloat((montoBruto - comisionPlataforma - comisionProcesadorPago).toFixed(2));

                    const concepto = session.line_items?.data[0]?.description ||
                        (session.mode === 'subscription' ? 'Suscripción' : 'Pago online');

                    const metodoPago = session.payment_method_types?.[0] || 'desconocido';

                    // Para referenciaProcesador:
                    // session.payment_intent puede ser un string (ID) o un objeto PaymentIntent expandido.
                    // Necesitamos el ID como string.
                    let referenciaProcesadorId: string | null = null;
                    if (session.payment_intent) {
                        if (typeof session.payment_intent === 'string') {
                            referenciaProcesadorId = session.payment_intent;
                        } else if (typeof session.payment_intent === 'object' && session.payment_intent.id) {
                            referenciaProcesadorId = session.payment_intent.id;
                        }
                    }
                    if (!referenciaProcesadorId) {
                        referenciaProcesadorId = session.id; // Fallback al ID de la sesión si no hay payment_intent ID
                    }

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
                            referenciaProcesador: referenciaProcesadorId, // Usamos el ID del Payment Intent o de la Sesión
                            emailComprador: session.customer_details?.email || session.customer_email,
                            nombreComprador: session.customer_details?.name,
                            // Usamos el valor string del enum de Prisma para el campo 'estado'
                            estado: 'COMPLETADA', // Corresponde a EstadoTransaccion.COMPLETADA en Prisma
                            origenPagoId: session.metadata?.promedia_producto_id || session.metadata?.promedia_oferta_id,
                            origenPagoTipo: session.metadata?.promedia_origen_tipo,
                            metadata: session.metadata as Record<string, string> | undefined,
                        },
                    });
                    console.log(`[Webhook] Transacción registrada para negocio ${negocioId}, sesión: ${session.id}`);

                    const negocioParaCorreo = await prisma.negocio.findUnique({
                        where: { id: negocioId }, // negocioId lo obtuviste de session.metadata
                        select: { nombre: true, logo: true, email: true } // Asumiendo que 'email' es el de respuesta
                    });

                    if (negocioParaCorreo) {
                        const inputCorreo: EnviarConfirmacionPagoInput = {
                            emailComprador: session.customer_details?.email || session.customer_email || '', // Asegurar que sea string
                            nombreComprador: session.customer_details?.name,
                            nombreNegocio: negocioParaCorreo.nombre,
                            logoNegocioUrl: negocioParaCorreo.logo,
                            emailRespuestaNegocio: negocioParaCorreo.email || `soporte@${new URL(process.env.NEXT_PUBLIC_APP_URL || 'https://promedia.mx').hostname}`,
                            conceptoPrincipal: concepto, // El concepto que ya tenías
                            montoPagado: montoBruto,
                            moneda: moneda,
                            idTransaccionStripe: referenciaProcesadorId, // El ID de la transacción de Stripe
                            // nombrePlataforma: "ProMedia",
                            // linkDetallesPedidoEnVitrina: `${process.env.NEXT_PUBLIC_APP_URL}/vd/${negocioParaCorreo.slug}/pedidos/${nuevaTransaccion.id}`, // Ejemplo
                        };
                        // Filtrar campos undefined antes de enviar a la acción de correo
                        Object.keys(inputCorreo).forEach(key => (inputCorreo as Record<string, unknown>)[key] === undefined && delete (inputCorreo as Record<string, unknown>)[key]);

                        if (inputCorreo.emailComprador) {
                            await enviarCorreoConfirmacionPagoAction(inputCorreo);
                        } else {
                            console.warn(`[Webhook] No se pudo enviar correo de confirmación para sesión ${session.id} porque falta emailComprador.`);
                        }
                    }

                } catch (dbError) {
                    console.error(`[Webhook] 'checkout.session.completed': Error al guardar la transacción en DB:`, dbError);
                    return res.status(500).json({ error: 'Error interno del servidor al procesar transacción.' });
                }
            } else {
                console.log(`[Webhook] 'checkout.session.completed': Sesión ${session.id} no pagada (estado: ${session.payment_status}). No se registra transacción.`);
            }
            break;

        default:
            console.log(`[Pages Router Webhook] Evento no manejado recibido: ${event.type}`);
    }

    // Devolver una respuesta 200 a Stripe
    res.status(200).json({ received: true });
}
