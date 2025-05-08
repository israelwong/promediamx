// app/dev-test-chat/components/ChatTestPanel.tsx
'use client';

import React, { useState } from 'react';
import { enviarMensajeComoUsuarioAction } from '@/app/admin/_lib/crmConversacion.actions';
import { EnviarMensajeUsuarioInput } from '@/app/admin/_lib/crmConversacion.types';
import { Send, Loader2, MessageSquareWarning, CheckCircle2 } from 'lucide-react';

export default function ChatTestPanel() {
    const [conversationId, setConversationId] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [isSending, setIsSending] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!conversationId.trim() || !mensaje.trim()) {
            setError('El ID de conversación y el mensaje son obligatorios.');
            setSuccessMessage(null);
            return;
        }

        setIsSending(true);
        setError(null);
        setSuccessMessage(null);

        const input: EnviarMensajeUsuarioInput = {
            conversationId: conversationId.trim(),
            mensaje: mensaje.trim(),
        };

        const result = await enviarMensajeComoUsuarioAction(input);

        setIsSending(false);

        if (result.success && result.data) {
            setSuccessMessage(`Mensaje enviado a la conversación ${result.data.conversacionId} (ID Mensaje: ${result.data.id})`);
            setMensaje('');
        } else {
            setError(result.error || 'Ocurrió un error desconocido al enviar el mensaje.');
        }
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">
            <div>
                <label htmlFor="conversationId" className="block text-sm font-medium text-zinc-300 mb-1">
                    ID de Conversación:
                </label>
                <input
                    type="text"
                    id="conversationId"
                    value={conversationId}
                    onChange={(e) => {
                        setConversationId(e.target.value);
                        setError(null); // Limpiar error al cambiar ID
                        setSuccessMessage(null); // Limpiar mensaje de éxito
                    }}
                    placeholder="Pega el ID de la conversación aquí"
                    className="
            w-full p-2.5 rounded-md text-sm
            bg-zinc-900 border border-zinc-700 text-zinc-300
            focus:ring-1 focus:ring-blue-500 focus:border-blue-500
            placeholder-zinc-500
          "
                    required
                />
            </div>

            <div>
                <label htmlFor="mensaje" className="block text-sm font-medium text-zinc-300 mb-1">
                    Mensaje del Usuario (Simulado):
                </label>
                <textarea
                    id="mensaje"
                    value={mensaje}
                    onChange={(e) => {
                        setMensaje(e.target.value);
                        setError(null); // Limpiar error al escribir
                        setSuccessMessage(null); // Limpiar mensaje de éxito
                    }}
                    placeholder="Escribe el mensaje que simulará enviar el usuario final..."
                    rows={4}
                    className="
            w-full p-2.5 rounded-md text-sm
            bg-zinc-900 border border-zinc-700 text-zinc-300
            focus:ring-1 focus:ring-blue-500 focus:border-blue-500
            placeholder-zinc-500
          "
                    required
                />
            </div>

            {error && (
                <div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-sm flex items-center gap-2">
                    <MessageSquareWarning size={18} />
                    {error}
                </div>
            )}
            {successMessage && (
                <div className="p-3 rounded-md bg-green-900/30 text-green-400 border border-green-700/50 text-sm flex items-center gap-2">
                    <CheckCircle2 size={18} />
                    {successMessage}
                </div>
            )}

            <div>
                <button
                    type="submit"
                    disabled={isSending || !conversationId.trim() || !mensaje.trim()}
                    className="
            w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white
            text-sm font-medium rounded-lg flex items-center justify-center gap-2
            focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800
            disabled:opacity-60 disabled:cursor-not-allowed
          "
                >
                    {isSending ? <Loader2 size={18} className="animate-spin" /> : <Send size={18} />}
                    Enviar Mensaje como Usuario
                </button>
            </div>
        </form>
    );
}