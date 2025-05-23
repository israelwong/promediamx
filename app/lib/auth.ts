'use server'
import { SignJWT, jwtVerify } from "jose";
import bcrypt from 'bcrypt';

import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

export async function login(email: string, password: string) {

    // console.log(email, password);
    const response = { status: false, token: '', error: {}, message: '' };

    try {
        // console.log('Buscando usuario por email:', email);
        const usuario = await prisma.usuario.findFirst({
            where: {
                email
            },
            include: {
                rol: {
                    select: {
                        nombre: true // Seleccionar solo el nombre del rol
                    }
                }
            }
        });

        if (!usuario) {
            return response;
        }

        // console.log('Usuario encontrado:', usuario.email);
        const passwordMatch = await bcrypt.compare(password, usuario.password);
        if (!passwordMatch) {
            response.error = 'Credenciales inválidas';
            console.log('Contraseña incorrecta');
            return response;
        }

        // console.log('Contraseña correcta, generando JWT');
        const jwt = await new SignJWT({ email: usuario.email, username: usuario.username, id: usuario.id, rol: usuario.rol?.nombre })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('israelwong')
            .setAudience('ProMedia')
            .setExpirationTime('5d')
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));

        // console.log('JWT generado:', jwt);

        // Registrar sesión en la base de datos
        // console.log('Registrando sesión en la base de datos');
        const sesionStatus = await crearSesion(usuario.id, jwt);

        response.status = true;
        response.token = jwt;
        response.message = sesionStatus.toString();
        // console.log('Sesión registrada exitosamente');
    } catch (error) {
        response.error = 'Error interno del servidor';
        console.error(error);
    }

    return response;
}

async function crearSesion(usuarioId: string, token: string) {
    try {
        await prisma.sesion.create({
            data: {
                token,
                usuarioId: usuarioId,
                status: 'activo'
            }
        });
        return 'Sesión creada exitosamente';
    } catch (error) {
        console.error('Error al crear la sesión:', error);
        throw new Error('No se pudo crear la sesión');
    }
}

export async function cerrarSesion(token: string) {

    try {
        const sesion = await prisma.sesion.findFirst({
            where: {
                token,
                status: 'activo'
            }
        });

        if (!sesion) {
            return { status: false, message: 'Sesion no encontrada' };
        }

        await prisma.sesion.update({
            where: {
                id: sesion.id
            },
            data: {
                status: 'closed'
            }
        });
        return { status: true, message: 'Sesion cerrada' };
    }
    catch (error) {
        console.log(error);
        return { status: false, message: 'Error al cerrar la sesion' };
    }
}

export async function verifyToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        const session = await prisma.sesion.findFirst({
            where: {
                token,
                status: 'activo'
            }
        });
        if (!session) {
            return { status: false, message: 'Sesion no encontrada' };
        }
        return { status: true, payload: payload as { id: string, email: string, username: string, token: string, rol: string } };
    } catch (error) {
        return { status: false, message: 'Error al verificar el token', error };
    }
}

export async function decodificarToken(token: string) {
    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        return payload as { id: string, email: string, username: string, token: string };
    } catch (error) {
        return error;
    }
}