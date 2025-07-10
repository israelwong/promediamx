// 'use server'
// import prisma from './prismaClient'
// import { Factura } from './types'


// // Interfaz para el resultado de la acción
// export interface DatosFacturacionCliente {
//     clienteNombre?: string | null;
//     proximaFechaPago?: Date | null;
//     montoEstimadoProximaFactura: number;
//     historialFacturas: Pick<Factura, 'id' | 'fechaEmision' | 'periodoInicio' | 'periodoFin' | 'montoTotal' | 'status' | 'stripeInvoiceId'>[]; // Traer solo campos necesarios para la lista
// }

// export async function obtenerDatosFacturacionCliente(clienteId: string): Promise<DatosFacturacionCliente> {
//     if (!clienteId) {
//         throw new Error("Se requiere el ID del cliente.");
//     }

//     try {
//         // 1. Obtener datos del cliente y necesarios para estimación
//         const clienteConDatos = await prisma.cliente.findUnique({
//             where: { id: clienteId },
//             select: {
//                 id: true,
//                 nombre: true,
//                 // Asumir que estos campos existen en Cliente o Negocio principal
//                 // fechaProximoPago: true, // ¡Necesario!
//                 negocio: {
//                     select: {
//                         id: true,
//                         AsistenteVirtual: {
//                             where: { status: 'activo' },
//                             select: {
//                                 id: true,
//                                 // precioBase: true,
//                                 AsistenteTareaSuscripcion: {
//                                     where: { status: 'activo' },
//                                     select: { montoSuscripcion: true, status: true }
//                                 }
//                             }
//                         }
//                     }
//                 }
//             }
//         });

//         if (!clienteConDatos) {
//             throw new Error("Cliente no encontrado.");
//         }

//         // 2. Calcular monto estimado (lógica similar a componentes anteriores)
//         // let montoEstimado = 0;
//         // clienteConDatos.negocio?.forEach(negocio => {
//         //     negocio.AsistenteVirtual?.forEach(asistente => {
//         //         // montoEstimado += typeof asistente.precioBase === 'number' ? asistente.precioBase : 0;
//         //         asistente.AsistenteTareaSuscripcion?.forEach(suscripcion => {
//         //             if (suscripcion.status === 'activo' && typeof suscripcion.montoSuscripcion === 'number') {
//         //                 montoEstimado += suscripcion.montoSuscripcion;
//         //             }
//         //         });
//         //     });
//         // });

//         // 3. Obtener historial de facturas (ej: las últimas 10)
//         const historialFacturas = await prisma.factura.findMany({
//             where: { clienteId: clienteId },
//             select: { // Seleccionar solo lo necesario para la lista
//                 id: true,
//                 fechaEmision: true,
//                 periodoInicio: true,
//                 periodoFin: true,
//                 montoTotal: true,
//                 status: true,
//                 stripeInvoiceId: true, // Útil para link a Stripe
//             },
//             orderBy: { fechaEmision: 'desc' }, // Más recientes primero
//             take: 10 // Limitar resultados iniciales
//         });

//         // Simular fecha próximo pago si no existe en el modelo
//         const proximaFechaSimulada = new Date();
//         proximaFechaSimulada.setMonth(proximaFechaSimulada.getMonth() + 1);
//         proximaFechaSimulada.setDate(1);

//         return {
//             clienteNombre: clienteConDatos.nombre,
//             // proximaFechaPago: clienteConDatos.fechaProximoPago, // Usar el campo real cuando exista
//             proximaFechaPago: proximaFechaSimulada, // Placeholder
//             // montoEstimadoProximaFactura: montoEstimado,
//             historialFacturas: historialFacturas,
//         };

//     } catch (error) {
//         console.error(`Error fetching billing data for cliente ${clienteId}:`, error);
//         throw new Error("Error al obtener los datos de facturación.");
//     }
// }