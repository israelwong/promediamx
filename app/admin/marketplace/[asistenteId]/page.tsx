import React from 'react'
import { Metadata } from 'next'
import MarketplaceLista from '../componentes/MarketplaceLista'
import prisma from '@/app/admin/_lib/prismaClient'

export const metadata: Metadata = {
    title: 'Marketplace de tareas',
}

export default async function page({ params }: { params: Promise<{ asistenteId: string }> }) {
    const { asistenteId } = await params

    // Ejemplo de cómo obtener el contexto:
    const asistenteConContexto = await prisma.asistenteVirtual.findUnique({
        where: { id: asistenteId },
        select: {
            negocioId: true,
            // Asumiendo que AsistenteVirtual tiene clienteId directamente o a través de Negocio
            clienteId: true, // O: negocio: { select: { clienteId: true } }
        }
    });

    const negocioId = asistenteConContexto?.negocioId;
    const clienteId = asistenteConContexto?.clienteId;


    return (
        <div>
            <MarketplaceLista
                asistenteId={asistenteId}
                negocioId={negocioId ?? undefined}
                clienteId={clienteId ?? undefined}
            />
        </div>
    )
}
