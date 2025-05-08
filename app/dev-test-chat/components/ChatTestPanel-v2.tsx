// Ruta: app/dev-test-chat/components/ChatTestPanel.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    iniciarConversacionWebchatAction,
    enviarMensajeWebchatAction
} from '@/app/admin/_lib/crmConversacion.actions';
import {
    ChatMessageItem,
    IniciarConversacionWebchatInput,
    // IniciarConversacionWebchatData, // No se usa directamente el tipo de datos de respuesta completo
    EnviarMensajeWebchatInput,
    // EnviarMensajeWebchatData // No se usa directamente el tipo de datos de respuesta completo
} from '@/app/admin/_lib/crmConversacion.types';
import { Send, Loader2, MessageSquareWarning, CheckCircle2, User, Bot, Trash2 } from 'lucide-react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

interface InteraccionRealtimePayload {
    id: string;
    conversacionId: string;
    role: string;
    mensaje: string | null;
    mediaUrl?: string | null;
    mediaType?: string | null;
    createdAt: string;
    agenteCrmId?: string | null;
}

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
        supabase = createClient(supabaseUrl, supabaseAnonKey);
    } else {
        console.warn("[ChatTestPanel] Supabase URL o Anon Key no definidas. Realtime no funcionará.");
    }
}

export default function ChatTestPanel() {
    const [asistenteId, setAsistenteId] = useState('');
    const [currentConversationId, setCurrentConversationId] = useState('');
    const [inputConversationId, setInputConversationId] = useState('');

    const [mensaje, setMensaje] = useState('');
    const [chatMessages, setChatMessages] = useState<ChatMessageItem[]>([]);

    const [isSending, setIsSending] = useState(false);
    const [isLoadingConversation] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const [remitenteIdWeb, setRemitenteIdWeb] = useState<string>('');

    useEffect(() => {
        let storedRemitenteId = localStorage.getItem('chatTestPanel_remitenteIdWeb');
        if (!storedRemitenteId) {
            storedRemitenteId = uuidv4();
            localStorage.setItem('chatTestPanel_remitenteIdWeb', storedRemitenteId);
        }
        setRemitenteIdWeb(storedRemitenteId);
        console.log("Simulated User (remitenteIdWeb):", storedRemitenteId);
    }, []);

    const scrollToBottom = useCallback(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(scrollToBottom, [chatMessages, scrollToBottom]);


    useEffect(() => {
        if (!supabase || !currentConversationId) {
            setChatMessages([]);
            return;
        }

        const channelName = `interacciones-conv-${currentConversationId}`;
        console.log(`[ChatTestPanel Realtime] Intentando suscribirse a: ${channelName}`);

        const channel: RealtimeChannel = supabase
            .channel(channelName)
            .on<InteraccionRealtimePayload>(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'Interaccion',
                    filter: `conversacionId=eq.${currentConversationId}`
                },
                (payload) => {
                    console.log('[ChatTestPanel Realtime] Nuevo mensaje:', payload.new);
                    const nuevaInteraccion = payload.new;

                    setChatMessages(prevMessages => {
                        if (prevMessages.some(msg => msg.id === nuevaInteraccion.id)) {
                            console.log("[ChatTestPanel Realtime] Mensaje ya existe (ID:", nuevaInteraccion.id, "), ignorando.");
                            return prevMessages;
                        }
                        const nuevaChatMessage: ChatMessageItem = {
                            id: nuevaInteraccion.id,
                            conversacionId: nuevaInteraccion.conversacionId,
                            role: nuevaInteraccion.role as ChatMessageItem['role'], // El tipo es validado por el servidor
                            mensaje: nuevaInteraccion.mensaje,
                            mediaUrl: nuevaInteraccion.mediaUrl,
                            mediaType: nuevaInteraccion.mediaType,
                            createdAt: new Date(nuevaInteraccion.createdAt),
                            agenteCrm: nuevaInteraccion.agenteCrmId ? { id: nuevaInteraccion.agenteCrmId, nombre: "Agente" } : null,
                        };
                        return [...prevMessages, nuevaChatMessage];
                    });
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[ChatTestPanel Realtime] Suscrito a ${channelName}`);
                } else if (err) {
                    console.error(`[ChatTestPanel Realtime] Error en canal ${channelName}:`, err);
                    setError(prev => prev ? `${prev}\nError Realtime: ${status}` : `Error Realtime: ${status}`);
                }
            });

        return () => {
            if (supabase && channel) {
                console.log(`[ChatTestPanel Realtime] Desuscribiéndose de ${channelName}`);
                supabase.removeChannel(channel).catch(console.error);
            }
        };
    }, [currentConversationId]);

    const handleLoadConversation = () => {
        if (!inputConversationId.trim()) {
            setError("Por favor, ingresa un ID de conversación para cargar.");
            return;
        }
        setError(null);
        setSuccessMessage(null);
        setChatMessages([]);
        setCurrentConversationId(inputConversationId.trim());
        setSuccessMessage(`Escuchando conversación: ${inputConversationId.trim()}. Envía un mensaje para continuarla.`);
    };

    /**
     * Normaliza un objeto de mensaje (posiblemente parcial) a un ChatMessageItem completo.
     * Principalmente se asegura que createdAt sea un objeto Date.
     * Asume que el messageData entrante, si está definido, ya cumple con la estructura de ChatMessageItem.
     */
    const normalizeChatMessage = (messageData: ChatMessageItem): ChatMessageItem => {
        return {
            ...messageData,
            createdAt: new Date(messageData.createdAt), // Asegurar que createdAt sea un objeto Date
        };
    };


    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!mensaje.trim()) {
            setError('El mensaje no puede estar vacío.');
            setSuccessMessage(null);
            return;
        }
        if (!currentConversationId && !asistenteId.trim()) {
            setError('Se requiere un ID de Asistente para iniciar una nueva conversación.');
            setSuccessMessage(null);
            return;
        }

        setIsSending(true);
        setError(null);
        setSuccessMessage(null);

        const tempUserMessageId = uuidv4();
        const userMessageOptimistic: ChatMessageItem = {
            id: tempUserMessageId,
            conversacionId: currentConversationId || "temp_conv_id", // ID temporal si es nueva conversación
            role: 'user',
            mensaje: mensaje.trim(),
            createdAt: new Date(),
            // Los demás campos opcionales de ChatMessageItem serán undefined por defecto
        };
        setChatMessages(prev => [...prev, userMessageOptimistic]);
        const currentMessageText = mensaje.trim();

        setMensaje(''); // Limpiar el input de mensaje

        try {
            if (currentConversationId) { // Continuar conversación existente
                const input: EnviarMensajeWebchatInput = {
                    conversationId: currentConversationId,
                    mensaje: currentMessageText,
                    remitenteIdWeb: remitenteIdWeb,
                };
                const result = await enviarMensajeWebchatAction(input);

                // Remover el mensaje optimista ANTES de añadir los mensajes del servidor
                setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId));

                if (result.success) {
                    if (result.data) {
                        const data = result.data;
                        setSuccessMessage(`Mensaje enviado. Esperando respuesta...`);

                        if (data.mensajeUsuario) {
                            // data.mensajeUsuario ya es ChatMessageItem (no undefined) aquí debido al if (result.data)
                            // y la definición de EnviarMensajeWebchatData
                            setChatMessages(prev => [...prev, normalizeChatMessage(data.mensajeUsuario!)]);
                        }
                        if (data.mensajeAsistente) {
                            setChatMessages(prev => [...prev, normalizeChatMessage(data.mensajeAsistente!)]);
                        }
                    } else {
                        setSuccessMessage(`Mensaje procesado, pero no se recibieron datos de vuelta.`);
                        console.warn("enviarMensajeWebchatAction tuvo éxito pero no devolvió datos.", result);
                    }
                } else {
                    setError(result.error || 'Error al enviar mensaje.');
                    setMensaje(currentMessageText); // Restaurar mensaje en el input en caso de error
                }
            } else { // Iniciar nueva conversación
                const input: IniciarConversacionWebchatInput = {
                    asistenteId: asistenteId.trim(),
                    mensajeInicial: currentMessageText,
                    remitenteIdWeb: remitenteIdWeb,
                    nombreRemitenteSugerido: `Web User ${remitenteIdWeb.substring(0, 6)}`
                };
                const result = await iniciarConversacionWebchatAction(input);

                setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId));

                if (result.success) {
                    if (result.data) {
                        const data = result.data;
                        setCurrentConversationId(data.conversationId);
                        setInputConversationId(data.conversationId);
                        setSuccessMessage(`Nueva conversación iniciada: ${data.conversationId}`);

                        if (data.mensajeUsuario) {
                            setChatMessages(prev => [...prev, normalizeChatMessage(data.mensajeUsuario!)]);
                        }
                        if (data.mensajeAsistente) {
                            setChatMessages(prev => [...prev, normalizeChatMessage(data.mensajeAsistente!)]);
                        }
                    } else {
                        setError(result.error || 'Error al iniciar: conversación creada pero no se recibieron datos.');
                        console.warn("iniciarConversacionWebchatAction tuvo éxito pero no devolvió datos.", result);
                        setMensaje(currentMessageText);
                    }
                } else {
                    setError(result.error || 'Error al iniciar conversación.');
                    setMensaje(currentMessageText);
                }
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Un error inesperado ocurrió.";
            setError(errorMessage);
            // Asegurarse de remover el mensaje optimista también en caso de excepción catastrófica
            setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId));
            setMensaje(currentMessageText);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDownSubmit = (event: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (event.key === 'Enter' && !event.shiftKey) {
            event.preventDefault();
            if (event.currentTarget.form) {
                // Simular el evento de submit del formulario
                const form = event.currentTarget.form;
                const submitEvent = new Event('submit', { bubbles: true, cancelable: true });
                form.dispatchEvent(submitEvent);
            }
        }
    };

    const getMessageAlignment = (role: ChatMessageItem['role']) => {
        return role === 'user' ? 'items-end' : 'items-start';
    };

    const getMessageBgColor = (role: ChatMessageItem['role']) => {
        if (role === 'user') return 'bg-blue-600 text-white';
        if (role === 'assistant') return 'bg-zinc-700 text-zinc-200';
        return 'bg-gray-500 text-white'; // Para otros roles como 'system' o 'agent'
    };

    // getMessageSenderIcon no se usa actualmente en el JSX, pero se mantiene por si se reintroduce
    // const getMessageSenderIcon = (role: ChatMessageItem['role']) => {
    //     if (role === 'user') return <User size={18} className="text-blue-300" />;
    //     if (role === 'assistant') return <Bot size={18} className="text-zinc-400" />;
    //     return null;
    // };

    const handleResetConversation = () => {
        setAsistenteId('');
        setCurrentConversationId('');
        setInputConversationId('');
        setChatMessages([]);
        setError(null);
        setSuccessMessage("Panel reiniciado. Ingresa un ID de Asistente para una nueva conversación o un ID de Conversación para cargar.");
    };

    return (
        <div className="space-y-6">
            {/* Sección de Inputs para IDs */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="asistenteId" className="block text-sm font-medium text-zinc-300 mb-1">
                        ID de Asistente (nueva conversación):
                    </label>
                    <input
                        type="text"
                        id="asistenteId"
                        value={asistenteId}
                        onChange={(e) => setAsistenteId(e.target.value)}
                        placeholder="ID del Asistente Virtual"
                        className="w-full p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500"
                        disabled={!!currentConversationId} // Deshabilitar si ya hay una conversación cargada/activa
                    />
                </div>
                <div>
                    <label htmlFor="inputConversationId" className="block text-sm font-medium text-zinc-300 mb-1">
                        ID de Conversación (continuar):
                    </label>
                    <div className="flex gap-2">
                        <input
                            type="text"
                            id="inputConversationId"
                            value={inputConversationId}
                            onChange={(e) => setInputConversationId(e.target.value)}
                            placeholder="Pega ID de conversación existente"
                            className="flex-grow p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500"
                        />
                        <button
                            type="button"
                            onClick={handleLoadConversation}
                            className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50"
                            disabled={!inputConversationId.trim() || isLoadingConversation}
                        >
                            {isLoadingConversation ? <Loader2 size={18} className="animate-spin" /> : "Cargar"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Botón de Reinicio */}
            <button
                type="button"
                onClick={handleResetConversation}
                className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-800 mb-4"
            >
                <Trash2 size={16} /> Reiniciar Panel / Nueva Conversación
            </button>

            {/* Área de Visualización de Mensajes */}
            <div className="h-96 bg-zinc-950 p-4 rounded-lg border border-zinc-700 overflow-y-auto flex flex-col space-y-3">
                {isLoadingConversation && (
                    <div className="flex-1 flex items-center justify-center">
                        <Loader2 size={32} className="animate-spin text-zinc-400" />
                        <p className="ml-2 text-zinc-500">Cargando mensajes...</p>
                    </div>
                )}
                {!isLoadingConversation && chatMessages.length === 0 && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500">
                        <MessageSquareWarning size={40} className="mb-2" />
                        <p>{currentConversationId ? `No hay mensajes visibles para la conversación ${currentConversationId}.` : "Inicia una nueva conversación o carga una existente."}</p>
                        <p className="text-xs mt-1">Los mensajes aparecerán aquí.</p>
                    </div>
                )}
                {!isLoadingConversation && chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${getMessageAlignment(msg.role)}`}>
                        <div className="flex items-end gap-2 max-w-[75%]">
                            {msg.role === 'assistant' && (
                                <span className="flex-shrink-0 text-zinc-400 self-center p-1.5 bg-zinc-700 rounded-full">
                                    <Bot size={16} />
                                </span>
                            )}
                            <div
                                className={`p-2.5 rounded-lg shadow ${getMessageBgColor(msg.role)} ${msg.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`}
                            >
                                {msg.mensaje && <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>}
                                {msg.mediaUrl && (
                                    <div className="mt-1.5">
                                        <a href={msg.mediaUrl} target="_blank" rel="noopener noreferrer" className="text-sky-400 hover:underline">Ver adjunto ({msg.mediaType || 'archivo'})</a>
                                    </div>
                                )}
                            </div>
                            {msg.role === 'user' && (
                                <span className="flex-shrink-0 text-blue-300 self-center p-1.5 bg-blue-800 rounded-full">
                                    <User size={16} />
                                </span>
                            )}
                        </div>
                        <span className={`text-xs text-zinc-500 mt-1 px-1 ${msg.role === 'user' ? 'self-end' : 'self-start'}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} /> {/* Para el scroll automático */}
            </div>

            {/* Formulario de Envío de Mensaje */}
            <form onSubmit={handleSubmit} id="chatTestPanelForm" className="space-y-4 sticky bottom-0 py-2 bg-zinc-800">
                <div>
                    <label htmlFor="mensaje" className="block text-sm font-medium text-zinc-300 mb-1">
                        Tu Mensaje: (Usuario Simulado: <span className="font-mono text-xs text-teal-400">{remitenteIdWeb.substring(0, 13)}...</span>)
                    </label>
                    <div className="flex items-center gap-2">
                        <textarea
                            id="mensaje"
                            form="chatTestPanelForm"
                            value={mensaje}
                            onKeyDown={handleKeyDownSubmit}
                            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setMensaje(e.target.value)}
                            placeholder={currentConversationId ? "Escribe tu respuesta..." : "Escribe tu primer mensaje..."}
                            rows={2}
                            className="flex-grow p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500"
                        />
                        <button
                            type="submit"
                            form="chatTestPanelForm"
                            disabled={isSending || !mensaje.trim() || (!currentConversationId && !asistenteId.trim())}
                            className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60"
                            aria-label="Enviar mensaje"
                        >
                            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>

                {/* Mensajes de Error y Éxito */}
                {error && (
                    <div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-sm flex items-center gap-2">
                        <MessageSquareWarning size={18} /> {error}
                    </div>
                )}
                {successMessage && (
                    <div className="p-3 rounded-md bg-green-900/30 text-green-400 border border-green-700/50 text-sm flex items-center gap-2">
                        <CheckCircle2 size={18} /> {successMessage}
                    </div>
                )}
            </form>
        </div>
    );
}
