

import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { revalidatePath } from 'next/cache';

export async function actualizarEtapaDeLeadAction(params: { leadId: string; nuevaEtapaId: string; }): Promise<ActionResult<boolean>> {
    const { leadId, nuevaEtapaId } = params;

    try {
        await prisma.lead.update({
            where: { id: leadId },
            data: {
                pipelineId: nuevaEtapaId,
                // También actualizamos la fecha de 'updatedAt' automáticamente
            },
        });

        // Revalidamos la ruta del kanban del agente para que todos los que lo vean
        // (si hubiera concurrencia) tengan la información actualizada.
        revalidatePath("/agente/kanban");

        return { success: true };
    } catch (error) {
        console.error("Error al actualizar la etapa del lead:", error);
        return { success: false, error: "No se pudo actualizar la etapa del lead." };
    }
}