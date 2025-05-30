import { z } from 'zod';

// Esquema para CrearAsistenteFormInput (del paso anterior, solo para referencia)
export const crearAsistenteFormSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre del asistente es obligatorio." }).trim(),
    descripcion: z.string().trim().nullish().transform(val => val || null),
    negocioId: z.string().cuid({ message: "ID de negocio inválido." }),
    clienteId: z.string().cuid({ message: "ID de cliente inválido." }),
});
export type CrearAsistenteFormInput = z.infer<typeof crearAsistenteFormSchema>;

// Esquema para AsistenteCreadoData (del paso anterior)
export const asistenteCreadoDataSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
});
export type AsistenteCreadoData = z.infer<typeof asistenteCreadoDataSchema>;

// Esquema para AsistenteEnListaData (del paso anterior)
export const asistenteEnListaDataSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    urlImagen: z.string().nullable(),
    status: z.string(),
    costoTotalTareasAdicionales: z.number().default(0),
    totalConversaciones: z.number().int().optional().nullable(),
});
export type AsistenteEnListaData = z.infer<typeof asistenteEnListaDataSchema>;


// --- NUEVOS SCHEMAS PARA EDICIÓN ---

// Schema para el dropdown de Negocios
export const negocioParaDropdownSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    cliente: z.object({
        id: z.string().cuid(),
        nombre: z.string().nullable(), // El nombre del cliente puede ser null
    }).nullable(), // El cliente asociado al negocio puede ser null
});
export type NegocioParaDropdownData = z.infer<typeof negocioParaDropdownSchema>;

// Schema para los datos del formulario de edición de AsistenteVirtual
// Solo campos editables directamente en este formulario.
export const actualizarAsistenteFormSchema = z.object({
    nombre: z.string().min(1, { message: "El nombre es obligatorio." }).trim(),
    descripcion: z.string().trim().nullish().transform(val => val || null),
    version: z.preprocess(
        val => (val === "" || val === undefined || val === null) ? 1.0 : Number(val),
        z.number().positive({ message: "La versión debe ser un número positivo." }).default(1.0)
    ),
    negocioId: z.string().cuid({ message: "Debe seleccionar un negocio válido." }).nullable(),
    status: z.string().min(1, { message: "El status es requerido" }), // Podría ser un z.enum(['activo', 'inactivo'])
    whatsappBusiness: z.string().trim().nullish().transform(val => val || null),
    phoneNumberId: z.string().trim().nullish().transform(val => val || null),
    token: z.string().trim().nullish().transform(val => val || null), // No se muestra, pero se podría actualizar
    // nombreHITL: z.string().trim().nullish().transform(val => val || null),
    // whatsappHITL: z.string().trim().nullish().transform(val => val || null),
    // emailHITL: z.string().email({ message: "Email HITL inválido." }).nullish().transform(val => val || null),
    // emailCalendario: z.string().email({ message: "Email de calendario inválido." }).nullish().transform(val => val || null),
    // urlImagen se maneja por un componente separado.
    // precioBase se omite.
    // origen, clienteId no suelen ser editables directamente en este formulario.
});
export type ActualizarAsistenteFormInput = z.infer<typeof actualizarAsistenteFormSchema>;

// Schema para los datos completos de un AsistenteVirtual para mostrar en el formulario de edición
// (lo que devuelve obtenerAsistenteVirtualPorIdAction)
export const asistenteDetalleDataSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    urlImagen: z.string().nullable(),
    origen: z.string().nullable(),
    whatsappBusiness: z.string().nullable(),
    phoneNumberId: z.string().nullable(),
    token: z.string().nullable(), // Considerar no enviar el token completo al cliente
    // nombreHITL: z.string().nullable(),
    // whatsappHITL: z.string().nullable(),
    // emailHITL: z.string().nullable(),
    // emailCalendario: z.string().nullable(),
    // precioBase: z.number().nullable(), // Omitido
    version: z.number(),
    status: z.string(),
    createdAt: z.date(),
    updatedAt: z.date(),
    negocioId: z.string().cuid().nullable(),
    clienteId: z.string().cuid().nullable(), // El clienteId del asistente
    negocio: negocioParaDropdownSchema.omit({ cliente: true }).nullable(), // Negocio simplificado, sin el cliente anidado aquí para evitar redundancia
    // No incluimos relaciones de tareas, conversaciones, etc., aquí.
    // Esas se cargarán por separado si es necesario para otras secciones.
});
export type AsistenteDetalleData = z.infer<typeof asistenteDetalleDataSchema>;


// --- SCHEMAS PARA AVATAR DEL ASISTENTE ---

// Schema para el resultado de la acción de actualizar avatar
export const actualizarAvatarResultSchema = z.object({
    urlImagen: z.string().url(),
    // podríamos añadir el nuevo tamaño del archivo si fuera relevante para la UI
    // fileSize: z.number().int().optional() 
});
export type ActualizarAvatarResultData = z.infer<typeof actualizarAvatarResultSchema>;

// No necesitamos un schema específico para el resultado de eliminarAvatar,
// ya que `ActionResult<null>` o `ActionResult<void>` es suficiente si solo indica éxito/fallo.
// Si quisiéramos devolver el tamaño del archivo eliminado, podríamos añadir un schema.