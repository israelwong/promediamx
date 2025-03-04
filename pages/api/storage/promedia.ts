import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method === 'POST') {
        const { processedData } = req.body;


        // console.log('Datos recibidos ProMedia:', processedData);

        // **Definir los campos estándar**
        const standardFields = ["nombre", "email", "telefono", "canalAdquisicionId", "clienteId"];

        // **Separar datos estándar de datos personalizados**
        const leadData: Record<string, string> = {};
        const customFields: Record<string, string> = {};

        processedData.forEach((field: { name: string; value: string }) => {
            if (standardFields.includes(field.name)) {
                leadData[field.name] = field.value;
            } else {
                customFields[field.name] = field.value; // Almacenar los campos personalizados
            }
        });

        console.log('Datos estándar:', leadData);
        console.log('Datos personalizados:', customFields);

        try {
            await prisma.lead.create({
                data: {
                    nombre: leadData.nombre || null,
                    email: leadData.email || null,
                    telefono: leadData.telefono || null,
                    clienteId: leadData.clienteId || null,
                    json: JSON.stringify(customFields), // Convert customFields to JSON string
                    canalAdquisicionId: leadData.canalAdquisicionId || '',
                    etapaLeadId: 'cm7nx2rsi0001gubfxk4zatfa',
                },
            });
            console.log('Datos guardados en la tabla lead promedia');
            // Responder con éxito
            res.status(200).json({ message: 'Datos recibidos correctamente' });
        } catch (error) {
            console.error('Error al guardar en la tabla lead:', error);
            res.status(500).json({ error: 'Error al guardar en la tabla lead' });
        } finally {
            await prisma.$disconnect();
        }
    } else {
        res.status(405).send('Method Not Allowed');
    }
}
