'use server'
import { SignJWT, jwtVerify } from "jose";
import bcrypt from 'bcrypt';
import { PrismaClient } from '@prisma/client';
import { cookies } from 'next/headers'; // <-- 1. Importar cookies
import { redirect as nextRedirect } from 'next/navigation';

const prisma = new PrismaClient();

export async function login(email: string, password: string) {
    const response = {
        success: false,
        token: '',
        error: '',
        message: ''
    };

    try {
        const agente = await prisma.agente.findFirst({
            where: { email },
        });

        if (!agente) {
            response.error = 'Credenciales inválidas. Agente no encontrado.';
            return response;
        }

        const passwordMatch = await bcrypt.compare(password, agente.password);
        if (!passwordMatch) {
            response.error = 'Credenciales inválidas. Contraseña incorrecta.';
            return response;
        }

        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        if (!process.env.JWT_SECRET) {
            throw new Error('La clave secreta JWT no está definida.');
        }

        const jwt = await new SignJWT({
            id: agente.id,
            email: agente.email,
            name: agente.nombre || 'Agente',
            rol: agente.rol || 'agente'
        })
            .setProtectedHeader({ alg: 'HS256' })
            .setIssuedAt()
            .setExpirationTime('5d')
            .sign(secret);

        // --- 2. Guardar el token en una cookie segura ---
        const cookieStore = await cookies();
        cookieStore.set('auth_token', jwt, {
            httpOnly: true, // La cookie no es accesible por JavaScript en el cliente
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'strict',
            maxAge: 60 * 60 * 24 * 5, // 5 días, igual que el token
            path: '/',
        });

        response.success = true;
        response.token = jwt; // Aún lo devolvemos para que el cliente lo guarde en localStorage
        response.message = 'Inicio de sesión exitoso.';

    } catch (error) {
        console.error("Error en la función de login de agente:", error);
        response.error = 'Error interno del servidor durante el inicio de sesión.';
    }

    return response;
}

export async function cerrarSesion() {
    const cookieStore = await cookies();

    console.log("Cerrando sesión y eliminando cookie 'auth_token'...");
    cookieStore.delete('auth_token');

    // --- 4. Reemplazamos el 'return' con una redirección ---
    // Esto completa el flujo en el servidor y envía al usuario al login.
    nextRedirect('/agente/login');
}

/**
 * Verifica la validez de un token JWT. Esta función ahora puede ser usada
 * tanto desde el cliente (con el token de localStorage) como desde el servidor (con el token de la cookie).
 */
export async function verifyToken(token: string) {
    try {
        if (!process.env.JWT_SECRET) {
            throw new Error('La clave secreta JWT no está definida.');
        }
        const secret = new TextEncoder().encode(process.env.JWT_SECRET);
        const { payload } = await jwtVerify(token, secret);

        return { success: true, payload: payload as { id: string; email: string; name: string; rol: string; } };
    } catch {
        return { success: false, message: 'Token inválido o expirado.' };
    }
}