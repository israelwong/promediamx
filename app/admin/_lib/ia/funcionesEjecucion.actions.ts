// Ruta sugerida: app/admin/_lib/funciones/ia/funcionesEjecucion.actions.ts
'use server';

// import { Prisma } from '@prisma/client';
import prisma from '../prismaClient'; //
import { ActionResult } from '../types'; //
// Importar tipos específicos para argumentos y resultados
import { AgendarCitaArgs, ResultadoAgendamiento } from '../funciones/agendarCitaPresencial.type';
import { BrindarInfoArgs, BrindarInfoData } from '../funciones/brindarInformacionDelNegocio.type';
import { InformarHorarioArgs, InformarHorarioData } from '../funciones/informarHorarioDeAtencion.type';
import { ejecutarMostrarOfertasAction } from '../funciones/mostrarOfertas.actions'; // Añadir import
import { MostrarOfertasArgs, MostrarOfertasData } from '../funciones/mostrarOfertas.type'; // Añadir import
import { MostrarDetalleOfertaArgs, MostrarDetalleOfertaData } from '../funciones/mostrarDetalleOferta.type'; // Añadir import
import { AceptarOfertaArgs, AceptarOfertaData } from '../funciones/aceptarOferta.type'; // Añadir import



// Importar las funciones de ejecución específicas
import { ejecutarAgendarCitaAction } from '../funciones/agendarCitaPresencial.actions';
import { ejecutarBrindarInfoNegocioAction } from '../funciones/brindarInformacionDelNegocio.actions';
import { ejecutarInformarHorarioAction } from '../funciones/informarHorarioDeAtencion.actions';
import { ChatMessageItem } from '../crmConversacion.types';
import { ejecutarDarDireccionAction } from '../funciones/darDireccionYUbicacion.actions'; // Añadir import
import { DarDireccionArgs, DarDireccionData } from '../funciones/darDireccionYUbicacion.type'; // Añadir import
import { ejecutarMostrarDetalleOfertaAction } from '../funciones/mostrarDetalleOferta.actions'; // Añadir import
import { ejecutarAceptarOfertaAction } from '../funciones/aceptarOferta.actions'; // Añadir import

/**
 * Guarda un mensaje interno (del asistente o sistema) en la conversación.
 * @param input Datos del mensaje a guardar.
 * @returns ActionResult con el ChatMessageItem creado.
 */
async function enviarMensajeInternoAction(input: {
    conversacionId: string;
    mensaje: string;
    role: 'assistant' | 'system'; // Roles permitidos
}): Promise<ActionResult<ChatMessageItem>> {
    try {
        if (!input.conversacionId || !input.mensaje || !input.role) {
            return { success: false, error: 'Faltan datos para enviar el mensaje interno.' };
        }

        // Crear la interacción en la base de datos
        const nuevaInteraccion = await prisma.interaccion.create({
            data: {
                conversacionId: input.conversacionId,
                mensaje: input.mensaje,
                role: input.role,
                // No se asocia agenteCrmId para mensajes de assistant/system generados aquí
            },
            // Seleccionar los campos necesarios para construir ChatMessageItem
            select: {
                id: true,
                conversacionId: true,
                role: true,
                mensaje: true,
                mediaUrl: true,
                mediaType: true,
                createdAt: true,
                // agenteCrm: { select: { id: true, nombre: true } }, // No aplica aquí
            }
        });

        // Actualizar timestamp de la conversación
        await prisma.conversacion.update({
            where: { id: input.conversacionId },
            data: { updatedAt: new Date() }
        });

        // Construir y devolver el objeto ChatMessageItem
        const data: ChatMessageItem = {
            id: nuevaInteraccion.id,
            conversacionId: nuevaInteraccion.conversacionId,
            role: nuevaInteraccion.role as ChatMessageItem['role'], // Casteo seguro
            mensaje: nuevaInteraccion.mensaje,
            mediaUrl: nuevaInteraccion.mediaUrl,
            mediaType: nuevaInteraccion.mediaType,
            createdAt: nuevaInteraccion.createdAt,
            agenteCrm: null, // No hay agente CRM asociado directamente
        };
        console.log(`[Mensaje Interno] Mensaje ${data.role} guardado en BD para conv ${data.conversacionId}, ID: ${data.id}`);
        return { success: true, data };

    } catch (error) {
        console.error(`[Mensaje Interno] Error al guardar mensaje ${input.role} para conv ${input.conversacionId}:`, error);
        return { success: false, error: 'No se pudo guardar el mensaje interno.' };
    }
}
// --- Fin Implementación REAL ---


/**
 * Lee una TareaEjecutada, identifica la función a llamar desde sus metadatos,
 * y llama a la Server Action de ejecución correspondiente.
 * Luego, envía el resultado de vuelta a la conversación como un mensaje del asistente.
 * @param tareaEjecutadaId El ID del registro TareaEjecutada a procesar.
 * @returns ActionResult<null> indicando si el despacho se intentó.
 */
export async function dispatchTareaEjecutadaAction(
    tareaEjecutadaId: string
): Promise<ActionResult<null>> {
    console.log(`[Dispatcher] Iniciando despacho para TareaEjecutada ${tareaEjecutadaId}`);

    let tareaEjecutada;
    try {
        // 1. Obtener la Tarea Ejecutada
        tareaEjecutada = await prisma.tareaEjecutada.findUnique({
            where: { id: tareaEjecutadaId },
        });

        if (!tareaEjecutada) {
            console.error(`[Dispatcher] TareaEjecutada con ID ${tareaEjecutadaId} no encontrada.`);
            return { success: false, error: `TareaEjecutada con ID ${tareaEjecutadaId} no encontrada.` };
        }
        if (!tareaEjecutada.metadata) {
            console.error(`[Dispatcher] TareaEjecutada ${tareaEjecutadaId} no tiene metadatos.`);
            return { success: false, error: `TareaEjecutada ${tareaEjecutadaId} no tiene metadatos para despachar.` };
        }

        // 2. Parsear los Metadatos
        let parsedMetadata: unknown;
        try {
            parsedMetadata = JSON.parse(tareaEjecutada.metadata);
        } catch (parseError) {
            console.error(`[Dispatcher] Error al parsear metadata de TareaEjecutada ${tareaEjecutadaId}:`, parseError);
            return { success: false, error: "Metadatos de tarea inválidos." };
        }

        if (typeof parsedMetadata !== 'object' || parsedMetadata === null) {
            console.error(`[Dispatcher] Metadata parseada no es un objeto para TareaEjecutada ${tareaEjecutadaId}:`, parsedMetadata);
            return { success: false, error: "Metadatos de tarea con formato incorrecto." };
        }

        const metadataObj = parsedMetadata as Record<string, unknown>;
        const funcionLlamada = typeof metadataObj.funcionLlamada === 'string' ? metadataObj.funcionLlamada : undefined;
        const argumentos = typeof metadataObj.argumentos === 'object' && metadataObj.argumentos !== null ? metadataObj.argumentos as Record<string, unknown> : undefined;
        const conversacionId = typeof metadataObj.conversacionId === 'string' ? metadataObj.conversacionId : undefined;
        const leadId = typeof metadataObj.leadId === 'string' ? metadataObj.leadId : undefined;
        const asistenteVirtualId = typeof metadataObj.asistenteVirtualId === 'string' ? metadataObj.asistenteVirtualId : undefined;


        if (!funcionLlamada || !argumentos || !conversacionId || !leadId || !asistenteVirtualId) {
            console.error(`[Dispatcher] Metadata incompleta o inválida en TareaEjecutada ${tareaEjecutadaId}:`, metadataObj);
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Metadata incompleta o inválida.");
            return { success: false, error: "Faltan datos o son inválidos en los metadatos de la tarea para despachar." };
        }

        // 3. Ejecutar la Función Correspondiente (Dispatcher)
        let resultadoEjecucion: ActionResult<unknown> | null = null;
        let mensajeResultadoParaUsuario: string | null = null;

        console.log(`[Dispatcher] Despachando función: ${funcionLlamada}`);
        switch (funcionLlamada) {
            case 'agendarCitaPresencial':
                const argsAgendar: AgendarCitaArgs = {
                    ...argumentos,
                    leadId: leadId,
                    nombre_contacto: typeof argumentos.nombre_contacto === 'string' ? argumentos.nombre_contacto : undefined,
                    email_contacto: typeof argumentos.email_contacto === 'string' ? argumentos.email_contacto : undefined,
                    telefono_contacto: typeof argumentos.telefono_contacto === 'string' ? argumentos.telefono_contacto : undefined,
                    fecha_hora: typeof argumentos.fecha_hora === 'string' ? argumentos.fecha_hora : undefined,
                    motivo_de_reunion: typeof argumentos.motivo_de_reunion === 'string' ? argumentos.motivo_de_reunion : undefined,
                };
                if (!argsAgendar.fecha_hora) {
                    mensajeResultadoParaUsuario = "Error: Falta la fecha y hora para agendar la cita.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                    break;
                }
                resultadoEjecucion = await ejecutarAgendarCitaAction(argsAgendar, tareaEjecutadaId);
                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as ResultadoAgendamiento).mensajeConfirmacion;
                } else {
                    mensajeResultadoParaUsuario = `Lo siento, hubo un problema al intentar agendar tu cita: ${resultadoEjecucion.error || 'Error desconocido.'}`;
                }
                break;

            case 'brindarInformacionDelNegocio':
                const asistenteInfo = await prisma.asistenteVirtual.findUnique({ where: { id: asistenteVirtualId }, select: { negocioId: true } });
                if (!asistenteInfo?.negocioId) {
                    mensajeResultadoParaUsuario = "Error interno: No se pudo encontrar el negocio asociado.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                    break;
                }
                const argsInfo: BrindarInfoArgs = {
                    ...argumentos,
                    negocioId: asistenteInfo.negocioId,
                    tema: typeof argumentos.tema === 'string' ? argumentos.tema : undefined,
                };
                resultadoEjecucion = await ejecutarBrindarInfoNegocioAction(argsInfo, tareaEjecutadaId);
                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as BrindarInfoData).informacionEncontrada;
                } else {
                    mensajeResultadoParaUsuario = `Lo siento, hubo un problema al obtener la información: ${resultadoEjecucion.error || 'Error desconocido.'}`;
                }
                break;

            case 'informarHorarioDeAtencion':
                const asistenteHorario = await prisma.asistenteVirtual.findUnique({ where: { id: asistenteVirtualId }, select: { negocioId: true } });
                if (!asistenteHorario?.negocioId) {
                    mensajeResultadoParaUsuario = "Error interno: No se pudo encontrar el negocio asociado.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                    break;
                }
                const argsHorario: InformarHorarioArgs = {
                    ...argumentos,
                    negocioId: asistenteHorario.negocioId,
                    diaEspecifico: typeof argumentos.diaEspecifico === 'string' ? argumentos.diaEspecifico : undefined,
                    verificarAbiertoAhora: typeof argumentos.verificarAbiertoAhora === 'boolean' ? argumentos.verificarAbiertoAhora : undefined,
                };
                resultadoEjecucion = await ejecutarInformarHorarioAction(argsHorario, tareaEjecutadaId);
                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as InformarHorarioData).respuestaHorario;
                } else {
                    mensajeResultadoParaUsuario = `Lo siento, hubo un problema al obtener el horario: ${resultadoEjecucion.error || 'Error desconocido.'}`;
                }
                break;

            case 'darDireccionYUbicacion': // <-- NUEVO CASE
                const asistenteDir = await prisma.asistenteVirtual.findUnique({ where: { id: asistenteVirtualId }, select: { negocioId: true } });
                if (!asistenteDir?.negocioId) {
                    mensajeResultadoParaUsuario = "Error interno: No se pudo encontrar el negocio asociado al asistente.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                    break;
                }
                const argsDir: DarDireccionArgs = {
                    ...argumentos, // Pasar argumentos extraídos por IA si los hubiera (aunque no se usen directamente)
                    negocioId: asistenteDir.negocioId,
                };
                resultadoEjecucion = await ejecutarDarDireccionAction(argsDir, tareaEjecutadaId);
                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as DarDireccionData).mensajeRespuesta;
                } else {
                    mensajeResultadoParaUsuario = `Lo siento, hubo un problema al obtener la dirección: ${resultadoEjecucion.error || 'Error desconocido.'}`;
                }
                break;

            case 'mostrarOfertas': // <-- NUEVO CASE
                const asistenteOfertas = await prisma.asistenteVirtual.findUnique({ where: { id: asistenteVirtualId }, select: { negocioId: true } });
                if (!asistenteOfertas?.negocioId) {
                    mensajeResultadoParaUsuario = "Error interno: No se pudo encontrar el negocio asociado al asistente para mostrar ofertas.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                    break;
                }
                const argsOfertas: MostrarOfertasArgs = {
                    // No hay argumentos extraídos de la IA para esta función específica
                    negocioId: asistenteOfertas.negocioId,
                };
                resultadoEjecucion = await ejecutarMostrarOfertasAction(argsOfertas, tareaEjecutadaId);
                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as MostrarOfertasData).mensajeRespuesta;
                } else {
                    mensajeResultadoParaUsuario = `Lo siento, hubo un problema al consultar las ofertas: ${resultadoEjecucion.error || 'Error desconocido.'}`;
                }
                break;

            case 'mostrarDetalleOferta':

                const asistenteConCanal = await prisma.asistenteVirtual.findUnique({
                    where: { id: asistenteVirtualId },
                    select: {
                        negocioId: true,
                        canalConversacional: { // Incluir el canal conversacional
                            select: { nombre: true }
                        }
                    }
                });

                if (!asistenteConCanal?.negocioId) {
                    mensajeResultadoParaUsuario = "Error interno: No se pudo encontrar el negocio asociado para detallar la oferta.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                    break;
                }

                // Extraer el parámetro con el nombre correcto de los args de Gemini
                const nombreDeLaOfertaExtraido = typeof argumentos.nombre_de_la_oferta === 'string' ? argumentos.nombre_de_la_oferta : undefined;

                if (!nombreDeLaOfertaExtraido) {
                    mensajeResultadoParaUsuario = "No especificaste claramente qué oferta te interesa. ¿Podrías indicarme el nombre?";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Falta el parámetro 'nombre_de_la_oferta' en los argumentos de IA.");
                    break;
                }

                const argsDetalleOferta: MostrarDetalleOfertaArgs = {
                    negocioId: asistenteConCanal.negocioId,
                    nombre_de_la_oferta: nombreDeLaOfertaExtraido,
                    canalNombre: asistenteConCanal.canalConversacional?.nombre, // <-- PASAR EL NOMBRE DEL CANAL
                };

                resultadoEjecucion = await ejecutarMostrarDetalleOfertaAction(argsDetalleOferta, tareaEjecutadaId);
                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as MostrarDetalleOfertaData).mensajeRespuesta;
                } else {
                    mensajeResultadoParaUsuario = `Lo siento, hubo un problema al obtener los detalles de la oferta: ${resultadoEjecucion.error || 'Error desconocido.'}`;
                }
                break;

            case 'aceptarOferta': // Asumiendo que el nombreInterno de la TareaFuncion es "aceptarOferta"
                // const asistenteAceptarOferta = await prisma.asistenteVirtual.findUnique({
                //     where: { id: asistenteVirtualId },
                //     select: { negocioId: true }
                // });
                const asistenteAceptarOferta = await prisma.asistenteVirtual.findUnique({
                    where: { id: asistenteVirtualId },
                    select: {
                        negocioId: true,
                        canalConversacional: { // Incluir el canal
                            select: { nombre: true }
                        }
                    }
                });

                if (!asistenteAceptarOferta?.negocioId) {
                    mensajeResultadoParaUsuario = "Error interno: No se pudo encontrar el negocio asociado para procesar la oferta.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                    break;
                }

                // Extraer 'oferta_id' de los argumentos de Gemini
                const ofertaIdExtraida = typeof argumentos.oferta_id === 'string' ? argumentos.oferta_id : undefined;

                if (!ofertaIdExtraida) {
                    mensajeResultadoParaUsuario = "No pude identificar claramente qué oferta deseas aceptar. ¿Podrías intentarlo de nuevo especificando la oferta?";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Falta el parámetro 'oferta_id' en los argumentos de IA para aceptarOferta.");
                    break;
                }

                const argsAceptarOferta: AceptarOfertaArgs = {
                    negocioId: asistenteAceptarOferta.negocioId,
                    oferta_id: ofertaIdExtraida,
                    canalNombre: asistenteAceptarOferta.canalConversacional?.nombre, // <-- PASAR EL NOMBRE DEL CANAL
                };

                resultadoEjecucion = await ejecutarAceptarOfertaAction(argsAceptarOferta, tareaEjecutadaId);

                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as AceptarOfertaData).mensajeSiguientePaso;
                } else {
                    mensajeResultadoParaUsuario = `Lo siento, hubo un problema al intentar procesar tu aceptación de la oferta: ${resultadoEjecucion.error || 'Error desconocido.'}`;
                }

                break;


            default:
                console.warn(`[Dispatcher] Función desconocida encontrada en TareaEjecutada ${tareaEjecutadaId}: ${funcionLlamada}`);
                mensajeResultadoParaUsuario = `No sé cómo procesar la acción: ${funcionLlamada}. Notificaré a un agente.`;
                await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, `Función desconocida: ${funcionLlamada}`);
                break;
        }

        // 4. Enviar Resultado de Vuelta a la Conversación
        if (mensajeResultadoParaUsuario) {
            console.log(`[Dispatcher] Enviando resultado a conversación ${conversacionId}: ${mensajeResultadoParaUsuario}`);
            // *** USAR LA IMPLEMENTACIÓN REAL ***
            const envioMsgResult = await enviarMensajeInternoAction({
                conversacionId: conversacionId,
                mensaje: mensajeResultadoParaUsuario,
                role: 'assistant', // El asistente informa el resultado
            });
            // *** FIN USO IMPLEMENTACIÓN REAL ***
            if (!envioMsgResult.success) {
                console.error(`[Dispatcher] Error al enviar mensaje de resultado a la conversación ${conversacionId}: ${envioMsgResult.error}`);
            }
        } else {
            console.log(`[Dispatcher] No se generó mensaje de resultado para TareaEjecutada ${tareaEjecutadaId}.`);
        }

        return { success: true, data: null };

    } catch (error) {
        console.error(`[Dispatcher] Error catastrófico al despachar TareaEjecutada ${tareaEjecutadaId}:`, error);
        if (tareaEjecutadaId) {
            await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, error instanceof Error ? error.message : "Error desconocido en dispatcher.");
        }
        return { success: false, error: error instanceof Error ? error.message : "Error interno al despachar la tarea." };
    }
}


// Función auxiliar interna para marcar la tarea como fallida desde el dispatcher
async function actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId: string, mensajeError: string) {
    try {
        await prisma.tareaEjecutada.update({
            where: { id: tareaEjecutadaId },
            data: {
                metadata: JSON.stringify({ error_dispatcher: mensajeError })
            }
        });
    } catch (updateError) {
        console.error(`[Dispatcher] Error al actualizar TareaEjecutada ${tareaEjecutadaId} como fallida:`, updateError);
    }
}
