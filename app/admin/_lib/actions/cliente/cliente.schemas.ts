import { z } from 'zod';

/**
 * Esquema base para el modelo Cliente. Define todos los campos escalares
 * y sus tipos básicos según el `schema.prisma`.
 */
export const baseClienteSchema = z.object({
    id: z.string().cuid({ message: 'ID de CUID inválido.' }),
    nombre: z.string().optional(),
    email: z.string().email({ message: 'Por favor, introduce un correo electrónico válido.' }),
    telefono: z.string().min(10, { message: 'El teléfono debe tener al menos 10 dígitos.' }),
    password: z.string().min(8, { message: 'La contraseña debe tener al menos 8 caracteres.' }),
    rfc: z.string().optional().nullable(),
    curp: z.string().optional().nullable(),
    razonSocial: z.string().optional().nullable(),
    status: z.enum(['activo', 'inactivo', 'archivado']).default('activo'),
    stripeCustomerId: z.string().optional().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});

/**
 * Esquema para CREAR un nuevo Cliente (flujo de administrador).
 * Valida solo los campos del formulario simplificado.
 */
export const createClienteAdminSchema = baseClienteSchema.pick({
    nombre: true,
    email: true,
    telefono: true,
}).required({ // Hacemos los campos requeridos explícitamente para este formulario
    nombre: true,
    email: true,
    telefono: true,
});

/**
 * Esquema para ACTUALIZAR un Cliente existente.
 * Todos los campos son opcionales. La actualización de contraseña se omite intencionadamente.
 */
export const updateClienteSchema = baseClienteSchema.pick({
    nombre: true,
    email: true,
    telefono: true,
    rfc: true,
    curp: true,
    razonSocial: true,
    status: true,
    stripeCustomerId: true
}).partial();

/**
 * Esquema para validar solo el ID de un cliente. Útil para eliminar, archivar, etc.
 */
export const clienteIdSchema = baseClienteSchema.pick({ id: true });

/**
 * Esquema para los datos detallados de un cliente en la lista.
 * Se usa para validar la salida de `getClientesConDetalles`.
 */
export const clienteConDetallesSchema = z.object({
    id: z.string(),
    nombre: z.string().nullable(),
    email: z.string().email(),
    status: z.string(),
    createdAt: z.date(),
    _count: z.object({
        Negocio: z.number().optional(),
    }).optional(),
    Negocio: z.array(z.object({
        AsistenteVirtual: z.array(z.object({
            AsistenteTareaSuscripcion: z.array(z.object({
                montoSuscripcion: z.number().nullable(),
                status: z.string(),
            })),
        })).optional(),
    })).optional(),
});


// --- TIPOS INFERIDOS DE ZOD ---

export type CreateClienteAdminInput = z.infer<typeof createClienteAdminSchema>;
export type UpdateClienteInput = z.infer<typeof updateClienteSchema>;
export type ClienteConDetalles = z.infer<typeof clienteConDetallesSchema>;



// Define la estructura de datos que la acción `getClienteById` debe devolver.
export const clienteParaEditarSchema = baseClienteSchema.pick({
    id: true,
    nombre: true,
    email: true,
    telefono: true,
    rfc: true,
    curp: true,
    razonSocial: true,
    status: true,
    stripeCustomerId: true,
    createdAt: true,
    updatedAt: true
});


export type ClienteParaEditar = z.infer<typeof clienteParaEditarSchema>;