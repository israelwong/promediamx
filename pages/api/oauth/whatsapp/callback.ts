// pages/api/oauth/whatsapp/callback.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { procesarCallbackMetaOAuth } from '@/app/admin/_lib/actions/asistenteVirtual/asistenteWhatsAppConfig.actions';
import { WhatsAppOAuthStateSchema } from '@/app/admin/_lib/actions/asistenteVirtual/asistenteWhatsAppConfig.schemas'; // Para parsear el state

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).end(`Method ${req.method} Not Allowed`);
    }

    const { code, state, error: errorMeta, error_reason: errorReasonMeta, error_description: errorDescriptionMeta } = req.query;

    const appBaseUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3001'; // Asegúrate que esta variable esté bien configurada

    // Intentar decodificar el state para obtener IDs para una redirección más precisa
    let asistenteIdFromState: string | undefined;
    let negocioIdFromState: string | undefined;
    let clientIdFromState: string | undefined; // Ahora lo obtendremos del state

    if (typeof state === 'string' && state) {
        try {
            const decodedStateString = Buffer.from(state, 'base64url').toString('utf-8');
            // Parsear el state usando el schema que ahora incluye clienteId
            const parsedState = WhatsAppOAuthStateSchema.safeParse(JSON.parse(decodedStateString));
            if (parsedState.success) {
                asistenteIdFromState = parsedState.data.asistenteId;
                negocioIdFromState = parsedState.data.negocioId;
                clientIdFromState = parsedState.data.clienteId; // <--- OBTENIDO DEL STATE
            } else {
                // Si el parseo falla, loguear el error específico de Zod
                console.warn("Callback de Meta: No se pudo parsear el 'state' con Zod:", parsedState.error.flatten());
            }
        } catch (e) {
            // Error al decodificar o parsear JSON antes de Zod
            console.warn("Callback de Meta: Error al decodificar o parsear JSON del 'state' inicial:", e);
        }
    }

    const fallbackErrorRedirectPath = '/admin/dashboard'; // Ruta genérica si no se pueden determinar los IDs del state
    let errorRedirectPath = fallbackErrorRedirectPath;

    // Construir la ruta de error específica si tenemos todos los IDs del state
    if (clientIdFromState && negocioIdFromState && asistenteIdFromState) {
        errorRedirectPath = `/admin/clientes/${clientIdFromState}/negocios/${negocioIdFromState}/asistente/`;
    }

    if (errorMeta) {
        console.error(`Error en callback de Meta: ${errorMeta} - ${errorReasonMeta} - ${errorDescriptionMeta}`);
        const errorRedirectUrl = new URL(errorRedirectPath, appBaseUrl);
        errorRedirectUrl.searchParams.set('whatsapp_status', 'error_meta');
        errorRedirectUrl.searchParams.set('whatsapp_error', typeof errorMeta === 'string' ? errorMeta : 'unknown_meta_error');
        errorRedirectUrl.searchParams.set('whatsapp_error_description', typeof errorDescriptionMeta === 'string' ? errorDescriptionMeta : 'Error desconocido de Meta durante la autorización.');
        return res.redirect(errorRedirectUrl.toString()).end();
    }

    if (typeof code !== 'string' || !code || typeof state !== 'string' || !state) {
        console.error("Callback de Meta: Faltan parámetros 'code' o 'state'.");
        const missingParamsErrorUrl = new URL(errorRedirectPath, appBaseUrl); // Usa el errorRedirectPath que ya tiene los IDs si es posible
        missingParamsErrorUrl.searchParams.set('whatsapp_status', 'error_callback');
        missingParamsErrorUrl.searchParams.set('whatsapp_error', 'missing_params');
        missingParamsErrorUrl.searchParams.set('whatsapp_error_description', 'Faltan parámetros requeridos en el callback de Meta.');
        return res.redirect(missingParamsErrorUrl.toString()).end();
    }

    // Llamar a la función que procesa el callback
    const result = await procesarCallbackMetaOAuth({ code, state });

    let finalRedirectPath = fallbackErrorRedirectPath; // Fallback

    if (result.success && result.data) {
        // result.data debería contener asistenteId y negocioId
        // Usamos clientIdFromState que obtuvimos al inicio del handler
        if (clientIdFromState && result.data.negocioId && result.data.asistenteId) {
            finalRedirectPath = `/admin/clientes/${clientIdFromState}/negocios/${result.data.negocioId}/asistente/`;
        } else {
            // Si por alguna razón no tenemos clientIdFromState aquí pero el result fue exitoso,
            // es una situación extraña. Podríamos intentar obtenerlo de result.data si lo devolviera procesarCallbackMetaOAuth.
            // Por ahora, si falta, se irá al dashboard.
            console.warn("Callback de Meta: Éxito en procesamiento, pero falta clientIdFromState para la redirección específica.");
        }

        const successRedirectUrl = new URL(finalRedirectPath, appBaseUrl);
        successRedirectUrl.searchParams.set('whatsapp_status', 'success');
        successRedirectUrl.searchParams.set('message', 'Conexión con WhatsApp configurada exitosamente.');
        return res.redirect(successRedirectUrl.toString()).end();

    } else {
        // Error durante el procesamiento de procesarCallbackMetaOAuth
        // Usar los IDs del state (clienteIdFromState, negocioIdFromState, asistenteIdFromState)
        // si están disponibles para redirigir a la página del asistente.
        // errorRedirectPath ya está configurado con estos valores si existen.

        const processErrorRedirectUrl = new URL(errorRedirectPath, appBaseUrl);
        processErrorRedirectUrl.searchParams.set('whatsapp_status', 'error_processing');
        processErrorRedirectUrl.searchParams.set('whatsapp_error', 'processing_failed');
        processErrorRedirectUrl.searchParams.set('whatsapp_error_description', result.error || 'Error desconocido al procesar la conexión con WhatsApp.');
        return res.redirect(processErrorRedirectUrl.toString()).end();
    }
}
