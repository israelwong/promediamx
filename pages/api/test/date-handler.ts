// Ruta: /pages/api/test/date-handler.ts

import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { combineDateAndTime } from '@/app/admin/_lib/helpers/date.helpers';

// Esquema para validar el cuerpo de la petición de prueba
const testSchema = z.object({
    fechaCita: z.string().datetime("Debe ser un string en formato ISO 8601"),
    horaCita: z.string().regex(/^([01]\d|2[0-3]):00$/, "Debe ser en formato HH:00"),
});

export default function handler(req: NextApiRequest, res: NextApiResponse) {
    // Habilitamos CORS para pruebas locales
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access--Control-Allow-Headers', 'Content-Type');

    if (req.method === 'OPTIONS') {
        return res.status(200).end();
    }
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Método no permitido' });
    }

    console.log("\n--- ENDPOINT DE PRUEBA DE FECHA ---");
    console.log("A. Body crudo recibido:", req.body);

    const validation = testSchema.safeParse(req.body);
    if (!validation.success) {
        console.log("B. Falló la validación de Zod:", validation.error.flatten());
        return res.status(400).json({ error: "Datos inválidos", details: validation.error.flatten() });
    }
    console.log("B. Datos validados por Zod:", validation.data);

    const { fechaCita, horaCita } = validation.data;

    // ✅ CORREGIDO: Se elimina la conversión innecesaria a objeto 'Date'.
    // Ahora pasamos el 'fechaCita' (que ya es un string) directamente a la librería.
    const finalDate = combineDateAndTime(fechaCita, horaCita);
    console.log("D. Resultado final de la librería:", finalDate.toISOString());

    // Devolvemos una respuesta estructurada para verificar los resultados
    res.status(200).json({
        message: "Prueba de fecha procesada.",
        input: {
            fechaString: fechaCita,
            horaString: horaCita,
        },
        output: {
            finalDate_ISO_UTC: finalDate.toISOString(),
            finalDate_Formatted_es_MX: format(finalDate, "EEEE, d 'de' MMMM, yyyy 'a las' h:mm a", { locale: es }),
        }
    });
}
