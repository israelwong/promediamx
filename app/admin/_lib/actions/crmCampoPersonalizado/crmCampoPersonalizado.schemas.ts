import { z } from 'zod';

// Tipos de datos permitidos para los campos personalizados
export const tipoCampoPersonalizadoEnum = z.enum(['texto', 'numero', 'fecha', 'booleano']);
export type TipoCampoPersonalizado = z.infer<typeof tipoCampoPersonalizadoEnum>;




// Esquema para un CRMCampoPersonalizado (basado en tu modelo Prisma)
export const crmCampoPersonalizadoSchema = z.object({
    id: z.string().cuid(),
    crmId: z.string().cuid(),
    nombre: z.string().min(1, "El nombre visible es requerido."), // Nombre visible para el usuario
    nombreCampo: z.string().min(1, "El nombre interno del campo es requerido."), // Nombre interno (ID para la BD/código)
    descripcionParaIA: z.string().nullable().optional(), // Opcional, para IA
    tipo: tipoCampoPersonalizadoEnum,
    requerido: z.boolean().default(false),
    status: z.string().default('activo'), // Podría ser z.enum(['activo', 'inactivo'])
    orden: z.number().int(), // El servidor se encargará de que siempre tenga un valor
    createdAt: z.date(),
    updatedAt: z.date(),
});
export type CrmCampoPersonalizadoData = z.infer<typeof crmCampoPersonalizadoSchema>;

// Esquema para el resultado de la acción que obtiene los campos y el crmId
export const obtenerCamposPersonalizadosCrmResultSchema = z.object({
    crmId: z.string().cuid().nullable(),
    campos: z.array(crmCampoPersonalizadoSchema),
});
export type ObtenerCamposPersonalizadosCrmResultData = z.infer<typeof obtenerCamposPersonalizadosCrmResultSchema>;

// Esquema para los parámetros de entrada de listarCamposPersonalizadosCrmAction
export const listarCamposPersonalizadosCrmParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ListarCamposPersonalizadosCrmParams = z.infer<typeof listarCamposPersonalizadosCrmParamsSchema>;

// Esquema para el formulario de creación/edición de Campo Personalizado
// export const campoPersonalizadoFormSchema = z.object({
//     nombre: z.string().min(1, "El nombre visible es obligatorio.").max(100, "Nombre demasiado largo."),
//     // nombreCampo se genera automáticamente al crear, y no es editable después.
//     tipo: tipoCampoPersonalizadoEnum,
//     requerido: z.boolean().default(false),
//     status: z.string().default('activo'), // No editable en el modal actual, pero se puede añadir
//     // descripcionParaIA: z.string().nullable().optional(), // Si se quiere editar en el modal
// });
// export type CampoPersonalizadoFormData = z.infer<typeof campoPersonalizadoFormSchema>;

// // Esquema para los parámetros de entrada de la acción crearCampoPersonalizadoCrmAction
// export const crearCampoPersonalizadoCrmParamsSchema = z.object({
//     crmId: z.string().cuid("Se requiere el ID del CRM."),
//     nombre: z.string().min(1).max(100),
//     nombreCampo: z.string().min(1, "El nombre interno del campo es requerido.").max(50)
//         .regex(/^[a-z0-9_]+$/, "Nombre interno solo puede contener minúsculas, números y guiones bajos."), // Validar formato
//     tipo: tipoCampoPersonalizadoEnum,
//     requerido: z.boolean().optional(),
//     status: z.string().optional(),
//     // descripcionParaIA: z.string().nullable().optional(),
// });
// export type CrearCampoPersonalizadoCrmParams = z.infer<typeof crearCampoPersonalizadoCrmParamsSchema>;

// // Esquema para los parámetros de entrada de la acción editarCampoPersonalizadoCrmAction
// // nombreCampo y tipo no son editables una vez creados generalmente.
// export const editarCampoPersonalizadoFormSchema = z.object({
//     nombre: z.string().min(1, "El nombre visible es obligatorio.").max(100),
//     // tipo: tipoCampoPersonalizadoEnum, // No se edita
//     // nombreCampo: z.string(), // No se edita
//     requerido: z.boolean().default(false),
//     status: z.string().default('activo'),
//     // descripcionParaIA: z.string().nullable().optional(),
// });
// export type EditarCampoPersonalizadoFormData = z.infer<typeof editarCampoPersonalizadoFormSchema>;

// export const editarCampoPersonalizadoCrmParamsSchema = z.object({
//     campoId: z.string().cuid(),
//     datos: editarCampoPersonalizadoFormSchema,
// });
// export type EditarCampoPersonalizadoCrmParams = z.infer<typeof editarCampoPersonalizadoCrmParamsSchema>;


// Esquema para los parámetros de entrada de la acción eliminarCampoPersonalizadoCrmAction
export const eliminarCampoPersonalizadoCrmParamsSchema = z.object({
    campoId: z.string().cuid(),
});
export type EliminarCampoPersonalizadoCrmParams = z.infer<typeof eliminarCampoPersonalizadoCrmParamsSchema>;

// Esquema para un ítem en la lista de reordenamiento de campos
export const campoPersonalizadoOrdenSchema = z.object({
    id: z.string().cuid(),
    orden: z.number().int().min(1),
});

// Esquema para los parámetros de entrada de la acción reordenarCamposPersonalizadosCrmAction
export const reordenarCamposPersonalizadosCrmParamsSchema = z.object({
    crmId: z.string().cuid("Se requiere el ID del CRM."),
    camposOrdenados: z.array(campoPersonalizadoOrdenSchema),
});
export type ReordenarCamposPersonalizadosCrmParams = z.infer<typeof reordenarCamposPersonalizadosCrmParamsSchema>;






export const campoPersonalizadoFormSchema = z.object({
    nombre: z.string().min(1, "El nombre visible es obligatorio.").max(100, "Nombre demasiado largo."),
    tipo: tipoCampoPersonalizadoEnum,
    // requerido: z.boolean().default(false), // <-- LÍNEA ANTIGUA
    requerido: z.boolean(),                // <-- LÍNEA NUEVA
    // status: z.string().default('activo'),   // <-- LÍNEA ANTIGUA
    status: z.string(),                     // <-- LÍNEA NUEVA
    // Nota: nombreCampo no es parte de este schema porque se genera/no es editable directamente en el form.
});
export type CampoPersonalizadoFormData = z.infer<typeof campoPersonalizadoFormSchema>;
// Ahora CampoPersonalizadoFormData tendrá:
// nombre: string;
// tipo: "texto" | "numero" | "fecha" | "booleano";
// requerido: boolean;
// status: string;

// ... (CrearCampoPersonalizadoCrmParamsSchema y EditarCampoPersonalizadoCrmParamsSchema
//      deben usar CampoPersonalizadoFormData o su variación para 'datos')

// Ajustar Crear y Editar Params Schemas para que 'datos' use el CampoPersonalizadoFormData actualizado
// y para que 'nombreCampo' (solo en crear) y otros campos necesarios para la acción estén bien definidos.

export const crearCampoPersonalizadoCrmParamsSchema = z.object({
    crmId: z.string().cuid("Se requiere el ID del CRM."),
    nombre: z.string().min(1).max(100), // Viene de CampoPersonalizadoFormData.nombre
    nombreCampo: z.string().min(1, "El nombre interno del campo es requerido.").max(50)
        .regex(/^[a-z0-9_]+$/, "Nombre interno solo puede contener minúsculas, números y guiones bajos."),
    tipo: tipoCampoPersonalizadoEnum, // Viene de CampoPersonalizadoFormData.tipo
    requerido: z.boolean().optional(), // Viene de CampoPersonalizadoFormData.requerido (ya es boolean)
    status: z.string().optional(),     // Viene de CampoPersonalizadoFormData.status (ya es string)
    descripcionParaIA: z.string().nullable().optional(),
});
export type CrearCampoPersonalizadoCrmParams = z.infer<typeof crearCampoPersonalizadoCrmParamsSchema>;


// Para editar, nombreCampo y tipo usualmente no se cambian.
export const editarCampoPersonalizadoFormSchema = z.object({
    nombre: z.string().min(1, "El nombre visible es obligatorio.").max(100),
    requerido: z.boolean(), // No opcional, viene del formulario
    status: z.string(),   // No opcional, viene del formulario
    // descripcionParaIA: z.string().nullable().optional(), // Si lo incluyes en el form
});
export type EditarCampoPersonalizadoFormData = z.infer<typeof editarCampoPersonalizadoFormSchema>;

export const editarCampoPersonalizadoCrmParamsSchema = z.object({
    campoId: z.string().cuid(),
    datos: editarCampoPersonalizadoFormSchema, // Schema específico para los datos editables
});
export type EditarCampoPersonalizadoCrmParams = z.infer<typeof editarCampoPersonalizadoCrmParamsSchema>;
