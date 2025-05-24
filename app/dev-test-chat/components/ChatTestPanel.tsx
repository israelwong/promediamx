'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Send, Loader2, MessageSquareWarning, CheckCircle2, User, Bot, Trash2 } from 'lucide-react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import Lightbox from "yet-another-react-lightbox";
import "yet-another-react-lightbox/styles.css";
import "yet-another-react-lightbox/plugins/thumbnails.css"; // Descomenta si usas thumbnails

// --- ACCIONES Y SCHEMAS/TIPOS REFACTORIZADOS ---
import {
    iniciarConversacionWebchatAction,
    enviarMensajeWebchatAction,
    obtenerUltimosMensajesAction
} from './chatTest.actions'; // Asegúrate que esta es la ruta a tus acciones refactorizadas
import {
    IniciarConversacionWebchatInputSchema, // Esquema Zod para validación (opcional en cliente)
    EnviarMensajeWebchatInputSchema,     // Esquema Zod para validación (opcional en cliente)
    type ChatMessageItem,                // Tipo inferido de Zod
    type IniciarConversacionWebchatInput,
    type IniciarConversacionWebchatOutput,
    type EnviarMensajeWebchatInput,
    type EnviarMensajeWebchatOutput
} from './chatTest.schemas'; // Asegúrate que esta es la ruta a tus schemas Zod
import type { ActionResult } from '@/app/admin/_lib/types'; // Tu ActionResult global

// Payload para Supabase Realtime (simplificado si solo es señal)
interface InteraccionRealtimeSignal {
    new?: { id?: string; conversacionId?: string;[key: string]: unknown };
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
    const [isLoadingMessages, setIsLoadingMessages] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof EnviarMensajeWebchatInput | keyof IniciarConversacionWebchatInput, string[]>>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const messagesEndRef = useRef<null | HTMLDivElement>(null);
    const [remitenteIdWeb, setRemitenteIdWeb] = useState<string>('');

    const [lightboxOpen, setLightboxOpen] = useState(false);
    const [lightboxSlides, setLightboxSlides] = useState<{ src: string; alt?: string }[]>([]);
    const [lightboxIndex, setLightboxIndex] = useState(0);
    const messagesContainerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const container = messagesContainerRef.current;
        if (!container) return;
        const handleClick = (event: MouseEvent) => {
            const targetElement = event.target as HTMLElement;
            const triggerLink = targetElement.closest('a.chat-image-lightbox-trigger') as HTMLAnchorElement | null;
            if (triggerLink) {
                event.preventDefault();
                const messageHtmlContentContainer = triggerLink.closest('.prose');
                if (messageHtmlContentContainer) {
                    const allImageLinksInMessage = Array.from(messageHtmlContentContainer.querySelectorAll<HTMLAnchorElement>('a.chat-image-lightbox-trigger'));
                    const slides = allImageLinksInMessage.map(link => ({ src: link.href, alt: link.dataset.alt || "Imagen" }));
                    const clickedImageIndex = allImageLinksInMessage.findIndex(link => link.href === triggerLink.href);
                    if (slides.length > 0) {
                        setLightboxSlides(slides);
                        setLightboxIndex(clickedImageIndex >= 0 ? clickedImageIndex : 0);
                        setLightboxOpen(true);
                    }
                } else {
                    setLightboxSlides([{ src: triggerLink.href, alt: triggerLink.dataset.alt || "Imagen" }]);
                    setLightboxIndex(0);
                    setLightboxOpen(true);
                }
            }
        };
        container.addEventListener('click', handleClick);
        return () => container.removeEventListener('click', handleClick);
    }, []);

    useEffect(() => {
        let storedRemitenteId = localStorage.getItem('chatTestPanel_remitenteIdWeb');
        if (!storedRemitenteId) { storedRemitenteId = uuidv4(); localStorage.setItem('chatTestPanel_remitenteIdWeb', storedRemitenteId); }
        setRemitenteIdWeb(storedRemitenteId);
    }, []);

    const scrollToBottom = useCallback(() => { messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, []);
    useEffect(scrollToBottom, [chatMessages, scrollToBottom]);

    const fetchAndSetMessages = useCallback(async (convId: string) => {
        if (!convId) { setChatMessages([]); return; }
        setIsLoadingMessages(true); setError(null);
        const result: ActionResult<ChatMessageItem[]> = await obtenerUltimosMensajesAction(convId, 50);
        if (result.success && result.data) {
            setChatMessages(result.data); // Zod schema ya debe manejar la conversión de fechas
        } else {
            setError(result.error || 'Error al cargar mensajes.');
            setChatMessages([]);
        }
        setIsLoadingMessages(false);
    }, []);

    useEffect(() => {
        if (!supabase || !currentConversationId) return;
        const channelName = `interacciones-conv-${currentConversationId}`;
        const channel: RealtimeChannel = supabase
            .channel(channelName)
            .on<InteraccionRealtimeSignal>(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Interaccion', filter: `conversacionId=eq.${currentConversationId}` },
                (payload) => {
                    if (payload.new && 'id' in payload.new && payload.new.id) fetchAndSetMessages(currentConversationId);
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log(`[ChatTestPanel Realtime] Suscrito a ${channelName}`);
                else if (err) console.error(`[ChatTestPanel Realtime] Error en canal ${channelName}:`, err);
                else console.log(`[ChatTestPanel Realtime] Estado del canal ${channelName}: ${status}`);
            });
        return () => { if (supabase && channel) supabase.removeChannel(channel).catch(console.error); };
    }, [currentConversationId, fetchAndSetMessages]);

    const handleLoadConversation = useCallback(() => {
        if (!inputConversationId.trim()) { setError("Ingresa un ID de conversación."); return; }
        setError(null); setSuccessMessage(null); setValidationErrors({});
        setChatMessages([]);
        const newConvId = inputConversationId.trim();
        setCurrentConversationId(newConvId);
        fetchAndSetMessages(newConvId);
    }, [inputConversationId, fetchAndSetMessages]);

    const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setError(null); setSuccessMessage(null); setValidationErrors({});

        const currentMessageText = mensaje.trim();
        if (!currentMessageText) { setError('El mensaje no puede estar vacío.'); return; }

        let actionInput: IniciarConversacionWebchatInput | EnviarMensajeWebchatInput;
        let validationSchema;

        if (currentConversationId) {
            actionInput = { conversationId: currentConversationId, mensaje: currentMessageText, remitenteIdWeb };
            validationSchema = EnviarMensajeWebchatInputSchema;
        } else {
            if (!asistenteId.trim()) { setError('Se requiere un ID de Asistente para iniciar.'); return; }
            actionInput = { asistenteId: asistenteId.trim(), mensajeInicial: currentMessageText, remitenteIdWeb, nombreRemitenteSugerido: `Web User ${remitenteIdWeb.substring(0, 6)}` };
            validationSchema = IniciarConversacionWebchatInputSchema;
        }

        const clientValidation = validationSchema.safeParse(actionInput);
        if (!clientValidation.success) {
            setValidationErrors(clientValidation.error.flatten().fieldErrors as Partial<Record<keyof (EnviarMensajeWebchatInput & IniciarConversacionWebchatInput), string[]>>); // Necesitarás mapear los errores si las claves no coinciden con el form
            setError("Por favor, corrige los errores.");
            return;
        }

        setIsSending(true);
        const tempUserMessageId = `optimistic-${uuidv4()}`;
        const optimisticMessage: ChatMessageItem = {
            id: tempUserMessageId,
            conversacionId: currentConversationId || "temp_conv_id",
            role: 'user',
            mensajeTexto: currentMessageText,
            createdAt: new Date(),
            // Los demás campos son opcionales o no aplican para el mensaje optimista
        };
        setChatMessages(prev => [...prev, optimisticMessage]);
        setMensaje('');

        try {
            let result: ActionResult<IniciarConversacionWebchatOutput | EnviarMensajeWebchatOutput>;
            if (currentConversationId) {
                result = await enviarMensajeWebchatAction(clientValidation.data as EnviarMensajeWebchatInput);
            } else {
                result = await iniciarConversacionWebchatAction(clientValidation.data as IniciarConversacionWebchatInput);
            }

            setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId)); // Remover optimista

            if (result.success && result.data) {
                const dataFromResult = result.data;
                if ('conversationId' in dataFromResult && dataFromResult.conversationId !== currentConversationId) { // Nueva conversación iniciada
                    setCurrentConversationId(dataFromResult.conversationId);
                    setInputConversationId(dataFromResult.conversationId);
                    setSuccessMessage(`Conversación iniciada: ${dataFromResult.conversationId}`);
                    // La señal de Supabase debería cargar todos los mensajes, incluyendo los iniciales.
                    // Opcionalmente, puedes añadir los mensajes de 'dataFromResult' a chatMessages aquí
                    // si quieres una actualización UI más inmediata antes de que llegue la señal.
                    // fetchAndSetMessages(dataFromResult.conversationId); // Podría ser redundante si Supabase es rápido
                } else {
                    setSuccessMessage(`Mensaje enviado.`);
                    // Para conversaciones existentes, la señal de Supabase actualizará el chat.
                }
                // Si la acción devuelve los mensajes, puedes añadirlos aquí. Ejemplo:
                // const newMessages: ChatMessageItem[] = [];
                // if (dataFromResult.mensajeUsuario) newMessages.push(dataFromResult.mensajeUsuario);
                // if (dataFromResult.mensajeAsistente) newMessages.push(dataFromResult.mensajeAsistente);
                // if (dataFromResult.mensajeResultadoFuncion) newMessages.push(dataFromResult.mensajeResultadoFuncion);
                // setChatMessages(prev => [...prev, ...newMessages]); // O usar fetchAndSetMessages

            } else {
                setError(result.error || 'Error en la acción.');
                setChatMessages(prev => [...prev.filter(m => m.id !== tempUserMessageId), { ...optimisticMessage, id: `error-${tempUserMessageId}` }]); // Mantener el mensaje pero marcarlo como error o reintentar
                setMensaje(currentMessageText); // Restaurar
            }
        } catch (e: unknown) {
            const errorMessage = e instanceof Error ? e.message : "Error inesperado.";
            setError(errorMessage);
            setChatMessages(prev => prev.filter(m => m.id !== tempUserMessageId));
            setMensaje(currentMessageText);
        } finally {
            setIsSending(false);
        }
    };

    const handleKeyDownSubmit = (event: React.KeyboardEvent<HTMLTextAreaElement>) => { /* ... tu lógica ... */ if (event.key === 'Enter' && !event.shiftKey) { event.preventDefault(); if (event.currentTarget.form) { const form = event.currentTarget.form; const submitEvent = new Event('submit', { bubbles: true, cancelable: true }); form.dispatchEvent(submitEvent); } } };
    const getMessageAlignment = (role: ChatMessageItem['role']) => { /* ... tu lógica ... */ return role === 'user' ? 'items-end' : 'items-start'; };
    const getMessageBgColor = (role: ChatMessageItem['role']) => { /* ... tu lógica ... */ if (role === 'user') return 'bg-blue-600 text-white'; if (role === 'assistant') return 'bg-zinc-900 text-zinc-200'; if (role === 'system') return 'bg-transparent text-zinc-500 italic text-xs text-center w-full'; return 'bg-gray-500 text-white'; };
    const handleResetConversation = () => { /* ... tu lógica ... */ setAsistenteId(''); setCurrentConversationId(''); setInputConversationId(''); setChatMessages([]); setError(null); setSuccessMessage("Panel reiniciado."); };

    return (
        <div className="space-y-4"> {/* Reducido space-y-6 a space-y-4 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                    <label htmlFor="asistenteId" className="block text-sm font-medium text-zinc-300 mb-1">ID Asistente (nueva):</label>
                    <input type="text" id="asistenteId" value={asistenteId} onChange={(e) => setAsistenteId(e.target.value)} placeholder="ID Asistente Virtual" className="w-full p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" disabled={!!currentConversationId} />
                </div>
                <div>
                    <label htmlFor="inputConversationId" className="block text-sm font-medium text-zinc-300 mb-1">ID Conversación (continuar):</label>
                    <div className="flex gap-2">
                        <input type="text" id="inputConversationId" value={inputConversationId} onChange={(e) => setInputConversationId(e.target.value)} placeholder="Pega ID existente" className="flex-grow p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" />
                        <button type="button" onClick={handleLoadConversation} className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50" disabled={!inputConversationId.trim() || (isLoadingMessages && currentConversationId === inputConversationId.trim())}>
                            {isLoadingMessages && currentConversationId === inputConversationId.trim() ? <Loader2 size={18} className="animate-spin" /> : "Cargar"}
                        </button>
                    </div>
                </div>
            </div>
            <button type="button" onClick={handleResetConversation} className="w-full px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-zinc-800"> {/* Removido mb-4 */}
                <Trash2 size={16} /> Reiniciar Panel
            </button>

            <div ref={messagesContainerRef} className="h-96 bg-zinc-950 p-4 rounded-lg border border-zinc-700 overflow-y-auto flex flex-col space-y-3">
                {(isLoadingMessages && chatMessages.length === 0) && (
                    <div className="flex-1 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-zinc-400" /><p className="ml-2 text-zinc-500">Cargando mensajes...</p></div>
                )}
                {(!isLoadingMessages && chatMessages.length === 0) && (
                    <div className="flex-1 flex flex-col items-center justify-center text-zinc-500"><MessageSquareWarning size={40} className="mb-2" /><p>{currentConversationId ? `No hay mensajes para ${currentConversationId}.` : "Inicia o carga una conversación."}</p></div>
                )}
                {/* //!RENDERIUZAR AQUI */}
                {chatMessages.map((msg) => (
                    <div key={msg.id} className={`flex flex-col ${getMessageAlignment(msg.role)} ${msg.role === "system" ? "items-center" : ""}`}>
                        {msg.role !== "system" ? (

                            <div className={`flex items-end gap-2 max-w-[75%] ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}>

                                {msg.role === "assistant" && (<span className="flex-shrink-0 text-zinc-400 self-center p-1.5 bg-zinc-700 rounded-full">
                                    <Bot size={16} />
                                </span>)}

                                <div className={`p-2.5 rounded-lg shadow ${getMessageBgColor(msg.role)} ${msg.role === "user" ? "rounded-br-none" : "rounded-bl-none"}`}>
                                    {msg.mensajeTexto && (msg.role === 'assistant' ?
                                        (<div className="text-sm prose prose-sm prose-invert max-w-none chat-message-content" dangerouslySetInnerHTML={{ __html: msg.mensajeTexto }} />) :
                                        (<p className="text-sm whitespace-pre-wrap chat-message-content">{msg.mensajeTexto}</p>)
                                    )}
                                </div>

                                {msg.role === "user" && (<span className="flex-shrink-0 text-blue-300 self-center p-1.5 bg-blue-800 rounded-full"><User size={16} /></span>)}

                            </div>

                        ) : (<div className={`py-1 ${getMessageBgColor(msg.role)}`}>{msg.mensajeTexto}</div>)}
                        <span className={`text-xs text-zinc-500 mt-1 px-1 ${msg.role === "user" ? "self-end" : msg.role === "system" ? "self-center" : "self-start"}`}>
                            {new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                        </span>
                    </div>
                ))}
                <div ref={messagesEndRef} />
            </div>

            <form onSubmit={handleSubmit} id="chatTestPanelForm" className="space-y-3 pt-3 border-t border-zinc-700"> {/* sticky bottom-0 py-3 bg-zinc-800 -mx-6 px-6 md:-mx-8 md:px-8 */}
                <div>
                    <div className="flex items-stretch gap-2"> {/* items-stretch para que textarea y button tengan misma altura */}
                        <textarea id="mensaje" form="chatTestPanelForm" value={mensaje} onKeyDown={handleKeyDownSubmit} onChange={(e) => setMensaje(e.target.value)} placeholder={currentConversationId ? "Escribe tu respuesta..." : "Escribe tu primer mensaje..."} rows={2} className="flex-grow p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500 resize-none" />
                        <button type="submit" form="chatTestPanelForm" disabled={isSending || !mensaje.trim() || (!currentConversationId && !asistenteId.trim())} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 self-stretch" aria-label="Enviar mensaje"> {/* self-stretch */}
                            {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
                        </button>
                    </div>
                </div>
                {validationErrors && Object.keys(validationErrors).length > 0 && (
                    <div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-xs space-y-1">
                        <p className="font-medium flex items-center gap-1"><MessageSquareWarning size={16} /> Errores de validación:</p>
                        <ul className="list-disc list-inside pl-1">
                            {Object.entries(validationErrors).map(([field, errors]) =>
                                errors?.map((err, i) => <li key={`${field}-${i}`}>{err}</li>)
                            )}
                        </ul>
                    </div>
                )}
                {error && (<div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-sm flex items-center gap-2"><MessageSquareWarning size={18} /> {error}</div>)}
                {successMessage && (<div className="p-3 rounded-md bg-green-900/30 text-green-400 border border-green-700/50 text-sm flex items-center gap-2"><CheckCircle2 size={18} /> {successMessage}</div>)}
            </form>
            {lightboxOpen && (<Lightbox open={lightboxOpen} close={() => setLightboxOpen(false)} slides={lightboxSlides} index={lightboxIndex} />)}
        </div>
    );
}