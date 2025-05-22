// Ruta sugerida: app/admin/_lib/funciones/ia/funcionesEjecucion.actions.ts
'use server';

import prisma from '../prismaClient';
import { ActionResult } from '../types';
import { ChatMessageItem } from './ia.schemas';

import { MostrarOfertasArgs, MostrarOfertasData } from '../funciones/mostrarOfertas.schemas';
import { ejecutarMostrarOfertasAction } from '../funciones/mostrarOfertas.actions';

import { MostrarDetalleOfertaArgs, MostrarDetalleOfertaData } from '../funciones/mostrarDetalleOferta.schemas';
import { ejecutarMostrarDetalleOfertaAction } from '../funciones/mostrarDetalleOferta.actions';

import { AceptarOfertaArgs, AceptarOfertaData } from '../funciones/aceptarOferta.schemas';
import { ejecutarAceptarOfertaAction } from '../funciones/aceptarOferta.actions';

import { AgendarCitaArgs, ConfiguracionAgendaDelNegocio } from '../funciones/agendarCita.schemas';
import { ejecutarAgendarCitaAction } from '../funciones/agendarCita.actions';

import { ListarServiciosAgendaArgs } from '../funciones/listarServiciosAgenda.schemas';
import { ejecutarListarServiciosAgendaAction } from '../funciones/listarServiciosAgenda.actions';

import { ListarHorariosDisponiblesArgs } from '../funciones/listarHorariosDisponiblesAgenda.schemas';
import { ejecutarListarHorariosDisponiblesAction } from '../funciones/listarHorariosDisponiblesAgenda.actions';

import { ejecutarCancelarCitaAction } from '../funciones/cancelarCita.actions';
import { CancelarCitaArgs } from '../funciones/cancelarCita.schemas';

import { ReagendarCitaArgs } from '../funciones/reagendarCita.schemas';
import { ejecutarReagendarCitaAction } from '../funciones/reagendarCita.actions';

import { ejecutarDarDireccionAction } from '../funciones/darDireccionYUbicacion.actions';
import { DarDireccionArgs, DarDireccionData } from '../funciones/darDireccionYUbicacion.schemas';

import { InformarHorarioArgs, InformarHorarioData } from '../funciones/informarHorarioDeAtencion.schemas';
import { ejecutarInformarHorarioAction } from '../funciones/informarHorarioDeAtencion.actions';


import { BrindarInfoArgs, BrindarInfoData } from '../funciones/brindarInformacionDelNegocio.schemas';
import { ejecutarBrindarInfoNegocioAction } from '../funciones/brindarInformacionDelNegocio.actions';

import { ChangedByType } from '@prisma/client'; // Asegúrate de que este tipo esté definido correctamente

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
        console.log(`[Dispatcher] Metadata parseada:`, metadataObj);

        const funcionLlamada = typeof metadataObj.funcionLlamada === 'string' ? metadataObj.funcionLlamada : undefined;
        const argumentos = typeof metadataObj.argumentos === 'object' && metadataObj.argumentos !== null ? metadataObj.argumentos as Record<string, unknown> : undefined;
        const conversacionId = typeof metadataObj.conversacionId === 'string' ? metadataObj.conversacionId : undefined;
        const leadId = typeof metadataObj.leadId === 'string' ? metadataObj.leadId : undefined;
        const asistenteVirtualId = typeof metadataObj.asistenteVirtualId === 'string' ? metadataObj.asistenteVirtualId : undefined;
        const canalNombre = typeof metadataObj.canalNombre === 'string' ? metadataObj.canalNombre : undefined;//!revisar


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

            //!ENVIAR INFORMACIN NEGOCIO
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

            //!INFORMAR HORARIO DE ATENCION
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

            //!DAR DIRECCION Y UBICACION
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

            //!MOSTRAR OFERTAS ?? listo
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

            //!MOSTRAR DETALLE OFERTA  ?? listo
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
                    // canalNombre: asistenteConCanal.canalConversacional?.nombre, // <-- PASAR EL NOMBRE DEL CANAL
                    canalNombre: canalNombre
                };

                resultadoEjecucion = await ejecutarMostrarDetalleOfertaAction(argsDetalleOferta, tareaEjecutadaId);
                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as MostrarDetalleOfertaData).mensajeRespuesta;
                } else {
                    mensajeResultadoParaUsuario = `Lo siento, hubo un problema al obtener los detalles de la oferta: ${resultadoEjecucion.error || 'Error desconocido.'}`;
                }
                break;

            //!ACEPTAR OFERTA
            case 'aceptarOferta': // Asumiendo que el nombreInterno de la TareaFuncion es "aceptarOferta"

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

            //!AGENDAR CITA
            case 'agendarCita':
                const asistenteContext = await prisma.asistenteVirtual.findUnique({
                    where: { id: asistenteVirtualId },
                    select: {
                        negocioId: true,
                        canalConversacional: {
                            select: {
                                id: true,
                                nombre: true
                            }
                        },
                        negocio: {
                            select: {
                                AgendaConfiguracion: {
                                    select: {
                                        aceptaCitasPresenciales: true,
                                        aceptaCitasVirtuales: true,
                                        requiereTelefonoParaCita: true,
                                        requiereEmailParaCita: true,
                                        requiereNombreParaCita: true,
                                        bufferMinutos: true,
                                        metodosPagoTexto: true,
                                    }
                                }
                            }
                        }
                    }
                });

                // Si existe agendaConfiguracion, usarla en vez de los campos legacy de negocio
                // (esto requiere ajustar más abajo la construcción de configAgenda)
                if (!asistenteContext?.negocioId || !asistenteContext.negocio) {
                    mensajeResultadoParaUsuario = "Error interno: No se pudo encontrar el negocio para agendar la cita.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                    break;
                }

                // Definir el actor que realiza la acción
                const actor = {
                    type: ChangedByType.ASSISTANT, // Ya que esta lógica es para el asistente virtual
                    id: asistenteVirtualId
                };
                // Construir el objeto de configuración del negocio
                if (!asistenteContext.negocio.AgendaConfiguracion) {
                    mensajeResultadoParaUsuario = "Error interno: No se encontró la configuración de agenda del negocio.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                    break;
                }
                const configAgenda: ConfiguracionAgendaDelNegocio = {
                    negocioId: asistenteContext.negocioId,
                    aceptaCitasVirtuales: asistenteContext.negocio.AgendaConfiguracion.aceptaCitasVirtuales,
                    aceptaCitasPresenciales: asistenteContext.negocio.AgendaConfiguracion.aceptaCitasPresenciales,
                    requiereEmail: asistenteContext.negocio.AgendaConfiguracion.requiereEmailParaCita,
                    requiereTelefono: asistenteContext.negocio.AgendaConfiguracion.requiereTelefonoParaCita,
                    requiereNombre: asistenteContext.negocio.AgendaConfiguracion.requiereNombreParaCita ?? true,
                    bufferMinutos: asistenteContext.negocio.AgendaConfiguracion.bufferMinutos ?? 0, // Asignar un valor predeterminado si es null
                };

                // Extraer y preparar los argumentos para ejecutarAgendarCitaAction
                // Asegúrate que 'leadId' y 'asistenteVirtualId' estén disponibles en este scope
                const argsAgendarCita: AgendarCitaArgs = {
                    negocioId: asistenteContext.negocioId,//!
                    asistenteId: asistenteVirtualId, //! 
                    leadId: leadId, //!
                    fecha_hora_deseada: typeof argumentos.fecha_hora_deseada === 'string' && argumentos.fecha_hora_deseada.trim() !== ''
                        ? argumentos.fecha_hora_deseada
                        : '', //!
                    motivo_de_reunion: typeof argumentos.motivo_de_reunion === 'string' ? argumentos.motivo_de_reunion : null,
                    tipo_cita_modalidad_preferida: typeof argumentos.tipo_cita_modalidad_preferida === 'string' && (argumentos.tipo_cita_modalidad_preferida === 'presencial' || argumentos.tipo_cita_modalidad_preferida === 'virtual') ? argumentos.tipo_cita_modalidad_preferida : undefined,
                    nombre_contacto: typeof argumentos.nombre_contacto === 'string' ? argumentos.nombre_contacto : undefined,
                    email_contacto: typeof argumentos.email_contacto === 'string' ? argumentos.email_contacto : null,
                    telefono_contacto: typeof argumentos.telefono_contacto === 'string' ? argumentos.telefono_contacto : null,
                    servicio_nombre: typeof argumentos.servicio_nombre === 'string' ? argumentos.servicio_nombre : '', // <-- NUEVO y CRUCIAL
                };

                resultadoEjecucion = await ejecutarAgendarCitaAction(
                    argsAgendarCita,
                    tareaEjecutadaId,
                    configAgenda, // Objeto de configuración del negocio
                    actor         // Información del actor
                );

                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario;
                } else {
                    // Si la acción de negocio falló internamente (ej. error no manejado en ejecutarAgendarCitaAction)
                    // o si success es false por alguna otra razón, usar el mensaje de error o uno genérico.
                    mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Lo siento, hubo un problema al procesar tu solicitud de cita.';
                }

                break;

            //!LISTAR SERVICIOS AGENDA
            case 'listarServiciosAgenda':
                // Obtener el negocioId del contexto del asistente (similar a como lo haces para agendarCita)
                const contextoAsistenteParaListar = await prisma.asistenteVirtual.findUnique({
                    where: { id: asistenteVirtualId }, // asistenteVirtualId debe estar en scope
                    select: {
                        negocioId: true,
                    }
                });

                if (!contextoAsistenteParaListar?.negocioId) {
                    mensajeResultadoParaUsuario = "Error interno: No se pudo determinar el negocio para listar los servicios.";
                    // Aquí podrías llamar a tu función 'actualizarTareaEjecutadaFallidaDispatcher'
                    // await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario, argumentos);
                    break;
                }

                const argsListarServicios: ListarServiciosAgendaArgs = {
                    negocioId: contextoAsistenteParaListar.negocioId,
                };

                resultadoEjecucion = await ejecutarListarServiciosAgendaAction(
                    argsListarServicios,
                    tareaEjecutadaId // El ID de la TareaEjecutada actual
                );

                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario;
                } else {
                    mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Lo siento, hubo un problema al obtener la lista de servicios.';
                }
                break;

            //! LISTAR HORARIOS DISPONIBLES
            case 'listarHorariosDisponiblesAgenda':
                // Obtener el contexto del negocio y su configuración de agenda
                const contextoNegocioParaListarHorarios = await prisma.asistenteVirtual.findUnique({
                    where: { id: asistenteVirtualId }, // asistenteVirtualId debe estar en scope
                    select: {
                        negocioId: true,
                        negocio: {
                            select: {
                                AgendaConfiguracion: {
                                    select: {
                                        aceptaCitasPresenciales: true,
                                        aceptaCitasVirtuales: true,
                                        requiereTelefonoParaCita: true,
                                        requiereEmailParaCita: true,
                                        requiereNombreParaCita: true,
                                        bufferMinutos: true,
                                        metodosPagoTexto: true,
                                    }
                                }
                            }
                        }
                    }
                });

                if (!contextoNegocioParaListarHorarios?.negocioId || !contextoNegocioParaListarHorarios.negocio) {
                    mensajeResultadoParaUsuario = "Error interno: No se pudo determinar la configuración del negocio para listar horarios.";
                    // await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario, argumentos);
                    break;
                }

                if (!contextoNegocioParaListarHorarios.negocio.AgendaConfiguracion) {
                    mensajeResultadoParaUsuario = "Error interno: No se encontró la configuración de agenda del negocio para listar horarios.";
                    break;
                }
                const configAgendaParaListar: ConfiguracionAgendaDelNegocio = {
                    negocioId: contextoNegocioParaListarHorarios.negocioId,
                    aceptaCitasVirtuales: contextoNegocioParaListarHorarios.negocio.AgendaConfiguracion.aceptaCitasVirtuales,
                    aceptaCitasPresenciales: contextoNegocioParaListarHorarios.negocio.AgendaConfiguracion.aceptaCitasPresenciales,
                    requiereEmail: contextoNegocioParaListarHorarios.negocio.AgendaConfiguracion.requiereEmailParaCita,
                    requiereTelefono: contextoNegocioParaListarHorarios.negocio.AgendaConfiguracion.requiereTelefonoParaCita,
                    requiereNombre: contextoNegocioParaListarHorarios.negocio.AgendaConfiguracion.requiereNombreParaCita ?? true,
                    bufferMinutos: contextoNegocioParaListarHorarios.negocio.AgendaConfiguracion.bufferMinutos ?? 0,
                };

                // Verificar directamente los argumentos recibidos de Gemini
                const servicioRecibido = argumentos.servicio_nombre_horario_interes;
                const fechaRecibida = argumentos.fecha_deseada_horario_servicio_interes;
                // console.log(`[Dispatcher Debug] Recibido de Gemini para listarHorariosDisponiblesAgenda: servicio_nombre_horario_interes='${servicioRecibido}' (tipo: ${typeof servicioRecibido}), fecha_deseada_horario_servicio_interes='${fechaRecibida}' (tipo: ${typeof fechaRecibida})`);

                if (typeof servicioRecibido !== 'string' || !servicioRecibido.trim() ||
                    typeof fechaRecibida !== 'string' || !fechaRecibida.trim()) {
                    mensajeResultadoParaUsuario = "Para buscar horarios disponibles, necesito saber para qué servicio y en qué fecha te gustaría.";
                    // Opcional: Log más detallado si la validación falla
                    // await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, "Faltan servicio_nombre_horario_interes o fecha_deseada_horario_servicio_interes en argumentos de Gemini.", argumentos);
                    break;
                }

                // Si pasamos la validación, los argumentos son válidos para construir argsListarHorarios
                const argsListarHorarios: ListarHorariosDisponiblesArgs = {
                    negocioId: contextoNegocioParaListarHorarios.negocioId,
                    servicio_nombre_interes: servicioRecibido.trim(),
                    fecha_deseada: fechaRecibida.trim(),
                };

                resultadoEjecucion = await ejecutarListarHorariosDisponiblesAction(
                    argsListarHorarios,
                    tareaEjecutadaId,
                    configAgendaParaListar
                );

                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario;
                } else {
                    mensajeResultadoParaUsuario = resultadoEjecucion.error || 'Lo siento, hubo un problema al buscar los horarios disponibles.';
                }
                break;

            //! CANCELAR CITA
            case 'cancelarCita':

                console.log('[Dispatcher Debug] Objeto "argumentos" recibido de IA para cancelarCita:', JSON.stringify(argumentos, null, 2)); // DEBUG VITAL

                const argsCancelar: CancelarCitaArgs = {
                    cita_id_cancelar: typeof argumentos.cita_id_cancelar === 'string' ? argumentos.cita_id_cancelar : undefined,
                    detalle_cita_para_cancelar: typeof argumentos.detalle_cita_para_cancelar === 'string' ? argumentos.detalle_cita_para_cancelar : undefined,
                    confirmacion_usuario_cancelar: typeof argumentos.confirmacion_usuario_cancelar === 'boolean' ? argumentos.confirmacion_usuario_cancelar : undefined,
                    motivo_cancelacion: typeof argumentos.motivo_cancelacion === 'string' ? argumentos.motivo_cancelacion : undefined,
                    leadId: leadId,
                    asistenteVirtualId: asistenteVirtualId,
                };
                console.log('[Dispatcher Debug] "argsCancelar" construidos:', JSON.stringify(argsCancelar, null, 2));

                resultadoEjecucion = await ejecutarCancelarCitaAction(argsCancelar, tareaEjecutadaId);

                if (resultadoEjecucion.success && resultadoEjecucion.data) {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario;
                } else {
                    mensajeResultadoParaUsuario = resultadoEjecucion.error || "Hubo un problema al intentar procesar la cancelación.";
                }
                break;

            case 'reagendarCita':
                // Obtener ConfiguracionAgendaDelNegocio (necesaria para verificarDisponibilidadSlot)
                // y definir el actor
                const asistenteCtxReagendar = await prisma.asistenteVirtual.findUnique({
                    where: { id: asistenteVirtualId },
                    select: {
                        negocio: {
                            select: {
                                id: true, // <-- Agregar esta línea para incluir el id del negocio
                                AgendaConfiguracion: {
                                    select: {
                                        aceptaCitasPresenciales: true,
                                        aceptaCitasVirtuales: true,
                                        requiereTelefonoParaCita: true,
                                        requiereEmailParaCita: true,
                                        requiereNombreParaCita: true,
                                        bufferMinutos: true,
                                        metodosPagoTexto: true,
                                    }
                                }
                            }
                        }
                    }
                });

                if (!asistenteCtxReagendar?.negocio) {
                    mensajeResultadoParaUsuario = "Error interno: No se pudo obtener la configuración del negocio para reagendar la cita.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, mensajeResultadoParaUsuario);
                    break; // Sale del switch
                }

                const configAgendaReagendar: ConfiguracionAgendaDelNegocio = {
                    negocioId: asistenteCtxReagendar.negocio.id,
                    aceptaCitasVirtuales: asistenteCtxReagendar.negocio.AgendaConfiguracion?.aceptaCitasVirtuales ?? false,
                    aceptaCitasPresenciales: asistenteCtxReagendar.negocio.AgendaConfiguracion?.aceptaCitasPresenciales ?? false,
                    requiereEmail: asistenteCtxReagendar.negocio.AgendaConfiguracion?.requiereEmailParaCita ?? true,
                    requiereTelefono: asistenteCtxReagendar.negocio.AgendaConfiguracion?.requiereTelefonoParaCita ?? false,
                    requiereNombre: asistenteCtxReagendar.negocio.AgendaConfiguracion?.requiereNombreParaCita ?? true, // Default a true si es null/undefined
                    bufferMinutos: asistenteCtxReagendar.negocio.AgendaConfiguracion?.bufferMinutos ?? 0,
                };

                const actorReagendar = { type: ChangedByType.ASSISTANT, id: asistenteVirtualId };

                // Construir los argumentos para ejecutarReagendarCitaAction
                const argsReagendar: ReagendarCitaArgs = {
                    cita_id_original: typeof argumentos.cita_id_original === 'string' ? argumentos.cita_id_original : undefined,
                    detalle_cita_original_para_reagendar: typeof argumentos.detalle_cita_original_para_reagendar === 'string' ? argumentos.detalle_cita_original_para_reagendar : undefined,
                    nueva_fecha_hora_deseada: typeof argumentos.nueva_fecha_hora_deseada === 'string' ? argumentos.nueva_fecha_hora_deseada : undefined,
                    confirmacion_usuario_reagendar: typeof argumentos.confirmacion_usuario_reagendar === 'boolean' ? argumentos.confirmacion_usuario_reagendar : undefined,
                    servicio_nombre: typeof argumentos.servicio_nombre === 'string' ? argumentos.servicio_nombre : undefined,
                    nombre_contacto: typeof argumentos.nombre_contacto === 'string' ? argumentos.nombre_contacto : undefined,
                    email_contacto: typeof argumentos.email_contacto === 'string' ? argumentos.email_contacto : undefined,
                    telefono_contacto: typeof argumentos.telefono_contacto === 'string' ? argumentos.telefono_contacto : undefined,
                    leadId: leadId, // Desde las variables del dispatcher
                    asistenteVirtualId: asistenteVirtualId, // Desde las variables del dispatcher
                };

                console.log('[Dispatcher v2.1] "argsReagendar" construidos para la acción:', JSON.stringify(argsReagendar, null, 2));
                resultadoEjecucion = await ejecutarReagendarCitaAction(argsReagendar, tareaEjecutadaId, configAgendaReagendar, actorReagendar);

                if (resultadoEjecucion.success && resultadoEjecucion.data && typeof (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario === 'string') {
                    mensajeResultadoParaUsuario = (resultadoEjecucion.data as { mensajeParaUsuario: string }).mensajeParaUsuario;
                } else if (!resultadoEjecucion.success) {
                    mensajeResultadoParaUsuario = resultadoEjecucion.error || "Hubo un problema al intentar reagendar tu cita.";
                    await actualizarTareaEjecutadaFallidaDispatcher(tareaEjecutadaId, `Error en ejecutarReagendarCitaAction: ${resultadoEjecucion.error}`);
                } else {
                    // Success true, pero data no tiene mensajeParaUsuario o es inesperada
                    mensajeResultadoParaUsuario = "Se procesó tu solicitud de reagendamiento, pero no hay un mensaje de respuesta detallado."; // O null si prefieres
                    console.warn(`[Dispatcher v2.1] La acción reagendarCita tuvo éxito pero 'data' o 'mensajeParaUsuario' fue inesperado. Data:`, resultadoEjecucion.data);
                }
                break;

            //! default
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
