'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { ActionResult } from '@/app/admin/_lib/types';
import {
    type InformarHorarioArgs, // Tipo inferido de Zod
    InformarHorarioDataSchema, // Schema para validar salida
    type InformarHorarioData    // Tipo inferido de Zod
} from './informarHorarioDeAtencion.schemas';
import { DiaSemana as PrismaDiaSemana } from '@prisma/client'; // Enum de Prisma
import { format, startOfDay, addMonths } from 'date-fns';
import { es } from 'date-fns/locale';

// Helper para actualizar TareaEjecutada (como lo tienes)
async function actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId: string, mensajeError: string) {
    try {
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: JSON.stringify({ error_funcion_horario: mensajeError }) }
        });
    } catch (updateError) {
        console.error(`[informarHorario] Error al actualizar TareaEjecutada ${tareaEjecutadaId}:`, updateError);
    }
}

// Orden y nombres para los días de la semana
const DIAS_SEMANA_ORDENADOS: PrismaDiaSemana[] = [
    PrismaDiaSemana.LUNES,
    PrismaDiaSemana.MARTES,
    PrismaDiaSemana.MIERCOLES,
    PrismaDiaSemana.JUEVES,
    PrismaDiaSemana.VIERNES,
    PrismaDiaSemana.SABADO,
    PrismaDiaSemana.DOMINGO,
];

const NOMBRES_DIAS_SEMANA: Record<PrismaDiaSemana, string> = {
    [PrismaDiaSemana.LUNES]: "Lunes",
    [PrismaDiaSemana.MARTES]: "Martes",
    [PrismaDiaSemana.MIERCOLES]: "Miércoles",
    [PrismaDiaSemana.JUEVES]: "Jueves",
    [PrismaDiaSemana.VIERNES]: "Viernes",
    [PrismaDiaSemana.SABADO]: "Sábado",
    [PrismaDiaSemana.DOMINGO]: "Domingo",
};


export async function ejecutarInformarHorarioAction(
    argumentos: InformarHorarioArgs, // Ya validado por el dispatcher
    tareaEjecutadaId: string
): Promise<ActionResult<InformarHorarioData>> {
    console.log(`[Función Ejecutada] ejecutarInformarHorarioAction para Tarea ${tareaEjecutadaId}, Negocio ${argumentos.negocioId}`);

    try {
        const negocio = await prisma.negocio.findUnique({
            where: { id: argumentos.negocioId },
            select: { nombre: true }
        });

        if (!negocio) {
            await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Negocio ${argumentos.negocioId} no encontrado.`);
            return { success: false, error: `Negocio no encontrado.` };
        }

        const horariosRegulares = await prisma.horarioAtencion.findMany({
            where: { negocioId: argumentos.negocioId },
            // No es necesario ordenar aquí si lo vamos a procesar con DIAS_SEMANA_ORDENADOS
        });

        // Obtener excepciones, por ejemplo, para los próximos 3 meses
        const hoy = startOfDay(new Date());
        const futuro3Meses = addMonths(hoy, 3);
        const excepciones = await prisma.excepcionHorario.findMany({
            where: {
                negocioId: argumentos.negocioId,
                fecha: { gte: hoy, lte: futuro3Meses }, // Excepciones futuras
                esDiaNoLaborable: true, // Solo las que son días no laborables
            },
            orderBy: { fecha: 'asc' },
            select: { fecha: true, descripcion: true }
        });

        let mensajeRespuesta = "";
        let tieneHorarioRegular = false;

        if (horariosRegulares.length > 0) {
            tieneHorarioRegular = true;
            mensajeRespuesta = `Los horarios de atención para ${negocio.nombre} son:\n`;

            const horariosPorDiaMap = new Map<PrismaDiaSemana, string>();
            horariosRegulares.forEach(h => {
                horariosPorDiaMap.set(h.dia, `${h.horaInicio} - ${h.horaFin}`);
            });

            let grupoActual = { inicio: "", fin: "", horario: "" };
            const segmentosDeHorario: string[] = [];

            for (let i = 0; i < DIAS_SEMANA_ORDENADOS.length; i++) {
                const diaActual = DIAS_SEMANA_ORDENADOS[i];
                const horarioDia = horariosPorDiaMap.get(diaActual);

                if (horarioDia) {
                    if (grupoActual.horario === horarioDia) { // Continuar grupo
                        grupoActual.fin = NOMBRES_DIAS_SEMANA[diaActual];
                    } else { // Nuevo grupo o fin de grupo anterior
                        if (grupoActual.inicio) { // Guardar grupo anterior
                            segmentosDeHorario.push(`${grupoActual.inicio}${grupoActual.inicio !== grupoActual.fin ? ` a ${grupoActual.fin}` : ''}: ${grupoActual.horario}`);
                        }
                        grupoActual = { inicio: NOMBRES_DIAS_SEMANA[diaActual], fin: NOMBRES_DIAS_SEMANA[diaActual], horario: horarioDia };
                    }
                } else { // Día sin horario (cerrado)
                    if (grupoActual.inicio) { // Guardar grupo anterior si existía
                        segmentosDeHorario.push(`${grupoActual.inicio}${grupoActual.inicio !== grupoActual.fin ? ` a ${grupoActual.fin}` : ''}: ${grupoActual.horario}`);
                        grupoActual = { inicio: "", fin: "", horario: "" }; // Resetear grupo
                    }
                    // Opcional: mencionar días cerrados si no hay muchos, o un "Domingos: Cerrado"
                }
            }
            // Guardar el último grupo
            if (grupoActual.inicio) {
                segmentosDeHorario.push(`${grupoActual.inicio}${grupoActual.inicio !== grupoActual.fin ? ` a ${grupoActual.fin}` : ''}: ${grupoActual.horario}`);
            }

            if (segmentosDeHorario.length > 0) {
                mensajeRespuesta += segmentosDeHorario.join('\n');
            } else { // Podría pasar si los horarios no están en DIAS_SEMANA_ORDENADOS (raro)
                mensajeRespuesta += "No tenemos un horario regular configurado en este momento.";
            }

        } else {
            mensajeRespuesta = `Actualmente no tenemos un horario de atención regular registrado para ${negocio.nombre}.`;
        }

        if (excepciones.length > 0) {
            if (tieneHorarioRegular) {
                mensajeRespuesta += "\n\nAdicionalmente, ten en cuenta los siguientes días no laborables (o con horario especial si implementas esa lógica):\n";
            } else {
                mensajeRespuesta += "\nSin embargo, ten en cuenta los siguientes días no laborables:\n";
            }
            excepciones.forEach(ex => {
                mensajeRespuesta += `- ${format(new Date(ex.fecha), "EEEE d 'de' MMMM", { locale: es })}${ex.descripcion ? ` (${ex.descripcion})` : ''}\n`;
            });
        }

        // TODO: Lógica para argumentos.diaEspecifico y argumentos.verificarAbiertoAhora
        // Si se proporcionan, esta función podría refinar 'mensajeRespuesta'
        // o devolver datos estructurados adicionales para que la IA los interprete.
        // Por ahora, la función se centra en el horario general como solicitaste.

        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: { metadata: JSON.stringify({ resultado_horario: "Información de horario generada." }) }
        }).catch(updateError => console.error("[informarHorario] Error al actualizar TareaEjecutada:", updateError));

        const dataToReturn: InformarHorarioData = { respuestaHorario: mensajeRespuesta.trim() };
        const outputValidation = InformarHorarioDataSchema.safeParse(dataToReturn);
        if (!outputValidation.success) {
            console.error("Error Zod en salida de ejecutarInformarHorarioAction:", outputValidation.error.flatten());
            return { success: false, error: "Error interno al formatear respuesta de horario." };
        }

        return { success: true, data: outputValidation.data };

    } catch (error: unknown) {
        console.error("[Función Ejecutada] Error al obtener horario de atención:", error);
        const errorMessage = error instanceof Error ? error.message : "Error interno al obtener el horario.";
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, errorMessage);
        return { success: false, error: errorMessage };
    }
}