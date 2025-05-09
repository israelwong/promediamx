// Ruta: app/admin/_lib/funciones/aceptarOferta.actions.ts
'use server';

import prisma from '../prismaClient';
import { ActionResult } from '../types';
import { AceptarOfertaArgs, AceptarOfertaData } from './aceptarOferta.type';

async function actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId: string, mensajeError: string) {
    try {
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({ error: `Error en aceptarOferta: ${mensajeError}` })
            }
        });
    } catch (updateError) {
        console.error(`[aceptarOferta] Error al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}

export async function ejecutarAceptarOfertaAction(
    argumentos: AceptarOfertaArgs,
    tareaEjecutadaId: string
): Promise<ActionResult<AceptarOfertaData>> {
    console.log(`[Ejecución Función] Iniciando ejecutarAceptarOfertaAction para TareaEjecutada ${tareaEjecutadaId}`);
    console.log("[Ejecución Función] Argumentos recibidos:", argumentos);

    if (!argumentos.negocioId) {
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Falta el ID del negocio.");
        return { success: false, error: "Falta el ID del negocio." };
    }
    if (!argumentos.oferta_id) {
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, "Falta el ID de la oferta.");
        // Este mensaje podría ser para el usuario si la IA no pudo extraer el oferta_id
        return {
            success: true, // La acción se ejecutó, pero la IA falló en proveer el dato
            data: {
                nombreOferta: "Desconocida",
                mensajeSiguientePaso: "No pude identificar claramente a qué oferta te refieres para proceder. ¿Podrías mencionarla de nuevo?"
            }
        };
    }

    try {
        const ahora = new Date();
        const oferta = await prisma.oferta.findUnique({
            where: {
                id: argumentos.oferta_id,
                negocioId: argumentos.negocioId, // Asegurar que la oferta pertenezca al negocio correcto
            },
            select: {
                id: true,
                nombre: true,
                linkPago: true, // El nuevo campo que agregaste
                status: true,
                fechaInicio: true,
                fechaFin: true,
                // Podrías seleccionar otros campos si son necesarios para determinar los "siguientes pasos"
            }
        });

        if (!oferta) {
            await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Oferta con ID ${argumentos.oferta_id} no encontrada para el negocio.`);
            return {
                success: true,
                data: {
                    nombreOferta: "Desconocida",
                    mensajeSiguientePaso: `Lo siento, no pude encontrar la oferta que mencionaste. Quizás ya no está disponible.`
                }
            };
        }

        if (oferta.status !== 'activo' || oferta.fechaInicio > ahora || oferta.fechaFin < ahora) {
            await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, `Oferta ${oferta.nombre} (ID: ${oferta.id}) no está activa o está fuera de vigencia.`);
            return {
                success: true,
                data: {
                    nombreOferta: oferta.nombre,
                    mensajeSiguientePaso: `Lo siento, la oferta "${oferta.nombre}" ya no se encuentra disponible o está fuera de su periodo de vigencia.`
                }
            };
        }

        let mensajeSiguientePaso = "";

        if (oferta.linkPago) {
            if (argumentos.canalNombre?.toLowerCase() === 'web chat' || argumentos.canalNombre?.toLowerCase() === 'webchat') {
                // Estilo simple, puedes mejorarlo con clases CSS
                // mensajeSiguientePaso = `¡Excelente! Puedes completar tu compra o activar la oferta "<span class="math-inline">\{oferta\.nombre\}" directamente haciendo clic aquí\: <a href\="</span>{oferta.linkPago}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">Ir al pago seguro</a>. Avísame si tienes algún problema.`;
                mensajeSiguientePaso = `¡Excelente! Puedes completar tu compra o activar la oferta "${oferta.nombre}" directamente haciendo clic aquí: <a href="${oferta.linkPago}" target="_blank" rel="noopener noreferrer" style="color: #60a5fa; text-decoration: underline;">Ir al pago seguro</a>. Avísame si tienes algún problema.`;
            } else {
                // Para WhatsApp u otros canales de solo texto
                mensajeSiguientePaso = `¡Excelente! Puedes completar tu compra o activar la oferta "${oferta.nombre}" directamente en este enlace de pago seguro: ${oferta.linkPago}`;
            }
        } else {
            mensajeSiguientePaso = `¡Genial que quieras aprovechar la oferta "${oferta.nombre}"! Para continuar, un asesor se pondrá en contacto contigo a la brevedad para ayudarte a completarla.`;
        }

        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({ resultado: { ofertaId: oferta.id, linkProporcionado: !!oferta.linkPago } })
            }
        }).catch(updateError => console.error("[aceptarOferta] Error al actualizar TareaEjecutada:", updateError));

        const resultado: AceptarOfertaData = {
            nombreOferta: oferta.nombre,
            linkDePago: oferta.linkPago,
            mensajeSiguientePaso: mensajeSiguientePaso
        };

        return { success: true, data: resultado };

    } catch (error) {
        console.error("[Ejecución Función] Error al procesar aceptación de oferta:", error);
        await actualizarTareaEjecutadaFallidaInterna(tareaEjecutadaId, error instanceof Error ? error.message : "Error desconocido al procesar la oferta.");
        return {
            success: false,
            error: error instanceof Error ? error.message : "Error interno al procesar tu solicitud para la oferta."
        };
    }
}