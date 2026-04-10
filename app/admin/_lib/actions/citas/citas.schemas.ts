import { z } from 'zod';
import { StatusAgenda as PrismaStatusAgendaEnum } from '@prisma/client';

// Zod enum para el estado de la cita
export const CitaStatusZodEnum = z.nativeEnum(PrismaStatusAgendaEnum);

// Esquema principal para una cita en la UI
export const CitaSchema = z.object({
    id: z.string().cuid(),
    fecha: z.date(),
    asunto: z.string(),
    status: CitaStatusZodEnum,
    lead: z.object({
        nombre: z.string(),
        telefono: z.string().nullable(),
    }),
    // El tipo de cita puede no estar siempre vinculado
    tipoDeCita: z.object({
        nombre: z.string(),
        duracionMinutos: z.number().int().nullable(),
    }).nullable(),
});

// Tipo inferido para usar en los componentes
export type CitaType = z.infer<typeof CitaSchema>;

// import { StatusAgenda } from '@prisma/client';
export enum StatusAgenda {
    COMPLETADA = "COMPLETADA",
    NO_ASISTIO = "NO_ASISTIO",
    // Agrega aquí otros estados si existen
}



// Esquema para la entrada de la acción
export const listarCitasParamsSchema = z.object({
    negocioId: z.string().cuid(),
    page: z.number().int().positive().default(1),
    pageSize: z.number().int().positive().default(10),
});



// Esquema para una cita individual en la tabla
export const CitaParaTablaSchema = z.object({
    id: z.string(),
    fecha: z.date(),
    leadId: z.string(),
    leadNombre: z.string(),
    leadTelefono: z.string().nullable(),
    pipelineNombre: z.string().nullable(),
});
export type CitaParaTabla = z.infer<typeof CitaParaTablaSchema>;

// Este es el tipo que tu acción retorna, que es más complejo.
// Lo mantenemos por si lo usas en otro lado, pero la tabla usará el tipo aplanado.
export const CitaListItemSchema = z.object({
    id: z.string(),
    asunto: z.string(),
    status: z.string(),
    start: z.date(),
    lead: z.object({
        id: z.string(),
        nombre: z.string(),
        telefono: z.string().nullable(),
        Pipeline: z.object({
            nombre: z.string(),
        }).nullable(),
    }),
    tipoDeCita: z.object({
        nombre: z.string(),
    }).nullable(),
});
export type CitaListItem = z.infer<typeof CitaListItemSchema>;

// Esquema para el resultado completo, incluyendo paginación
export const ListarCitasResultSchema = z.object({
    citas: z.array(CitaParaTablaSchema),
    totalCount: z.number(),
    startIndex: z.number(),
});
export type ListarCitasResult = z.infer<typeof ListarCitasResultSchema>;



// CORRECCIÓN 3: Actualizamos también el esquema para la acción de cambio de estado.
export const actualizarEstadoCitaParamsSchema = z.object({
    agendaId: z.string().cuid(),
    nuevoEstado: z.nativeEnum(StatusAgenda),
});


// ✅ ESQUEMA ACTUALIZADO PARA EL CALENDARIO: Este es el esquema que el calendario espera.
// Se ha añadido `duracionMinutos` para poder calcular la hora de fin del evento.
export const CitaParaCalendarioSchema = z.object({
    id: z.string(),
    asunto: z.string(),
    start: z.date(), // 'start' es la fecha de inicio
    lead: z.object({
        id: z.string(),
        nombre: z.string(),
    }),
    tipoDeCita: z.object({
        nombre: z.string(),
        duracionMinutos: z.number().nullable(), // Se añade la duración
    }).nullable(),
});
export type CitaParaCalendario = z.infer<typeof CitaParaCalendarioSchema>;

// Para obtener las etapas del pipeline para el filtro
export const EtapaPipelineSimpleSchema = z.object({
    id: z.string(),
    nombre: z.string(),
});
export type EtapaPipelineSimple = z.infer<typeof EtapaPipelineSimpleSchema>;