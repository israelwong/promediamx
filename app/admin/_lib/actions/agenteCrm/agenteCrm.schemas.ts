import { z } from 'zod';

// Roles permitidos para un Agente (ajusta según tus necesidades)
export const rolAgenteCrmEnum = z.enum(['agente_ventas', 'supervisor_crm', 'admin_crm']);
export type RolAgenteCrm = z.infer<typeof rolAgenteCrmEnum>;

// Status permitidos
export const statusAgenteCrmEnum = z.enum(['activo', 'inactivo']);
export type StatusAgenteCrm = z.infer<typeof statusAgenteCrmEnum>;

// Esquema para un AgenteCRM (basado en tu modelo Prisma y tipo Agente)
export const agenteCrmSchema = z.object({
    id: z.string().cuid(),
    crmId: z.string().cuid(),
    userId: z.string().cuid().nullable().optional(), // ID del modelo Usuario global
    nombre: z.string().nullable(),
    email: z.string().email(),
    telefono: z.string().nullable().optional(),
    rol: rolAgenteCrmEnum.optional(),
    status: statusAgenteCrmEnum.default('activo'),
    createdAt: z.date(),
    updatedAt: z.date(),
    _count: z.object({
        Lead: z.number().int().optional(),
    }).optional(),
});
export type AgenteCrmData = z.infer<typeof agenteCrmSchema>;

// Esquema para el resultado de la acción que obtiene los agentes y el crmId
export const obtenerAgentesCrmResultSchema = z.object({
    crmId: z.string().cuid().nullable(),
    agentes: z.array(agenteCrmSchema),
});
export type ObtenerAgentesCrmResultData = z.infer<typeof obtenerAgentesCrmResultSchema>;

// Esquema para los parámetros de entrada de listarAgentesCrmAction
export const listarAgentesCrmParamsSchema = z.object({
    negocioId: z.string().cuid(),
});
export type ListarAgentesCrmParams = z.infer<typeof listarAgentesCrmParamsSchema>;

// Esquema para el formulario de CREACIÓN de Agente
export const crearAgenteCrmFormSchema = z.object({
    nombre: z.string().min(1, "El nombre es obligatorio.").max(100),
    email: z.string().email("Email inválido.").min(1, "El email es obligatorio."),
    telefono: z.string().nullable().optional().transform(val => val === "" ? null : val),
    password: z.string().min(8, "La contraseña debe tener al menos 8 caracteres."),
    rol: rolAgenteCrmEnum,
    status: statusAgenteCrmEnum,
});
export type CrearAgenteCrmFormData = z.infer<typeof crearAgenteCrmFormSchema>;

// Esquema para los parámetros de entrada de la acción crearAgenteCrmAction
export const crearAgenteCrmParamsSchema = z.object({
    crmId: z.string().cuid("Se requiere el ID del CRM."),
    datos: crearAgenteCrmFormSchema,
});
export type CrearAgenteCrmParams = z.infer<typeof crearAgenteCrmParamsSchema>;


// Esquema para el formulario de EDICIÓN de Agente
// Email y password no se editan a través de este formulario simple.
// Password se manejaría en un flujo de "reset password". Email usualmente es fijo o tiene un proceso de cambio especial.
export const editarAgenteCrmFormSchema = z.object({
    // crmId: z.string().cuid("Se requiere el ID del CRM."),
    nombre: z.string().min(1, "El nombre es obligatorio.").max(100),
    telefono: z.string().nullable().optional().transform(val => val === "" ? null : val),
    rol: rolAgenteCrmEnum,
    status: statusAgenteCrmEnum,
    // email: z.string().email().optional(), // Si permites editar email, pero usualmente no.
});
export type EditarAgenteCrmFormData = z.infer<typeof editarAgenteCrmFormSchema>;

// Esquema para los parámetros de entrada de la acción editarAgenteCrmAction
export const editarAgenteCrmParamsSchema = z.object({
    agenteId: z.string().cuid(),
    datos: editarAgenteCrmFormSchema,
});
export type EditarAgenteCrmParams = z.infer<typeof editarAgenteCrmParamsSchema>;

// Esquema para los parámetros de entrada de la acción eliminarAgenteCrmAction
export const eliminarAgenteCrmParamsSchema = z.object({
    agenteId: z.string().cuid(),
});
export type EliminarAgenteCrmParams = z.infer<typeof eliminarAgenteCrmParamsSchema>;

// Schema para la información básica de un agente (reutilizado)
// Podrías importarlo desde conversacion.schemas.ts si prefieres tenerlo en un solo lugar
export const agenteBasicoCrmSchema = z.object({
    id: z.string().cuid(),
    nombre: z.string().nullable(),
    // Podrías añadir email o userId si es relevante para la UI
    userId: z.string().cuid().optional().nullable(), // El userId del modelo Usuario global
});
export type AgenteBasicoCrmData = z.infer<typeof agenteBasicoCrmSchema>;

export const ObtenerAgenteCrmPorUsuarioInputSchema = z.object({
    usuarioId: z.string().cuid("ID de usuario inválido."),
    negocioId: z.string().cuid("ID de negocio inválido."),
});
export type ObtenerAgenteCrmPorUsuarioInput = z.infer<typeof ObtenerAgenteCrmPorUsuarioInputSchema>;