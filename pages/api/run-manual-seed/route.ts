
import type { NextApiRequest, NextApiResponse } from 'next';
import { PrismaClient } from '@prisma/client'; // Asegúrate de que PrismaClient se importe correctamente

const prisma = new PrismaClient();

// IDs que ya tienes de tu CRM y Asistente Virtual existentes
const EXISTING_CRM_ID = 'cm9x2nnb80001gupd0536gg5h';
const EXISTING_ASISTENTE_VIRTUAL_ID = 'cma4f5zho0009guj0fnv019t1';

type SeedDataResult = {
    message: string;
    leadsCreados?: { id: string; nombre: string }[];
    conversacionesCreadas?: { id: string; leadNombre: string | null }[];
    error?: string;
    details?: unknown;
};

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<SeedDataResult>
) {
    // Solo permitir el método GET para esta ruta de sembrado
    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ message: `Method ${req.method} Not Allowed` });
    }

    // (Opcional pero recomendado) Solo permitir en entorno de desarrollo
    if (process.env.NODE_ENV !== 'development') {
        console.warn("Intento de acceso a ruta de sembrado en entorno no desarrollo.");
        return res.status(403).json({ message: 'Acceso denegado.', error: 'Esta ruta solo está disponible en desarrollo.' });
    }

    console.log("Solicitud GET recibida en /api/seed-conversations");

    try {
        console.log(`Iniciando sembrado de conversaciones para CRM: ${EXISTING_CRM_ID} y Asistente: ${EXISTING_ASISTENTE_VIRTUAL_ID}`);

        // Verificar que los IDs no estén vacíos
        if (!EXISTING_CRM_ID || !EXISTING_ASISTENTE_VIRTUAL_ID) {
            const errorMsg = 'Error de configuración: CRM_ID y ASISTENTE_VIRTUAL_ID deben estar definidos en la API.';
            console.error(errorMsg);
            return res.status(500).json({ message: 'Error interno del servidor.', error: errorMsg });
        }

        // Verificar existencia de CRM y Asistente (opcional, pero buena práctica)
        const crmExists = await prisma.cRM.findUnique({ where: { id: EXISTING_CRM_ID } });
        if (!crmExists) {
            return res.status(404).json({ message: 'CRM no encontrado.', error: `CRM con ID ${EXISTING_CRM_ID} no encontrado.` });
        }
        const asistenteExists = await prisma.asistenteVirtual.findUnique({ where: { id: EXISTING_ASISTENTE_VIRTUAL_ID } });
        if (!asistenteExists) {
            return res.status(404).json({ message: 'AsistenteVirtual no encontrado.', error: `AsistenteVirtual con ID ${EXISTING_ASISTENTE_VIRTUAL_ID} no encontrado.` });
        }
        console.log(`CRM y Asistente Virtual encontrados. Procediendo con el sembrado...`);

        // 1. Crear Leads
        const leadAna = await prisma.lead.create({
            data: {
                crmId: EXISTING_CRM_ID,
                nombre: 'Ana Pérez (API Seed)',
                email: 'ana.perez.apiseed@example.com', // Email único para evitar conflictos
                telefono: '5533445566',
                status: 'nuevo',
            },
        });

        const leadLuis = await prisma.lead.create({
            data: {
                crmId: EXISTING_CRM_ID,
                nombre: 'Luis García (API Seed)',
                email: 'luis.garcia.apiseed@example.com', // Email único
                telefono: '5577889900',
                status: 'contactado',
            },
        });
        console.log(`Leads creados: Ana (ID: ${leadAna.id}), Luis (ID: ${leadLuis.id})`);

        // 2. Crear Conversaciones e Interacciones
        const conversacionAna = await prisma.conversacion.create({
            data: {
                leadId: leadAna.id,
                asistenteVirtualId: EXISTING_ASISTENTE_VIRTUAL_ID,
                status: 'abierta',
                intencion: 'Consulta de producto (API Seed)',
            },
        });

        await prisma.interaccion.createMany({
            data: [
                { conversacionId: conversacionAna.id, role: 'user', mensaje: 'Hola, ¿info del plan premium? (API Seed)', createdAt: new Date(Date.now() - 10 * 60 * 1000) },
                { conversacionId: conversacionAna.id, role: 'assistant', mensaje: '¡Hola Ana! El plan premium ofrece... (API Seed)', createdAt: new Date(Date.now() - 9 * 60 * 1000) },
                { conversacionId: conversacionAna.id, role: 'user', mensaje: '¿Costo y cómo me suscribo? (API Seed)', createdAt: new Date(Date.now() - 8 * 60 * 1000) },
                { conversacionId: conversacionAna.id, role: 'agent', mensaje: 'Ana, soy David. El costo es $X. (API Seed)', createdAt: new Date(Date.now() - 7 * 60 * 1000) },
            ],
        });
        console.log(`Conversación e interacciones para Ana creadas.`);

        const conversacionLuis = await prisma.conversacion.create({
            data: {
                leadId: leadLuis.id,
                asistenteVirtualId: EXISTING_ASISTENTE_VIRTUAL_ID,
                status: 'en_espera_agente',
                intencion: 'Soporte técnico (API Seed)',
            },
        });

        await prisma.interaccion.createMany({
            data: [
                { conversacionId: conversacionLuis.id, role: 'user', mensaje: 'Problema con mi config. (API Seed)', createdAt: new Date(Date.now() - 5 * 60 * 1000) },
                { conversacionId: conversacionLuis.id, role: 'assistant', mensaje: 'Entendido Luis, ¿puedes detallar? (API Seed)', createdAt: new Date(Date.now() - 4 * 60 * 1000) },
                { conversacionId: conversacionLuis.id, role: 'user', mensaje: 'No guarda tarea X. (API Seed)', createdAt: new Date(Date.now() - 3 * 60 * 1000) },
                { conversacionId: conversacionLuis.id, role: 'assistant', mensaje: 'Un momento, te conecto con un agente. (API Seed)', createdAt: new Date(Date.now() - 2 * 60 * 1000) },
            ],
        });
        console.log(`Conversación e interacciones para Luis creadas.`);

        const resultado: SeedDataResult = {
            message: "Sembrado de conversaciones ejecutado con éxito desde API.",
            leadsCreados: [
                { id: leadAna.id, nombre: leadAna.nombre },
                { id: leadLuis.id, nombre: leadLuis.nombre },
            ],
            conversacionesCreadas: [
                { id: conversacionAna.id, leadNombre: leadAna.nombre },
                { id: conversacionLuis.id, leadNombre: leadLuis.nombre },
            ],
        };
        return res.status(200).json(resultado);

    } catch (error) {
        console.error("Error durante el sembrado vía API:", error);
        const errorMessage = "Error interno del servidor al ejecutar el sembrado.";
        if (error instanceof Error) {
            // Podrías ser más específico en desarrollo
            // errorMessage = process.env.NODE_ENV === 'development' ? error.message : errorMessage;
        }
        return res.status(500).json({ message: "Error interno del servidor al ejecutar el sembrado.", error: errorMessage, details: error });
    } finally {
        await prisma.$disconnect();
        console.log("Cliente Prisma desconectado de la API de sembrado.");
    }
}
