'use server';

import prisma from '../../../prismaClient';
import type { FunctionExecutor } from '../../../dispatcher/dispatcher.types';

/**
 * Función simple y directa cuya única responsabilidad es
 * obtener y presentar los servicios de cita disponibles.
 */
export const ejecutarListarServiciosDeCitasAction: FunctionExecutor = async (argsFromIA, context) => {
    const { negocioId } = context;

    const servicios = await prisma.agendaTipoCita.findMany({
        where: { negocioId, activo: true },
        select: { nombre: true, descripcion: true },
        orderBy: { orden: 'asc' }
    });

    if (servicios.length === 0) {
        return {
            success: true,
            data: {
                content: "Lo siento, parece que no hay servicios configurados para agendar en este momento. Por favor, contacta a un administrador."
            }
        };
    }

    let textoRespuesta = "¡Claro! Con gusto te ayudo a agendar. Estos son nuestros servicios disponibles:\n";

    const listaServicios = servicios.map(s => {
        let item = `\n- **${s.nombre}**`;
        if (s.descripcion) {
            item += `: ${s.descripcion}`;
        }
        return item;
    }).join('');

    textoRespuesta += `${listaServicios}\n\n¿Para cuál de ellos te gustaría agendar tu cita?`;

    return {
        success: true,
        data: {
            content: textoRespuesta,
            // Opcional: podemos darle contexto a la IA de que el siguiente paso probable es agendar.
            aiContextData: {
                status: 'SERVICIOS_LISTADOS',
                nextActionSuggestion: 'agendarCita'
            }
        }
    };
};