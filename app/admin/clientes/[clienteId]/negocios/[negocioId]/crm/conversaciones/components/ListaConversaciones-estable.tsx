'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Search, Loader2, Inbox, RefreshCw } from 'lucide-react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'; // Importar Supabase
import { obtenerListaConversacionesAction } from '@/app/admin/_lib/crmConversacion.actions';
import { ConversationPreviewItem } from '@/app/admin/_lib/crmConversacion.types';
import { useDebounce } from '@/app/admin/_lib/hooks/useDebounce';
import Image from 'next/image';

interface ListaConversacionesProps {
    negocioId: string;
    clienteId: string;
}

// Inicialización del cliente Supabase (solo en el lado del cliente)
let supabaseLista: SupabaseClient | null = null; // Usar un nombre diferente para evitar conflictos si ChatComponent usa 'supabase'
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
        supabaseLista = createClient(supabaseUrl, supabaseAnonKey);
        console.log("[ListaConversaciones] Supabase client initialized for Realtime.");
    } else {
        console.warn("[ListaConversaciones] Supabase URL o Anon Key no definidas en .env. Realtime no funcionará.");
    }
}

export default function ListaConversaciones({ negocioId, clienteId }: ListaConversacionesProps) {
    const [conversations, setConversations] = useState<ConversationPreviewItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);

    const params = useParams();
    const activeConversationId = params?.conversationId as string || '';

    const fetchConversations = useCallback(async (currentSearchTerm: string) => {
        console.log(`[ListaConversaciones] fetchConversations para negocioId: ${negocioId}, término: ${currentSearchTerm}`);
        // No poner setIsLoading(true) aquí para evitar parpadeo en refrescos de Realtime
        // Se maneja con el isLoading inicial y al cambiar término de búsqueda.
        if (conversations.length === 0 && !error) setIsLoading(true); // Solo en carga inicial

        const result = await obtenerListaConversacionesAction(negocioId, currentSearchTerm);
        if (result.success && result.data) {
            setConversations(result.data);
        } else {
            setError(result.error || 'No se pudieron cargar las conversaciones.');
            setConversations([]);
        }
        setIsLoading(false);
    }, [negocioId, conversations.length, error]); // conversations.length y error para la lógica del spinner inicial

    useEffect(() => {
        fetchConversations(debouncedSearchTerm);
    }, [debouncedSearchTerm, fetchConversations]);

    // useEffect para Supabase Realtime en la tabla Conversacion
    useEffect(() => {
        if (!supabaseLista) {
            console.log("[ListaConversaciones Realtime] Supabase client no disponible. Realtime desactivado.");
            return;
        }

        const channelName = 'public:Conversacion'; // Escuchar todos los cambios en la tabla Conversacion
        console.log(`[ListaConversaciones Realtime] Suscribiéndose al canal: ${channelName}`);

        const channel: RealtimeChannel = supabaseLista
            .channel(channelName)
            .on(
                'postgres_changes',
                {
                    event: '*', // Escuchar INSERT, UPDATE, DELETE
                    schema: 'public',
                    table: 'Conversacion',
                    // No podemos filtrar por negocioId directamente aquí de forma sencilla
                    // ya que negocioId está en una tabla relacionada.
                    // Por lo tanto, recargaremos la lista y la acción la filtrará.
                },
                (payload) => {
                    console.log('[ListaConversaciones Realtime] Cambio detectado en tabla Conversacion:', payload);
                    // Volver a cargar la lista de conversaciones.
                    // La acción `obtenerListaConversacionesAction` ya filtra por el `negocioId` correcto.
                    // Usamos el `debouncedSearchTerm` actual para la recarga.
                    fetchConversations(debouncedSearchTerm);
                }
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') {
                    console.log(`[ListaConversaciones Realtime] Suscrito exitosamente al canal: ${channelName}`);
                } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
                    console.error(`[ListaConversaciones Realtime] Error de suscripción o timeout en canal ${channelName}:`, err);
                    setError(prevError => prevError ? `${prevError}\nError de Realtime (Lista): ${status}` : `Error de Realtime (Lista): ${status}`);
                } else if (status === 'CLOSED') {
                    console.log(`[ListaConversaciones Realtime] Canal cerrado: ${channelName}`);
                } else {
                    console.log(`[ListaConversaciones Realtime] Estado del canal ${channelName}: ${status}`);
                }
            });

        return () => {
            if (supabaseLista && channel) {
                console.log(`[ListaConversaciones Realtime] Desuscribiéndose del canal: ${channelName}`);
                supabaseLista.removeChannel(channel).catch(error => {
                    console.error(`[ListaConversaciones Realtime] Error al remover canal ${channelName}:`, error);
                });
            }
        };
    }, [negocioId, fetchConversations, debouncedSearchTerm]); // Incluir dependencias relevantes

    const handleRefresh = () => {
        fetchConversations(debouncedSearchTerm);
    };

    const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}/crm/conversaciones`;

    const getStatusColor = (status: string) => {
        switch (status?.toLowerCase()) {
            case 'abierta': return 'bg-green-500';
            case 'en_espera_agente': return 'bg-amber-500';
            case 'hitl': return 'bg-sky-500';
            case 'cerrada': return 'bg-zinc-600';
            default: return 'bg-zinc-500';
        }
    };

    return (
        <div
            className="p-3 flex flex-col h-full max-h-[800px] overflow-y-auto"
        >
            <div className="mb-3 flex-shrink-0">
                <div className="flex justify-between items-center mb-1 px-1">
                    <h3 className="text-lg font-semibold text-zinc-100">Conversaciones</h3>
                    <button
                        onClick={handleRefresh}
                        disabled={isLoading && conversations.length > 0} // Deshabilitar solo si está cargando pero ya hay datos (evitar parpadeo)
                        className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50"
                        title="Actualizar lista"
                    >
                        <RefreshCw size={16} className={isLoading && conversations.length > 0 ? "animate-spin" : ""} />
                    </button>
                </div>
                <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                        <Search size={16} className="text-zinc-500" />
                    </div>
                    <input
                        type="text"
                        placeholder="Buscar por nombre de lead..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-10 pr-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-blue-500 focus:border-blue-500 text-sm"
                    />
                </div>
            </div>

            {isLoading && conversations.length === 0 && ( // Mostrar spinner solo en carga inicial absoluta
                <div className="flex-grow flex items-center justify-center">
                    <Loader2 size={24} className="animate-spin text-zinc-400" />
                </div>
            )}
            {!isLoading && error && (
                <div className="flex-grow flex flex-col items-center justify-center text-red-400 p-3 text-center">
                    <p className="font-medium">Error al cargar:</p>
                    <p className="text-sm">{error}</p>
                    <button onClick={handleRefresh} className="mt-2 text-xs text-blue-400 hover:underline">Intentar de nuevo</button>
                </div>
            )}
            {!isLoading && !error && conversations.length === 0 && (
                <div className="flex-grow flex flex-col items-center justify-center text-zinc-500 p-3 text-center">
                    <Inbox size={40} className="mb-2" />
                    <p>{debouncedSearchTerm ? 'No hay conversaciones que coincidan.' : 'No hay conversaciones activas.'}</p>
                </div>
            )}
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
                                    <div className="relative flex-shrink-0">
                                        {conv.avatarUrl ? (
                                            <Image
                                                src={conv.avatarUrl}
                                                alt={conv.leadName}
                                                width={36}
                                                height={36}
                                                className="w-9 h-9 rounded-full object-cover border border-zinc-600"
                                            />
                                        ) : (
                                            <div className="w-9 h-9 rounded-full bg-zinc-600 flex items-center justify-center text-zinc-300 text-sm font-medium">
                                                {conv.leadName?.substring(0, 2).toUpperCase() || '??'}
                                            </div>
                                        )}
                                        <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-zinc-800 ${getStatusColor(conv.status)}`} />
                                    </div>
                                    <div className="flex-grow overflow-hidden">
                                        <div className="flex justify-between items-center">
                                            <h4 className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-zinc-200'}`}>{conv.leadName}</h4>
                                        </div>
                                        <p className={`text-xs truncate ${isActive ? 'text-zinc-300' : 'text-zinc-400'}`}>{conv.lastMessagePreview}</p>
                                    </div>
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