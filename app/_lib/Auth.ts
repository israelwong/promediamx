'use server';
import { PrismaClient } from '@prisma/client';
import { SignJWT, jwtVerify, JWTPayload } from 'jose';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

export async function login(email: string, password: string) {
    const response = {
        status: false,
        token: '',
        error: '',
        message: ''
    };

    try {
        const user = await prisma.usuario.findFirst({
            where: {
                email,
                status: 'activo'
            }
        });

        if (!user) {
            response.error = 'Credenciales inválidas';
            return response;
        }

        const passwordMatch = await bcrypt.compare(password, user.password);
        if (!passwordMatch) {
            response.error = 'Credenciales inválidas';
            return response;
        }

        const jwt = await new SignJWT({
            id: user.id, email: user.email, username: user.username, rol: user.rol
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('israelwong')
            .setAudience('promedia')
            .setExpirationTime('5d')
            .sign(new TextEncoder().encode(process.env.JWT_SECRET));

        // Registrar sesión en la base de datos
        const sesionStatus = await crearSesion(user.id, jwt);

        response.status = true;
        response.token = jwt;
        response.message = sesionStatus.toString();
    } catch (error) {
        response.error = 'Error interno del servidor';
        console.error(error);
    }

    return response;
}

async function crearSesion(userId: string, token: string) {
    try {
        await prisma.sesion.create({
            data: {
                token,
                usuarioId: userId
            }
        });
        return 'Sesion creada';
    } catch (error) {
        console.log(error);
        return 'Error al crear la sesion';
    }
}

export async function cerrarSesion(token: string) {
    try {
        const sesion = await prisma.sesion.findFirst({
            where: {
                token,
                status: 'active'
            }
        });

        if (sesion) {
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
    } catch (error) {
        console.log(error);
        return { status: false, message: 'Error al cerrar la sesion' };
    }
}

export async function verifyToken(token: string): Promise<{ valid: boolean; payload?: JWTPayload; message?: string }> {


    try {
        const { payload } = await jwtVerify(token, new TextEncoder().encode(process.env.JWT_SECRET));
        const session = await prisma.sesion.findFirst({
            where: {
                token,
                status: 'active'
            }
        });
        if (!session) {
            return { valid: false, message: 'Token inválido o sesión expirada' };
        }

        await prisma.sesion.update({
            where: {
                id: session.id
            },
            data: {
                status: 'active'
            }
        });

        return { valid: true, payload };
    } catch (error) {
        console.log(error);
        return { valid: false, message: 'Error al verificar el token' };
    }
}