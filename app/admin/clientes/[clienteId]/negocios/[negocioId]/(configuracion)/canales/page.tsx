import { obtenerCanalesPorCrmAction } from "@/app/admin/_lib/actions/canales/canales.actions"; // Se cambia el nombre de la acción
import prisma from "@/app/admin/_lib/prismaClient";
import CanalesManager from "./components/CanalesManager";

import { Metadata } from 'next';
export const metadata: Metadata = {
    title: "Canales de Adquisición",
    description: "Gestiona los canales de adquisición para tu CRM.",
};

interface CanalesPageProps {
    params: { negocioId: string; }
}

export default async function ConfiguracionPage({ params }: { params: Promise<CanalesPageProps["params"]> }) {
    const resolvedParams = await params;
    const { negocioId } = resolvedParams;

    const crm = await prisma.cRM.findUnique({ where: { negocioId }, select: { id: true } });
    if (!crm) return <div>CRM no encontrado para este negocio.</div>;

    const result = await obtenerCanalesPorCrmAction(crm.id);
    if (!result.success) return <div>Error: {result.error}</div>;

    return (
        <div className="p-8">
            <h1 className="text-3xl font-bold mb-6">Canales de Adquisición</h1>
            <CanalesManager initialCanales={result.data || []} crmId={crm.id} />
        </div>
    );
}
