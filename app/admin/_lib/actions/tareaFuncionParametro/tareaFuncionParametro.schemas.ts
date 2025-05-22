import { z } from 'zod';

// Esquema para la entrada de crear y editar un TareaFuncionParametro
// 'tareaFuncionId' se pasará como argumento separado a la acción, no parte del input principal.
export const TareaFuncionParametroInputSchema = z.object({
    // nombreVisible: z.string().min(1, "El nombre visible es obligatorio.").max(100), // Para la UI y generar el 'nombre'
    nombre: z.string() // Este será el snake_case, generado o validado.
        .min(1, "El nombre del parámetro (snake_case) es obligatorio.")
        .max(100, "El nombre del parámetro no puede exceder los 100 caracteres.")
        .regex(/^[a-z0-9_]+$/, "El nombre del parámetro solo puede contener minúsculas, números y guiones bajos (_)."),
    descripcionParaIA: z.string().min(1, "La descripción para la IA es obligatoria.").max(2000),
    tipoDato: z.string().min(1, "El tipo de dato es obligatorio."), // Podrías usar z.enum() si tienes una lista fija
    esObligatorio: z.boolean().default(true),
    // 'orden' se maneja por la acción de ordenar o al crear.
    valorPorDefecto: z.string().max(255).nullable().optional(),
    ejemploValor: z.string().max(255).nullable().optional(),
});
export type TareaFuncionParametroInput = z.infer<typeof TareaFuncionParametroInputSchema>;

// Esquema para un ítem en la lista de ordenamiento
export const OrdenarParametroItemSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().min(0),
});
export type OrdenarParametroItem = z.infer<typeof OrdenarParametroItemSchema>;

// Esquema para el input de la acción de ordenar parámetros
export const OrdenarParametrosInputSchema = z.array(OrdenarParametroItemSchema);
export type OrdenarParametrosInput = z.infer<typeof OrdenarParametrosInputSchema>;

// Esquema para TareaFuncionParametro con datos adicionales para la UI (como el 'nombreVisible' si se decide mantener)
// Este es el tipo que el componente usará para el estado de la lista de parámetros.
// Incluye un 'nombreVisibleParaUI' que es el que el usuario escribe,
// y 'nombre' que es el snake_case generado.
export const ParametroParaUIListaSchema = z.object({
    id: z.string().cuid(),
    tareaFuncionId: z.string().cuid(),
    nombre: z.string(), // snake_case
    nombreVisibleParaUI: z.string(), // Nombre que el usuario ve y edita en el modal para generar 'nombre'
    descripcionParaIA: z.string(),
    tipoDato: z.string(),
    esObligatorio: z.boolean(),
    orden: z.number().int().nullable(),
    valorPorDefecto: z.string().nullable(),
    ejemploValor: z.string().nullable(),
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type ParametroParaUILista = z.infer<typeof ParametroParaUIListaSchema>;

// Tipo para el estado del formulario del modal.
// 'nombreVisibleParaUI' es lo que el usuario teclea.
// 'nombre' (snake_case) se autogenera a partir de 'nombreVisibleParaUI'.
export type ParametroModalFormData = Partial<Omit<TareaFuncionParametroInput, 'nombre'>> & {
    id?: string; // Para edición
    nombreVisibleParaUI?: string; // Campo que el usuario edita para generar el 'nombre' snake_case
};