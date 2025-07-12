// /app/admin/_lib/actions/whatsapp/tasks/manejarSolicitudDeCostos.handler.ts
'use server';

import prisma from '@/app/admin/_lib/prismaClient';
import { Prisma } from '@prisma/client';
import type { FsmContext } from '../whatsapp.schemas';
import { enviarMensajeAsistente } from '../core/orchestrator-original';

export async function manejarSolicitudDeCostos(contexto: FsmContext) {
    const { conversacionId, usuarioWaId, negocioPhoneNumberId } = contexto;

    // Este es el bloque de texto predefinido que siempre se enviará para "costos"
    const respuestaDeCostos = `Grupo Cultural Albatros ofrece diferentes *paquetes educativos*. Desde el paquete más básico tu hijo, hija tendrá acceso a Computación, robótica, danza e inglés con certificación en Cambridge.

*Colegio Albatros. Zumpango Centro* te ofrece colegiaturas desde:
> Kinder 1°	$1,590.00 MXN
> Kinder 2º y 3°	$1,766.00 MXN
> Primaria 1°	$2,264.00 MXN
> Primaria 2°	$2,390.00 MXN
> Primaria 3°-6°	$2,516.00 MXN

*Colegio Tecno. Zumpango San Lorenzo* te ofrece colegiaturas desde:
> Kinder 1º-3º	$2,516.00 MXN
> Primaria 1°	$3,005.00 MXN
> Primaria 2º-6º	$3,164.00 MXN
> Secundaria 1º-3º	$3,278.00 MXN

Cada colegio ofrece paquetes educativos especiales con servicios adicionales como: horario amplio, natación, talleres académicos, artísticos y deportivos.`;

    await enviarMensajeAsistente(conversacionId, respuestaDeCostos, usuarioWaId, negocioPhoneNumberId);

    // Inmediatamente después, creamos la tarea de seguimiento para invitar a la acción
    const contextoSeguimiento = {
        siguienteTarea: 'agendarCita',
        preguntaDeCierre: '¿Te gustaría agendar una cita para darte los detalles completos y recibir una oferta especial?'
    };

    await prisma.tareaEnProgreso.create({
        data: {
            conversacionId,
            nombreTarea: 'seguimientoGenerico',
            contexto: contextoSeguimiento as Prisma.JsonObject
        }
    });

    // Y finalmente, llamamos al handler de seguimiento para que envíe la pregunta
    await enviarMensajeAsistente(conversacionId, contextoSeguimiento.preguntaDeCierre, usuarioWaId, negocioPhoneNumberId);

    // await manejarSeguimiento(await prisma.tareaEnProgreso.findFirstOrThrow({ where: { conversacionId } }), contexto.mensaje, contexto);


    return { success: true, data: null };
}