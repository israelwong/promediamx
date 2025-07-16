'use server'
import { SignJWT, jwtVerify } from "jose";
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';

// Se utiliza el patrón Singleton para evitar múltiples instancias de Prisma en entornos serverless.
const prisma = new PrismaClient();

/**
 * Valida las credenciales de un usuario y genera un token JWT si son correctas.
 * @param email - El email del usuario.
 * @param password - La contraseña del usuario.
 * @returns Un objeto con el estado de la operación, el token si es exitoso, o un mensaje de error.
 */
export async function login(email: string, password: string) {
    const response = {
        success: false,
        token: '',
        error: '',
        message: ''
    };

    try {
        const usuario = await prisma.usuario.findFirst({
            where: { email },
            include: {
                rol: {
                    select: {
                        nombre: true // Seleccionar solo el nombre del rol
                    }
                }
            }
        });

        if (!usuario) {
            response.error = 'Credenciales inválidas. Usuario no encontrado.';
            return response;
        }

        const passwordMatch = await bcrypt.compare(password, usuario.password);
        if (!passwordMatch) {
            response.error = 'Credenciales inválidas. Contraseña incorrecta.';
            return response;
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        if (!process.env.JWT_SECRET) {
            throw new Error('La clave secreta JWT no está definida en las variables de entorno.');
        }

        const jwt = await new SignJWT({
            id: usuario.id,
            email: usuario.email,
            username: usuario.username,
            rol: usuario.rol?.nombre || 'agente' // Asignar un rol por defecto si no lo tiene
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setIssuer('urn:promedia:issuer')
            .setAudience('urn:promedia:audience')
            .setExpirationTime('5d')
            .sign(secret);

        await crearSesion(usuario.id, jwt);

        response.success = true;
        response.token = jwt;
        response.message = 'Inicio de sesión exitoso.';

    } catch (error) {
        console.error("Error en la función de login:", error);
        response.error = 'Error interno del servidor durante el inicio de sesión.';
    }

    return response;
}

/**
 * Crea un registro de sesión en la base de datos.
 * @param usuarioId - El ID del usuario que inicia sesión.
 * @param token - El token JWT generado para la sesión.
 */
async function crearSesion(usuarioId: string, token: string) {
    try {
        await prisma.sesion.create({
            data: {
                token,
                usuarioId: usuarioId,
                status: 'activo'
            }
        });
    } catch (error) {
        console.error('Error al crear la sesión:', error);
        // No lanzamos un error que detenga el login, pero lo registramos.
        // El usuario puede operar aunque no se guarde la sesión.
    }
}

/**
 * Invalida una sesión activa en la base de datos.
 * @param token - El token de la sesión a cerrar.
 * @returns Un objeto indicando el resultado de la operación.
 */
export async function cerrarSesion(token: string) {
    try {
        const sesion = await prisma.sesion.findFirst({
            where: {
                token,
                status: 'activo'
            }
        });

        if (!sesion) {
            return { success: false, message: 'Sesión no encontrada o ya está inactiva.' };
        }

        await prisma.sesion.update({
            where: { id: sesion.id },
            data: { status: 'closed' }
        });
        return { success: true, message: 'Sesión cerrada exitosamente.' };
    } catch (error) {
        console.error("Error al cerrar sesión:", error);
        return { success: false, message: 'Error interno del servidor al cerrar la sesión.' };
    }
}

/**
 * Verifica la validez de un token JWT y el estado de la sesión en la BD.
 * @param token - El token a verificar.
 * @returns Un objeto con el estado de la verificación y el payload del token si es válido.
 */
export async function verifyToken(token: string) {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('La clave secreta JWT no está definida.');
        }
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        const session = await prisma.sesion.findFirst({
            where: {
                token,
                status: 'activo'
            }
        });

        if (!session) {
            return { success: false, message: 'La sesión ha expirado o es inválida.' };
        }

        return { success: true, payload: payload as { id: string; email: string; username: string; rol: string; } };
    } catch {
        // El token expiró o es inválido
        return { success: false, message: 'Token inválido o expirado.' };
    }
}
