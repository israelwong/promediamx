'use server'
import { PrismaClient } from "@prisma/client";
import { PrismaClientKnownRequestError } from "@prisma/client/runtime/library";
const prisma = new PrismaClient();
import { Usuario } from './Types';
import bcrypt from 'bcryptjs';

export async function crearUsuario(usuario: Usuario) {

    const salt = await bcrypt.genSalt(10);
    usuario.password = await bcrypt.hash(usuario.password, salt);

    try {
        await prisma.usuario.create({
            data: {
                username: usuario.username,
                email: usuario.email,
                telefono: usuario.telefono,
                direccion: usuario.direccion,
                clabe: usuario.clabe,
                password: usuario.password,
                rol: usuario.rol,
                status: usuario.status
            }
        });

        return {
            status: 'success',
            message: 'Usuario creado correctamente'
        }

    } catch (error: unknown) {
        if (error instanceof PrismaClientKnownRequestError) {
            let message = `Error al crear el usuario: ${error.message}`;
            switch (error.code) {
                case 'P2002':
                    message = 'Error: El usuario ya existe.';
                    break;
                // Add more cases as needed
                default:
                    message = `Error al crear el usuario: ${error.message}`;
            }
            return {
                status: 'error',
                message
            }
        } else {
            return {
                status: 'error',
                message: `Error desconocido al crear el usuario: ${error}`
            }
        }
    }

}

export async function obtenerUsuarios() {
    return await prisma.usuario.findMany({
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function obtenerUlmaSesionUsuario(usuarioId: string) {
    return await prisma.sesion.findFirst({
        where: {
            usuarioId
        },
        orderBy: {
            createdAt: 'desc'
        }
    });
}

export async function obtenerSesionesUsuario(id: string) {

    const results = await prisma.sesion.findMany({
        where: {
            usuarioId: id
        }
    })
    return results
}

export async function obtenerUsuario(id: string) {
    return await prisma.usuario.findUnique({
        where: {
            id
        }
    });
}


export async function actualizarUsuario(usuario: Usuario) {
    try {

        if (usuario.password) {
            const salt = await bcrypt.genSalt(10);
            usuario.password = await bcrypt.hash(usuario.password, salt);
        }

        await prisma.usuario.update({
            where: {
                id: usuario.id
            },
            data: {
                username: usuario.username,
                email: usuario.email,
                telefono: usuario.telefono,
                direccion: usuario.direccion,
                clabe: usuario.clabe,
                password: usuario.password,
                rol: usuario.rol,
                status: usuario.status
            }
        });

        return {
            status: 'success',
            message: 'Usuario actualizado correctamente'
        }

    } catch (error: unknown) {
        if (error instanceof PrismaClientKnownRequestError) {
            let message = `Error al actualizar el usuario: ${error.message}`;
            switch (error.code) {
                case 'P2002':
                    message = 'Error: El usuario ya existe.';
                    break;
                // Add more cases as needed
                default:
                    message = `Error al actualizar el usuario: ${error.message}`;
            }
            return {
                status: 'error',
                message
            }
        } else {
            return {
                status: 'error',
                message: `Error desconocido al actualizar el usuario: ${error}`
            }
        }
    }

}

export async function eliminarUsuario(id: string) {

    try {
        await prisma.usuario.deleteMany({
            where: {
                id: id
            }
        });

        return {
            status: 'success',
            message: 'Usuario eliminado correctamente'
        }

    } catch (error: unknown) {
        if (error instanceof PrismaClientKnownRequestError) {
            let message = `Error al eliminar el usuario: ${error.message}`;
            switch (error.code) {
                // Add more cases as needed
                default:
                    message = `Error al eliminar el usuario: ${error.message}`;
            }
            return {
                status: 'error',
                message
            }
        } else {
            return {
                status: 'error',
                message: `Error desconocido al eliminar el usuario: ${error}`
            }
        }
    }

}

export async function cerrarSesionUsuario(id: string) {
    try {
        await prisma.sesion.updateMany({
            where: {
                usuarioId: id
            },
            data: {
                status: 'closed'
            }
        });

        return {
            status: 'success',
            message: 'Sesiones cerradas correctamente'
        }

    } catch (error: unknown) {
        if (error instanceof PrismaClientKnownRequestError) {
            let message = `Error al cerrar sesiones: ${error.message}`;
            switch (error.code) {
                // Add more cases as needed
                default:
                    message = `Error al cerrar sesiones: ${error.message}`;
            }
            return {
                status: 'error',
                message
            }
        } else {
            return {
                status: 'error',
                message: `Error desconocido al cerrar sesiones: ${error}`
            }
        }
    }
}