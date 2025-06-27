// @/app/admin/_lib/actions/negocio/negocio.schemas.ts
import { z } from 'zod';

export const NegocioEditableCoreSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre del negocio es obligatorio." }).max(100, { message: "El nombre no puede exceder los 100 caracteres." }),
    slogan: z.string().max(150, { message: "El slogan no puede exceder los 150 caracteres." }).nullish(),
    logo: z.string().nullish(), // Este campo se maneja por NegocioImagenLogo, no se incluye en la validación aquí.
    descripcion: z.string().nullish(),
    telefonoLlamadas: z.string().nullish(),
    telefonoWhatsapp: z.string().nullish(),
    email: z.string().email({ message: "Email inválido." }).nullish().or(z.literal('')), // permitir string vacío o null
    direccion: z.string().nullish(),
    googleMaps: z.string().url({ message: "URL de Google Maps inválida." }).nullish().or(z.literal('')),
    paginaWeb: z.string().url({ message: "URL de página web inválida." }).nullish().or(z.literal('')),
    garantias: z.string().nullish(),
    politicas: z.string().nullish(),
    avisoPrivacidad: z.string().nullish(),
    status: z.enum(['activo', 'inactivo']).default('inactivo'),
});

// Esquema para los datos que se envían al actualizar el negocio desde NegocioEditForm
// Este esquema es lo que espera la acción `actualizarDetallesNegocio`
export const ActualizarDetallesNegocioDataSchema = NegocioEditableCoreSchema;

// Tipo inferido para los datos del formulario de edición.
// export type NegocioFormData = z.infer<typeof ActualizarDetallesNegocioDataSchema>;

// Si la acción `actualizarDetallesNegocio` devuelve datos específicos en `ActionResult<T>`
// se definiría un esquema para T aquí. Por ahora, parece que solo devuelve success/error.
export const ActualizarNegocioSuccessPayloadSchema = z.object({
    // Podría tener un mensaje o el ID del negocio actualizado si fuera necesario
    // mensaje: z.string() 
});
export type ActualizarNegocioSuccessPayload = z.infer<typeof ActualizarNegocioSuccessPayloadSchema>;

// Schema base para los datos del formulario de Negocio
// Incluye el nuevo campo 'slug' como opcional
export const NegocioFormDataSchema = z.object({
    nombre: z.string().min(1, "El nombre del negocio es obligatorio.").max(100, "El nombre no puede exceder los 100 caracteres."),
    slug: z.string()
        .min(3, "El slug debe tener al menos 3 caracteres.")
        .max(150, "El slug no puede exceder los 150 caracteres.")
        .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido. Solo letras minúsculas, números y guiones. Sin espacios ni guiones al inicio/final.")
        .optional()
        .nullable(), // Permite que sea null si el negocio aún no tiene slug
    slogan: z.string().max(150, "El slogan no puede exceder los 150 caracteres.").nullable().optional(),
    descripcion: z.string().nullable().optional(),
    telefonoLlamadas: z.string().max(20, "Teléfono demasiado largo.").nullable().optional(),
    telefonoWhatsapp: z.string().max(20, "Teléfono WhatsApp demasiado largo.").nullable().optional(),
    email: z.string().email("Email inválido.").nullable().optional(),
    direccion: z.string().nullable().optional(),
    googleMaps: z.string().url("Enlace de Google Maps inválido.").nullable().optional(),
    paginaWeb: z.string().url("Página web inválida.").nullable().optional(),
    garantias: z.string().nullable().optional(),
    politicas: z.string().nullable().optional(),
    avisoPrivacidad: z.string().nullable().optional(),
    status: z.enum(['activo', 'inactivo']).default('inactivo'),
    logo: z.string().url("URL de logo inválida.").nullable().optional(),
    // clienteId: z.string().cuid().optional(), // Si lo manejaras desde aquí
});
export type NegocioFormData = z.infer<typeof NegocioFormDataSchema>;

// Schema para la entrada de la acción de actualizar un negocio
// Es similar a NegocioFormData pero todos los campos son opcionales para la actualización parcial.
// El 'nombre' sigue siendo requerido si se edita desde un formulario que lo tiene como obligatorio.
export const ActualizarNegocioInputSchema = NegocioFormDataSchema.extend({
    nombre: z.string().min(1, "El nombre del negocio es obligatorio.").max(100).optional(), // Opcional para la actualización
    status: z.enum(['activo', 'inactivo']).optional(),
}).partial(); // .partial() hace todos los campos opcionales, pero redefinimos 'nombre' y 'status' arriba si queremos que tengan validaciones específicas incluso al ser opcionales.
// Para una actualización más flexible donde cualquier campo es opcional:
// export const ActualizarNegocioInputSchema = NegocioFormDataSchema.partial();
export type ActualizarNegocioInput = z.infer<typeof ActualizarNegocioInputSchema>;


// Schema para la entrada de la acción obtenerDetallesNegocioParaEditar
// (No necesita cambios por el slug, ya que solo es un ID de entrada)
export const ObtenerDetallesNegocioInputSchema = z.object({
    negocioId: z.string().cuid("ID de negocio inválido."),
});

// Schema para la salida de la acción obtenerDetallesNegocioParaEditar
// (Debe incluir el slug)
export const NegocioDetallesParaEditarSchema = NegocioFormDataSchema.extend({
    id: z.string().cuid(),
    // slug: z.string().nullable(), // Ya está en NegocioFormDataSchema como opcional y nullable
    // Otros campos específicos que no estén en NegocioFormData pero que se devuelvan
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type NegocioDetallesParaEditar = z.infer<typeof NegocioDetallesParaEditarSchema>;


// --- NUEVOS ESQUEMAS PARA LA VERIFICACIÓN DE SLUG ---
export const VerificarSlugUnicoInputSchema = z.object({
    slug: z.string().min(1, "El slug es requerido para la verificación."),
    negocioIdActual: z.string().cuid("ID de negocio actual inválido.").optional(), // Para excluir el negocio actual al editar
});
export type VerificarSlugUnicoInput = z.infer<typeof VerificarSlugUnicoInputSchema>;

export const VerificarSlugUnicoOutputSchema = z.object({
    esUnico: z.boolean(),
    sugerencia: z.string().optional(), // Sugerencia si no es único
});
export type VerificarSlugUnicoOutput = z.infer<typeof VerificarSlugUnicoOutputSchema>;



// Esquema base con todas las propiedades escalares de un Negocio.
export const baseNegocioSchema = z.object({
    id: z.string().cuid(),
    clienteId: z.string().cuid(),
    nombre: z.string().min(1, "El nombre del negocio es obligatorio."),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug inválido").nullable(),
    status: z.enum(['activo', 'inactivo']).default('inactivo'),
    // Otros campos escalares...
    logo: z.string().url().nullable(),
    slogan: z.string().nullable(),
    descripcion: z.string().nullable(),
    telefonoLlamadas: z.string().nullable(),
    telefonoWhatsapp: z.string().nullable(),
    email: z.string().email().nullable(),
    direccion: z.string().nullable(),
    googleMaps: z.string().url().nullable(),
    paginaWeb: z.string().url().nullable(),
});

// 1. Esquema para CREAR un nuevo Negocio (simplificado).
export const createNegocioSchema = baseNegocioSchema.pick({
    nombre: true,
    clienteId: true,
});

// 2. Esquema para ACTUALIZAR un Negocio.
export const updateNegocioSchema = baseNegocioSchema.pick({
    nombre: true,
    slug: true,
    status: true,
    slogan: true,
    descripcion: true,
    telefonoLlamadas: true,
    telefonoWhatsapp: true,
    email: true,
    direccion: true,
    googleMaps: true,
    paginaWeb: true,
}).partial();

// 3. Esquema para la VISTA DE LISTA de ClienteNegocios.tsx
// Define los datos específicos que necesita el componente.
export const negocioConDetallesSchema = z.object({
    id: z.string(),
    nombre: z.string(),
    status: z.string(),
    _count: z.object({
        AsistenteVirtual: z.number().optional(),
        Catalogo: z.number().optional(),
    }),
    AsistenteVirtual: z.array(z.object({
        precioBase: z.number().nullable().optional(), // Incluyendo precioBase
        AsistenteTareaSuscripcion: z.array(z.object({
            montoSuscripcion: z.number().nullable(),
            status: z.string(),
        })),
    })),
});

// --- TIPOS INFERIDOS ---
export type CreateNegocioInput = z.infer<typeof createNegocioSchema>;
export type UpdateNegocioInput = z.infer<typeof updateNegocioSchema>;
export type NegocioConDetalles = z.infer<typeof negocioConDetallesSchema>;


// Esquema para los datos que se muestran en el NegocioHeader
export const negocioHeaderDataSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    suscripcionStatus: z.enum(['activa', 'inactiva', 'prueba', 'cancelada']).nullable(),
    estadoPago: z.enum(['pagado', 'pendiente', 'vencido']).nullable(),
    fechaProximoPago: z.date().nullable(),
    AsistenteVirtual: z.array(z.object({
        // precioBase: z.number().nullable(), // Descomentar si existe el campo
        AsistenteTareaSuscripcion: z.array(z.object({
            montoSuscripcion: z.number().nullable(),
            status: z.string(),
        })).optional(),
    })).optional(),
});

// Esquema para la entrada de la acción de actualizar solo el nombre
export const updateNegocioNombreSchema = z.object({
    nombre: z.string().min(1, "El nombre no puede estar vacío.").max(100, "El nombre es demasiado largo."),
});


// --- TIPOS INFERIDOS DE ZOD ---
export type NegocioHeaderData = z.infer<typeof negocioHeaderDataSchema>;
export type UpdateNegocioNombreInput = z.infer<typeof updateNegocioNombreSchema>;