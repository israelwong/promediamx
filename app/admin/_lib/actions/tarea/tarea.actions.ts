'use server';

import { z } from 'zod'; // Asegúrate de tener zod instalado

import prisma from '@/app/admin/_lib/prismaClient'; // Ajusta la ruta si es diferente
import type { ActionResult } from '@/app/admin/_lib/types';
import {
    TareaBaseInfoData,
    tareaBaseInfoSchema,
    tareaParaMarketplaceSchema,
    TareaParaMarketplaceData
} from './tarea.schemas';

// Acción para obtener las tareas marcadas como "por defecto" y activas
export async function obtenerTareasBaseAction(): Promise<ActionResult<TareaBaseInfoData[]>> {
    try {
        const tareasPrisma = await prisma.tarea.findMany({
            where: {
                esTareaPorDefecto: true, // Usamos el nuevo campo
                status: 'activo'
            },
            select: {
                id: true,
                nombre: true,
                descripcion: true
            },
            orderBy: {
                orden: 'asc' // O por nombre, o como prefieras
            }
        });

        // Validar cada tarea con el schema (opcional pero buena práctica)
        const parsedTareas = z.array(tareaBaseInfoSchema).safeParse(tareasPrisma);
        if (!parsedTareas.success) {
            console.error("Error de validación en obtenerTareasBaseAction:", parsedTareas.error.flatten());
            return { success: false, error: "Error al procesar los datos de las tareas base." };
        }

        return { success: true, data: parsedTareas.data };
    } catch (error) {
        console.error("Error en obtenerTareasBaseAction:", error);
        return { success: false, error: "No se pudieron obtener las tareas base." };
    }
}


export async function obtenerTareasParaMarketplaceAction(
    // Opcional: asistenteId para saber si ya está suscrito (más complejo, hacerlo en un segundo paso si es necesario)
    // asistenteId?: string 
): Promise<ActionResult<TareaParaMarketplaceData[]>> {
    try {
        const tareasPrisma = await prisma.tarea.findMany({
            where: {
                status: 'activo' // Solo mostrar tareas activas en el marketplace
            },
            select: {
                id: true,
                nombre: true,
                descripcion: true,
                precio: true,
                categoriaTareaId: true,
                CategoriaTarea: {
                    select: { nombre: true, /* color: true */ } // Añadir color si CategoriaTarea lo tiene y el schema lo espera
                },
                etiquetas: {
                    select: {
                        etiquetaTarea: {
                            select: { id: true, nombre: true }
                        }
                    }
                },
                _count: {
                    select: {
                        AsistenteTareaSuscripcion: { where: { status: 'activo' } }, // Contar solo suscripciones activas
                        TareaGaleria: true
                    }
                }
                // Seleccionar otros campos que TareaParaMarketplaceDataSchema espere (ej. iconoUrl, status, esTareaPorDefecto)
            },
            orderBy: [
                { orden: 'asc' },
                { nombre: 'asc' }
            ]
        });

        // Mapear para asegurar que la estructura coincida exactamente con TareaParaMarketplaceDataSchema
        // y manejar posibles nulos de relaciones.
        const tareasData = tareasPrisma.map(t => ({
            id: t.id,
            nombre: t.nombre,
            descripcion: t.descripcion ?? null,
            precio: t.precio ?? null,
            categoriaTareaId: t.categoriaTareaId ?? null,
            CategoriaTarea: t.CategoriaTarea ? { nombre: t.CategoriaTarea.nombre } : null,
            etiquetas: t.etiquetas.map(et => ({
                etiquetaTarea: et.etiquetaTarea ? { id: et.etiquetaTarea.id, nombre: et.etiquetaTarea.nombre } : null
            })).filter(et => et.etiquetaTarea !== null) as { etiquetaTarea: { id: string; nombre: string; } }[], // Filtrar nulos y asegurar tipo
            _count: {
                AsistenteTareaSuscripcion: t._count.AsistenteTareaSuscripcion,
                TareaGaleria: t._count.TareaGaleria
            }
        }));

        const validation = z.array(tareaParaMarketplaceSchema).safeParse(tareasData);
        if (!validation.success) {
            console.error("Error de validación Zod en obtenerTareasParaMarketplaceAction:", validation.error.flatten());
            return { success: false, error: "Datos de tareas con formato inesperado." };
        }
        return { success: true, data: validation.data };

    } catch (error) {
        console.error("Error en obtenerTareasParaMarketplaceAction:", error);
        return { success: false, error: "No se pudieron obtener las tareas para el marketplace." };
    }
}