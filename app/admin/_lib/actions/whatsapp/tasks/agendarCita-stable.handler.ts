// app/admin/_lib/actions/whatsapp/tasks/agendarCita.handler.ts

// ==================================================================
// MANEJADOR DE TAREA: agendarCita
// VERSIÓN: 1.0 - SELLADA
// FECHA DE SELLADO: 4 de Julio de 2025
//
// DESCRIPCIÓN:
// Este handler gestiona el flujo completo para que un usuario
// agende una nueva cita. Es el núcleo del asistente conversacional.
// Incluye extracción de contexto inicial, validación de
// disponibilidad, recolección de datos personalizados de forma
// dinámica, y confirmación final con notificación por correo.
// ==================================================================

'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import type { TareaEnProgreso, Prisma } from '@prisma/client';
import { EstadoTareaConversacional } from '@prisma/client';
import { z } from 'zod';

import type { ActionResult } from '../../../types';
import type { FsmContext, AgendarCitaContext, ProcesarMensajeWhatsAppOutput, WhatsAppMessageInput } from '../whatsapp.schemas';
import { construirFechaDesdePalabrasClave } from '../helpers/date.helpers';
import { extraerPalabrasClaveDeFecha, construirPromptDeExtraccionDinamico } from '../helpers/ia.helpers';
import { construirPreguntaDinamica, ejecutarConfirmacionFinalCitaAction } from '../helpers/actions.helpers';
import { findBestMatchingService, verificarDisponibilidad } from '../helpers/availability.helpers';
import { enviarMensajeAsistente } from '../core/orchestrator';
import { enviarEmailConfirmacionCita } from '../../email/email.actions';
import { generarRespuestaAsistente } from '../../../ia/ia.actions';


export async function manejarAgendarCita(
    tarea: TareaEnProgreso,
    mensaje: WhatsAppMessageInput,
    contexto: FsmContext
): Promise<ActionResult<ProcesarMensajeWhatsAppOutput | null>> {
    const tareaContexto = (tarea.contexto as AgendarCitaContext) || {};
    const { conversacionId, leadId, asistente, usuarioWaId, negocioPhoneNumberId } = contexto;
    const textoUsuario = mensaje.type === 'text' ? mensaje.content : '';

    console.log(`[AGENDAR CITA vFINAL] Estado: ${tarea.estado}. Contexto:`, tareaContexto);

    switch (tarea.estado) {

        case EstadoTareaConversacional.INICIADA: {
            const [camposRequeridos, serviciosDisponibles] = await prisma.$transaction([
                prisma.cRMCampoPersonalizado.findMany({ where: { crmId: asistente.negocio!.CRM!.id, requerido: true } }),
                prisma.agendaTipoCita.findMany({ where: { negocioId: asistente.negocio!.id, activo: true } })
            ]);

            // Paso 1: Construimos el prompt dinámicamente usando nuestro nuevo helper.
            const promptDinamico = construirPromptDeExtraccionDinamico(textoUsuario, serviciosDisponibles, camposRequeridos);

            // Paso 2: Pasamos el prompt recién creado a la función principal de la IA.
            const resultadoIA = await generarRespuestaAsistente({
                historialConversacion: [],
                mensajeUsuarioActual: promptDinamico,
                contextoAsistente: { nombreAsistente: asistente.nombre, nombreNegocio: asistente.negocio?.nombre || 'el negocio' },
                tareasDisponibles: [],
            });

            const respuestaJson = resultadoIA.data?.respuestaTextual;
            let extraccion: { servicio?: string, campos_personalizados?: { [key: string]: string } } | null = null;
            if (respuestaJson && respuestaJson.toLowerCase().trim() !== 'null') {
                try {
                    const match = respuestaJson.match(/{[\s\S]*}/);
                    if (match) extraccion = JSON.parse(match[0]);
                } catch (e) {
                    console.error("Error parseando JSON de extracción inicial:", e);
                }
            }

            if (!tareaContexto.camposPersonalizados) tareaContexto.camposPersonalizados = {};

            // Paso 3: Procesamos la extracción (esta lógica no cambia).
            if (extraccion?.servicio) {
                const servicioEncontrado = findBestMatchingService(extraccion.servicio, serviciosDisponibles);
                if (servicioEncontrado) {
                    tareaContexto.servicioId = servicioEncontrado.id;
                    tareaContexto.servicioNombre = servicioEncontrado.nombre;
                }
            }

            if (extraccion?.campos_personalizados) {
                for (const nombreCampo in extraccion.campos_personalizados) {
                    const campoDB = camposRequeridos.find(c => c.nombre.toLowerCase() === nombreCampo.toLowerCase());
                    const valorExtraido = extraccion.campos_personalizados[nombreCampo];
                    if (campoDB && valorExtraido) {
                        tareaContexto.camposPersonalizados[campoDB.id] = valorExtraido;
                    }
                }
            }

            // Paso 4: Buscamos la fecha y decidimos el siguiente estado (esta lógica no cambia).
            const extraccionDeFecha = await extraerPalabrasClaveDeFecha(textoUsuario);
            if (extraccionDeFecha && (extraccionDeFecha.dia_semana || extraccionDeFecha.dia_relativo || extraccionDeFecha.dia_mes || extraccionDeFecha.hora_str)) {
                const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_FECHA_HORA } });
                return manejarAgendarCita(tareaActualizada, mensaje, contexto);
            }

            await enviarMensajeAsistente(conversacionId, "¡Claro! Para agendar tu cita, primero dime, ¿qué día y a qué hora te gustaría?", usuarioWaId, negocioPhoneNumberId);
            await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_FECHA_HORA } });

            return { success: true, data: null };
        }

        case EstadoTareaConversacional.VALIDANDO_FECHA_HORA: {
            const extraccionDeFecha = await extraerPalabrasClaveDeFecha(textoUsuario);
            if (!extraccionDeFecha) {
                await enviarMensajeAsistente(conversacionId, "No entendí la fecha que mencionaste. Por favor, intenta de nuevo (por ejemplo: 'mañana a las 3pm').", usuarioWaId, negocioPhoneNumberId);
                return { success: true, data: null };
            }

            const { fecha, hora } = construirFechaDesdePalabrasClave(extraccionDeFecha, new Date());
            if (!fecha || !hora) {
                await enviarMensajeAsistente(conversacionId, "No pude construir una fecha y hora completas. ¿Podrías ser un poco más específico?", usuarioWaId, negocioPhoneNumberId);
                return { success: true, data: null };
            }
            fecha.setHours(hora.hora, hora.minuto, 0, 0);

            const servicioDefault = await prisma.agendaTipoCita.findFirst({ where: { negocioId: asistente.negocio!.id, activo: true } });
            if (!servicioDefault) return { success: false, error: "No hay servicios de cita configurados." };

            const resultadoDisponibilidad = await verificarDisponibilidad({
                negocioId: asistente.negocio!.id,
                tipoDeCitaId: servicioDefault.id,
                fechaDeseada: fecha,
                leadId: leadId,
            });

            if (resultadoDisponibilidad.disponible) {
                tareaContexto.fechaHora = fecha.toISOString();
                await enviarMensajeAsistente(conversacionId, `¡Perfecto! El horario de ${fecha.toLocaleString('es-MX', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Mexico_City' })} está disponible.`, usuarioWaId, negocioPhoneNumberId);
                const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_DATOS_ADICIONALES } });
                return manejarAgendarCita(tareaActualizada, mensaje, contexto);
            } else {
                await enviarMensajeAsistente(conversacionId, `Lo siento, ese horario no está disponible. Por favor, elige otro día y hora.`, usuarioWaId, negocioPhoneNumberId);
                return { success: true, data: null };
            }
        }

        case EstadoTareaConversacional.RECOLECTANDO_DATOS_ADICIONALES: {
            if (!tareaContexto.servicioId) {
                const serviciosDisponibles = await prisma.agendaTipoCita.findMany({ where: { negocioId: asistente.negocio!.id, activo: true }, select: { id: true, nombre: true } });
                const listaServicios = serviciosDisponibles.map(s => `- **${s.nombre}**`).join('\n');
                await enviarMensajeAsistente(conversacionId, `Ahora, ¿para cuál de nuestros servicios te gustaría agendar?\n\n${listaServicios}`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.ESPERANDO_SERVICIO } });
                return { success: true, data: null };
            }

            const camposRequeridos = await prisma.cRMCampoPersonalizado.findMany({
                where: { crmId: asistente.negocio!.CRM!.id, requerido: true, nombre: { not: 'correo electrónico' } },
                orderBy: { orden: 'asc' }
            });

            if (!tareaContexto.camposPersonalizados) tareaContexto.camposPersonalizados = {};

            const camposFaltantes = camposRequeridos.filter(campo => !tareaContexto.camposPersonalizados![campo.id]);

            if (camposFaltantes.length > 0) {
                const { pregunta, ejemplo } = await construirPreguntaDinamica(camposFaltantes);
                await enviarMensajeAsistente(conversacionId, `${pregunta} ${ejemplo}`, usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.ESPERANDO_CAMPO_PERSONALIZADO } });
                return { success: true, data: null };
            }

            const lead = await prisma.lead.findUnique({ where: { id: leadId }, select: { email: true } });
            if (lead?.email && lead.email !== '') {
                tareaContexto.email = lead.email;
                const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
                return manejarAgendarCita(tareaActualizada, mensaje, contexto);
            } else {
                await enviarMensajeAsistente(conversacionId, "Para poder enviarte la confirmación por correo, ¿me podrías proporcionar tu email, por favor?", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.ESPERANDO_EMAIL } });
                return { success: true, data: null };
            }
        }

        case EstadoTareaConversacional.ESPERANDO_SERVICIO: {
            const serviciosDisponibles = await prisma.agendaTipoCita.findMany({ where: { negocioId: asistente.negocio!.id, activo: true } });
            const servicioEncontrado = findBestMatchingService(textoUsuario, serviciosDisponibles);
            if (servicioEncontrado) {
                tareaContexto.servicioId = servicioEncontrado.id;
                tareaContexto.servicioNombre = servicioEncontrado.nombre;
                const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_DATOS_ADICIONALES } });
                return manejarAgendarCita(tareaActualizada, mensaje, contexto);
            } else {
                await enviarMensajeAsistente(conversacionId, "No encontré ese servicio. ¿Podrías elegir uno de la lista que te mencioné?", usuarioWaId, negocioPhoneNumberId);
                return { success: true, data: null };
            }
        }

        case EstadoTareaConversacional.ESPERANDO_CAMPO_PERSONALIZADO: {
            if (!tareaContexto.camposPersonalizados) {
                tareaContexto.camposPersonalizados = {};
            }

            // ✅ SOLUCIÓN: Obtenemos AMBOS, los campos y los servicios, para pasarlos al helper.
            const [camposRequeridos, serviciosDisponibles] = await prisma.$transaction([
                prisma.cRMCampoPersonalizado.findMany({
                    where: {
                        crmId: asistente.negocio!.CRM!.id,
                        requerido: true,
                        nombre: { not: 'correo electrónico' }
                    },
                    orderBy: { orden: 'asc' }
                }),
                prisma.agendaTipoCita.findMany({
                    where: { negocioId: asistente.negocio!.id, activo: true }
                })
            ]);

            // Construimos el prompt dinámico con los 3 argumentos requeridos.
            const promptDinamico = construirPromptDeExtraccionDinamico(
                textoUsuario,
                serviciosDisponibles,
                camposRequeridos
            );

            const resultadoIA = await generarRespuestaAsistente({
                historialConversacion: [],
                mensajeUsuarioActual: promptDinamico,
                contextoAsistente: {
                    nombreAsistente: asistente.nombre,
                    nombreNegocio: asistente.negocio?.nombre || 'el negocio'
                },
                tareasDisponibles: [],
            });

            const respuestaJson = resultadoIA.data?.respuestaTextual;
            let extraccion: { servicio?: string, campos_personalizados?: { [key: string]: string } } | null = null;
            if (respuestaJson && respuestaJson.toLowerCase().trim() !== 'null') {
                try {
                    const match = respuestaJson.match(/{[\s\S]*}/);
                    if (match) extraccion = JSON.parse(match[0]);
                } catch (e) {
                    console.error("Error parseando JSON de contexto de agendamiento dinámico:", e);
                }
            }

            if (extraccion?.campos_personalizados) {
                for (const nombreCampo in extraccion.campos_personalizados) {
                    const campoDB = camposRequeridos.find(c => c.nombre.toLowerCase() === nombreCampo.toLowerCase());
                    const valorExtraido = extraccion.campos_personalizados[nombreCampo];
                    if (campoDB && valorExtraido) {
                        tareaContexto.camposPersonalizados[campoDB.id] = valorExtraido;
                    }
                }
            }

            const tareaActualizada = await prisma.tareaEnProgreso.update({
                where: { id: tarea.id },
                data: {
                    contexto: tareaContexto as Prisma.JsonObject,
                    estado: EstadoTareaConversacional.RECOLECTANDO_DATOS_ADICIONALES
                }
            });

            return manejarAgendarCita(tareaActualizada, mensaje, contexto);
        }

        case EstadoTareaConversacional.ESPERANDO_EMAIL: {
            const emailSchema = z.string().email("Ese no parece ser un correo válido. ¿Podrías verificarlo?");
            const validation = emailSchema.safeParse(textoUsuario.trim());
            if (validation.success) {
                tareaContexto.email = validation.data;
                await prisma.lead.update({ where: { id: leadId }, data: { email: validation.data } });
                const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO } });
                return manejarAgendarCita(tareaActualizada, mensaje, contexto);
            } else {
                await enviarMensajeAsistente(conversacionId, validation.error.errors[0].message, usuarioWaId, negocioPhoneNumberId);
                return { success: true, data: null };
            }
        }

        case EstadoTareaConversacional.PENDIENTE_CONFIRMACION_USUARIO: {
            const [leadInfo, camposInfo] = await prisma.$transaction([
                prisma.lead.findUniqueOrThrow({ where: { id: leadId }, select: { nombre: true, telefono: true } }),
                prisma.cRMCampoPersonalizado.findMany({
                    where: { id: { in: Object.keys(tareaContexto.camposPersonalizados || {}) } },
                    select: { id: true, nombre: true },
                    orderBy: { orden: 'asc' }
                })
            ]);

            const telefono10Digitos = leadInfo.telefono ? leadInfo.telefono.slice(-10) : '';

            let resumen = `¡Perfecto! Por favor, confirma que los datos de tu cita son correctos:\n`;
            resumen += `\n- **A nombre de:** ${leadInfo.nombre}`;
            resumen += `\n- **Teléfono:** ${telefono10Digitos}`;
            resumen += `\n- **Servicio:** ${tareaContexto.servicioNombre}`;

            camposInfo.forEach(campo => {
                const valor = tareaContexto.camposPersonalizados?.[campo.id];
                if (valor) {
                    resumen += `\n- **${campo.nombre}:** ${valor}`;
                }
            });

            resumen += `\n- **Fecha:** ${new Date(tareaContexto.fechaHora!).toLocaleString('es-MX', { dateStyle: 'full', timeStyle: 'short', timeZone: 'America/Mexico_City' })}`;
            if (tareaContexto.email) {
                resumen += `\n- **Confirmación a:** ${tareaContexto.email}`;
            }
            resumen += `\n\n¿Es todo correcto? Responde "sí" para confirmar.`;

            await enviarMensajeAsistente(conversacionId, resumen, usuarioWaId, negocioPhoneNumberId);
            await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.EJECUTANDO_ACCION_FINAL } });
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.EJECUTANDO_ACCION_FINAL: {
            const keywordsAfirmativos = ['si', 'sí', 'claro', 'ok', 'perfecto', 'de acuerdo', 'correcto'];
            if (keywordsAfirmativos.some(kw => textoUsuario.toLowerCase().includes(kw))) {
                const resultadoAgendado = await ejecutarConfirmacionFinalCitaAction(tareaContexto, contexto);

                if (resultadoAgendado.success) {
                    let mensajeFinal = resultadoAgendado.data!.mensajeAdicional!;

                    if (tareaContexto.email) {
                        mensajeFinal += `\n\nTe hemos enviado una confirmación a tu correo electrónico. ¡Te esperamos!`;
                        try {
                            const [leadInfo, tipoCitaInfo, negocioInfo, camposInfo] = await prisma.$transaction([
                                prisma.lead.findUniqueOrThrow({ where: { id: leadId } }),
                                prisma.agendaTipoCita.findUniqueOrThrow({ where: { id: resultadoAgendado.data!.agenda.tipoDeCitaId! } }),
                                prisma.negocio.findUniqueOrThrow({
                                    where: { id: asistente.negocio!.id },
                                    include: { AsistenteVirtual: true }
                                }),
                                prisma.cRMCampoPersonalizado.findMany({
                                    where: { id: { in: Object.keys(tareaContexto.camposPersonalizados || {}) } },
                                    select: { id: true, nombre: true },
                                    orderBy: { orden: 'asc' }
                                })
                            ]);

                            let detallesAdicionales = '';
                            camposInfo.forEach(campo => {
                                const valor = tareaContexto.camposPersonalizados?.[campo.id];
                                if (valor) {
                                    detallesAdicionales += `<p style="margin:0;color:#374151;"><b>${campo.nombre}:</b> ${valor}</p>`;
                                }
                            });

                            const fechaCita = new Date(resultadoAgendado.data!.agenda.fecha);
                            const fechaFormateadaParaLink = fechaCita.toLocaleString('es-MX', {
                                dateStyle: 'long',
                                timeStyle: 'short',
                                timeZone: 'America/Mexico_City'
                            });

                            let linkCancelarWhatsApp: string | undefined = undefined;
                            let linkReagendarWhatsApp: string | undefined = undefined;

                            const asistenteActivo = negocioInfo.AsistenteVirtual.find(a => a.id === asistente.id);
                            const numeroWhatsappAsistente = asistenteActivo?.whatsappBusiness?.replace(/\D/g, '');

                            if (numeroWhatsappAsistente) {
                                const textoCancelar = `Quiero "cancelar" mi cita de "${tipoCitaInfo.nombre}" del ${fechaFormateadaParaLink}.`;
                                const textoReagendar = `Quiero "reagendar" mi cita de "${tipoCitaInfo.nombre}" del ${fechaFormateadaParaLink}.`;

                                linkCancelarWhatsApp = `https://wa.me/${numeroWhatsappAsistente}?text=${encodeURIComponent(textoCancelar)}`;
                                linkReagendarWhatsApp = `https://wa.me/${numeroWhatsappAsistente}?text=${encodeURIComponent(textoReagendar)}`;
                            } else {
                                console.warn(`[HANDLER] No se generaron links de acción porque el AsistenteVirtual ID ${asistente.id} no tiene un 'whatsappBusiness' configurado.`);
                            }

                            await enviarEmailConfirmacionCita({
                                emailDestinatario: tareaContexto.email,
                                nombreDestinatario: leadInfo.nombre,
                                nombreNegocio: negocioInfo.nombre,
                                nombreServicio: tipoCitaInfo.nombre,
                                fechaHoraCita: resultadoAgendado.data!.agenda.fecha,
                                detallesAdicionales: detallesAdicionales,
                                modalidadCita: tipoCitaInfo.esVirtual ? 'virtual' : 'presencial',
                                ubicacionCita: negocioInfo.direccion || undefined,
                                googleMapsUrl: negocioInfo.googleMaps || undefined,
                                linkCancelar: linkCancelarWhatsApp,
                                linkReagendar: linkReagendarWhatsApp,
                                emailRespuestaNegocio: negocioInfo.email || 'contacto@promedia.mx',
                            });

                        } catch (error) {
                            console.error("[AGENDAR] Fallo el envío del correo, pero la cita fue exitosa.", error);
                        }
                    }
                    await enviarMensajeAsistente(conversacionId, mensajeFinal, usuarioWaId, negocioPhoneNumberId);
                } else {
                    await enviarMensajeAsistente(conversacionId, `Hubo un problema al agendar: ${resultadoAgendado.error}`, usuarioWaId, negocioPhoneNumberId);
                }
                await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            } else {
                await enviarMensajeAsistente(conversacionId, "De acuerdo. ¿Qué dato te gustaría corregir? (ej. 'la fecha', 'el colegio', 'el grado')", usuarioWaId, negocioPhoneNumberId);
                await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { estado: EstadoTareaConversacional.ANALIZANDO_CORRECCION } });
            }
            return { success: true, data: null };
        }

        case EstadoTareaConversacional.ANALIZANDO_CORRECCION: {
            const texto = textoUsuario.toLowerCase();
            const extraccionDeFecha = await extraerPalabrasClaveDeFecha(texto);

            if (extraccionDeFecha && (extraccionDeFecha.dia_semana || extraccionDeFecha.dia_relativo || extraccionDeFecha.dia_mes || extraccionDeFecha.hora_str)) {
                if (!extraccionDeFecha.hora_str && tareaContexto.fechaHora) {
                    const horaOriginal = new Date(tareaContexto.fechaHora).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
                    extraccionDeFecha.hora_str = horaOriginal;
                }
                await enviarMensajeAsistente(conversacionId, "Entendido, vamos a cambiar la fecha.", usuarioWaId, negocioPhoneNumberId);
                delete tareaContexto.fechaHora;
                const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_FECHA_HORA } });
                return manejarAgendarCita(tareaActualizada, mensaje, contexto);
            }

            if (texto.includes('servicio')) {
                delete tareaContexto.servicioId;
                delete tareaContexto.servicioNombre;
                await enviarMensajeAsistente(conversacionId, "De acuerdo, elijamos otro servicio.", usuarioWaId, negocioPhoneNumberId);
                const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_DATOS_ADICIONALES } });
                return manejarAgendarCita(tareaActualizada, mensaje, contexto);
            }

            const camposInfo = await prisma.cRMCampoPersonalizado.findMany({ where: { id: { in: Object.keys(tareaContexto.camposPersonalizados || {}) } } });
            const campoACorregir = camposInfo.find(c => texto.includes(c.nombre.toLowerCase()));

            if (campoACorregir) {
                await enviarMensajeAsistente(conversacionId, `Ok, vamos a corregir el **${campoACorregir.nombre}**.`, usuarioWaId, negocioPhoneNumberId);
                delete tareaContexto.camposPersonalizados![campoACorregir.id];
                const tareaActualizada = await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: tareaContexto as Prisma.JsonObject, estado: EstadoTareaConversacional.RECOLECTANDO_DATOS_ADICIONALES } });
                return manejarAgendarCita(tareaActualizada, mensaje, contexto);
            }

            await enviarMensajeAsistente(conversacionId, "No estoy seguro de qué corregir. Empecemos de nuevo para asegurar que todo esté bien. ¿Para qué fecha y hora quieres la cita?", usuarioWaId, negocioPhoneNumberId);
            await prisma.tareaEnProgreso.update({ where: { id: tarea.id }, data: { contexto: {} as Prisma.JsonObject, estado: EstadoTareaConversacional.VALIDANDO_FECHA_HORA } });
            return { success: true, data: null };
        }

        default: {
            await prisma.tareaEnProgreso.delete({ where: { id: tarea.id } });
            return { success: false, error: `Estado no manejado en agendarCita: ${tarea.estado}` };
        }
    }
}