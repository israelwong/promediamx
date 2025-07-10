// // app/admin/_lib/negocio.actions.ts
// 'use server'
// import prisma from './prismaClient'
// import { Negocio, AsistenteVirtual } from './types'; // Ajusta ruta a tus tipos
// import { Prisma } from '@prisma/client';
// import { EstadoConfiguracionNegocio, ActionResult } from './types'; // O importa desde donde definas los tipos
// import { llamarGeminiParaMejorarTexto } from '@/scripts/gemini/gemini.actions'; // Ajusta la ruta a tu función de IA
// import { revalidatePath } from 'next/cache';


// interface AsistenteTareaSuscripcion {
//     montoSuscripcion: number;
//     status: 'activo' | 'inactivo';
// }

// // Tipo para los datos de entrada de la acción
// type CrearNegocioData = Pick<Negocio, 'nombre'> & {
//     clienteId: string;
//     descripcion?: string | null;
// };

// // --- Acción para Crear Negocio y su CRM inicial ---
// export async function crearNegocio(
//     data: CrearNegocioData
// ): Promise<{ success: boolean; data?: Negocio; error?: string }> {

//     if (!data.clienteId) {
//         return { success: false, error: "El ID del cliente es obligatorio." };
//     }
//     if (!data.nombre?.trim()) {
//         return { success: false, error: "El nombre del negocio es obligatorio." };
//     }

//     try {
//         // Usar una transacción para asegurar que todo se cree o nada
//         const nuevoNegocioConCRM = await prisma.$transaction(async (tx) => {
//             // 1. Crear el Negocio
//             const nuevoNegocio = await tx.negocio.create({
//                 data: {
//                     clienteId: data.clienteId,
//                     nombre: data.nombre.trim(),
//                     // descripcion: data.descripcion?.trim() || null,
//                     status: 'activo', // Status inicial por defecto
//                     // Otros campos con valores por defecto si los tienes
//                 },
//             });

//             return nuevoNegocio;
//         });

//         return { success: true, data: nuevoNegocioConCRM as Negocio };

//     } catch (error: unknown) {
//         console.error('Error creating negocio and initial CRM setup:', error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
//             // Podría ser un nombre de negocio duplicado si tienes esa restricción
//             return { success: false, error: `Ya existe un registro con un valor único proporcionado.` };
//         }
//         if (error instanceof Error) {
//             return { success: false, error: error.message };
//         }
//         return { success: false, error: 'An unknown error occurred during creation' };
//     }
// }

// export async function obtenerNegocios() {
//     const negocios = await prisma.negocio.findMany({
//         orderBy: {
//             id: 'asc'
//         },
//         include: {
//             cliente: {
//                 select: {
//                     id: true,
//                     nombre: true
//                 }
//             },
//             AsistenteVirtual: {
//                 select: {
//                     id: true,
//                     nombre: true,
//                     status: true,
//                     createdAt: true,
//                     updatedAt: true,
//                     phoneNumberId: true,
//                     version: true,
//                 }
//             }
//         }
//     })
//     return negocios
// }

// export async function obtenerNegociosPorClienteId(clienteId: string) {
//     const negocios = await prisma.negocio.findMany({
//         where: {
//             clienteId: clienteId
//         },
//         orderBy: {
//             id: 'asc'
//         },
//         include: {
//             cliente: {
//                 select: {
//                     id: true,
//                     nombre: true,
//                     email: true, // Hacer opcional y único
//                     telefono: true, // Hacer opcional
//                     rfc: true,
//                     curp: true,
//                     razonSocial: true,
//                     status: true,
//                     createdAt: true,
//                     updatedAt: true,
//                     stripeCustomerId: true // ID de Cliente en Stripe
//                 }
//             },
//             AsistenteVirtual: {
//                 select: {
//                     id: true,
//                     nombre: true,
//                     status: true,
//                     createdAt: true,
//                     updatedAt: true,
//                     phoneNumberId: true,
//                     version: true,
//                 }
//             },
//             Catalogo: {
//                 select: {
//                     id: true,
//                     descripcion: true,
//                     // precio: true
//                 }
//             }
//         }
//     })
//     return negocios
// }

// export async function obtenerNegocioPorId(negocioId: string) {

//     const crmExistente = await prisma.cRM.findFirst({
//         where: {
//             negocioId: negocioId
//         }
//     });

//     if (!crmExistente) {
//         await prisma.cRM.create({
//             data: {
//                 negocioId: negocioId
//             }
//         });
//     }

//     const negocio = await prisma.negocio.findUnique({
//         where: {
//             id: negocioId
//         },
//         include: {
//             cliente: {
//                 select: {
//                     id: true,
//                     nombre: true
//                 }
//             },
//             AsistenteVirtual: {
//                 select: {
//                     id: true,
//                     nombre: true,
//                     status: true,
//                     createdAt: true,
//                     updatedAt: true,
//                     phoneNumberId: true,
//                     version: true,
//                 }
//             },
//             CRM: {
//                 select: {
//                     id: true
//                 }
//             },
//         }
//     })
//     return negocio
// }


// export async function actualizarNegocio(negocioId: string, negocio: Negocio) {

//     const negocioActualizado = await prisma.negocio.update({
//         where: {
//             id: negocioId
//         },
//         data: {
//             logo: negocio.logo,
//             nombre: negocio.nombre,
//             slogan: negocio.slogan,
//             // descripcion: negocio.descripcion,
//             telefonoLlamadas: negocio.telefonoLlamadas,
//             telefonoWhatsapp: negocio.telefonoWhatsapp,
//             email: negocio.email,
//             direccion: negocio.direccion,
//             googleMaps: negocio.googleMaps,
//             paginaWeb: negocio.paginaWeb,
//             // horarioAtencion: negocio.horarioAtencion,
//             garantias: negocio.garantias,
//             politicas: negocio.politicas,
//             avisoPrivacidad: negocio.avisoPrivacidad,
//             competencia: negocio.competencia,
//             clienteIdeal: negocio.clienteIdeal,
//             terminologia: negocio.terminologia,
//             // preguntasFrecuentes: negocio.preguntasFrecuentes,
//             // objeciones: negocio.objeciones,
//             status: negocio.status ?? undefined,
//             clienteId: negocio.clienteId,
//         }
//     })
//     return negocioActualizado
// }

// export async function generarPrompt(negocioId: string, palabrasClave: string) {
//     const negocio = await prisma.negocio.findUnique({
//         where: {
//             id: negocioId
//         }
//     });
//     if (!negocio) {
//         throw new Error('Negocio no encontrado');
//     }

//     const keywords = palabrasClave
//         ? palabrasClave.toLowerCase().split(',').map(k => k.trim())
//         : null;
//     const sections = [];

//     if (!keywords || (keywords.includes('informacion_negocio'))) {
//         sections.push(`Nombre del negocio: ${negocio.nombre}`);
//         // sections.push(`${negocio.descripcion}`);
//     }

//     const contacto = [];
//     if (!keywords || (keywords.includes('contacto_negocio') || keywords.includes('contacto'))) {
//         if (negocio.telefonoLlamadas && negocio.telefonoLlamadas.trim() !== '') {
//             contacto.push(`- **Teléfono de Llamadas:** ${negocio.telefonoLlamadas}`);
//         }
//         if (negocio.telefonoWhatsapp && negocio.telefonoWhatsapp.trim() !== '') {
//             contacto.push(`- **Teléfono de WhatsApp:** ${negocio.telefonoWhatsapp}`);
//         }
//         if (negocio.email && negocio.email.trim() !== '') {
//             contacto.push(`- **Email:** ${negocio.email}`);
//         }
//         // if (negocio.horarioAtencion && negocio.horarioAtencion.trim() !== '') {
//         //     contacto.push(`- **Horario de Atención:**\n${negocio.horarioAtencion}`);
//         // }
//         if (negocio.direccion && negocio.direccion.trim() !== '') {
//             contacto.push(`- **Dirección:** ${negocio.direccion}`);
//         }
//         if (negocio.googleMaps && negocio.googleMaps.trim() !== '') {
//             contacto.push(`- **Google Maps:** ${negocio.googleMaps}`);
//         }
//     }
//     if (contacto.length > 0) {
//         sections.push(`## Contacto\n${contacto.join('\n')}`);
//     }

//     const presenciaEnLinea = [];
//     if (!keywords || (negocio.paginaWeb && (keywords.includes('pagina_web') || keywords.includes('pagina') || keywords.includes('web') || keywords.includes('sitio web') || keywords.includes('internet')))) {
//         presenciaEnLinea.push(`- **Página Web:** ${negocio.paginaWeb}`);
//     }

//     if (presenciaEnLinea.length > 0) {
//         sections.push(`## Presencia en Línea\n${presenciaEnLinea.join('\n')}`);
//     }

//     // const informacionAdicional = [];
//     // if (!keywords || (negocio.garantias && (keywords.includes('garantias') || keywords.includes('garantia')))) {
//     //     if (negocio.garantias && negocio.garantias.trim() !== '') {
//     //         informacionAdicional.push(`- **Garantías:** ${negocio.garantias}`);
//     //     }
//     // }
//     // if (!keywords || (negocio.politicas && (keywords.includes('politicas') || keywords.includes('política') || keywords.includes('devolucion')))) {
//     //     if (negocio.politicas && negocio.politicas.trim() !== '') {
//     //         informacionAdicional.push(`- **Políticas:** ${negocio.politicas}`);
//     //     }
//     // }
//     // if (!keywords || (negocio.catalogoDescriptivo && (keywords.includes('catalogo_descriptivo') || keywords.includes('catálogo') || keywords.includes('descriptivo')))) {
//     //     if (negocio.catalogoDescriptivo && negocio.catalogoDescriptivo.trim() !== '') {
//     //         informacionAdicional.push(`- **Catálogo Descriptivo:** ${negocio.catalogoDescriptivo}`);
//     //     }
//     // }

//     if (informacionAdicional.length > 0) {
//         sections.push(`## Información Adicional\n${informacionAdicional.join('\n')}`);
//     }

//     // const analisisEstrategia = [];
//     // if (!keywords || (negocio.competencia && (keywords.includes('competencia') || keywords.includes('comparación') || keywords.includes('comparativa')))) {
//     //     analisisEstrategia.push(`- **Competencia:** ${negocio.competencia}`);
//     // }
//     // if (negocio.clienteIdeal && negocio.clienteIdeal.trim() !== '') {
//     //     analisisEstrategia.push(`- **Cliente Ideal:** ${negocio.clienteIdeal}`);
//     // }

//     // if (negocio.terminologia && negocio.terminologia.trim() !== '') {
//     //     analisisEstrategia.push(`- **Terminología Especializada:** ${negocio.terminologia}`);
//     // }

//     // if (!keywords || (negocio.preguntasFrecuentes && keywords.includes('preguntas_frecuentes'))) {
//     //     analisisEstrategia.push(`- **Preguntas Frecuentes:** ${negocio.preguntasFrecuentes}`);
//     // }
//     // if (!keywords || (negocio.objeciones && (keywords.includes('objeciones') || keywords.includes('queja')))) {
//     //     analisisEstrategia.push(`- **Objeciones Comunes:** ${negocio.objeciones}`);
//     // }
//     if (analisisEstrategia.length > 0) {
//         sections.push(`## Análisis y Estrategia\n${analisisEstrategia.join('\n')}`);
//     }

//     sections.push(`## Palabras Clave Mapeadas\n${keywords ? keywords.join(', ') : 'No se proporcionaron palabras clave'}`);

//     return sections.join('\n\n');
// }

// export async function eliminarNegocio(negocioId: string) {
//     const negocioEliminado = await prisma.negocio.delete({
//         where: {
//             id: negocioId
//         }
//     });
//     return negocioEliminado;
// }

// // Interfaz extendida para el resultado de la acción
// export interface NegocioHeaderData extends Omit<Negocio, 'AsistenteVirtual'> {
//     // Campos adicionales que podrías añadir al modelo Negocio
//     suscripcionStatus?: 'activa' | 'inactiva' | 'prueba' | 'cancelada' | null;
//     estadoPago?: 'pagado' | 'pendiente' | 'vencido' | null;
//     fechaProximoPago?: Date | null;
//     // Incluir asistentes con datos necesarios para cálculo
//     AsistenteVirtual?: (Pick<AsistenteVirtual, 'id' | 'precioBase' | 'nombre' | 'version'> & {
//         AsistenteTareaSuscripcion?: Pick<AsistenteTareaSuscripcion, 'montoSuscripcion' | 'status'>[];
//     })[];
// }

// export async function obtenerDatosHeaderNegocio(negocioId: string): Promise<NegocioHeaderData | null> {
//     if (!negocioId) return null;
//     try {
//         const negocio = await prisma.negocio.findUnique({
//             where: { id: negocioId },
//             include: {
//                 // Incluir asistentes
//                 AsistenteVirtual: {
//                     select: {
//                         id: true,
//                         // precioBase: true, // Asegúrate que este campo exista
//                         nombre: true, // Include 'nombre' to match NegocioHeaderData
//                         version: true, // Include 'version' to match NegocioHeaderData
//                         // Incluir solo suscripciones activas y con monto para cálculo
//                         AsistenteTareaSuscripcion: {
//                             where: {
//                                 status: 'activo', // Solo suscripciones activas
//                                 montoSuscripcion: {
//                                     gt: 0 // Solo las que tienen costo > 0
//                                 }
//                             },
//                             select: {
//                                 montoSuscripcion: true,
//                                 status: true, // Necesario para el where, aunque se filtre
//                             }
//                         }
//                     }
//                 },
//                 // Incluir cliente si necesitas mostrar el nombre
//                 cliente: {
//                     select: { nombre: true }
//                 }
//             }
//         });

//         if (!negocio) return null;

//         // Simular campos de suscripción si no existen en el modelo aún
//         const negocioHeader: NegocioHeaderData = {
//             ...negocio,
//             estadoPago: 'pagado', // Placeholder
//             // suscripcionStatus: 'activa', // Placeholder
//             // fechaProximoPago: nextMonth, // Placeholder
//             AsistenteVirtual: Array.isArray(negocio.AsistenteVirtual)
//                 ? negocio.AsistenteVirtual
//                 : (negocio.AsistenteVirtual ? [negocio.AsistenteVirtual] : []),
//         };

//         return negocioHeader;

//     } catch (error) {
//         console.error(`Error fetching header data for negocio ${negocioId}:`, error);
//         throw new Error("Error al obtener datos de la cabecera del negocio.");
//     }
// }

// // Interfaz extendida para el resultado
// export interface NegocioConDetalles extends Negocio {
//     _count?: {
//         AsistenteVirtual?: number;
//         Catalogo?: number;
//     };
//     // Incluir asistentes con datos para cálculo de precio
//     AsistenteVirtual?: (AsistenteVirtual & {
//         precioBase?: number | null;
//         AsistenteTareaSuscripcion?: Pick<AsistenteTareaSuscripcion, 'montoSuscripcion' | 'status'>[];
//     })[];
// }

// export async function obtenerNegociosPorClienteIdConDetalles(clienteId: string): Promise<NegocioConDetalles[]> {
//     if (!clienteId) return [];
//     try {
//         const negocios = await prisma.negocio.findMany({
//             where: { clienteId: clienteId },
//             orderBy: { nombre: 'asc' },
//             select: {
//                 id: true,
//                 nombre: true,
//                 status: true, // Incluir status del negocio si quieres mostrarlo
//                 // Conteo de relaciones
//                 _count: {
//                     select: {
//                         asistenteVirtual: true, // Contar asistentes
//                         Catalogo: true,         // Contar catálogos
//                     },
//                 },
//                 // Datos necesarios para calcular precio total del negocio
//                 AsistenteVirtual: {
//                     where: { status: 'activo' }, // O considerar todos los asistentes?
//                     select: {
//                         id: true,
//                         // precioBase: true, // ¡Necesario!
//                         status: true,
//                         AsistenteTareaSuscripcion: {
//                             where: { status: 'activo' }, // Solo suscripciones activas
//                             select: {
//                                 montoSuscripcion: true, // ¡Necesario!
//                                 status: true,
//                             }
//                         }
//                     }
//                 }
//             }
//         });
//         return negocios as NegocioConDetalles[];
//     } catch (error) {
//         console.error(`Error fetching negocios for cliente ${clienteId}:`, error);
//         throw new Error("Error al obtener los negocios del cliente.");
//     }
// }


// // Tipo para el input de actualización completo
// // Incluye todos los campos editables del modelo Negocio
// // Incluye slogan, EXCLUYE redesSociales
// export type ActualizarNegocioInput = Partial<Omit<Negocio,
//     'id' | 'clienteId' | 'createdAt' | 'updatedAt' | 'cliente' |
//     'ofertas' | 'Catalogo' | 'categorias' | 'etiquetas' |
//     'AsistenteVirtual' | 'CRM' | 'itemsCatalogo' | 'Notificacion' |
//     '_count' | 'redesSociales' // Excluir redesSociales del tipo base
// >>;

// // --- ACCIÓN PARA OBTENER DATOS COMPLETOS DEL NEGOCIO (ACTUALIZADA) ---
// /**
//  * @description Obtiene todos los detalles de un negocio por su ID para el formulario de edición.
//  * @param {string} negocioId - El ID del negocio.
//  * @returns {Promise<Negocio | null>} - El objeto Negocio completo o null si no se encuentra o hay error.
//  */
// export async function obtenerDetallesNegocioParaEditar(negocioId: string): Promise<Negocio | null> {
//     if (!negocioId) {
//         console.warn("obtenerDetallesNegocioParaEditar: negocioId no proporcionado.");
//         return null;
//     }
//     try {
//         const negocio = await prisma.negocio.findUnique({
//             where: { id: negocioId },
//             // Seleccionar todos los campos necesarios para el formulario, incluyendo slogan
//             // No es necesario 'select' explícito si queremos todos los campos escalares.
//         });
//         return negocio;
//     } catch (error) {
//         console.error(`Error obteniendo detalles del negocio ${negocioId}:`, error);
//         return null;
//     }
// }

// export async function actualizarDetallesNegocio(
//     negocioId: string,
//     data: ActualizarNegocioInput
// ): Promise<ActionResult<void>> {
//     if (!negocioId) return { success: false, error: "ID de negocio no proporcionado." };
//     // Quitar explícitamente redesSociales si aún viniera en data por error
//     if ('redesSociales' in data) {
//         delete data.redesSociales;
//     }

//     try {
//         const negocioActualizado = await prisma.negocio.update({
//             where: { id: negocioId },
//             data: {
//                 ...data,
//                 status: data.status ? { set: data.status } : undefined, // Map 'status' to Prisma's update input type
//                 GaleriaNegocio: data.GaleriaNegocio
//                     ? {
//                         set: data.GaleriaNegocio.map((item) => ({ id: item.id })),
//                     }
//                     : undefined, // Map GaleriaNegocio to Prisma nested input type
//             }, // Pasar directamente los datos parciales (sin redesSociales)
//             select: { clienteId: true } // Para revalidación
//         });

//         // Revalidar rutas
//         const basePath = negocioActualizado.clienteId
//             ? `/admin/clientes/${negocioActualizado.clienteId}/negocios/${negocioId}`
//             : `/admin/negocios/${negocioId}`;
//         revalidatePath(basePath); // Dashboard negocio
//         revalidatePath(`${basePath}/editar`); // Página de edición

//         return { success: true };
//     } catch (error) {
//         console.error(`Error actualizando negocio ${negocioId}:`, error);
//         if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2025') {
//             return { success: false, error: "Negocio no encontrado para actualizar." };
//         }
//         return { success: false, error: "No se pudo actualizar la información del negocio." };
//     }
// }


// /**
//  * @description Mejora la descripción general del negocio usando IA.
//  * @param {string} negocioId - ID del negocio para contexto.
//  * @param {string} descripcionActual - Descripción a mejorar.
//  * @returns {Promise<ActionResult<{ sugerencia: string }>>} - Sugerencia de texto.
//  */


// export type NivelCreatividadIA = 'bajo' | 'medio' | 'alto'; // 'bajo' is already part of the type


// // --- ACCIONES DE IA (EJEMPLOS - Prompt de descripción actualizado) ---

// /**
//  * @description Mejora la descripción general del negocio usando IA, enfocándose en un tono profesional y claro,
//  * con parámetros de creatividad y longitud definidos internamente.
//  * @param {string} negocioId - ID del negocio para contexto.
//  * @param {string} descripcionActual - Descripción a mejorar.
//  * @returns {Promise<ActionResult<{ sugerencia: string }>>} - Sugerencia de texto.
//  */
// export async function mejorarDescripcionNegocioIA(
//     negocioId: string,
//     descripcionActual: string | null | undefined
//     // Ya no recibe nivelCreatividad ni maxCaracteres
// ): Promise<ActionResult<{ sugerencia: string }>> {
//     if (!negocioId || !descripcionActual?.trim()) {
//         return { success: false, error: "Faltan datos para mejorar la descripción." };
//     }

//     // --- Parámetros Fijos para este caso de uso ---
//     const nivelCreatividadFijo: NivelCreatividadIA = 'medio'; // O 'bajo' para ser más conservador
//     const maxCaracteresFijo = 1000; // Límite para resumen ejecutivo
//     // --------------------------------------------

//     try {
//         // 1. Obtener contexto del ítem (incluyendo slogan)
//         const negocio = await prisma.negocio.findUnique({
//             where: { id: negocioId },
//             select: { nombre: true, slogan: true, terminologia: true, descripcion: true }
//         });
//         if (!negocio) return { success: false, error: "Negocio no encontrado." };

//         // 2. Preparar datos y construir prompt (ACTUALIZADO)
//         const promptContexto = `Negocio: ${negocio.nombre}${negocio.slogan ? ` (Eslogan: ${negocio.slogan})` : ''}. Se dirige a: ${negocio.clienteIdeal || 'Público general'}. Usa terminología como: ${negocio.terminologia || 'Estándar'}.`;
//         // --- Prompt Refinado para MEJORAR REDACCIÓN como Resumen Ejecutivo ---
//         const promptMejora = `Eres un consultor de negocios y redactor experto con un nivel de creatividad ${nivelCreatividadFijo}. Revisa y **mejora la redacción** de la siguiente descripción para que funcione como un **resumen ejecutivo profesional** del negocio.\n`
//             + `**Objetivo:** Crear un texto claro, descriptivo, conciso (máximo ${maxCaracteresFijo} caracteres aprox.), sin ambigüedades y que refleje profesionalismo, manteniendo la información esencial sobre qué hace el negocio y su propuesta de valor.\n`
//             + `**Contexto adicional:** ${promptContexto}\n`
//             + `**Descripción actual a mejorar/reescribir:** "${descripcionActual.trim()}"\n`
//             + `**Instrucciones de Formato:**\n`
//             + `- Estructura en párrafos coherentes usando saltos de línea (\\n) para separar ideas principales.\n`
//             + `- Usa un lenguaje formal y profesional.\n`
//             + `- Corrige posibles errores gramaticales o de estilo.\n`
//             + `- NO incluyas el precio si se menciona en el contexto.\n\n`
//             + `Resumen Ejecutivo Mejorado:`;
//         // ---------------------------------------------------------------------

//         console.log("Enviando a llamarGeminiParaMejorarTexto con prompt fijo...");

//         // 3. Determinar temperatura basada en creatividad FIJA
//         const temperature: number = .7;
//         // switch (nivelCreatividadFijo) {
//         //     case 'bajo': temperature = 0.2; break;
//         //     case 'alto': temperature = 0.7; break; // No tan alto como antes
//         //     case 'medio': default: temperature = 0.4; break;
//         // }

//         // 4. Llamar a Gemini (pasando la configuración fija)
//         const sugerencia = await llamarGeminiParaMejorarTexto(
//             promptMejora,
//             { temperature: temperature, maxOutputTokens: maxCaracteresFijo + 100 } // Dar margen
//         );

//         if (!sugerencia) throw new Error("La IA no generó sugerencia.");

//         // 5. Devolver resultado
//         // Truncar si excede (aunque el prompt lo pide)
//         const sugerenciaFinal = sugerencia.trim().slice(0, maxCaracteresFijo);
//         return { success: true, data: { sugerencia: sugerenciaFinal } };

//     } catch (error) {
//         console.error(`Error mejorando descripción negocio ${negocioId}:`, error);
//         return { success: false, error: `Error IA: ${error instanceof Error ? error.message : 'Desconocido'}` };
//     }
// }

// /**
//  * @description Genera un borrador de políticas de privacidad/términos usando IA.
//  */
// export async function generarPoliticasNegocioIA(
//     negocioId: string,
//     tipoPolitica: 'privacidad' | 'terminos',
//     politicaActual?: string | null
// ): Promise<ActionResult<{ sugerencia: string }>> {
//     // ... (código sin cambios) ...
//     if (!negocioId || !tipoPolitica) { return { success: false, error: "Faltan datos para generar políticas." }; }
//     try {
//         const negocio = await prisma.negocio.findUnique({ where: { id: negocioId }, select: { nombre: true, slogan: true, descripcion: true, paginaWeb: true } });
//         if (!negocio) return { success: false, error: "Negocio no encontrado." };
//         const tipoTexto = tipoPolitica === 'privacidad' ? 'Política de Privacidad' : 'Términos y Condiciones';
//         const accionPrompt = politicaActual?.trim() ? `Mejora la siguiente ${tipoTexto}: "${politicaActual.trim()}"` : `Genera un borrador inicial para la ${tipoTexto}.`;
//         const promptContexto = `Negocio: ${negocio.nombre}${negocio.slogan ? ` (${negocio.slogan})` : ''}. Descripción: ${negocio.descripcion || 'N/A'}. Sitio Web: ${negocio.paginaWeb || 'N/A'}.`;
//         const prompt = `Eres un asistente legal especializado en documentos web. ${accionPrompt} Basándote en el contexto del negocio, asegúrate de incluir cláusulas estándar relevantes y usa un lenguaje claro y formal. Contexto: ${promptContexto}\n\nBorrador ${tipoTexto}:`;
//         const sugerencia = await llamarGeminiParaMejorarTexto(prompt, { temperature: 0.3 }); // Temp baja para legales
//         if (!sugerencia) throw new Error("La IA no generó sugerencia.");
//         return { success: true, data: { sugerencia: sugerencia.trim() } };
//     } catch (error) {
//         console.error(`Error generando ${tipoPolitica} negocio ${negocioId}:`, error);
//         return { success: false, error: `Error IA: ${error instanceof Error ? error.message : 'Desconocido'}` };
//     }
// }

// // --- Acción para obtener estado de configuración ---
// export async function obtenerEstadoConfiguracionNegocio(negocioId: string): Promise<EstadoConfiguracionNegocio | null> {
//     // ... (código sin cambios) ...
//     if (!negocioId) { console.warn("obtenerEstadoConfiguracionNegocio: negocioId no proporcionado."); return null; }
//     try {
//         const negocio = await prisma.negocio.findUnique({
//             where: { id: negocioId },
//             select: { id: true, logo: true, nombre: true, slogan: true, descripcion: true, telefonoLlamadas: true, telefonoWhatsapp: true, email: true, direccion: true, politicas: true, avisoPrivacidad: true, clienteIdeal: true, terminologia: true, }
//         });
//         if (!negocio) { console.warn(`Negocio ${negocioId} no encontrado.`); return null; }
//         const seccionesCompletas: { [key: string]: boolean } = {
//             logo: !!negocio.logo?.trim(), descripcion: !!(negocio.descripcion?.trim() || negocio.slogan?.trim()),
//             contacto: !!(negocio.telefonoLlamadas?.trim() || negocio.telefonoWhatsapp?.trim() || negocio.email?.trim()),
//             politicas: !!(negocio.politicas?.trim() || negocio.avisoPrivacidad?.trim()),
//             marketing: !!(negocio.clienteIdeal?.trim() || negocio.terminologia?.trim()),
//             // faqObjeciones: !!(negocio.preguntasFrecuentes?.trim() || negocio.objeciones?.trim()),
//         };
//         const totalSecciones = Object.keys(seccionesCompletas).length;
//         const seccionesCompletadas = Object.values(seccionesCompletas).filter(Boolean).length;
//         const progresoGeneral = totalSecciones > 0 ? Math.round((seccionesCompletadas / totalSecciones) * 100) : 0;
//         const estado: EstadoConfiguracionNegocio = {
//             progresoGeneral: progresoGeneral,
//             secciones: {
//                 logo: { completo: seccionesCompletas.logo }, descripcion: { completo: seccionesCompletas.descripcion }, contacto: { completo: seccionesCompletas.contacto },
//                 politicas: { completo: seccionesCompletas.politicas }, marketing: { completo: seccionesCompletas.marketing }, faqObjeciones: { completo: seccionesCompletas.faqObjeciones },
//             }
//         };
//         return estado;
//     } catch (error) { console.error(`Error obteniendo estado de configuración para negocio ${negocioId}:`, error); return null; }
// }

// // --- Definición del tipo NivelCreatividadIA (si no está global) ---
// // --- Tipo para el retorno de la nueva acción ---
// export type NegocioLogoNombre = {
//     logo: string | null;
//     nombre: string;
// } | null; // Puede devolver null si no se encuentra

// /**
//  * @description Obtiene únicamente el logo y el nombre de un negocio por su ID.
//  * @param {string} negocioId - El ID del negocio.
//  * @returns {Promise<NegocioLogoNombre>} - Objeto con logo y nombre, o null.
//  */
// export async function obtenerLogoYNombreNegocio(negocioId: string): Promise<NegocioLogoNombre> {
//     if (!negocioId) return null;
//     try {
//         const negocio = await prisma.negocio.findUnique({
//             where: { id: negocioId },
//             select: {
//                 logo: true,
//                 nombre: true,
//             }
//         });
//         // Devuelve los datos o null si no se encontró el negocio
//         return negocio ? { logo: negocio.logo, nombre: negocio.nombre } : null;
//     } catch (error) {
//         console.error(`Error obteniendo logo y nombre para negocio ${negocioId}:`, error);
//         return null; // Devolver null en caso de error
//     }
// }