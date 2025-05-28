// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ChatHeader.tsx
'use client';

import React, { memo } from 'react';
import { Volume2, MessageSquareWarning, Copy } from 'lucide-react';
import type { ConversationDetailsForPanelData } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas'; // Ajusta la ruta

export interface ChatHeaderProps {
    conversationDetails: ConversationDetailsForPanelData | null;
    currentConversationId?: string;
    mensajeCopiado: string | null;
    copiarIdConversacion: (id: string | undefined) => void;
}

const ChatHeader: React.FC<ChatHeaderProps> = ({
    conversationDetails,
    currentConversationId,
    mensajeCopiado,
    copiarIdConversacion,
}) => {
    return (
        <div className="p-3 border-b border-zinc-700 bg-zinc-800/95 backdrop-blur-sm shadow-sm flex-shrink-0 justify-between flex items-center sticky top-0 z-10">
            <h4
                className="text-lg font-semibold text-zinc-50 truncate pr-2"
                title={conversationDetails?.leadNombre || 'Chat'}
            >
                {conversationDetails?.leadNombre || 'Chat con Cliente'}
            </h4>
            <div className="flex items-center gap-2">
                {conversationDetails?.canalIcono && conversationDetails.canalOrigen && (
                    <span
                        className="text-xs font-medium bg-zinc-700 text-zinc-300 px-2 py-1 rounded-full flex items-center gap-1.5"
                        title={`Canal: ${conversationDetails.canalOrigen}`}
                    >
                        {conversationDetails.canalIcono === 'whatsapp' && <Volume2 size={12} className="text-green-400" />}
                        {conversationDetails.canalIcono === 'webchat' && <MessageSquareWarning size={12} className="text-blue-400" />}
                        {/* Puedes añadir más iconos de canal aquí si es necesario */}
                        {conversationDetails.canalOrigen.charAt(0).toUpperCase() + conversationDetails.canalOrigen.slice(1)}
                    </span>
                )}
                {mensajeCopiado && (
                    <span className="text-xs text-green-400 mr-1 animate-pulse">
                        {mensajeCopiado}
                    </span>
                )}
                <button
                    type="button"
                    className="text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer inline-flex items-center gap-1.5 px-2 py-1.5 bg-zinc-700 hover:bg-zinc-600 rounded-md transition-colors"
                    onClick={() => copiarIdConversacion(currentConversationId)}
                    title="Copiar ID de Conversación"
                >
                    <Copy size={12} />
                    ID: {currentConversationId?.substring(currentConversationId.length - 6) || "N/A"}
                </button>
            </div>
        </div>
    );
};

export default memo(ChatHeader);