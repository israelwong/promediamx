// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ChatInputArea.tsx
'use client';

import React, { FormEvent } from 'react';
import { Send, Loader2 } from 'lucide-react'; // Paperclip si decides reactivar adjuntos
// Asegúrate que UsuarioExtendido está disponible o ajusta si no es necesario aquí directamente
// import type { UsuarioExtendido } from '@/app/admin/_lib/actions/usuario/usuario.schemas';

export interface ChatInputAreaProps {
    newMessage: string;
    setNewMessage: (value: string) => void;
    handleSendMessage: (e: FormEvent) => Promise<void>; // Asumiendo que es async
    isSending: boolean;
    isLoadingPermissions: boolean;
    canSendPermission: boolean;
    currentConversationId?: string; // Para deshabilitar si no hay conversación
    error: string | null; // Errores generales del chat (no de envío)
    // user: UsuarioExtendido | null; // Para la lógica del mensaje de "no tienes permiso" si 'user' es null
}

const ChatInputArea: React.FC<ChatInputAreaProps> = ({
    newMessage,
    setNewMessage,
    handleSendMessage,
    isSending,
    isLoadingPermissions,
    canSendPermission,
    currentConversationId,
    error,
    // user, // Descomentar si se usa para el mensaje de error
}) => {
    const isEffectivelyDisabled = isSending || isLoadingPermissions || !canSendPermission || !currentConversationId;

    // Determinar el placeholder y el title del botón de forma más dinámica
    let placeholderText = "Escribe un mensaje...";
    let sendButtonTitle = "Enviar mensaje";

    if (isLoadingPermissions) {
        placeholderText = "Verificando permisos...";
    } else if (!currentConversationId) {
        placeholderText = "Selecciona una conversación para chatear.";
    } else if (!canSendPermission) {
        placeholderText = "No tienes permiso para enviar mensajes";
        sendButtonTitle = "No puedes enviar mensajes en este momento";
    }


    return (
        <form onSubmit={handleSendMessage} className="p-3 border-t border-zinc-700 bg-zinc-800/95 backdrop-blur-sm flex-shrink-0">
            {/* Mostrar errores generales del chat si no son de permisos y no se está enviando */}
            {!isSending && error && !error.includes("permiso") && !error.includes("autorización") && !error.includes("autenticado") && (
                <p className="text-xs mb-2 text-red-400 bg-red-900/30 border border-red-700/50 p-1.5 rounded text-center">
                    {error}
                </p>
            )}
            <div className="flex items-center gap-2">
                {/* // Botón adjuntar (funcionalidad futura)
                <button 
                    type="button" 
                    // onClick={() => fileInputRef.current?.click()} // Necesitarías pasar fileInputRef o un handler
                    className="p-2 text-zinc-400 hover:text-zinc-100 rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500" 
                    aria-label="Adjuntar archivo" 
                    disabled={isEffectivelyDisabled}
                    title="Adjuntar archivo (no disponible)"
                >
                    <Paperclip size={20} />
                </button>
                <input type="file" className="hidden" disabled={isEffectivelyDisabled} /> 
                */}

                <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    placeholder={placeholderText}
                    className="flex-grow px-3.5 py-2.5 rounded-lg text-sm bg-zinc-900 border border-zinc-700 text-zinc-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500 disabled:opacity-70 disabled:cursor-not-allowed"
                    disabled={isEffectivelyDisabled}
                    aria-label="Mensaje a enviar"
                />
                <button
                    type="submit"
                    className="px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-60 disabled:cursor-not-allowed min-w-[110px] sm:min-w-[120px]"
                    disabled={isEffectivelyDisabled || !newMessage.trim()}
                    title={sendButtonTitle}
                >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    <span className="hidden sm:inline">Enviar</span>
                </button>
            </div>
            {/* Mensaje específico de "No tienes permiso" si no está cargando y no puede enviar */}
            {!isLoadingPermissions && !canSendPermission && currentConversationId && /* user !== null && */ (
                // El chequeo de user !== null podría ser útil si solo quieres mostrarlo si el usuario está logueado
                // pero no tiene permisos, en lugar de si aún no se ha cargado el usuario.
                // Por ahora, si canSendPermission es false y no estamos cargando, mostramos el mensaje.
                <p className="text-xs text-amber-500 bg-amber-900/30 border border-amber-700/50 p-1.5 rounded mt-2 text-center">
                    No tienes permiso para enviar mensajes en esta conversación.
                </p>
            )}
        </form>
    );
}

ChatInputArea.displayName = 'ChatInputArea';
export default ChatInputArea;