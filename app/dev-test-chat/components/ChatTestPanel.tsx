// // Ruta: app/dev-test-chat/components/ChatTestPanel.tsx
// 'use client';

// import React, { useState, useEffect, useRef, FormEvent, KeyboardEvent, useCallback, JSX } from 'react';
// import { Loader2, Send, Trash2, MessageSquareWarning } from 'lucide-react'; // Iconos
// import Lightbox from "yet-another-react-lightbox"; // Lightbox
// import "yet-another-react-lightbox/styles.css";
// // import "yet-another-react-lightbox/plugins/thumbnails.css";
// // import Thumbnails from "yet-another-react-lightbox/plugins/thumbnails"; // Descomentar si se instala y usa


// // Acciones del backend para interactuar con el WebChat
// import {
//     iniciarConversacionWebchatAction,
//     enviarMensajeWebchatAction,
//     obtenerUltimosMensajesAction
//     // obtenerMensajesConversacionWebchatAction // Nombre incorrecto usado anteriormente
// } from '@/app/admin/_lib/actions/webchat_test/chatTest.actions';

// // Tipos de datos para los mensajes y detalles de conversación
// import {
//     type ChatMessageItemCrmData, // Tipo para cada mensaje en el chat
//     type ConversationDetailsForPanelData, // Tipo para detalles simulados de la conversación
//     // type MediaItem, // Tipo para items de media
// } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

// // Tipo para los botones de acción del uiComponentPayload
// import { type ActionButtonPayload } from '@/app/admin/_lib/ui-payloads.types';

// // Subcomponente para renderizar cada burbuja de mensaje
// import ChatMessageBubble from '@/app/components/chat/ChatMessageBubble';

// // Importar el enum de Prisma directamente si es necesario para el estado inicial o tipos
// import { InteraccionParteTipo } from '@prisma/client';

// // Clave para guardar/leer el ID del remitente web en localStorage
// const REMITENTE_ID_WEB_KEY = 'chatTestPanel_remitenteIdWeb_v1'; // v1 para evitar colisiones si hubo versiones previas

// // Función para obtener o generar un ID único para el remitente web (usuario del panel de pruebas)
// const getRemitenteIdWeb = (): string => {
//     if (typeof window !== 'undefined') { // Asegurar que se ejecuta solo en el cliente
//         let id = localStorage.getItem(REMITENTE_ID_WEB_KEY);
//         if (!id) {
//             id = crypto.randomUUID(); // Generar un nuevo UUID si no existe
//             localStorage.setItem(REMITENTE_ID_WEB_KEY, id);
//         }
//         return id;
//     }
//     // Fallback para SSR o entornos sin window (aunque este panel es 'use client')
//     // En un entorno puramente cliente, esto no debería ejecutarse.
//     console.warn("[ChatTestPanel] getRemitenteIdWeb llamado en un entorno sin window. Generando UUID temporal.");
//     return crypto.randomUUID();
// };


// export default function ChatTestPanel() {
//     // --- ESTADOS DEL COMPONENTE ---
//     const [asistenteId, setAsistenteId] = useState<string>('cma4f5zho0009guj0fnv019t1'); // ID del Asistente a probar, con un valor por defecto
//     const [currentConversationId, setCurrentConversationId] = useState<string | null>(null); // ID de la conversación activa
//     const [inputConversationId, setInputConversationId] = useState<string>(''); // Para cargar una conversación existente

//     const [mensaje, setMensaje] = useState(''); // Mensaje actual en el input de texto
//     const [chatMessages, setChatMessages] = useState<ChatMessageItemCrmData[]>([]); // Array de mensajes de la conversación

//     const [isSending, setIsSending] = useState(false); // Estado para indicar si se está enviando un mensaje
//     const [isLoadingMessages, setIsLoadingMessages] = useState(false); // Estado para indicar si se están cargando mensajes

//     const [error, setError] = useState<string | null>(null); // Mensaje de error general
//     // const [successMessage, setSuccessMessage] = useState<string | null>(null); // Mensaje de éxito general
//     const [validationErrors, setValidationErrors] = useState<Record<string, string[] | undefined> | null>(null); // Errores de validación específicos

//     // Referencias a elementos del DOM
//     const messagesContainerRef = useRef<HTMLDivElement>(null); // Contenedor de mensajes para scroll
//     const messagesEndRef = useRef<HTMLDivElement>(null); // Elemento al final de los mensajes para auto-scroll

//     // ID único del remitente web (usuario del panel), obtenido o generado al montar
//     const [remitenteIdWeb] = useState<string>(getRemitenteIdWeb());

//     // Estados para el Lightbox (visualizador de imágenes)
//     const [lightboxOpen, setLightboxOpen] = useState(false);
//     const [lightboxSlides, setLightboxSlides] = useState<{ src: string; alt?: string; type?: "image" }[]>([]);
//     const [lightboxIndex, setLightboxIndex] = useState(0);

//     // --- FUNCIONES AUXILIARES DE UI ---

//     // Determina la alineación de la burbuja de mensaje
//     const getTestPanelMessageAlignment = (role: string): string => (role === 'user' ? 'self-end' : 'self-start');

//     // Determina el color de fondo de la burbuja de mensaje
//     const getTestPanelMessageBgColor = (role: string): string => {
//         if (role === 'user') return 'bg-blue-600 text-white';
//         if (role === 'assistant') return 'bg-zinc-700 text-zinc-100'; // Color para el asistente
//         if (role === 'agent') return 'bg-purple-600 text-white'; // Color para un agente humano
//         if (role === 'system') return 'bg-zinc-600 text-zinc-300 text-center'; // Color para mensajes de sistema
//         return 'bg-gray-500 text-white'; // Fallback
//     };

//     // Determina el icono del remitente
//     const getTestPanelMessageSenderIcon = (roleArg: string, msg: ChatMessageItemCrmData): JSX.Element => {
//         // En este panel de pruebas, simplificamos los iconos
//         if (roleArg === 'user') return <span className="text-xs font-semibold">YO</span>;
//         if (roleArg === 'assistant') return <span className="text-xs font-semibold">IA</span>;
//         if (roleArg === 'agent' && msg.agenteCrm?.nombre) return <span className="text-xs font-semibold">{msg.agenteCrm.nombre.substring(0, 2).toUpperCase()}</span>;
//         if (roleArg === 'agent') return <span className="text-xs font-semibold">AG</span>;
//         return <span className="text-xs">SYS</span>;
//     };

//     // Abre el Lightbox con las imágenes proporcionadas
//     const openLightboxWithSlides = useCallback((
//         slides: { src: string; alt?: string; type?: "image" }[],
//         index: number,
//         caller?: string // Opcional: para depurar quién llamó
//     ) => {
//         console.log(`[ChatTestPanel] openLightbox. Caller: ${caller}, Index: ${index}, Slides Count: ${slides.length}`);
//         if (slides && slides.length > 0) {
//             setLightboxSlides(slides);
//             setLightboxIndex(index >= 0 && index < slides.length ? index : 0);
//             setLightboxOpen(true);
//         } else {
//             console.warn("[ChatTestPanel] No slides provided to openLightbox.");
//         }
//     }, []); // useCallback para evitar re-creaciones innecesarias

//     // --- EFECTOS ---

//     // Efecto para hacer scroll automático al final cuando llegan nuevos mensajes
//     const scrollToBottom = useCallback(() => {
//         messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
//     }, []); // Se mantiene estable

//     useEffect(() => {
//         scrollToBottom();
//     }, [chatMessages, scrollToBottom]); // Depende de chatMessages y la función scrollToBottom

//     // --- MANEJADORES DE EVENTOS ---

//     // Reinicia la conversación actual en el panel
//     const handleResetConversation = useCallback(() => {
//         setCurrentConversationId(null);
//         setChatMessages([]);
//         setMensaje('');
//         setError(null);
//         // setSuccessMessage("Panel reiniciado. Ingresa ID de Asistente para nueva conversación o carga una existente.");
//         setInputConversationId('');
//         // Podrías considerar resetear asistenteId si es necesario:
//         // setAsistenteId('cma4f5zho0009guj0fnv019t1'); // O a un valor vacío
//         console.log("[ChatTestPanel] Conversación reiniciada.");
//     }, []);

//     // Carga los mensajes de una conversación existente
//     const fetchAndSetMessages = useCallback(async (convId: string) => {
//         if (!convId) return;
//         console.log(`[ChatTestPanel] Cargando mensajes para conversación ID: ${convId}`);
//         setIsLoadingMessages(true);
//         setError(null);
//         setChatMessages([]); // Limpiar mensajes anteriores mientras carga
//         try {
//             // USA LA ACCIÓN CORRECTA AQUÍ
//             const result = await obtenerUltimosMensajesAction(convId);
//             if (result.success && result.data) {
//                 setChatMessages(result.data);
//                 setCurrentConversationId(convId);
//                 // setSuccessMessage(`Conversación ${convId} cargada (${result.data.length} mensajes).`);
//             } else {
//                 setError(result.error || "No se pudieron cargar los mensajes.");
//                 setCurrentConversationId(null); // Resetear si falla la carga
//             }
//         } catch (e) {
//             setError(e instanceof Error ? e.message : "Error desconocido al cargar mensajes.");
//             setCurrentConversationId(null);
//         } finally {
//             setIsLoadingMessages(false);
//         }
//     }, []);

//     const handleLoadConversation = useCallback(() => {
//         if (inputConversationId.trim()) {
//             fetchAndSetMessages(inputConversationId.trim());
//         }
//     }, [inputConversationId, fetchAndSetMessages]);

//     // Manejador para acciones de UI (ej. clics en botones generados por ActionPromptComponent)
//     const handleUiActionTrigger = useCallback(async (
//         action: ActionButtonPayload
//     ) => {
//         console.log("[ChatTestPanel] UI Action Triggered:", action);
//         setError(null); setValidationErrors(null);

//         if (!currentConversationId) {
//             setError("No hay una conversación activa para procesar la acción.");
//             // toast.error("No hay una conversación activa.");
//             return;
//         }

//         if (action.actionType === "CALL_FUNCTION" && action.actionName && action.payload) {
//             // Mensaje que simula la elección del usuario para la IA
//             const intentMessageForIA = `El usuario ha seleccionado la acción '${action.label}' que corresponde a ejecutar la función '${action.actionName}' con los siguientes argumentos: ${JSON.stringify(action.payload)}`;

//             // Mensaje optimista para la UI (lo que el usuario "dijo" al hacer clic)
//             const userActionDisplayMessage: ChatMessageItemCrmData = {
//                 id: `action-${crypto.randomUUID()}`,
//                 role: 'user',
//                 mensajeTexto: action.label, // Mostrar el label del botón
//                 createdAt: new Date(),
//                 conversacionId: currentConversationId,
//                 parteTipo: InteraccionParteTipo.TEXT,
//                 canalInteraccion: 'webchat', // Asumimos webchat para este panel
//             };
//             setChatMessages(prev => [...prev, userActionDisplayMessage]);
//             setIsSending(true);

//             try {
//                 const result = await enviarMensajeWebchatAction({
//                     conversationId: currentConversationId,
//                     mensaje: intentMessageForIA, // Este mensaje es para que la IA lo procese
//                     remitenteIdWeb: remitenteIdWeb,
//                 });

//                 // Quitar el mensaje optimista y añadir los reales
//                 setChatMessages(prev => prev.filter(m => m.id !== userActionDisplayMessage.id));
//                 if (result.success && result.data) {
//                     const newMessages: ChatMessageItemCrmData[] = [];
//                     if (result.data.mensajeAsistente) newMessages.push(result.data.mensajeAsistente);
//                     if (result.data.mensajeResultadoFuncion) newMessages.push(result.data.mensajeResultadoFuncion);

//                     setChatMessages(prev => [...prev, userActionDisplayMessage, ...newMessages]);
//                 } else {
//                     setError(result.error || "Error al procesar la acción.");
//                     if (result.validationErrors) setValidationErrors(result.validationErrors);
//                 }
//             } catch (err) {
//                 setError(err instanceof Error ? err.message : "Error de red al procesar la acción.");
//                 setChatMessages(prev => prev.filter(m => m.id !== userActionDisplayMessage.id));
//             } finally {
//                 setIsSending(false);
//             }

//         } else if (action.actionType === "USER_INPUT_EXPECTED") {
//             document.getElementById('mensaje')?.focus();
//         } else if (action.actionType === "OPEN_URL" && action.url) {
//             window.open(action.url, '_blank', 'noopener,noreferrer');
//         }
//     }, [currentConversationId, remitenteIdWeb]);

//     // Manejador para enviar un mensaje (ya sea nuevo o continuando conversación)
//     const handleSubmit = useCallback(async (e?: FormEvent<HTMLFormElement>) => {
//         if (e) e.preventDefault();
//         if (!mensaje.trim() || isSending) return;

//         setError(null); setValidationErrors(null);
//         setIsSending(true);

//         const userMessageOptimistic: ChatMessageItemCrmData = {
//             id: `temp-user-${Date.now()}-${Math.random()}`,
//             role: 'user',
//             mensajeTexto: mensaje,
//             createdAt: new Date(),
//             conversacionId: currentConversationId || "temp-conv-id",
//             parteTipo: InteraccionParteTipo.TEXT,
//             canalInteraccion: 'webchat',
//         };
//         setChatMessages(prev => [...prev, userMessageOptimistic]);
//         const currentMessageText = mensaje;
//         setMensaje('');

//         try {
//             let result;
//             if (currentConversationId) {
//                 result = await enviarMensajeWebchatAction({
//                     conversationId: currentConversationId,
//                     mensaje: currentMessageText,
//                     remitenteIdWeb: remitenteIdWeb,
//                 });
//             } else {
//                 if (!asistenteId.trim()) {
//                     setError("Se requiere un ID de Asistente para iniciar una nueva conversación.");
//                     setChatMessages(prev => prev.filter(m => m.id !== userMessageOptimistic.id));
//                     setIsSending(false);
//                     return;
//                 }
//                 result = await iniciarConversacionWebchatAction({
//                     asistenteId: asistenteId,
//                     mensajeInicial: currentMessageText,
//                     remitenteIdWeb: remitenteIdWeb,
//                     nombreRemitenteSugerido: "Usuario Panel Test"
//                 });
//                 if (result.success && result.data?.conversationId) {
//                     setCurrentConversationId(result.data.conversationId);
//                     setInputConversationId(result.data.conversationId);
//                 }
//             }

//             setChatMessages(prev => prev.filter(m => m.id !== userMessageOptimistic.id));

//             if (result.success && result.data) {
//                 const newMessages: ChatMessageItemCrmData[] = [];
//                 if (result.data.mensajeUsuario) newMessages.push(result.data.mensajeUsuario);
//                 if (result.data.mensajeAsistente) newMessages.push(result.data.mensajeAsistente);
//                 if (result.data.mensajeResultadoFuncion) newMessages.push(result.data.mensajeResultadoFuncion);

//                 setChatMessages(prev => [...prev, ...newMessages]);
//             } else {
//                 setError(result.error || "Error desconocido al procesar mensaje.");
//                 if (result.validationErrors) setValidationErrors(result.validationErrors);
//             }
//         } catch (err) {
//             setError(err instanceof Error ? err.message : "Error de red o inesperado.");
//             setChatMessages(prev => prev.filter(m => m.id !== userMessageOptimistic.id));
//         } finally {
//             setIsSending(false);
//         }
//     }, [mensaje, isSending, currentConversationId, asistenteId, remitenteIdWeb]);

//     const handleKeyDownSubmit = useCallback((e: KeyboardEvent<HTMLTextAreaElement>) => {
//         if (e.key === 'Enter' && !e.shiftKey) {
//             e.preventDefault();
//             handleSubmit();
//         }
//     }, [handleSubmit]);

//     const simulatedConversationDetailsForBubble: ConversationDetailsForPanelData | null = currentConversationId ? {
//         id: currentConversationId,
//         status: 'abierta',
//         leadId: null,
//         leadNombre: 'Usuario (Panel Test)',
//         agenteCrmActual: null,
//         canalOrigen: 'webchat',
//         canalIcono: 'MessageSquare',
//         asistenteNombre: asistenteId ? `Asistente (${asistenteId.substring(0, 6)}...)` : 'Asistente de Prueba',
//     } : null;

//     return (
//         <div className="p-4 md:p-6 bg-zinc-900 text-zinc-100 rounded-xl shadow-2xl border border-zinc-700 max-w-3xl mx-auto my-8">
//             <h2 className="text-xl font-semibold text-zinc-50 mb-4">Panel de Pruebas Web Chat (V8.1 - ActionPrompt)</h2>
//             <div className="space-y-4">
//                 <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
//                     <div>
//                         <label htmlFor="asistenteId" className="block text-sm font-medium text-zinc-300 mb-1">ID Asistente (nueva conv):</label>
//                         <input type="text" id="asistenteId" value={asistenteId} onChange={(e) => setAsistenteId(e.target.value)} placeholder="ID Asistente Virtual" className="w-full p-2.5 rounded-md text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" disabled={!!currentConversationId && !isLoadingMessages} />
//                     </div>
//                     <div>
//                         <label htmlFor="inputConversationId" className="block text-sm font-medium text-zinc-300 mb-1">ID Conversación (continuar):</label>
//                         <div className="flex gap-2">
//                             <input type="text" id="inputConversationId" value={inputConversationId} onChange={(e) => setInputConversationId(e.target.value)} placeholder="Pega ID existente" className="flex-grow p-2.5 rounded-md text-sm bg-zinc-950 border border-zinc-700 text-zinc-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500" />
//                             <button type="button" onClick={handleLoadConversation} className="p-2.5 bg-teal-600 hover:bg-teal-700 text-white text-sm font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-teal-500 disabled:opacity-50" disabled={!inputConversationId.trim() || (isLoadingMessages && currentConversationId === inputConversationId.trim())}>
//                                 {isLoadingMessages && currentConversationId === inputConversationId.trim() ? <Loader2 size={18} className="animate-spin" /> : "Cargar"}
//                             </button>
//                         </div>
//                     </div>
//                 </div>
//                 <button type="button" onClick={handleResetConversation} className="w-full px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white text-sm font-medium rounded-lg flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-amber-500">
//                     <Trash2 size={16} /> Reiniciar Panel
//                 </button>

//                 <div ref={messagesContainerRef} className="h-96 bg-zinc-950 p-3 sm:p-4 rounded-lg border border-zinc-700 overflow-y-auto flex flex-col space-y-0.5 custom-scrollbar">
//                     {(isLoadingMessages && chatMessages.length === 0) && (
//                         <div className="flex-1 flex items-center justify-center"><Loader2 size={32} className="animate-spin text-zinc-400" /><p className="ml-2 text-zinc-500">Cargando mensajes...</p></div>
//                     )}
//                     {(!isLoadingMessages && chatMessages.length === 0) && (
//                         <div className="flex-1 flex flex-col items-center justify-center text-zinc-500"><MessageSquareWarning size={40} className="mb-2" /><p>{currentConversationId ? `No hay mensajes para la conversación: ${currentConversationId.substring(0, 12)}...` : "Inicia una nueva conversación o carga una existente."}</p></div>
//                     )}

//                     {chatMessages.map((msg) => (
//                         <ChatMessageBubble
//                             key={msg.id || `msg-${msg.createdAt?.getTime()}-${Math.random()}`}
//                             msg={msg}
//                             conversationDetails={simulatedConversationDetailsForBubble}
//                             currentAgentInfo={null}
//                             isAdmin={false}
//                             isOwner={false}
//                             getMessageAlignment={getTestPanelMessageAlignment}
//                             getMessageBgColor={getTestPanelMessageBgColor}
//                             getMessageSenderIcon={(roleArg) => getTestPanelMessageSenderIcon(roleArg, msg)}
//                             openLightboxWithSlides={openLightboxWithSlides}
//                             onUiActionTrigger={handleUiActionTrigger}
//                         />
//                     ))}
//                     <div ref={messagesEndRef} />
//                 </div>

//                 <form onSubmit={handleSubmit} id="chatTestPanelForm" className="space-y-3 pt-3 border-t border-zinc-700">
//                     <div>
//                         <div className="flex items-stretch gap-2">
//                             <textarea id="mensaje" value={mensaje} onChange={(e) => setMensaje(e.target.value)} onKeyDown={handleKeyDownSubmit} placeholder={currentConversationId ? "Escribe tu respuesta..." : "Escribe tu primer mensaje para iniciar..."} rows={2} className="flex-grow p-2.5 rounded-md text-sm bg-zinc-900 border border-zinc-700 text-zinc-200 focus:ring-1 focus:ring-blue-500 focus:border-blue-500 placeholder-zinc-500 resize-none custom-scrollbar" />
//                             <button type="submit" disabled={isSending || !mensaje.trim() || (!currentConversationId && !asistenteId.trim())} className="p-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-60 self-stretch" aria-label="Enviar mensaje">
//                                 {isSending ? <Loader2 size={20} className="animate-spin" /> : <Send size={20} />}
//                             </button>
//                         </div>
//                     </div>
//                     {validationErrors && Object.keys(validationErrors).length > 0 && (
//                         <div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-xs space-y-1">
//                             <p className="font-medium flex items-center gap-1"><MessageSquareWarning size={16} /> Errores de validación:</p>
//                             <ul className="list-disc list-inside pl-1">
//                                 {Object.entries(validationErrors).map(([field, errors]) =>
//                                     errors?.map((err, i) => <li key={`${field}-${i}`}>{field}: {err}</li>)
//                                 )}
//                             </ul>
//                         </div>
//                     )}
//                     {error && (<div className="p-3 rounded-md bg-red-900/30 text-red-400 border border-red-700/50 text-sm flex items-center gap-2"><MessageSquareWarning size={18} /> {error}</div>)}
//                 </form>

//                 {lightboxOpen && (
//                     <Lightbox
//                         open={lightboxOpen}
//                         close={() => setLightboxOpen(false)}
//                         slides={lightboxSlides}
//                         index={lightboxIndex}
//                         // plugins={[Thumbnails]}
//                         styles={{ container: { backgroundColor: "rgba(0, 0, 0, .9)" } }}
//                     />
//                 )}
//             </div>
//         </div>
//     );
// }
