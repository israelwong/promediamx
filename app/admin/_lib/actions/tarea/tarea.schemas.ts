// /admin/_lib/actions/tarea/tarea.schemas.ts
import { z } from 'zod';

// Esquema para la información básica de una tarea (ID, nombre, descripción)
// Esto es lo que la acción obtenerTareasBaseAction devolverá por cada tarea.
export const tareaBaseInfoSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(), // La descripción puede ser opcional/nula
});
export type TareaBaseInfoData = z.infer<typeof tareaBaseInfoSchema>;

export const categoriaParaTareaSchema = z.object({
    nombre: z.string(),
    color: z.string().nullable().optional(), // Si lo necesitas para la card
}).nullable();

export const etiquetaParaTareaSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
});

export const tareaParaMarketplaceSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    precio: z.number().nullable(),
    categoriaTareaId: z.string().cuid().nullable(), // Categoria puede ser opcional
    CategoriaTarea: categoriaParaTareaSchema,
    etiquetas: z.array(
        z.object({
            etiquetaTarea: etiquetaParaTareaSchema.nullable(), // etiquetaTarea puede ser null
        })
    ).default([]),
    _count: z.object({
        AsistenteTareaSuscripcion: z.number().int().default(0),
        TareaGaleria: z.number().int().default(0),
    }),
    // Campos adicionales que podrías querer para la lógica del admin:
    // status: z.string().optional(),
    // esTareaPorDefecto: z.boolean().optional(),
});
export type TareaParaMarketplaceData = z.infer<typeof tareaParaMarketplaceSchema>;


// Esquema para el input de la acción de actualizar orden de tareas
export const OrdenarTareaItemSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().min(0),
});

export const OrdenarTareasInputSchema = z.array(OrdenarTareaItemSchema);

// Tipo inferido para el input, si se necesita explícitamente en algún lugar
export type OrdenarTareasInput = z.infer<typeof OrdenarTareasInputSchema>;

// Definición del tipo TareaConDetalles, basado en lo que ListaTareas.tsx necesita
// y lo que el schema.prisma permite.
export interface TareaConDetalles {
    id: string;
    nombre: string;
    iconoUrl: string | null;
    precio: number | null;
    status: string;
    version: number | null;
    orden: number | null; // El orden puede ser null inicialmente
    categoriaTareaId: string | null;
    CategoriaTarea: {
        id: string;
        nombre: string;
        color: string | null;
    } | null;
    tareaFuncion: {
        id: string;
        nombre: string;
    } | null;
    etiquetas: {
        etiquetaTarea: {
            id: string;
            nombre: string;
        };
    }[];
    _count: {
        TareaEjecutada: number;
        TareaGaleria: number;
    };
}


// Esquema para la entrada de la acción crearTarea (basado en tu CrearTareaBasicaInput)
export const CrearTareaBasicaInputSchema = z.object({
    nombre: z.string().min(3, { message: "El nombre de la tarea debe tener al menos 3 caracteres." }).max(100, { message: "El nombre de la tarea no puede exceder los 100 caracteres." }),
    categoriaTareaId: z.string().cuid({ message: "Debe seleccionar una categoría válida." }),
    // canalConversacionalId: z.string().cuid({ message: "Debe seleccionar un canal conversacional válido." }),
    // No incluimos descripcionTool, instruccion, etc., aquí porque es "Paso 1 de 2"
});
export type CrearTareaBasicaInput = z.infer<typeof CrearTareaBasicaInputSchema>;

// Esquema para la salida de la acción crearTarea
export const TareaCreadaOutputSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    // Podríamos añadir más campos si la redirección o el mensaje de éxito los necesitan
});
export type TareaCreadaOutput = z.infer<typeof TareaCreadaOutputSchema>;


// Esquema para los datos que se cargan en el formulario de edición
export const TareaParaEditarSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcionMarketplace: z.string().nullable().optional(),
    instruccion: z.string().nullable().optional(),
    precio: z.number().nullable().optional(),
    rol: z.string().nullable().optional(),
    personalidad: z.string().nullable().optional(),
    version: z.number().nullable().optional(), // De schema.prisma Tarea.version es Float?
    status: z.string(), // Podría ser z.enum si tienes status fijos
    categoriaTareaId: z.string().cuid().nullable().optional(),
    iconoUrl: z.string().url("Debe ser una URL válida.").nullable().optional(),
    updatedAt: z.date(), // O z.string().datetime() si se transforma desde Prisma

    tareaFuncion: z.object({
        id: z.string().cuid(),
        nombre: z.string(), // El nombre camelCase de la función
    }).nullable().optional(),

    // 'canalesSoportados' podría eliminarse si todas las tareas soportan todos los canales por defecto.
    // Si se mantiene, asegurar que el tipo de `canalConversacional` sea el correcto.
    canalesSoportados: z.array(z.object({
        canalConversacionalId: z.string().cuid(),
        canalConversacional: z.object({
            id: z.string().cuid(),
            nombre: z.string(),
            icono: z.string().nullable().optional(),
        }),
    })).optional().default([]), // Default a array vacío si es opcional

    etiquetas: z.array(z.object({
        etiquetaTareaId: z.string().cuid(),
        etiquetaTarea: z.object({
            id: z.string().cuid(),
            nombre: z.string(),
        }).nullable().optional(),
    })).optional().default([]), // Default a array vacío

    _count: z.object({
        AsistenteTareaSuscripcion: z.number().int().optional(),
    }).optional(),
});
export type TareaParaEditar = z.infer<typeof TareaParaEditarSchema>;

// Esquema para la entrada de la acción actualizarTarea
export const ActualizarTareaInputSchema = z.object({
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
    descripcionMarketplace: z.string().max(1000).nullable().optional(),
    instruccion: z.string().nullable().optional(),
    precio: z.number().min(0, "El precio no puede ser negativo.").nullable().optional(),
    rol: z.string().max(50).nullable().optional(),
    personalidad: z.string().max(50).nullable().optional(),
    version: z.number().min(0.1, "La versión debe ser al menos 0.1").nullable().optional(), // Hacerla opcional y validar mínimo si se provee
    status: z.enum(['activo', 'inactivo', 'beta', 'proximamente'], {
        message: "Status inválido."
    }),
    categoriaTareaId: z.string().cuid("Categoría inválida.").nullable().optional(),
    iconoUrl: z.string().url("URL de icono inválida.").nullable().optional(),
    funcionDescripcion: z.string().nullable().optional(),
    etiquetaIds: z.array(z.string().cuid()).optional().default([]),
});
export type ActualizarTareaInput = z.infer<typeof ActualizarTareaInputSchema>;

// Nuevo Schema para un item de tarea individual al actualizar orden por grupo
export const TareaOrdenadaInputSchema = z.object({
    id: z.string().cuid("El ID de la tarea no es válido."),
    orden: z.number().int().min(0, "El orden no puede ser negativo."), // Nuevo orden 0-based dentro del grupo
});
export type TareaOrdenadaInput = z.infer<typeof TareaOrdenadaInputSchema>;

// Nuevo Schema para la entrada de la acción actualizarOrdenTareas (por grupo)
export const ActualizarOrdenTareasPorGrupoInputSchema = z.object({
    categoriaTareaId: z.string().cuid("El ID de la categoría no es válido.").nullable(), // null para tareas sin categoría
    tareasOrdenadas: z.array(TareaOrdenadaInputSchema)
        .min(1, "Se requiere al menos una tarea para actualizar el orden."), // Opcional: .default([]) si permites un array vacío
});
export type ActualizarOrdenTareasPorGrupoInput = z.infer<typeof ActualizarOrdenTareasPorGrupoInputSchema>;

export const CategoriaTareaSimpleSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    color: z.string().nullable().optional(),
    // orden: z.number().int().nullable().optional(), // Descomentar si añades 'orden' a CategoriaTarea
});
export type CategoriaTareaSimple = z.infer<typeof CategoriaTareaSimpleSchema>;

export interface TareaConDetalles {
    id: string;
    nombre: string;
    iconoUrl: string | null;
    precio: number | null;
    status: string;
    version: number | null; // Ajustado de tu schema.prisma Tarea.version es Float?, pero usualmente se maneja como int en UI.
    // Si es Float, el tipo aquí debería ser number | null.
    // El schema TareaParaEditar lo tiene como number().optional()
    orden: number | null;
    categoriaTareaId: string | null;
    CategoriaTarea: {
        id: string;
        nombre: string;
        color: string | null;
        // orden: number | null; // Descomentar si añades 'orden' a CategoriaTarea
    } | null;
    tareaFuncion: {
        id: string;
        nombre: string; // Nombre camelCase de la función
    } | null;
    etiquetas: {
        etiquetaTarea: {
            id: string;
            nombre: string;
        };
    }[];
    _count: {
        TareaEjecutada: number;
        TareaGaleria: number;
    };
}