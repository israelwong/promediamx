// /pages/api/whatsapp/verify-test.ts

import type { NextApiRequest, NextApiResponse } from 'next';

export default function handler(req: NextApiRequest, res: NextApiResponse) {

    // Solo nos interesa el método GET para esta prueba
    if (req.method === "GET") {
        console.log("--- INICIANDO PRUEBA DE VERIFICACIÓN AISLADA ---");

        // Leemos los parámetros que Meta debería enviar
        const mode = req.query["hub.mode"];
        const token = req.query["hub.verify_token"];
        const challenge = req.query["hub.challenge"];

        // Leemos la variable de entorno desde Vercel
        const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN;

        // Logueamos TODO para tener máxima visibilidad
        console.log(`[VERIFY-TEST] Modo recibido: ${mode}`);
        console.log(`[VERIFY-TEST] Token recibido de Meta: ${token}`);
        console.log(`[VERIFY-TEST] Challenge recibido: ${challenge}`);
        console.log(`[VERIFY-TEST] Token esperado de Vercel ENV: ${expectedToken}`);

        if (mode === "subscribe" && token === expectedToken) {
            console.log("[VERIFY-TEST] ¡ÉXITO! Los tokens coinciden. Respondiendo challenge.");
            res.status(200).send(challenge);
        } else {
            console.error("[VERIFY-TEST] ¡FALLO! Los tokens NO coinciden o falta el modo.");
            res.status(403).send("Verificación fallida desde el endpoint de prueba.");
        }
        return;
    }

    // Para cualquier otra cosa, solo respondemos que el endpoint existe.
    res.status(200).send("Endpoint de prueba de verificación está activo. Use GET para verificar.");
}
