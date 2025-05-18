// En: app/admin/_lib/actions/categoriaTarea/categoriaTarea.actions.ts
'use server';
import { z } from 'zod';
import prisma from '@/app/admin/_lib/prismaClient';
import type { ActionResult } from '@/app/admin/_lib/types';
import { CategoriaTareaData, categoriaTareaDataSchema } from './categoriaTarea.schemas';

export async function obtenerCategoriasAction(): Promise<ActionResult<CategoriaTareaData[]>> {
    try {
        const categoriasPrisma = await prisma.categoriaTarea.findMany({
            orderBy: { orden: 'asc' },
            select: { id: true, nombre: true, descripcion: true, orden: true, color: true }
        });

        const validation = z.array(categoriaTareaDataSchema).safeParse(categoriasPrisma);
        if (!validation.success) {
            console.error("Error de validación Zod en obtenerCategoriasAction:", validation.error.flatten());
            return { success: false, error: "Datos de categorías con formato inesperado." };
        }
        return { success: true, data: validation.data };
    } catch (error) {
        console.error('Error en obtenerCategoriasAction:', error);
        return { success: false, error: "No se pudieron obtener las categorías." };
    }
}

// ... (Otras actions de CategoriaTarea que ya tienes o migrarás: crear, actualizar, etc.)