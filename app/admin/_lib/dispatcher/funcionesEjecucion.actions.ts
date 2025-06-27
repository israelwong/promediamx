// Propuesta para: app/admin/_lib/dispatcher/dispatcher.actions.ts
'use server';
import { type ActionResult } from '../types';
import prisma from '../prismaClient';
import { enviarMensajeInternoYWhatsAppAction, actualizarTareaEjecutadaFallidaDispatcher } from './funcionesEjecucion.helpers';
import type { MediaItem } from '../actions/conversacion/conversacion.schemas';

// Tipos del dispatcher y el registro
import type { FullExecutionFunctionContext, FunctionResponsePayload } from './dispatcher.types'; // Ajusta la ruta
import { functionRegistry } from './functionRegistry'; // El nuevo registro

// -----------------------------------------------------------------------------
// ACCIÓN PRINCIPAL DEL DISPATCHER (REFACTORIZADA)
// -----------------------------------------------------------------------------
export async function dispatchTareaEjecutadaAction(
    tareaEjecutadaId: string
): Promise<ActionResult<null>> {

    // const timestampInicio = Date.now();
    let metadataObj: Record<string, unknown> = {};
    let fullExecContext: FullExecutionFunctionContext;

    let resultadoEjecucionDeFuncion: ActionResult<FunctionResponsePayload | null> | null = null;
    let responseContentParaUsuario: string | null = null;
    let responseMediaParaEnviar: MediaItem[] | null = null;
    let uiPayloadDesdeFuncion: Record<string, unknown> | null = null;

    try {

        const tareaEjecutada = await prisma.tareaEjecutada.findUnique({ where: { id: tareaEjecutadaId } });
        if (!tareaEjecutada) {
            console.error(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - NO ENCONTRADA.`);
            return { success: false, error: `TareaEjecutada con ID ${tareaEjecutadaId} no encontrada.`, data: null };
        }

        if (!tareaEjecutada.metadata) {
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Metadatos faltantes en TareaEjecutada.", null);
            return { success: false, error: "Metadatos no encontrados en TareaEjecutada.", data: null };
        }

        try {
            if (typeof tareaEjecutada.metadata === 'string') metadataObj = JSON.parse(tareaEjecutada.metadata);
            else if (typeof tareaEjecutada.metadata === 'object' && tareaEjecutada.metadata !== null) metadataObj = tareaEjecutada.metadata as Record<string, unknown>;
            else throw new Error("Metadata en formato inesperado o nulo.");
        } catch (e) {
            const parseErrorMsg = e instanceof Error ? e.message : "Error desconocido al parsear metadata.";
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, `Error al parsear metadata: ${parseErrorMsg}`, tareaEjecutada.metadata as unknown as Record<string, unknown>);
            return { success: false, error: `Error al parsear metadatos: ${parseErrorMsg}`, data: null };
        }

        // console.log(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - Metadata parseada.`);
        const {
            funcionLlamada,
            argumentos: argsFromIA,
            conversacionId,
            leadId,
            asistenteVirtualId,
            canalNombre,
            destinatarioWaId,
            negocioPhoneNumberIdEnvia
        } = metadataObj;

        if (
            typeof funcionLlamada !== 'string' || !funcionLlamada.trim() ||
            argsFromIA === undefined || // Permitir null o {} para argsFromIA
            typeof conversacionId !== 'string' ||
            typeof asistenteVirtualId !== 'string' ||
            typeof leadId !== 'string'
        ) {
            const errorMsg = "Metadata crítica incompleta o con tipos incorrectos.";
            console.error(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - ${errorMsg}`, metadataObj);
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, errorMsg, metadataObj);
            return { success: false, error: errorMsg, data: null };
        }

        const asistenteDb = await prisma.asistenteVirtual.findUnique({
            where: { id: asistenteVirtualId as string },
            include: {
                negocio: {
                    select: {
                        id: true,
                        configuracionPago: { select: { monedaPrincipal: true } },
                        // Los campos de idioma se omiten según tu decisión
                    }
                }
            }
        });

        if (!asistenteDb?.negocio?.id) {
            const errorMsg = "Configuración de negocio o asistente no encontrada o incompleta.";
            console.error(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - ${errorMsg} para asistenteId: ${asistenteVirtualId}`);
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, errorMsg, metadataObj);
            return { success: false, error: errorMsg, data: null };
        }

        fullExecContext = {
            conversacionId: conversacionId as string,
            canalNombre: typeof canalNombre === 'string' && canalNombre.trim() !== '' ? canalNombre : "webchat",
            negocioId: asistenteDb.negocio.id,
            asistenteId: asistenteVirtualId as string,
            leadId: leadId as string,
            idiomaLocale: 'es-MX', // Default
            monedaNegocio: asistenteDb.negocio.configuracionPago?.monedaPrincipal || 'MXN',
            tareaEjecutadaId: tareaEjecutadaId,
        };

        const executor = functionRegistry[funcionLlamada as string];

        if (executor) {
            // console.log(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - Ejecutando función: "${funcionLlamada}"`);
            try {
                // argsFromIA se pasa como Record<string, unknown>. La función específica debe validarlo con Zod.
                resultadoEjecucionDeFuncion = await executor(argsFromIA as Record<string, unknown>, fullExecContext);
            } catch (execError: unknown) {
                // Este catch es para errores no controlados DENTRO de la función executor,
                // o errores en la llamada misma si la firma no coincide exactamente (poco probable con TS).
                const errorMsgBase = `Error crítico no capturado durante la ejecución de la función '${funcionLlamada}'`;
                console.error(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - ${errorMsgBase}:`, execError);
                responseContentParaUsuario = `Lo siento, ocurrió un error técnico severo al procesar tu solicitud. Un administrador ha sido notificado.`;
                resultadoEjecucionDeFuncion = { success: false, error: responseContentParaUsuario, data: null };
            }
        } else {
            console.warn(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - Función desconocida o no registrada: "${funcionLlamada}"`);
            responseContentParaUsuario = `La acción solicitada '${funcionLlamada}' no está configurada en el sistema.`;
            resultadoEjecucionDeFuncion = {
                success: true, // Consideramos que el dispatcher manejó esto informando al usuario
                error: `Función '${funcionLlamada}' no encontrada en el registro.`, // Error para logs internos
                data: { content: responseContentParaUsuario, media: null, uiComponentPayload: null }
            };
        }

        let aiContextDataParaHistorial = null; // Inicializar aquí para evitar errores de referencia
        // Procesar el resultado de la función ejecutada
        if (resultadoEjecucionDeFuncion && resultadoEjecucionDeFuncion.success && resultadoEjecucionDeFuncion.data) {
            const dataDeFuncion = resultadoEjecucionDeFuncion.data; // Tipo FunctionResponsePayload | null
            responseContentParaUsuario = dataDeFuncion.content ?? null;
            responseMediaParaEnviar = dataDeFuncion.media ?? null;
            uiPayloadDesdeFuncion = dataDeFuncion.uiComponentPayload ?? null;
            aiContextDataParaHistorial = dataDeFuncion.aiContextData ?? null; // Correcto obtenerlo aquí

        } else if (resultadoEjecucionDeFuncion) { // Función no exitosa
            responseContentParaUsuario = resultadoEjecucionDeFuncion.error || `Hubo un problema al procesar '${funcionLlamada}'.`;
            console.warn(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - Función "${funcionLlamada}" NO tuvo éxito. Error: ${resultadoEjecucionDeFuncion.error}`, "ValidationErrors:", resultadoEjecucionDeFuncion.validationErrors);
            // Si la función específica ya preparó un mensaje de error para el usuario en su .data.content, podríamos usarlo.
            // Por ahora, usamos el .error para el usuario.
            if (resultadoEjecucionDeFuncion.data?.content) { // Si la función fallida preparó un mensaje para el usuario
                responseContentParaUsuario = resultadoEjecucionDeFuncion.data.content;
            }
        } else { // resultadoEjecucionDeFuncion es null (error muy inesperado)
            responseContentParaUsuario = `Respuesta interna inesperada para '${funcionLlamada}'. Contacte a soporte.`;
            resultadoEjecucionDeFuncion = { success: false, error: responseContentParaUsuario, data: null }; // Para el log final
        }

        // Enviar la respuesta al usuario
        if (responseContentParaUsuario || (responseMediaParaEnviar && responseMediaParaEnviar.length > 0) || uiPayloadDesdeFuncion) {
            await enviarMensajeInternoYWhatsAppAction({
                conversacionId: conversacionId as string,
                contentFuncion: responseContentParaUsuario,
                mediaItemsFuncion: responseMediaParaEnviar,
                uiComponentPayload: uiPayloadDesdeFuncion,
                aiContextData: aiContextDataParaHistorial, // <--- USAR EL MISMO NOMBRE DEL PARÁMETRO DE LA FUNCIÓN
                role: 'assistant',
                nombreFuncionEjecutada: funcionLlamada as string,
                canalOriginal: fullExecContext.canalNombre,
                destinatarioWaId: typeof destinatarioWaId === 'string' ? destinatarioWaId : undefined,
                negocioPhoneNumberIdEnvia: typeof negocioPhoneNumberIdEnvia === 'string' ? negocioPhoneNumberIdEnvia : undefined,
            });
        } else {
            console.warn(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - No se generó contenido para la función "${funcionLlamada}" y no hubo error explícito para el usuario. No se enviará respuesta.`);
        }

        // Actualizar TareaEjecutada con el resultado final
        const ejecucionFuncionExito = resultadoEjecucionDeFuncion?.success ?? false;
        let errorOriginalFuncion: string | null = null;
        if (!ejecucionFuncionExito && resultadoEjecucionDeFuncion?.error) {
            if (typeof resultadoEjecucionDeFuncion.error === 'string') errorOriginalFuncion = resultadoEjecucionDeFuncion.error;
            else try { errorOriginalFuncion = JSON.stringify(resultadoEjecucionDeFuncion.error); } catch { errorOriginalFuncion = "Error no serializable en la función."; }
        }

        const metadataParaGuardar = {
            ...metadataObj,
            resultadoDespacho: {
                timestamp: new Date().toISOString(),
                ejecucionFuncionExito: ejecucionFuncionExito,
                errorFuncionOriginal: errorOriginalFuncion,
                validationErrorsFuncion: resultadoEjecucionDeFuncion?.validationErrors, // Guardar errores de validación Zod si existen
                mensajeEnviadoAlUsuario: !!(responseContentParaUsuario || responseMediaParaEnviar?.length || uiPayloadDesdeFuncion),
                tipoContenidoEnviado: uiPayloadDesdeFuncion ? 'uiComponent' : (responseMediaParaEnviar?.length ? 'media' : (responseContentParaUsuario ? 'text' : 'ninguno')),
            },
            estadoFuncionOriginal: ejecucionFuncionExito ? "EXITO" : "FALLO",
            estadoDispatcher: "COMPLETADO",
        };

        try {
            await prisma.tareaEjecutada.update({
                where: { id: tareaEjecutadaId },
                data: { metadata: JSON.stringify(metadataParaGuardar) }
            });
        } catch (updateError) {
            console.error(`[Dispatcher Refactor] Error al actualizar TareaEjecutada ${tareaEjecutadaId} con metadata final:`, updateError);
        }

        // console.log(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - FIN. Duración: ${Date.now() - timestampInicio}ms`);
        return { success: true, data: null };

    } catch (catastrophicError: unknown) {
        const errorMsg = catastrophicError instanceof Error ? catastrophicError.message : "Error catastrófico desconocido en dispatcher.";
        console.error(`[Dispatcher Refactor] Tarea ${tareaEjecutadaId} - ERROR CATASTRÓFICO:`, catastrophicError);
        if (typeof tareaEjecutadaId === 'string' && tareaEjecutadaId) {
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, `Error catastrófico dispatcher: ${errorMsg}`, metadataObj);
        }
        return { success: false, error: errorMsg, data: null };
    }
}