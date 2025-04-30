// 'use server'

// import prisma from './prismaClient'
// import { ParametroRequerido } from './types'

// export async function obtenerParametros(tareaId: string) {
//     const parametros = await prisma.parametroRequerido.findMany({
//         where: {
//             tareaId: tareaId
//         },
//         orderBy: {
//             orden: 'asc'
//         }
//     })
//     return parametros
// }

// export async function crearParametro(tareaId: string, parametro: ParametroRequerido) {
//     try {
//         const nuevoParametro = await prisma.parametroRequerido.create({
//             data: {
//                 tareaId: tareaId,
//                 nombre: parametro.nombre.trim().toLowerCase(),
//                 tipoDato: parametro.tipoDato,
//                 descripcion: (parametro.descripcion ?? '').trim().charAt(0).toUpperCase() + (parametro.descripcion ?? '').trim().slice(1).toLowerCase(),
//                 esRequerido: parametro.esRequerido,
//             }
//         })
//         return nuevoParametro
//     } catch (error: unknown) {
//         interface PrismaError extends Error {
//             code?: string;
//             meta?: {
//                 target?: string[];
//             };
//         }

//         if (error instanceof Error && (error as PrismaError).code === 'P2002' && (error as PrismaError).meta?.target?.includes('nombre')) {
//             console.error('Error: El nombre del parámetro ya existe:', parametro.nombre)
//             throw new Error('El nombre del parámetro ya existe. Por favor, elige otro nombre.')
//         }
//         console.error('Error al crear el parámetro:', error)
//         throw new Error('Error al crear el parámetro')
//     }
// }

// export async function actualizarParametro(parametroId: string, parametro: ParametroRequerido) {
//     try {
//         const parametroActualizado = await prisma.parametroRequerido.update({
//             where: { id: parametroId },
//             data: {
//                 nombre: parametro.nombre.trim().toLowerCase(),
//                 tipoDato: parametro.tipoDato,
//                 descripcion: (parametro.descripcion ?? '').trim().charAt(0).toUpperCase() + (parametro.descripcion ?? '').trim().slice(1).toLowerCase(),
//                 esRequerido: parametro.esRequerido,
//             }
//         })
//         return parametroActualizado
//     } catch (error) {
//         console.error('Error al actualizar el parámetro:', error)
//         throw new Error('Error al actualizar el parámetro')
//     }
// }
// export async function eliminarParametro(parametroId: string) {
//     try {
//         const parametroEliminado = await prisma.parametroRequerido.delete({
//             where: { id: parametroId }
//         })
//         return parametroEliminado
//     } catch (error) {
//         console.error('Error al eliminar el parámetro:', error)
//         throw new Error('Error al eliminar el parámetro')
//     }
// }

// export async function obtenerParametro(parametroId: string) {
//     try {
//         const parametro = await prisma.parametroRequerido.findUnique({
//             where: { id: parametroId }
//         })
//         return parametro
//     } catch (error) {
//         console.error('Error al obtener el parámetro:', error)
//         throw new Error('Error al obtener el parámetro')
//     }
// }