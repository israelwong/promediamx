// Ruta: app/admin/_lib/funciones/ofertas/mostrarOfertas/mostrarOfertas.actions.ts
'use server';

import prisma from '../../../prismaClient';
import type { ActionResult } from '../../../types';
import type { FullExecutionFunctionContext, FunctionResponsePayload } from '../../../dispatcher/dispatcher.types';
import {
    MostrarOfertasArgsSchema,
    type OfertaResumen,
} from './mostrarOfertas.schemas';

export async function ejecutarMostrarOfertasAction(
    argsFromIA: Record<string, unknown>, // Argumentos brutos de la IA
    context: FullExecutionFunctionContext
): Promise<ActionResult<FunctionResponsePayload | null>> {

    const actionName = "ejecutarMostrarOfertasAction";
    console.log(`[${actionName}] Iniciando. TareaEjecutadaId: ${context.tareaEjecutadaId}`);
    console.log(`[${actionName}] Args de IA:`, argsFromIA);
    console.log(`[${actionName}] Contexto:`, { ...context, asistenteDb: "omitido", negocioDb: "omitido" }); // No loguear objetos grandes

    // 1. Validar los argumentos de la IA con el schema Zod específico
    const validationResult = MostrarOfertasArgsSchema.safeParse(argsFromIA);
    if (!validationResult.success) {
        console.warn(`[${actionName}] Error de validación de argumentos de IA:`, validationResult.error.flatten().fieldErrors);
        const userMessage = "Parece que hubo un problema al procesar tu solicitud para ver las ofertas. Intenta de nuevo.";
        return {
            success: true, // La función se ejecutó para dar feedback, no es un error catastrófico del sistema
            data: { content: userMessage, media: null, uiComponentPayload: null },
            error: "Argumentos de IA inválidos para mostrarOfertas.", // Para logs internos
            validationErrors: validationResult.error.flatten().fieldErrors
        };
    }
    // const validatedArgs = validationResult.data; // En este caso, validatedArgs sería un objeto vacío {}

    const { negocioId, canalNombre } = context;

    if (!negocioId) { // Aunque el contexto debería tenerlo, es una buena verificación
        console.error(`[${actionName}] Error crítico: negocioId no encontrado en el contexto.`);
        return { success: false, error: "Configuración interna incorrecta: Falta ID del negocio.", data: null };
    }

    try {
        const ahora = new Date();
        const ofertasDb = await prisma.oferta.findMany({
            where: {
                negocioId: negocioId,
                status: 'activo',
                fechaInicio: { lte: ahora },
                fechaFin: { gte: ahora },
            },
            select: {
                id: true,
                nombre: true,
                descripcion: true, // Seleccionar para posible descripción corta o uiPayload
                // tipoPago: true, // Podría ser útil para un uiPayload más rico
                // precio: true,   // Podría ser útil para un uiPayload más rico
            },
            orderBy: {
                // Podrías tener un campo 'ordenPromocional' o similar en Oferta
                // O mantener el orden por fechaFin, o por fechaCreacion
                createdAt: 'desc', // Mostrar las más nuevas primero, por ejemplo
            },
            take: 5 // Limitar a 5 para conversación inicial, se pueden añadir más con "ver más"
        });

        const ofertasEncontradas: OfertaResumen[] = ofertasDb.map(o => ({
            id: o.id,
            nombre: o.nombre,
        }));

        let mensajeParaUsuario: string;
        let uiPayload: Record<string, unknown> | null = null;

        if (ofertasEncontradas.length === 0) {
            mensajeParaUsuario = "Por el momento no tenemos ofertas o promociones especiales activas. ¡Vuelve a consultarnos pronto!";
        } else if (ofertasEncontradas.length === 1) {
            const oferta = ofertasDb[0]; // Usar la oferta completa para más detalles
            mensajeParaUsuario = `¡Tenemos una oferta especial para ti! Se llama "${oferta.nombre}". ${oferta.descripcion ? oferta.descripcion.substring(0, 100) + '... ' : ''}¿Te gustaría saber más detalles o aceptarla?`;
            // Para WebChat, podríamos enviar la oferta completa
            if (canalNombre?.toLowerCase().includes('webchat')) {
                uiPayload = {
                    componentType: 'OfferCard', // O un nombre de componente que tengas
                    data: {
                        id: oferta.id,
                        nombre: oferta.nombre,
                        descripcion: oferta.descripcion,
                        // precio: oferta.precio, // etc.
                    }
                };
            }
        } else {
            mensajeParaUsuario = `¡Buenas noticias! Tenemos estas ofertas especiales disponibles:\n`;
            ofertasEncontradas.forEach((o, index) => {
                mensajeParaUsuario += `${index + 1}. "${o.nombre}"\n`;
            });
            mensajeParaUsuario += `\n¿Te gustaría conocer los detalles de alguna en particular? Puedes decirme el nombre o número.`;

            if (canalNombre?.toLowerCase().includes('webchat')) {
                uiPayload = {
                    componentType: 'OfferListDisplay', // O un nombre de componente que tengas
                    data: {
                        ofertas: ofertasDb.map(o => ({ // Enviar más detalles para la lista en WebChat
                            id: o.id,
                            nombre: o.nombre,
                            descripcionCorta: o.descripcion?.substring(0, 70) + "..."
                        }))
                    }
                };
            }
        }

        // La actualización de TareaEjecutada.metadata con el resultado específico de la función
        // ahora la maneja el dispatcher central después de que esta función retorna.
        // No es necesario llamar a prisma.tareaEjecutada.update() aquí.

        const responsePayload: FunctionResponsePayload = {
            content: mensajeParaUsuario,
            media: null, // Esta función no devuelve media directamente
            uiComponentPayload: uiPayload
        };

        console.log(`[${actionName}] ${ofertasEncontradas.length} ofertas encontradas para negocio ${negocioId}.`);
        return { success: true, data: responsePayload };

    } catch (error: unknown) {
        console.error(`[${actionName}] Error al obtener ofertas para negocio ${negocioId}:`, error);
        // El dispatcher se encargará de loguear esto en TareaEjecutada.metadata
        // Devolvemos un mensaje genérico para el usuario en caso de error no controlado.
        return {
            success: false,
            error: `Error interno al obtener las ofertas: ${error instanceof Error ? error.message : "Error desconocido."}`,
            data: { content: "Lo siento, no pude obtener las ofertas en este momento. Por favor, intenta más tarde.", media: null, uiComponentPayload: null }
        };
    }
}