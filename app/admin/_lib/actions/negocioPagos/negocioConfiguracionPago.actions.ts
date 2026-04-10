// @/app/admin/_lib/actions/negocioPagos/negocioConfiguracionPago.actions.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient'; // Asegúrate de que la ruta es correcta
import {
    NegocioConfiguracionPagoSchema,
    GetNegocioConfiguracionPagoInputSchema,
    type NegocioConfiguracionPago,
    IniciarConexionStripeInputSchema,
    IniciarConexionStripeOutputSchema,
    ActualizarOpcionesPagoInputSchema,
    type ActualizarOpcionesPagoInput
} from './negocioConfiguracionPago.schemas';
import { ActionResult } from '@/app/admin/_lib/types'; // Asumo que tienes un tipo ActionResult
import { headers } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { stripe } from '@/app/lib/stripe'; // Asegúrate que exista y esté configurado: /lib/stripe.ts


export async function getNegocioConfiguracionPago(
    input: { negocioId: string }
): Promise<ActionResult<(NegocioConfiguracionPago & { _esNuevaConfiguracion: boolean }) | null>> {
    try {
        const validatedInput = GetNegocioConfiguracionPagoInputSchema.safeParse(input);
        if (!validatedInput.success) {
            return { success: false, error: 'Input inválido.' };
        }

        const { negocioId } = validatedInput.data;

        let configuracion = await prisma.negocioConfiguracionPago.findUnique({
            where: { negocioId },
        });

        let esNuevaConfiguracion = false;
        if (!configuracion) {
            configuracion = await prisma.negocioConfiguracionPago.create({
                data: {
                    negocioId: negocioId,
                    // Si usaste Opción 1 (default en Prisma), mesesPermitidosMSI se pondrá a [] automáticamente.
                    // Si no usaste Opción 1, y Prisma lo deja como null/undefined,
                    // la Opción 2 (default en Zod) lo manejará durante el parseo.
                },
            });
            esNuevaConfiguracion = true;
        }

        // Validamos la salida (aunque viene de Prisma, es buena práctica)
        const parsedConfig = NegocioConfiguracionPagoSchema.safeParse(configuracion);
        if (!parsedConfig.success) {
            console.error("Error al parsear configuración desde DB:", parsedConfig.error);
            // Podrías optar por devolver el objeto `configuracion` tal cual si confías en Prisma,
            // o manejar este error de forma más específica.
            // Por simplicidad, si falla el parseo post-creación/fetch, es un error interno.
            return { success: false, error: "Error interno al procesar la configuración de pagos." };
        }

        // Adjuntamos si es una nueva configuración, podría ser útil para el frontend
        // Aunque no es parte del schema Zod, podemos añadirlo al objeto de 'data' de ActionResult
        const dataWithStatus = {
            ...parsedConfig.data,
            _esNuevaConfiguracion: esNuevaConfiguracion // Prefijo _ para indicar metadato
        };


        return { success: true, data: dataWithStatus };

    } catch (error) {
        console.error('Error en getNegocioConfiguracionPago:', error);
        const errorMessage = 'Error al obtener la configuración de pagos.';
        if (error instanceof Error) {
            // Podrías querer ser más específico dependiendo del error de Prisma
            // errorMessage = error.message; 
        }
        return { success: false, error: errorMessage };
    }
}

// Aquí irían las acciones para conectar con Stripe, actualizar configuración, etc.
// Por ejemplo: iniciarConexionStripeAction, actualizarConfiguracionMSIAction, etc.


// --- NUEVA ACCIÓN: iniciarConexionStripeAction ---
export async function iniciarConexionStripeAction(
    input: { negocioId: string }
): Promise<ActionResult<{ onboardingUrl: string; stripeAccountId: string }>> {
    try {
        const validatedInput = IniciarConexionStripeInputSchema.safeParse(input);
        if (!validatedInput.success) {
            return { success: false, error: 'Input inválido para iniciar conexión Stripe.' };
        }
        const { negocioId } = validatedInput.data;

        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { email: true, clienteId: true, nombre: true }, // Necesitamos email para Stripe y clienteId para URL
        });

        if (!negocio) {
            return { success: false, error: "Negocio no encontrado." };
        }
        if (!negocio.clienteId) {
            return { success: false, error: "ID de cliente no encontrado para el negocio." };
        }

        let configuracionPago = await prisma.negocioConfiguracionPago.findUnique({
            where: { negocioId },
        });

        if (!configuracionPago) { // Aunque getNegocioConfiguracionPago debería haberla creado...
            configuracionPago = await prisma.negocioConfiguracionPago.create({ data: { negocioId } });
        }

        let currentStripeAccountId = configuracionPago.stripeAccountId;

        if (!currentStripeAccountId) {
            const account = await stripe.accounts.create({
                type: 'express',
                country: 'MX', // O desde config general de la plataforma
                email: negocio.email || undefined, // Stripe requiere un email
                business_type: 'individual', // O 'company', podría ser una pregunta en el onboarding de ProMedia
                company: { name: negocio.nombre || undefined }, // Opcional pero bueno
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
            });
            currentStripeAccountId = account.id;
            // Actualizar nuestra DB con el nuevo Stripe Account ID
            await prisma.negocioConfiguracionPago.update({
                where: { id: configuracionPago.id },
                data: {
                    stripeAccountId: currentStripeAccountId,
                    stripeAccountType: 'express',
                    stripeOnboardingComplete: false, // Aún no
                    stripeChargesEnabled: false,
                    stripePayoutsEnabled: false,
                    aceptaPagosOnline: true, // Asumimos que si conectan Stripe, quieren aceptar pagos
                },
            });
        }
        // Si ya hay un ID, simplemente generamos un nuevo link de onboarding
        // Stripe recomienda generar un nuevo link cada vez que el usuario necesita acceder.

        const host = (await headers()).get('host') || 'localhost:3000';
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';
        const baseAppUrl = `${protocol}://${host}`;

        const returnUrl = `${baseAppUrl}/admin/clientes/${negocio.clienteId}/negocios/${negocioId}/pagos?stripe_return=true`;
        const refreshUrl = `${baseAppUrl}/admin/clientes/${negocio.clienteId}/negocios/${negocioId}/pagos?stripe_refresh=true`;

        const accountLink = await stripe.accountLinks.create({
            account: currentStripeAccountId,
            refresh_url: refreshUrl,
            return_url: returnUrl,
            type: 'account_onboarding',
        });

        const outputData = { onboardingUrl: accountLink.url, stripeAccountId: currentStripeAccountId };
        const validatedOutput = IniciarConexionStripeOutputSchema.safeParse(outputData);

        if (!validatedOutput.success) {
            console.error("Error al parsear URL de Stripe generada:", validatedOutput.error.issues);
            return { success: false, error: 'Error interno al generar el link de onboarding de Stripe.' };
        }

        // Revalidar la ruta actual para que la UI se actualice si la página recarga o el usuario navega atrás.
        revalidatePath(`/admin/clientes/${negocio.clienteId}/negocios/${negocioId}/pagos`);

        return { success: true, data: validatedOutput.data };

    } catch (error) {
        console.error('Error en iniciarConexionStripeAction:', error);
        // Stripe puede devolver errores específicos que podríamos querer propagar
        let errorMessage = 'No se pudo iniciar la conexión con Stripe.';
        if (
            typeof error === 'object' &&
            error !== null &&
            'type' in error &&
            (error as { type?: string }).type === 'StripeInvalidRequestError' &&
            'param' in error
        ) {
            errorMessage = `Error de Stripe: ${(error as { message?: string }).message} (Parámetro: ${(error as { param?: string }).param})`;
        } else if (typeof error === 'object' && error !== null && 'message' in error) {
            errorMessage = (error as { message?: string }).message ?? errorMessage;
        }
        return { success: false, error: errorMessage };
    }
}

// --- NUEVA ACCIÓN: actualizarOpcionesPagoAction ---
export async function actualizarOpcionesPagoAction(
    input: ActualizarOpcionesPagoInput // Usar el tipo inferido del schema
): Promise<ActionResult<NegocioConfiguracionPago>> {
    try {
        // const usuario = await obtenerUsuarioServidor();
        // if (!usuario || !usuario.clienteId) return { success: false, error: "No autorizado." };

        const validation = ActualizarOpcionesPagoInputSchema.safeParse(input);
        if (!validation.success) {
            console.error("Error de validación en actualizarOpcionesPagoAction:", validation.error.flatten());
            return { success: false, error: "Datos de entrada inválidos." };
        }

        const {
            negocioId,
            aceptaPagosOnline,
            aceptaOxxoPay,
            aceptaMesesSinIntereses,
            mesesPermitidosMSI
        } = validation.data;

        // TODO: Validar que el usuario tiene permiso sobre este negocioId
        // const negocioPermiso = await prisma.negocio.findFirst({
        //     where: { id: negocioId, clienteId: usuario.clienteId },
        //     select: { clienteId: true } // Solo para confirmar existencia y permiso
        // });
        // if (!negocioPermiso) {
        //     return { success: false, error: "Negocio no encontrado o no tienes permiso." };
        // }

        const configuracionExistente = await prisma.negocioConfiguracionPago.findUnique({
            where: { negocioId },
        });

        if (!configuracionExistente) {
            return { success: false, error: "Configuración de pagos no encontrada para este negocio. Conecta Stripe primero." };
        }

        // Si se desactiva MSI, asegurarse de que mesesPermitidosMSI esté vacío
        const finalMesesPermitidosMSI = aceptaMesesSinIntereses ? mesesPermitidosMSI : [];

        const updatedConfig = await prisma.negocioConfiguracionPago.update({
            where: { negocioId: negocioId },
            data: {
                aceptaPagosOnline,
                aceptaOxxoPay,
                aceptaMesesSinIntereses,
                mesesPermitidosMSI: finalMesesPermitidosMSI,
                // Aquí podrías añadir lógica para actualizar capacidades en Stripe si es necesario,
                // por ejemplo, si 'oxxo_payments' no estaba solicitado antes.
                // Pero por ahora, solo guardamos la preferencia en nuestra BD.
            },
        });

        // Revalidar el path para que la página que muestra la configuración se actualice
        // Necesitamos el clienteId para construir la ruta completa.
        // Asumimos que lo obtuvimos de negocioPermiso o que el input lo incluye si es necesario.
        // const clienteId = negocioPermiso.clienteId; 
        // revalidatePath(`/admin/clientes/${clienteId}/negocios/${negocioId}/pagos`);
        // Por ahora, el frontend usará router.refresh() después de una respuesta exitosa.

        const parsedConfig = NegocioConfiguracionPagoSchema.parse(updatedConfig); // Validar la salida

        return { success: true, data: parsedConfig };

    } catch (error) {
        console.error('Error en actualizarOpcionesPagoAction:', error);
        let errorMessage = 'No se pudo actualizar la configuración de opciones de pago.';
        if (error instanceof Error) {
            errorMessage = error.message;
        }
        return { success: false, error: errorMessage };
    }
}
