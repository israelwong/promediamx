import React from 'react';
import { getAssistantConfigByBusinessId, createAsistenteWithDefaultName } from '@/app/admin/_lib/actions/asistente/asistenteWhatsAppConfig.actions';
import prisma from '@/app/admin/_lib/prismaClient';

import { AsistenteWhatsAppConfig } from './components/AsistenteWhatsAppConfig';
import { AlertCircle } from 'lucide-react';

interface PageProps {
    clienteId: string;
    negocioId: string;
}

// Este es un Server Component que orquesta la lógica
export default async function AsistentePage({ params }: { params: Promise<PageProps> }) {
    const { clienteId, negocioId } = await params;

    // 1. Intentamos obtener la configuración del asistente.
    let asistenteConfig = await getAssistantConfigByBusinessId(negocioId);

    // 2. Si no existe, lo creamos.
    if (!asistenteConfig) {
        const negocio = await prisma.negocio.findUnique({
            where: { id: negocioId },
            select: { nombre: true }
        });

        if (!negocio || !negocio.nombre) {
            return (
                <div className="m-auto flex flex-col items-center gap-4 p-8 text-red-400">
                    <AlertCircle size={48} />
                    <h1 className="text-xl font-bold">Error Crítico</h1>
                    <p>No se encontró el negocio o no tiene un nombre asignado.</p>
                </div>
            );
        }

        console.log(`Asistente no encontrado para el negocio ${negocio.nombre}. Creando uno nuevo...`);
        asistenteConfig = await createAsistenteWithDefaultName(negocioId, negocio.nombre);
    }

    if (!asistenteConfig) {
        return (
            <div className="m-auto flex flex-col items-center gap-4 p-8 text-red-400">
                <AlertCircle size={48} />
                <h1 className="text-xl font-bold">Error de Asistente</h1>
                <p>Hubo un problema al crear o cargar el asistente. Intente recargar la página.</p>
            </div>
        );
    }

    // 3. Renderizamos el componente de configuración con los props correctos.
    return (
        <div className="container mx-auto">
            <AsistenteWhatsAppConfig
                clienteId={clienteId}
                negocioId={negocioId}
                asistenteId={asistenteConfig.id}
                asistenteConfig={asistenteConfig}
            />
        </div>
    );
}
