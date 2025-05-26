// pages/api/test/send-test-email.ts
import type { NextApiRequest, NextApiResponse } from 'next';
import { enviarCorreoConfirmacionPagoAction } from '@/app/admin/_lib/actions/email/email.actions'; // Ajusta la ruta
import type { EnviarConfirmacionPagoInput } from '@/app/admin/_lib/actions/email/email.schemas';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'GET') {
        return res.status(405).end(); // Method Not Allowed
    }

    // Solo en desarrollo
    if (process.env.NODE_ENV !== 'development') {
        return res.status(403).json({ message: 'Solo para desarrollo.' });
    }

    const testEmailData: EnviarConfirmacionPagoInput = {
        emailComprador: 'ing.israel.wong@gmail.com', // ¡CAMBIA ESTO!
        nombreComprador: 'Usuario de Prueba',
        nombreNegocio: 'ProSocial',
        logoNegocioUrl: null, // o una URL de placeholder
        emailRespuestaNegocio: 'contacto@prosocial.mx',//email negocio
        conceptoPrincipal: 'Test: Compra de Producto de Prueba',
        montoPagado: 99.99,
        moneda: 'MXN',
        idTransaccionStripe: 'pi_test_desde_api_route',
        linkDetallesPedidoEnVitrina: null,
    };

    try {
        const result = await enviarCorreoConfirmacionPagoAction(testEmailData);
        if (result.success) {
            res.status(200).json({ message: 'Correo de prueba enviado con éxito.', data: result.data });
        } else {
            res.status(500).json({ message: 'Error al enviar correo de prueba.', error: result.error, details: result.errorDetails });
        }
    } catch (error) {
        console.error("Error catastrófico enviando email de prueba:", error);
        res.status(500).json({ message: 'Error interno del servidor.' });
    }
}