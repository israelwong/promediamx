import { PrismaClient } from '@prisma/client';
import { NextApiRequest, NextApiResponse } from 'next';

const prisma = new PrismaClient();

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method Not Allowed' });
    }

    const { nombre, empresa, telefono, email, asunto, negocioId } = req.body;

    try {
        const newLead = await prisma.lead.create({
            data: {
                nombre,
                negocioId,
                telefono,
                email,
                asunto,
                empresa,
                etapaId: 'cm6zhg6cj0003gumu3mu5swc7',
                canalId: 'cm6zhgzow0004gumu32pz0q95'
            },
        });
        res.status(201).json(newLead);
    } catch (error: unknown) {
        if ((error as { code?: string }).code === 'P2002') {
            res.status(400).json({ error: 'Duplicate entry' });
        } else {
            res.status(500).json({ error: 'An unexpected error occurred' });
        }
    }
}