'use server'
import prisma from './prismaClient'
import { Prisma } from '@prisma/client'; // Importar tipos Prisma
import { Usuario, Rol } from './types'
import bcrypt from 'bcrypt'

export async function obtenerUsuarios() {
    return await prisma.usuario.findMany()
}

export async function obtenerUsuario(id: string) {
    return await prisma.usuario.findUnique({
        where: {
            id
        }
        ,
        include: {
            rol: {
                select: {
                    nombre: true
                }
            }
        }
    })
}

// --- Crear Usuario (Ajustado para devolver datos y manejar errores) ---
export async function crearUsuario(
    // Aceptar solo los campos necesarios para crear
    data: Pick<Usuario, 'username' | 'email' | 'telefono' | 'password' | 'rolId' | 'status'>
): Promise<{ success: boolean; data?: Usuario, error?: string }> {

    // Validaciones básicas
    if (!data.email || !data.username || !data.password || !data.rolId) {
        return { success: false, error: 'Faltan campos obligatorios (username, email, password, rolId).' };
    }

    try {
        // Verificar si email ya existe
        const existingEmail = await prisma.usuario.findUnique({ where: { email: data.email } });
        if (existingEmail) { return { success: false, error: 'El email ya está registrado.' }; }

        // Verificar si username ya existe
        const existingUsername = await prisma.usuario.findUnique({ where: { username: data.username } });
        if (existingUsername) { return { success: false, error: 'El nombre de usuario ya existe.' }; }

        // Verificar si teléfono ya existe (si se proporciona)
        if (data.telefono) {
            const existingPhone = await prisma.usuario.findUnique({ where: { telefono: data.telefono } });
            if (existingPhone) { return { success: false, error: 'El número de teléfono ya está registrado.' }; }
        }

        // Hashear contraseña
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(data.password, salt);

        const newUser = await prisma.usuario.create({
            data: {
                username: data.username,
                email: data.email,
                telefono: data.telefono,
                password: hashedPassword, // Guardar contraseña hasheada
                rolId: data.rolId,
                status: data.status || 'activo', // Status por defecto si no se envía
            },
            include: { rol: true } // Devolver con rol
        });
        // No devolver la contraseña hasheada al frontend
        const { ...userWithoutPassword } = newUser;
        return { success: true, data: userWithoutPassword as Usuario }; // Castear si es necesario
    } catch (error: unknown) {
        console.error('Error creating user:', error);
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            const field = (error.meta?.target as string[])?.join(', ') || 'campo';
            return { success: false, error: `El valor proporcionado para '${field}' ya existe.` };
        }
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred during creation' };
    }
}

export async function actualizarUsuario(
    usuarioId: string,
    // Aceptar solo los campos editables desde este formulario
    data: Partial<Pick<Usuario, 'username' | 'email' | 'telefono' | 'rolId' | 'status'>>
): Promise<{ success: boolean; data?: Usuario, error?: string }> {
    try {
        // Validar que el ID exista
        if (!usuarioId) throw new Error("ID de usuario no proporcionado.");

        // Construir objeto de datos para Prisma (solo campos proporcionados)
        const dataToUpdate: Prisma.UsuarioUpdateInput = {};
        if (data.username !== undefined) dataToUpdate.username = data.username;
        if (data.email !== undefined) dataToUpdate.email = data.email;
        if (data.telefono !== undefined) dataToUpdate.telefono = data.telefono;
        if (data.status !== undefined) dataToUpdate.status = data.status;
        if (data.rolId !== undefined) {
            // Conectar a un nuevo rol si se proporciona rolId
            dataToUpdate.rol = data.rolId ? { connect: { id: data.rolId } } : undefined;
        }
        // **NO incluir 'password' aquí**

        // Validar si hay algo que actualizar
        if (Object.keys(dataToUpdate).length === 0) {
            console.warn("Llamada a actualizarUsuario sin datos modificados.");
            // Podríamos devolver el usuario existente o un mensaje específico
            const usuarioExistente = await prisma.usuario.findUnique({ where: { id: usuarioId } });
            if (!usuarioExistente) throw new Error("Usuario no encontrado.");
            return { success: true, data: { ...usuarioExistente, rolId: usuarioExistente.rolId || '' } };
        }


        const updatedUsuario = await prisma.usuario.update({
            where: { id: usuarioId },
            data: dataToUpdate,
            include: { rol: true } // Devolver con el rol actualizado
        });
        return { success: true, data: updatedUsuario as Usuario }; // Castear si es necesario
    } catch (error: unknown) {
        console.error('Error updating user:', error);
        // Manejar errores específicos de Prisma (ej: email duplicado P2002)
        if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
            // Extraer el campo que causó el error único
            const field = (error.meta?.target as string[])?.join(', ') || 'campo';
            return { success: false, error: `El valor proporcionado para '${field}' ya existe.` };
        }
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred during update' };
    }
}

// --- Obtener Usuarios CON Rol ---
export async function obtenerUsuariosConRol(): Promise<(Usuario & { rol?: Rol | null })[]> {
    try {
        const usuarios = await prisma.usuario.findMany({
            include: {
                rol: true // Incluir la relación con Rol
            },
            orderBy: {
                username: 'asc' // Ordenar por nombre de usuario
            }
        });
        // Asegurar compatibilidad con la interfaz Usuario que espera rol opcional
        return usuarios.map(u => ({
            ...u,
            rol: u.rol // Mantener el objeto rol completo
        })) as (Usuario & { rol?: Rol | null })[]; // Castear al tipo esperado
    } catch (error) {
        console.error('Error fetching users with roles:', error);
        throw new Error('Could not fetch users');
    }
}

// --- Eliminar Usuario (Sin cambios funcionales necesarios) ---
export async function eliminarUsuario(id: string) {
    // **IMPORTANTE**: Añadir lógica aquí para PREVENIR eliminar si el rol es 'administrador'
    // antes de llamar a prisma.usuario.delete
    try {
        const usuario = await prisma.usuario.findUnique({
            where: { id },
            include: { rol: true } // Necesitamos el rol para la validación
        });

        if (!usuario) {
            return { success: false, error: "Usuario no encontrado." };
        }

        // **VALIDACIÓN:** No permitir eliminar administradores
        if (usuario.rol?.nombre?.toLowerCase() === 'administrador') {
            return { success: false, error: "No se puede eliminar al usuario administrador." };
        }

        await prisma.usuario.delete({ where: { id } });
        return { success: true };
    } catch (error: unknown) {
        console.error('Error deleting user:', error);
        if (error instanceof Error) {
            return { success: false, error: error.message };
        }
        return { success: false, error: 'An unknown error occurred' };
    }
}
