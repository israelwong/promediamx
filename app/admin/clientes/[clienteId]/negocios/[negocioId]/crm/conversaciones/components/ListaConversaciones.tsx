// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/components/ListaConversaciones.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
// Importar icono para webchat/otro
import { Search, Loader2, Inbox, RefreshCw, MessageSquare } from 'lucide-react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import { obtenerListaConversacionesAction } from '@/app/admin/_lib/crmConversacion.actions'; // Ajusta ruta si es necesario
// Importar tipo actualizado
import { ConversationPreviewItem } from '@/app/admin/_lib/crmConversacion.types'; // Ajusta ruta si es necesario
import { useDebounce } from '@/app/admin/_lib/hooks/useDebounce';
import Image from 'next/image';

interface ListaConversacionesProps {
    negocioId: string;
    clienteId: string;
}

// --- SVG de WhatsApp ---
const WhatsAppIcon = () => (
    <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="currentColor" className="text-green-500">
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" />
    </svg>
);
// --- FIN SVG ---


let supabaseLista: SupabaseClient | null = null;
if (typeof window !== 'undefined') { /* ... inicialización supabase ... */
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL; const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) supabaseLista = createClient(supabaseUrl, supabaseAnonKey);
    else console.warn("[ListaConversaciones] Supabase no configurado.");
}

export default function ListaConversaciones({ negocioId, clienteId }: ListaConversacionesProps) {
    const [conversations, setConversations] = useState<ConversationPreviewItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const params = useParams();
    const activeConversationId = params?.conversationId as string || '';

    const fetchConversations = useCallback(async (currentSearchTerm: string) => { /* ... (sin cambios) ... */
        console.log(`[ListaConversaciones] fetchConversations: ${negocioId}, término: ${currentSearchTerm}`);
        if (conversations.length === 0 && !error) setIsLoading(true);
        const result = await obtenerListaConversacionesAction(negocioId, currentSearchTerm);
        console.log("[ListaConversaciones] Resultado:", result);
        if (result.success && result.data) setConversations(result.data);
        else { setError(result.error || 'Error al cargar.'); setConversations([]); }
        setIsLoading(false);
    }, [negocioId, conversations.length, error]);

    useEffect(() => { fetchConversations(debouncedSearchTerm); }, [debouncedSearchTerm, fetchConversations]);

    // useEffect para Supabase Realtime (sin cambios funcionales aquí)
    useEffect(() => { /* ... */
        if (!supabaseLista) { console.log("[ListaConversaciones Realtime] No suscrito."); return; }
        const channelName = 'public:Conversacion';
        console.log(`[ListaConversaciones Realtime] Suscribiéndose a: ${channelName}`);
        const channel: RealtimeChannel = supabaseLista.channel(channelName)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'Conversacion' },
                (payload) => { console.log('[ListaConversaciones Realtime] Cambio detectado:', payload); fetchConversations(debouncedSearchTerm); }
            )
            .subscribe((status, err) => { if (status === 'SUBSCRIBED') console.log(`Suscrito a ${channelName}`); else if (err) console.error(`Error canal ${channelName}:`, err); else console.log(`Estado canal ${channelName}: ${status}`); });
        return () => { if (supabaseLista && channel) { console.log(`Desuscribiéndose de ${channelName}`); supabaseLista.removeChannel(channel).catch(console.error); } };
    }, [negocioId, fetchConversations, debouncedSearchTerm]);

    const handleRefresh = () => { fetchConversations(debouncedSearchTerm); };
    const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}/crm/conversaciones`;
    const getStatusColor = (status: string) => { /* ... (sin cambios) ... */ switch (status?.toLowerCase()) { case 'abierta': return 'bg-green-500'; case 'en_espera_agente': return 'bg-amber-500'; case 'hitl': return 'bg-sky-500'; case 'cerrada': return 'bg-zinc-600'; default: return 'bg-zinc-500'; } };

    // --- Función para obtener el icono del canal ---
    const getChannelIcon = (canal: ConversationPreviewItem['canalOrigen']) => {
        if (canal === 'whatsapp') {
            return <WhatsAppIcon />;
        }
        if (canal === 'webchat') {
            // Usar MessageSquare para webchat u otro icono que prefieras
            return <MessageSquare size={14} className="text-blue-400" />;
        }
        // Icono por defecto si es 'otro' o null/undefined
        return <MessageSquare size={14} className="text-gray-500" />;
    };
    // --- FIN Función ---

    return (
        <div className="p-3 flex flex-col h-full max-h-[800px] overflow-y-auto">
            {/* ... (Header y barra de búsqueda sin cambios) ... */}
            <div className="mb-3 flex-shrink-0"><div className="flex justify-between items-center mb-1 px-1"><h3 className="text-lg font-semibold text-zinc-100">Conversaciones</h3><button onClick={handleRefresh} disabled={isLoading && conversations.length > 0} className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50" title="Actualizar lista"><RefreshCw size={16} className={isLoading && conversations.length > 0 ? "animate-spin" : ""} /></button></div><div className="relative mt-1"><div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-zinc-500" /></div><input type="text" placeholder="Buscar por nombre de lead..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-blue-500 focus:border-blue-500 text-sm" /></div></div>

            {/* ... (Estados de carga, error y vacío sin cambios) ... */}
            {isLoading && conversations.length === 0 && (<div className="flex-grow flex items-center justify-center"><Loader2 size={24} className="animate-spin text-zinc-400" /></div>)}
            {!isLoading && error && (<div className="flex-grow flex flex-col items-center justify-center text-red-400 p-3 text-center"><p className="font-medium">Error:</p><p className="text-sm">{error}</p><button onClick={handleRefresh} className="mt-2 text-xs text-blue-400 hover:underline">Reintentar</button></div>)}
            {!isLoading && !error && conversations.length === 0 && (<div className="flex-grow flex flex-col items-center justify-center text-zinc-500 p-3 text-center"><Inbox size={40} className="mb-2" /><p>{debouncedSearchTerm ? 'No hay coincidencias.' : 'No hay conversaciones.'}</p></div>)}

            {/* Lista de Conversaciones */}
            {!isLoading && !error && conversations.length > 0 && (
                <ul className="space-y-1 overflow-y-auto flex-grow pr-1 -mr-1">
                    {conversations.map((conv) => {
                        const isActive = activeConversationId === conv.id;
                        return (
                            <li key={conv.id}>
                                <Link
                                    href={`${basePath}/${conv.id}`}
                                    className={`flex items-center gap-3 p-2.5 rounded-md transition-colors ${isActive ? 'bg-zinc-700/80 shadow-sm' : 'hover:bg-zinc-700/50'}`}
                                >
                                    {/* Avatar y Status */}
                                    <div className="relative flex-shrink-0">
                                        {/* ... (Lógica avatar) ... */}
                                        {conv.avatarUrl ? (<Image src={conv.avatarUrl} alt={conv.leadName} width={36} height={36} className="w-9 h-9 rounded-full object-cover border border-zinc-600" />) : (<div className="w-9 h-9 rounded-full bg-zinc-600 flex items-center justify-center text-zinc-300 text-sm font-medium">{conv.leadName?.substring(0, 2).toUpperCase() || '??'}</div>)}
                                        <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-zinc-800 ${getStatusColor(conv.status)}`} />
                                    </div>
                                    {/* Nombre, Preview y Canal */}
                                    <div className="flex-grow overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <div className="flex items-center gap-1.5 truncate"> {/* Contenedor para nombre e icono */}
                                                {/* --- CORRECCIÓN: Añadir icono de canal --- */}
                                                <span className="flex-shrink-0" title={`Canal: ${conv.canalOrigen || 'Desconocido'}`}>
                                                    {getChannelIcon(conv.canalOrigen)}
                                                </span>
                                                {/* --- FIN CORRECCIÓN --- */}
                                                <h4 className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-zinc-200'}`}>{conv.leadName}</h4>
                                            </div>
                                            {/* Timestamp (movido aquí para mejor alineación si es necesario) */}
                                            {/* <span className={`text-xs flex-shrink-0 ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>{new Date(conv.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span> */}
                                        </div>
                                        <p className={`text-xs truncate ${isActive ? 'text-zinc-300' : 'text-zinc-400'}`}>{conv.lastMessagePreview}</p>
                                    </div>
                                    {/* Timestamp (posición original) */}
                                    <span className={`text-xs flex-shrink-0 ${isActive ? 'text-zinc-400' : 'text-zinc-500'}`}>
                                        {new Date(conv.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                    </span>
                                </Link>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}
