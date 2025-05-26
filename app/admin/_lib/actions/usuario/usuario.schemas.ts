// app/admin/_lib/actions/usuario/usuario.schemas.ts (o una ubicación similar para schemas globales/de usuario)
import { z } from 'zod';
// import { RolSchema } from './rol.schemas'; // Eliminada esta importación ya que RolSchema no se usa directamente aquí

// Este schema debe reflejar los campos que REALMENTE usas del usuario en el frontend
// y cómo vienen del token o de tus consultas a la DB.
// Haz opcionales los campos que no siempre están presentes o no son cruciales.
export const UsuarioExtendidoSchema = z.object({
    id: z.string().cuid(),
    username: z.string(),
    email: z.string().email(),
    rolNombre: z.string().nullable().optional(), // Nombre del rol
    token: z.string().optional(), // El token JWT

    // Estos son los campos que causaban el error de TypeScript antes.
    // Define si son realmente necesarios en el objeto 'user' del ChatComponent,
    // o si son opcionales en tu definición global de UsuarioExtendido.
    // Por ahora, los haré opcionales para flexibilidad.
    status: z.string().optional(),
    createdAt: z.date().optional(),
    updatedAt: z.date().optional(),
    rolId: z.string().cuid().nullable().optional(),
    telefono: z.string().nullable().optional(),
    // password no debería estar en el objeto de usuario del frontend.
});
export type UsuarioExtendido = z.infer<typeof UsuarioExtendidoSchema>;

// Podrías tener un schema más específico para el payload del token si es diferente:
export const UserTokenPayloadSchema = z.object({
    id: z.string().cuid(),
    username: z.string(),
    email: z.string().email(),
    rol: z.string().nullable().optional(), // Nombre del rol como viene en el token
});
export type UserTokenPayload = z.infer<typeof UserTokenPayloadSchema>;

