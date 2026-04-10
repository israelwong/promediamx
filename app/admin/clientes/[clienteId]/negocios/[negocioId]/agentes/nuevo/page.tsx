import prisma from "@/app/admin/_lib/prismaClient";
import { notFound } from "next/navigation";
import CrearAgenteForm from "./components/CrearAgenteForm";
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: "Crear Nuevo Agente - Promedia",
    description: "Añade un nuevo agente al negocio.",
};

interface PaginaCrearAgenteProps {
    clienteId: string;
    negocioId: string;
}

export default async function PaginaCrearAgente({ params }: { params: Promise<PaginaCrearAgenteProps> }) {

    // --- CORRECCIÓN: "Resolvemos" la Promise de los params con await ---
    const { clienteId, negocioId } = await params;

    const crm = await prisma.cRM.findUnique({
        where: { negocioId: negocioId },
        select: { id: true }
    });

    if (!crm) {
        notFound();
    }

    return (
        <div className="p-4 sm:p-6 md:p-8">
            <CrearAgenteForm
                crmId={crm.id}
                clienteId={clienteId}
                negocioId={negocioId}
            />
        </div>
    );
}