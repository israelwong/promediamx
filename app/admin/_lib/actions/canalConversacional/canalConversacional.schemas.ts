import { z } from 'zod';

// Esquema para la entrada de crear y editar un Canal Conversacional
// Basado en tu tipo CanalModalSubmitData y CanalConversacionalInput
export const CanalConversacionalInputSchema = z.object({
    nombre: z.string().min(1, "El nombre del canal es obligatorio.").max(100, "El nombre no puede exceder los 100 caracteres."),
    descripcion: z.string().max(200, "La descripción no puede exceder los 200 caracteres.").nullable().optional(),
    icono: z.string().max(50, "El nombre del icono no puede exceder los 50 caracteres.").nullable().optional(),
    status: z.enum(['activo', 'inactivo', 'beta']).default('activo'), // Definimos los status permitidos
});
export type CanalConversacionalInput = z.infer<typeof CanalConversacionalInputSchema>;

// Esquema para un item en la lista de ordenamiento
export const OrdenarCanalItemSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().min(0),
});
export type OrdenarCanalItem = z.infer<typeof OrdenarCanalItemSchema>;

// Esquema para el input de la acción de ordenar canales
export const OrdenarCanalesInputSchema = z.array(OrdenarCanalItemSchema);
export type OrdenarCanalesInput = z.infer<typeof OrdenarCanalesInputSchema>;

// Esquema para la data que se devuelve al crear/editar un canal (podría ser el tipo Prisma directamente)
// Por ahora, definamos uno simple si solo necesitamos ID y nombre, o el objeto completo.
// Usaremos el tipo base de Prisma CanalConversacional, así que no es necesario un schema de output aquí
// a menos que queramos transformar la data.

// Esquema para CanalConDetalles (para la UI) - este es más un tipo de datos de UI
// que una validación de entrada, así que puede permanecer como interfaz en .type.ts o aquí si se prefiere.
// Por coherencia, si no se valida, puede quedarse en .type.ts
// Si se quisiera validar la salida de obtenerCanalesConversacionales:
export const CanalConDetallesSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string(),
    descripcion: z.string().nullable(),
    icono: z.string().nullable(),
    status: z.string(), // Podría ser z.enum(['activo', 'inactivo', 'beta'])
    orden: z.number().int(),
    createdAt: z.date(), // O z.string().datetime() si se transforma
    updatedAt: z.date(), // O z.string().datetime()
    _count: z.object({
        tareasSoportadas: z.number().int().optional(),
        AsistenteVirtual: z.number().int().optional(),
    }).optional(),
});
export type CanalConDetalles = z.infer<typeof CanalConDetallesSchema>;


// Tipos que ya definiste en canalConversacional.type.ts que no son esquemas de input directo para Zod:
// - CanalFormData: Lo usaremos como tipo para el estado del formulario en el componente.
// - CanalConversacionalBasePrisma (importado de types): Lo usaremos como referencia.
// Ya no necesitaríamos CanalModalSubmitData y CanalConversacionalInput como tipos separados si usamos el de Zod.


export interface CanalConversacionalSimple {
    id: string;
    nombre: string;
    icono?: string | null;
}