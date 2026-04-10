"use server";

import prisma from "@/app/admin/_lib/prismaClient";
import { revalidatePath } from "next/cache";
import { z } from 'zod';
import type { ActionResult } from "@/app/admin/_lib/types";
import { CanalAdquisicion } from '@prisma/client'; // Importar el tipo

// El schema ahora espera crmId
const UpsertCanalSchema = z.object({
    nombre: z.string().min(2, "El nombre debe tener al menos 2 caracteres."),
    crmId: z.string().cuid(),
});

// La función ahora busca por crmId
export async function obtenerCanalesPorCrmAction(crmId: string) {
    // console.log("--- [obtenerCanalesPorCrmAction] Buscando canales para CRM ID:", crmId);
    if (!crmId) return { success: false, error: "CRM no encontrado" };

    try {
        const canales = await prisma.canalAdquisicion.findMany({
            where: { crmId: crmId },
            orderBy: { nombre: 'asc' },
        });
        return { success: true, data: canales };
    } catch {
        return { success: false, error: "No se pudieron obtener los canales." };
    }
}

// La acción ahora recibe y usa crmId
export async function upsertCanalAction(data: { id?: string, nombre: string, crmId: string }): Promise<ActionResult<CanalAdquisicion>> {
    const validation = UpsertCanalSchema.safeParse(data);
    if (!validation.success) return { success: false, error: "Datos inválidos." };

    try {
        const canalUpserted = await prisma.canalAdquisicion.upsert({
            where: { id: data.id || '' },
            create: {
                nombre: data.nombre,
                crmId: data.crmId,
            },
            update: {
                nombre: data.nombre,
            }
        });

        revalidatePath('/admin/configuracion/canales'); // Ajusta la ruta si es necesario
        return { success: true, data: canalUpserted };
    } catch {
        return { success: false, error: "No se pudo guardar el canal." };
    }
}

// La acción de eliminar no cambia, pero la de revalidación sí podría si la ruta depende del crmId/negocioId
export async function eliminarCanalAction(id: string): Promise<ActionResult<void>> {
    try {
        await prisma.canalAdquisicion.delete({ where: { id } });
        revalidatePath('/admin/configuracion/canales'); // Ajusta la ruta si es necesario
        return { success: true };
    } catch {
        return { success: false, error: "No se pudo eliminar el canal." };
    }
}