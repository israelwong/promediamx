'use server'
import { AsistenteVirtual, Negocio, Cliente, AsistenteEnLista } from './types'
import prisma from './prismaClient'

import { Prisma } from '@prisma/client'; // Importa tipos de Prisma

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
                                descripcionMarketplace: true,
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

type CrearAsistenteInput = Pick<AsistenteVirtual, 'nombre' | 'negocioId' | 'clienteId'> & Partial<Pick<AsistenteVirtual, 'descripcion' | 'urlImagen'>>; // Campos mínimos requeridos desde el front

export async function crearAsistenteVirtual(
    // Recibe solo los datos necesarios del frontend
    data: CrearAsistenteInput
): Promise<AsistenteVirtual> { // Devuelve el asistente creado completo

    // const PRECIO_BASE_DEFAULT = 499;
    const VERSION_DEFAULT = 1.0;
    const STATUS_DEFAULT = 'activo';
    const ORIGEN_DEFAULT = 'cliente'; // O el valor por defecto que prefieras

    try {
        // Usar una transacción para asegurar atomicidad
        const nuevoAsistente = await prisma.$transaction(async (tx) => {

            // 1. Crear el Asistente Virtual con valores fijos/por defecto
            const asistenteCreado = await tx.asistenteVirtual.create({
                data: {
                    nombre: data.nombre,
                    negocioId: data.negocioId,
                    clienteId: data.clienteId,
                    descripcion: data.descripcion || null, // Usar null si no viene
                    urlImagen: data.urlImagen || null, // Usar null si no viene
                    // precioBase: PRECIO_BASE_DEFAULT,   // <-- Precio base fijo
                    version: VERSION_DEFAULT,        // <-- Versión por defecto
                    status: STATUS_DEFAULT,          // <-- Status por defecto
                    origen: ORIGEN_DEFAULT,          // <-- Origen por defecto
                }
            });

            // 2. Encontrar todas las Tareas base (precio 0 o null)
            const tareasBase = await tx.tarea.findMany({
                where: {
                    OR: [
                        { precio: null },
                        { precio: 0 }
                    ],
                    status: 'activo' // Asegurarse de suscribir solo a tareas activas
                },
                select: {
                    id: true // Solo necesitamos el ID de la tarea
                }
            });

            // 3. Si se encontraron tareas base, crear las suscripciones
            if (tareasBase.length > 0) {
                const suscripcionesData = tareasBase.map(tarea => ({
                    asistenteVirtualId: asistenteCreado.id,
                    tareaId: tarea.id,
                    montoSuscripcion: 0, // Las tareas base tienen costo 0
                    status: 'activo'      // Suscripción activa por defecto
                    // fechaSuscripcion es default now()
                }));

                // Crear todas las suscripciones en lote
                await tx.asistenteTareaSuscripcion.createMany({
                    data: suscripcionesData,
                    skipDuplicates: true, // Evitar errores si por alguna razón ya existiera (poco probable aquí)
                });
                console.log(`Asistente ${asistenteCreado.id} suscrito a ${tareasBase.length} tareas base.`);
            } else {
                console.log(`No se encontraron tareas base activas para suscribir al asistente ${asistenteCreado.id}.`);
            }

            // La transacción devuelve el asistente creado
            return asistenteCreado;
        });

        // Devolver el asistente creado fuera de la transacción
        // Puedes hacer un findUnique aquí si quieres devolver con relaciones incluidas,
        // pero por ahora devolvemos el objeto creado en la transacción.
        return nuevoAsistente;

    } catch (error) {
        console.error("Error en la transacción crearAsistenteVirtual:", error);
        // Puedes ser más específico con el manejo de errores de Prisma si es necesario
        if (error instanceof Prisma.PrismaClientKnownRequestError) {
            // Manejar errores específicos de Prisma (ej: violación de constraint)
            throw new Error(`Error de base de datos al crear asistente: ${error.message} (Código: ${error.code})`);
        }
        throw new Error(`Error al crear el asistente virtual y suscribir tareas base: ${error instanceof Error ? error.message : String(error)}`);
    }
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


    // await prisma.asistenteTareaSuscripcion.deleteMany({
    //     where: {
    //         asistenteVirtualId
    //     }
    // });

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
            // precioBase: true,
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

// Tipo para la respuesta de la acción
export interface CostosAsistente {
    // precioBase: number | null;
    costoTareasAdicionales: number;
}
/**
 * Obtiene el precio base y el costo total de las tareas adicionales
 * suscritas para un asistente virtual específico.
 * @param asistenteId - El ID del Asistente Virtual.
 * @returns Objeto con precioBase y costoTareasAdicionales, o null si hay error.
 */
export async function obtenerCostosAsistente(asistenteId: string): Promise<CostosAsistente | null> {
    if (!asistenteId) {
        console.error("obtenerCostosAsistente: ID de asistente no proporcionado.");
        return null; // O lanzar un error si se prefiere
    }

    try {
        // // 1. Obtener el precio base del asistente
        // const asistente = await prisma.asistenteVirtual.findUnique({
        //     where: { id: asistenteId },
        //     select: { precioBase: true }
        // });

        // if (!asistente) {
        //     console.error(`obtenerCostosAsistente: Asistente con ID ${asistenteId} no encontrado.`);
        //     return null; // O lanzar error
        // }

        // 2. Calcular la suma de los montos de suscripción de tareas adicionales activas
        const resultadoSuma = await prisma.asistenteTareaSuscripcion.aggregate({
            _sum: {
                montoSuscripcion: true
            },
            where: {
                asistenteVirtualId: asistenteId,
                status: 'activo', // Solo suscripciones activas
                // Filtrar para incluir solo tareas con costo > 0 (o diferente de null/0)
                // Esto asume que las tareas base tienen montoSuscripcion 0 o null
                montoSuscripcion: {
                    gt: 0 // Mayor que cero
                }
                // Alternativa si las base son null:
                // montoSuscripcion: {
                //    not: null,
                //    gt: 0
                // }
            }
        });

        const costoTareas = resultadoSuma._sum.montoSuscripcion ?? 0; // Usar 0 si la suma es null (ninguna tarea con costo)

        return {
            // precioBase: asistente.precioBase ?? 0, // Devolver 0 si precioBase es null
            costoTareasAdicionales: costoTareas
        };

    } catch (error) {
        console.error(`Error al obtener costos para asistente ${asistenteId}:`, error);
        // Devolver null para indicar error, el componente frontend manejará esto
        return null;
        // O podrías lanzar el error:
        // throw new Error(`Error al obtener costos: ${error instanceof Error ? error.message : String(error)}`);
    }
}


// Tipo para la respuesta de la acción
export interface EstadisticasGenerales {
    totalConversaciones: number;
    totalTareasEjecutadas: number;
}

/**
 * Obtiene las estadísticas generales de uso para un asistente virtual específico.
 * @param asistenteId - El ID del Asistente Virtual.
 * @returns Objeto con totalConversaciones y totalTareasEjecutadas, o null si hay error.
 */
export async function obtenerEstadisticasGeneralesAsistente(asistenteId: string): Promise<EstadisticasGenerales | null> {
    if (!asistenteId) {
        console.error("obtenerEstadisticasGeneralesAsistente: ID de asistente no proporcionado.");
        return null;
    }

    try {
        // Usar Promise.all para ejecutar conteos en paralelo
        const [countConversaciones, countTareas] = await Promise.all([
            prisma.conversacion.count({
                where: { asistenteVirtualId: asistenteId },
            }),
            prisma.tareaEjecutada.count({
                where: { asistenteVirtualId: asistenteId },
            })
        ]);

        return {
            totalConversaciones: countConversaciones,
            totalTareasEjecutadas: countTareas
        };

    } catch (error) {
        console.error(`Error al obtener estadísticas generales para asistente ${asistenteId}:`, error);
        return null; // Devolver null para indicar error
    }
}

export async function obtenerAsistentesParaLista(negocioId: string): Promise<AsistenteEnLista[]> {
    if (!negocioId) {
        console.warn("obtenerAsistentesParaLista: negocioId no proporcionado.");
        return [];
    }

    try {
        const asistentes = await prisma.asistenteVirtual.findMany({
            where: { negocioId: negocioId },
            select: {
                id: true,
                nombre: true,
                urlImagen: true,
                // precioBase: true,
                status: true, // Incluir status
                // Seleccionar suscripciones para calcular costo adicional
                AsistenteTareaSuscripcion: {
                    where: {
                        status: 'activo',
                        montoSuscripcion: { gt: 0 } // Solo tareas con costo > 0
                    },
                    select: {
                        montoSuscripcion: true
                    }
                },
                // Opcional: Contar conversaciones
                _count: {
                    select: {
                        Conversacion: true,
                        // Opcional: Contar todas las suscripciones activas
                        // AsistenteTareaSuscripcion: { where: { status: 'activo' } }
                    }
                }
            },
            orderBy: {
                nombre: 'asc' // Ordenar por nombre
            }
        });

        // Mapear y calcular costos
        const resultado: AsistenteEnLista[] = asistentes.map(asistente => {
            const costoTareas = asistente.AsistenteTareaSuscripcion.reduce(
                (sum, sub) => sum + (sub.montoSuscripcion ?? 0),
                0
            );
            return {
                id: asistente.id,
                nombre: asistente.nombre,
                urlImagen: asistente.urlImagen,
                // precioBase: asistente.precioBase,
                costoTotalTareasAdicionales: costoTareas,
                totalConversaciones: asistente._count?.Conversacion,
                // totalTareasSuscritas: asistente._count?.AsistenteTareaSuscripcion, // Descomentar si cuentas suscripciones
                status: asistente.status
            };
        });

        return resultado;

    } catch (error) {
        console.error(`Error al obtener lista de asistentes para negocio ${negocioId}:`, error);
        // Devolver array vacío o lanzar error según prefieras
        return [];
        // throw new Error(`Error al obtener asistentes: ${error instanceof Error ? error.message : String(error)}`);
    }
}