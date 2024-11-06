'use server';
import { PrismaClient } from "@prisma/client";
import { Servicio } from "./Types";
const prisma = new PrismaClient();

export async function obtenerServicios() {
    return await prisma.servicio.findMany();
}

export async function crearServicio(servicio: Servicio) {
    try {
        const nuevoServicio = await prisma.servicio.create({
            data: {
                nombre: servicio.nombre,
                descripcion: servicio.descripcion,
                precio: servicio.precio,
                cuota_mensual: servicio.cuota_mensual,
                cuota_anual: servicio.cuota_anual,
                status: servicio.status
            }
        });
        return { success: true, data: nuevoServicio, message: 'Servicio creado correctamente' };
    } catch (error: unknown) {
        return { success: false, data: null, message: (error as Error).message };
    }
}

export async function actualizarServicio(servicio: Servicio) {
    try {
        const servicioActualizado = await prisma.servicio.update({
            where: { id: servicio.id },
            data: {
                nombre: servicio.nombre,
                descripcion: servicio.descripcion,
                precio: servicio.precio,
                cuota_mensual: servicio.cuota_mensual,
                cuota_anual: servicio.cuota_anual,
                status: servicio.status
            }
        });
        return { success: true, data: servicioActualizado, message: 'Servicio actualizado correctamente' };
    } catch (error: unknown) {
        return { success: false, data: null, message: (error as Error).message };
    }
}

export async function obtenerServicio(id: string) {
    return await prisma.servicio.findUnique({
        where: { id }
    });
}

export async function eliminarServicio(id: string) {
    try {
        await prisma.servicio.delete({
            where: { id }
        });
        return { success: true, message: 'Servicio eliminado correctamente' };
    } catch (error: unknown) {
        return { success: false, message: (error as Error).message };
    }
}