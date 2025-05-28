// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/page.tsx
import React from 'react';
import { Metadata } from 'next';
import { MessageSquareWarning } from 'lucide-react';
import ConversacionDetalle from './components/ConversacionDetalle';
import {
    obtenerDetallesConversacionAction,
    obtenerMensajesCrmAction
} from '@/app/admin/_lib/actions/conversacion/conversacion.actions';
import type {
    ConversationDetailsForPanelData,
    ChatMessageItemCrmData
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

export const metadata: Metadata = {
    title: 'Detalles de Conversación',
    description: 'Detalles de la conversación seleccionada.',
};

interface ConversationDetailPageParams {
    clienteId: string;
    negocioId: string;
    conversacionId: string;
    initialConversationDetails: ConversationDetailsForPanelData;
    initialMessages: ChatMessageItemCrmData[];
    initialError: string | null;

}

export default async function ConversationDetailPage({ params }: { params: Promise<ConversationDetailPageParams> }) {
    const { clienteId, negocioId, conversacionId } = await params;

    // console.log(conversacionId)
    // Cargar datos iniciales en el Server Component
    // Usamos Promise.all para cargar en paralelo
    const [detailsResult, messagesResult] = await Promise.all([
        obtenerDetallesConversacionAction({ conversacionId }),
        obtenerMensajesCrmAction({ conversacionId, limit: 50 }) // Cargar los primeros 50 mensajes
    ]);

    // console.log('[ConversationDetailPage] Resultado de obtenerMensajesCrmAction:', messagesResult);
    if (messagesResult.success) {
        //! console.log('[ConversationDetailPage] InitialMessages (primeros 2):', JSON.stringify(messagesResult.data?.slice(0, 2), null, 2));
    }

    const initialConversationDetails: ConversationDetailsForPanelData | null = detailsResult.success ? (detailsResult.data ?? null) : null;
    const initialMessages: ChatMessageItemCrmData[] = messagesResult.success && messagesResult.data ? messagesResult.data : [];

    // console.log(initialConversationDetails);

    // Determinar si hubo un error crítico al cargar los detalles (sin los cuales el chat no tiene sentido)
    const criticalError = !detailsResult.success ? (detailsResult.error || "Error desconocido al cargar detalles.") : null;

    // Si hay un error crítico cargando los detalles, mostramos un mensaje de error.
    if (criticalError || !initialConversationDetails) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-zinc-800 rounded-lg border border-zinc-700">
                <MessageSquareWarning size={64} className="text-red-500 mb-6" />
                <h2 className="text-2xl font-semibold text-red-400 mb-2">Error al Cargar la Conversación</h2>
                <p className="text-zinc-400 max-w-md">
                    {criticalError || "No se pudieron obtener los detalles esenciales de la conversación."}
                </p>
            </div>
        );
    }

    // Si los mensajes no cargaron, pasamos un error específico para eso.
    const messagesError = !messagesResult.success ? (messagesResult.error || "Error al cargar mensajes.") : null;

    return (
        <ConversacionDetalle
            clienteId={clienteId}
            negocioId={negocioId}
            conversacionId={conversacionId} // Se sigue pasando por si ConversacionDetalle lo necesita directamente
            initialConversationDetails={initialConversationDetails}
            initialMessages={initialMessages}
            initialError={messagesError} // Error específico de la carga de mensajes
        />
    );
}
