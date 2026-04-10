import { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        try {
            const { phone, first_name, email, last_wa_interaction } = req.query;

            if (!phone || !first_name || !email) {
                return res.status(400).json({ message: 'Faltan parámetros obligatorios (phone, first_name, email).' });
            }

            // Convertir last_wa_interaction a JSON si es necesario
            let jsonParams = null;
            if (last_wa_interaction) {
                try {
                    jsonParams = JSON.parse(last_wa_interaction as string);
                } catch (error) {
                    console.error('Error al parsear last_wa_interaction:', error);
                    jsonParams = { raw: last_wa_interaction }; // Guardar como string si falla el parseo
                }
            }

            // Aquí debes definir cómo obtendrás el pilelineId.
            // Podría ser un valor estático, consultado de otra fuente, o enviado también como parámetro.

            const leadData = {
                canalId: 'cm8ouqbw30000guy30rle2v6i',//WhatsApp
                nombre: first_name as string,
                email: email as string,
                telefono: (phone as string).slice(-10), // Extract the last 10 digits
                jsonParams: jsonParams,
                pilelineId: 'cm8ourlfy0001guy344s5xw36',
            };

            console.log('Datos del lead:', leadData);

            const newLead = await prisma.lead.create({
                data: leadData,
            });

            console.log('Lead guardado:', newLead);
            return res.status(200).json({ message: 'Lead guardado exitosamente.', leadId: newLead.id });
            // return res.status(200).json({ message: 'Datos del lead recibidos correctamente.' });
        } catch (error) {
            console.error('Error al guardar el lead:', error);
            return res.status(500).json({ message: 'Error al guardar el lead en la base de datos.' });
        } finally {
            await prisma.$disconnect();
        }
    } else {
        return res.status(405).json({ message: 'Método no permitido. Solo se aceptan peticiones POST.' });
    }
}