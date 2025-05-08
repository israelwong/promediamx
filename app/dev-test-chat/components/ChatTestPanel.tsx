// Ruta: app/dev-test-chat/components/ChatTestPanel.tsx
'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
    iniciarConversacionWebchatAction,
    enviarMensajeWebchatAction,
    obtenerUltimosMensajesAction
} from '@/app/admin/_lib/crmConversacion.actions';
import {
    ChatMessageItem,
    IniciarConversacionWebchatInput,
    EnviarMensajeWebchatInput,
} from '@/app/admin/_lib/crmConversacion.types';
import { Send, Loader2, MessageSquareWarning, CheckCircle2, User, Bot, Trash2 } from 'lucide-react';
import { createClient, SupabaseClient, RealtimeChannel, RealtimePostgresChangesPayload } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

interface InteraccionRealtimePayload {
    id: string;
    conversacionId: string;
    mensaje: string;
    createdAt: string;
    [key: string]: unknown; // For any additional properties
}

let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabase = createClient(supabaseUrl, supabaseAnonKey);
    else console.warn("[ChatTestPanel] Supabase URL o Anon Key no definidas. Realtime no funcionará.");
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
        if (!storedRemitenteId) { storedRemitenteId = uuidv4(); localStorage.setItem('chatTestPanel_remitenteIdWeb', storedRemitenteId); }
        setRemitenteIdWeb(storedRemitenteId);
    }, []);

    const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
    useEffect(scrollToBottom, [chatMessages]);

    const fetchAndSetMessages = useCallback(async (convId: string) => {
        if (!convId) return;
        console.log(`[ChatTestPanel] fetchAndSetMessages para convId: ${convId}`);
        // No poner isLoading aquí para evitar parpadeo en refresco por señal
        // setIsLoadingConversation(true); 
        setError(null);
        const result = await obtenerUltimosMensajesAction(convId, 50);
        if (result.success && result.data) {
            setChatMessages(result.data.map(m => ({ ...m, createdAt: new Date(m.createdAt) })));
        } else {
            setError(result.error || 'Error al cargar mensajes.');
            // No limpiar mensajes aquí si ya había, para no perderlos si el fetch falla
            // setChatMessages([]); 
        }
        // setIsLoadingConversation(false); // No poner aquí si no se puso arriba
    }, []);

    // --- useEffect para Realtime (SIMPLIFICADO) ---
    useEffect(() => {
        // No limpiar mensajes aquí, se hace en load/reset

        if (!supabase || !currentConversationId) {
            console.log("[ChatTestPanel Realtime] No suscrito.");
            return;
        }

        const channelName = `interacciones-conv-${currentConversationId}`;
        console.log(`[ChatTestPanel Realtime] Suscribiendo a: ${channelName} (Evento: INSERT, Filtro: conversacionId=${currentConversationId}) - SOLO COMO SEÑAL`);

        const channel: RealtimeChannel = supabase
            .channel(channelName)
            .on<RealtimePostgresChangesPayload<InteraccionRealtimePayload>>(
                'postgres_changes',
                {
                    event: 'INSERT',
                    schema: 'public',
                    table: 'Interaccion',
                    filter: `conversacionId=eq.${currentConversationId}`
                },
                (payload) => {
                    console.log('[ChatTestPanel Realtime] Señal INSERT recibida:', payload);
                    // Llamar a fetch si el payload parece válido (aunque no usemos sus datos)
                    if (payload.new || payload.old) {
                        fetchAndSetMessages(currentConversationId);
                    } else {
                        console.warn("[ChatTestPanel Realtime] Señal recibida sin datos 'new' u 'old'. Payload:", payload);
                    }
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[ChatTestPanel Realtime] Suscrito a ${channelName}`);
                } else if (err) {
                    // *** DEBUG LOG ERROR ***
                    console.error(`[ChatTestPanel Realtime] Error en canal ${channelName} durante suscripción o conexión:`, err);
                    setError(prev => prev ? `${prev}\nError Realtime: ${status} - ${err.message}` : `Error Realtime: ${status} - ${err.message}`);
                    // *** FIN DEBUG LOG ERROR ***
                } else {
                    console.log(`[ChatTestPanel Realtime] Estado del canal ${channelName}: ${status}`);
                }
            });

        // Función de limpieza para desuscribirse
        return () => {
            if (supabase && channel) {
                console.log(`[ChatTestPanel Realtime] Desuscribiéndose de ${channelName}`);
                supabase.removeChannel(channel).catch(console.error);
            }
        };
    }, [currentConversationId, fetchAndSetMessages]);

    // handleLoadConversation ahora es el responsable principal de limpiar y cargar
    const handleLoadConversation = useCallback(() => {
        if (!inputConversationId.trim()) { setError("Ingresa ID."); return; }
        setError(null); setSuccessMessage(null);
        setChatMessages([]); // Limpiar mensajes al cargar nueva conversación
        const newConvId = inputConversationId.trim();
        setCurrentConversationId(newConvId);
        setSuccessMessage(`Cargando conversación: ${newConvId}...`);
        fetchAndSetMessages(newConvId); // Cargar historial inicial
    }, [inputConversationId, fetchAndSetMessages]);

    const normalizeChatMessage = (messageData: ChatMessageItem): ChatMessageItem => {
        return { ...messageData, createdAt: new Date(messageData.createdAt) };
    };

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        if (!mensaje.trim()) { setError('Mensaje vacío.'); return; }
        if (!currentConversationId && !asistenteId.trim()) { setError('Se requiere ID Asistente.'); return; }

        setIsSending(true); setError(null); setSuccessMessage(null);

        const tempUserMessageId = uuidv4();
        const userMessageOptimistic: ChatMessageItem = { id: tempUserMessageId, conversacionId: currentConversationId || "temp", role: 'user', mensaje: mensaje.trim(), createdAt: new Date() };
        setChatMessages(prev => [...prev, userMessageOptimistic]);
        const currentMessageText = mensaje.trim();
        setMensaje('');

        let newConvIdCreated: string | null = null;

        try {
            let result;
            if (currentConversationId) {
                const input: EnviarMensajeWebchatInput = { conversationId: currentConversationId, mensaje: currentMessageText, remitenteIdWeb: remitenteIdWeb };
                result = await enviarMensajeWebchatAction(input);
            } else {
                const input: IniciarConversacionWebchatInput = { asistenteId: asistenteId.trim(), mensajeInicial: currentMessageText, remitenteIdWeb: remitenteIdWeb, nombreRemitenteSugerido: `Web User ${remitenteIdWeb.substring(0, 6)}` };
                result = await iniciarConversacionWebchatAction(input);
                if (result.success && result.data && 'conversationId' in result.data) {
                    newConvIdCreated = result.data.conversationId;
                }
            }

            // Remover optimista DESPUÉS de la llamada
            setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId));

            if (result.success) {
                if (result.data) {
                    const data = result.data;

                    if (newConvIdCreated) {
                        setCurrentConversationId(newConvIdCreated);
                        setInputConversationId(newConvIdCreated);
                        setSuccessMessage(`Nueva conversación iniciada: ${newConvIdCreated}`);
                        const initialMessages: ChatMessageItem[] = [];
                        if (data.mensajeUsuario) initialMessages.push(normalizeChatMessage(data.mensajeUsuario!));
                        if (data.mensajeAsistente) initialMessages.push(normalizeChatMessage(data.mensajeAsistente!));
                        setChatMessages(initialMessages);

                    } else if (currentConversationId) {
                        setSuccessMessage(`Mensaje enviado. Esperando respuesta...`);
                        // Añadir mensajes devueltos por la acción (usuario + asistente inicial)
                        // Estos serán reemplazados/complementados por fetchAndSetMessages cuando llegue la señal
                        if (data.mensajeUsuario) setChatMessages(prev => [...prev, normalizeChatMessage(data.mensajeUsuario!)]);
                        if (data.mensajeAsistente) setChatMessages(prev => [...prev, normalizeChatMessage(data.mensajeAsistente!)]);
                    }
                } else {
                    setSuccessMessage(`Acción completada, pero sin datos.`);
                    console.warn("Acción éxito pero sin datos.", result);
                }
            } else {
                setError(result.error || 'Error en la acción.');
                setMensaje(currentMessageText);
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Error inesperado."; setError(errorMessage);
            setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId));
            setMensaje(currentMessageText);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDownSubmit = (event: React.KeyboardEvent<HTMLTextAreaElement>) => { /* ... */ if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (event.currentTarget.form) { const form = event.currentTarget.form; const submitEvent = new Event('submit', { bubbles: true, cancelable: true }); form.dispatchEvent(submitEvent); } } };
    const getMessageAlignment = (role: ChatMessageItem['role']) => { /* ... */ return role === 'user' ? 'items-end' : 'items-start'; };
    const getMessageBgColor = (role: ChatMessageItem['role']) => { /* ... */ if (role === 'user') return 'bg-blue-600 text-white'; if (role === 'assistant') return 'bg-zinc-700 text-zinc-200'; if (role === 'system') return 'bg-transparent text-zinc-500 italic text-xs text-center w-full'; return 'bg-gray-500 text-white'; };
    const handleResetConversation = () => { /* ... */ setAsistenteId(''); setCurrentConversationId(''); setInputConversationId(''); setChatMessages([]); setError(null); setSuccessMessage("Panel reiniciado."); };

    return (
        <div className="space-y-6">
            {/* ... (Renderizado sin cambios) ... */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div><label htmlFor="asistenteId" className="block text-sm font-medium text-zinc-300 mb-1">ID Asistente (nueva):</label><input type="text" id="asistenteId" value={asistenteId} onChange={(e) => setAsistenteId(e.target.value)} placeholder="ID Asistente Virtual" className="w-full p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" disabled={!!currentConversationId} /></div><div><label htmlFor="inputConversationId" className="block text-sm font-medium text-zinc-300 mb-1">ID Conversación (continuar):</label><div className="flex gap-2"><input type="text" id="inputConversationId" value={inputConversationId} onChange={(e) => setInputConversationId(e.target.value)} placeholder="Pega ID existente" className="flex-grow p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" /><button type="button" onClick={handleLoadConversation} className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50" disabled={!inputConversationId.trim() || isLoadingConversation}>{isLoadingConversation ? <Loader2 size={18} className="animate-spin" /> : "Cargar"}</button></div></div></div><button type="button" onClick={handleResetConversation} className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-800 mb-4"><Trash2 size={16} /> Reiniciar</button>
            <div className="h-96 bg-zinc-950 p-4 rounded-lg border border-zinc-700 overflow-y-auto flex flex-col space-y-3">
                {isLoadingConversation && (<div className="flex-1 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-zinc-400" /><p className="ml-2 text-zinc-500">Cargando mensajes...</p></div>)}
                {!isLoadingConversation && chatMessages.length === 0 && (<div className="flex-1 flex flex-col items-center justify-center text-zinc-500"><MessageSquareWarning size={40} className="mb-2" /><p>{currentConversationId ? `No hay mensajes para ${currentConversationId}.` : "Inicia o carga conversación."}</p></div>)}
                {!isLoadingConversation && chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${getMessageAlignment(msg.role)} ${msg.role === 'system' ? 'items-center' : ''}`}>
                        {msg.role !== 'system' ? (
                            <div className={`flex items-end gap-2 max-w-[75%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                                {msg.role === 'assistant' && (<span className="flex-shrink-0 text-zinc-400 self-center p-1.5 bg-zinc-700 rounded-full"><Bot size={16} /></span>)}
                                <div className={`p-2.5 rounded-lg shadow ${getMessageBgColor(msg.role)} ${msg.role === 'user' ? 'rounded-br-none' : 'rounded-bl-none'}`}>
                                    {msg.mensaje && <p className="text-sm whitespace-pre-wrap">{msg.mensaje}</p>}
                                </div>
                                {msg.role === 'user' && (<span className="flex-shrink-0 text-blue-300 self-center p-1.5 bg-blue-800 rounded-full"><User size={16} /></span>)}
                            </div>
                        ) : (<div className={getMessageBgColor(msg.role)}>{msg.mensaje}</div>)}
                        <span className={`text-xs text-zinc-500 mt-1 px-1 ${msg.role === 'user' ? 'self-end' : (msg.role === 'system' ? 'self-center' : 'self-start')}`}>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>
            <form onSubmit={handleSubmit} id="chatTestPanelForm" className="space-y-4 sticky bottom-0 py-2 bg-zinc-800">
                <div><label htmlFor="mensaje" className="block text-sm font-medium text-zinc-300 mb-1">Tu Mensaje: (Simulado: <span className="font-mono text-xs text-teal-400">{remitenteIdWeb.substring(0, 13)}...</span>)</label><div className="flex items-center gap-2"><textarea id="mensaje" form="chatTestPanelForm" value={mensaje} onKeyDown={handleKeyDownSubmit} onChange={(e) => setMensaje(e.target.value)} placeholder={currentConversationId ? "Respuesta..." : "Primer mensaje..."} rows={2} className="flex-grow p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" /><button type="submit" form="chatTestPanelForm" disabled={isSending || !mensaje.trim() || (!currentConversationId && !asistenteId.trim())} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60" aria-label="Enviar mensaje">{isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}</button></div></div>
                {error && (<div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-sm flex items-center gap-2"><MessageSquareWarning size={18} /> {error}</div>)}
                {successMessage && (<div className="p-3 rounded-md bg-green-900/30 text-green-400 border border-green-700/50 text-sm flex items-center gap-2"><CheckCircle2 size={18} /> {successMessage}</div>)}
            </form>
        </div>
    );
}
