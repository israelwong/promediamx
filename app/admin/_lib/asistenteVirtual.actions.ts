'use server'
import prisma from './prismaClient'
import { AsistenteVirtual, Negocio, Cliente } from './types'

export async function obtenerAsistentesVirtuales() {
    const asistentes = await prisma.asistenteVirtual.findMany({
        select: {
            id: true,
            urlImagen: true,
            nombre: true,
            descripcion: true,
            origen: true,
            whatsappBusiness: true,
            phoneNumberId: true,
            token: true,
            nombreHITL: true,
            whatsappHITL: true,
            emailHITL: true,
            emailCalendario: true,
            version: true,
            status: true,
            createdAt: true,
            updatedAt: true
        }
    })
    return asistentes
}

export async function obtenerAsistenteVirtualPorId(asistenteVirtualId: string): Promise<AsistenteVirtual | null> {
    try {
        const asistente = await prisma.asistenteVirtual.findUnique({
            where: {
                id: asistenteVirtualId
            },
            include: {
                negocio: { // Incluir Negocio
                    select: { // Seleccionar campos necesarios de Negocio
                        id: true,
                        nombre: true,
                        // ... otros campos de Negocio si los necesitas directamente ...
                        cliente: { // Incluir Cliente relacionado con Negocio
                            select: { // Seleccionar campos necesarios de Cliente
                                id: true, // **ASEGURARSE DE INCLUIR ID**
                                nombre: true
                                // ... otros campos de Cliente si los necesitas ...
                            }
                        }
                    }
                },
                AsistenteTareaSuscripcion: { // Incluir suscripciones
                    include: {
                        tarea: { // Incluir Tarea relacionada
                            select: { // Seleccionar campos necesarios de Tarea
                                id: true, // **ASEGURARSE DE INCLUIR ID**
                                nombre: true,
                                descripcion: true,
                                precio: true // Incluir precio si lo usas
                                // ... otros campos de Tarea ...
                            }
                        }
                    }
                },
                TareaEjecutada: { // Incluir tareas ejecutadas
                    include: {
                        tarea: { // Incluir Tarea relacionada
                            select: { // Seleccionar campos necesarios de Tarea
                                id: true, // **ASEGURARSE DE INCLUIR ID**
                                nombre: true
                            }
                        }
                    }
                },
                Conversacion: true, // Incluir todas las conversaciones (o usar select/count)
                FacturaItem: true // Incluir todos los items de factura (o usar select)
            }
        });
        // Es importante castear aquí si la selección no coincide exactamente con el tipo completo
        // O ajustar el tipo AsistenteVirtual para reflejar la selección parcial
        return asistente as AsistenteVirtual | null;
    } catch (error) {
        console.error(`Error fetching asistente virtual ${asistenteVirtualId}:`, error);
        throw new Error("No se pudo cargar el asistente virtual.");
    }
}

// --- Acción obtenerNegocios (Simplificada para el dropdown) ---
export async function obtenerNegociosParaDropdown(): Promise<Pick<Negocio, 'id' | 'nombre' | 'cliente'>[]> {
    try {
        const negocios = await prisma.negocio.findMany({
            orderBy: { nombre: 'asc' },
            select: {
                id: true,
                nombre: true,
                cliente: { // Incluir cliente solo para mostrar nombre
                    select: {
                        id: true, // Necesario para la clave y tipo
                        nombre: true
                    }
                }
            }
        });
        // Castear explícitamente para asegurar la estructura esperada
        return negocios as (Pick<Negocio, 'id' | 'nombre'> & { cliente: Pick<Cliente, 'id' | 'nombre'> | null })[];
    } catch (error) {
        console.error("Error fetching negocios for dropdown:", error);
        throw new Error("Error al cargar lista de negocios.");
    }
}
export async function obtenerSuscripcionesAsistenteTareas(asistenteVirtualId: string) {
    const asistente = await prisma.asistenteTareaSuscripcion.findMany({
        where: {
            asistenteVirtualId
        },
        include: {
            tarea: true
        }
    })
    return asistente
}

export async function crearAsistenteVirtual(asistente: AsistenteVirtual) {

    const nuevoAsistente = await prisma.asistenteVirtual.create({
        data: {
            nombre: asistente.nombre,
            negocioId: asistente.negocioId,
            descripcion: asistente.descripcion,
            urlImagen: asistente.urlImagen,
            origen: asistente.origen,
            whatsappBusiness: asistente.whatsappBusiness,
            phoneNumberId: asistente.phoneNumberId,
            token: asistente.token,
            nombreHITL: asistente.nombreHITL,
            whatsappHITL: asistente.whatsappHITL,
            emailHITL: asistente.emailHITL,
            emailCalendario: asistente.emailCalendario,
            version: asistente.version ?? 0,
            status: asistente.status ?? undefined,
            precioBase: asistente.precioBase ?? undefined,
        }
    })
    return nuevoAsistente
}

export async function actualizarAsistenteVirtual(asistenteId: string, asistente: AsistenteVirtual) {
    const asistenteEditado = await prisma.asistenteVirtual.update({
        where: {
            id: asistenteId
        },
        data: {
            nombre: asistente.nombre,
            descripcion: asistente.descripcion,
            urlImagen: asistente.urlImagen,
            origen: asistente.origen,
            whatsappBusiness: asistente.whatsappBusiness,
            phoneNumberId: asistente.phoneNumberId,
            token: asistente.token,
            nombreHITL: asistente.nombreHITL,
            whatsappHITL: asistente.whatsappHITL,
            emailHITL: asistente.emailHITL,
            emailCalendario: asistente.emailCalendario,
            version: asistente.version ?? 0,
            status: asistente.status ?? undefined,
            negocioId: asistente.negocioId ?? undefined
        }
    })
    return asistenteEditado
}

export async function eliminarAsistenteVirtual(asistenteVirtualId: string) {
    const tareasAsociadas = await prisma.asistenteTareaSuscripcion.findMany({
        where: {
            asistenteVirtualId
        }
    })

    if (tareasAsociadas.length > 0) {
        throw new Error('No se puede eliminar el asistente virtual porque tiene tareas asociadas.')
    }

    const asistenteEliminado = await prisma.asistenteVirtual.delete({
        where: {
            id: asistenteVirtualId
        }
    })
    return asistenteEliminado
}

export async function obtenerAsistenteVirtualPorClienteId(clienteId: string) {
    const asistente = await prisma.asistenteVirtual.findMany({
        where: {
            clienteId
        },
    })
    return asistente
}

export async function obtenerAsistentesPorNegocioId(negocioId: string) {
    const asistentes = await prisma.asistenteVirtual.findMany({
        where: {
            negocioId
        },
        select: {
            id: true,
            clienteId: true,
            negocioId: true,
            negocio: {
                select: {
                    id: true,
                    nombre: true
                }
            },
            urlImagen: true,
            nombre: true,
            descripcion: true,
            origen: true,
            whatsappBusiness: true,
            phoneNumberId: true,
            token: true,
            nombreHITL: true,
            whatsappHITL: true,
            emailHITL: true,
            emailCalendario: true,
            precioBase: true,
            version: true,
            status: true,
            createdAt: true,
            updatedAt: true,
            AsistenteTareaSuscripcion: {
                select: {
                    id: true,
                    asistenteVirtualId: true,
                    tareaId: true,
                    tarea: true,
                    fechaSuscripcion: true,
                    fechaDesuscripcion: true,
                    montoSuscripcion: true,
                    status: true,
                    createdAt: true,
                    updatedAt: true
                }
            },
            TareaEjecutada: {
                select: {
                    id: true,
                    asistenteVirtualId: true,
                    tareaId: true,
                    tarea: true,
                    fechaEjecutada: true,
                    metadata: true,
                    createdAt: true
                }
            },
            Conversacion: {
                select: {
                    id: true
                }
            },
            FacturaItem: {
                select: {
                    id: true,
                    descripcion: true,
                    monto: true,
                }
            }
        }
    })
    return asistentes
}