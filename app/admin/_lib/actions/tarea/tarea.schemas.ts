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

// Esquema base para una Tarea con detalles mínimos (usado para derivar TareaConDetalles)
// Esto podría expandirse o ajustarse según los datos exactos que necesitemos devolver.
// Por ahora, TareaConDetalles se definirá más explícitamente en actions.ts o un .types.ts
// basado en la respuesta de la query de Prisma, ya que incluye conteos y relaciones complejas.

// Esquema para CategoriaTarea simple (para el filtro)
export const CategoriaTareaSimpleSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    color: z.string().nullable().optional(), // Asumiendo que el color puede ser null
});

export type CategoriaTareaSimple = z.infer<typeof CategoriaTareaSimpleSchema>;


// Definición del tipo TareaConDetalles, basado en lo que ListaTareas.tsx necesita
// y lo que el schema.prisma permite.
export interface TareaConDetalles {
    id: string;
    nombre: string;
    iconoUrl: string | null;
    precio: number | null;
    status: string;
    version: number;
    orden: number | null; // El orden puede ser null inicialmente
    categoriaTareaId: string | null;
    CategoriaTarea: {
        id: string;
        nombre: string;
        color: string | null;
    } | null;
    tareaFuncion: {
        id: string;
        nombreVisible: string;
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


// --- NUEVOS ESQUEMAS PARA TareaEditarForm ---

// Esquema para los datos que se cargan en el formulario de edición
// Basado en tu tipo TareaParaEditar
export const TareaParaEditarSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcionMarketplace: z.string().nullable().optional(), // Antes 'descripcion'
    // descripcionTool: z.string().nullable().optional(),
    instruccion: z.string().nullable().optional(),
    precio: z.number().nullable().optional(),
    rol: z.string().nullable().optional(),
    personalidad: z.string().nullable().optional(),
    version: z.number().optional(),
    status: z.string(), // Podría ser z.enum si tienes status fijos
    categoriaTareaId: z.string().cuid().nullable().optional(),
    iconoUrl: z.string().url("Debe ser una URL válida.").nullable().optional(),

    // Información de la TareaFuncion asociada (solo ID y nombre para mostrar)
    tareaFuncion: z.object({
        id: z.string().cuid(),
        nombre: z.string(), // El nombre camelCase de la función
        // No necesitamos más detalles de la función aquí, se editaría por separado
    }).nullable().optional(),

    // IDs de las relaciones para preseleccionar en el formulario
    canalesSoportados: z.array(z.object({ // Representa TareaCanal
        canalConversacionalId: z.string().cuid(),
        canalConversacional: z.object({ // Para mostrar el nombre en el form si es necesario
            id: z.string().cuid(),
            nombre: z.string(),
            icono: z.string().nullable().optional(),
        }),
    })).optional(),

    etiquetas: z.array(z.object({ // Representa TareaEtiqueta
        etiquetaTareaId: z.string().cuid(),
        etiquetaTarea: z.object({ // Para mostrar el nombre
            id: z.string().cuid(),
            nombre: z.string(),
        }).nullable().optional(), // etiquetaTarea podría ser null si la relación está rota
    })).optional(),

    updatedAt: z.date(), // O z.string().datetime()
    _count: z.object({ // Para la lógica de eliminación
        AsistenteTareaSuscripcion: z.number().int().optional(),
    }).optional(),


});
export type TareaParaEditar = z.infer<typeof TareaParaEditarSchema>;


// Esquema para la entrada de la acción actualizarTarea
// Basado en tu tipo ActualizarTareaConRelacionesInput
export const ActualizarTareaInputSchema = z.object({
    nombre: z.string().min(3, "El nombre debe tener al menos 3 caracteres.").max(100),
    descripcionMarketplace: z.string().max(1000).nullable().optional(), // Ajusta max lengths
    // descripcionTool: z.string().max(1000).nullable().optional(),
    instruccion: z.string().max(2000).nullable().optional(),
    precio: z.number().min(0, "El precio no puede ser negativo.").nullable().optional(),
    rol: z.string().max(50).nullable().optional(),
    personalidad: z.string().max(50).nullable().optional(),
    version: z.number(),
    status: z.string(), // Podría ser z.enum(['activo', 'inactivo', 'beta'])
    categoriaTareaId: z.string().cuid("Categoría inválida.").nullable().optional(),
    // tareaFuncionId NO se actualiza aquí directamente para cambiar a OTRA función,
    // porque la TareaFuncion es única para la Tarea.
    // Si el nombre de la TareaFuncion (ej. el camelCase) necesita cambiar porque Tarea.nombre cambió,
    // la acción actualizarTarea podría manejar la actualización del TareaFuncion.nombre asociado.
    iconoUrl: z.string().url("URL de icono inválida.").nullable().optional(),

    // IDs para las relaciones M-N
    canalIds: z.array(z.string().cuid()).optional().default([]),
    etiquetaIds: z.array(z.string().cuid()).optional().default([]),
});
export type ActualizarTareaInput = z.infer<typeof ActualizarTareaInputSchema>;