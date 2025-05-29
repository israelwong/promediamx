// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/components/ListaConversaciones.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { Search, Loader2, Inbox, RefreshCw, MessageSquare, Filter, ChevronDown, Bot, Globe } from 'lucide-react';
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js';
import Image from 'next/image';

// Asegúrate que la ruta a las acciones y schemas sea la correcta
import { listarConversacionesAction } from '@/app/admin/_lib/actions/conversacion/conversacion.actions';
import type { ConversacionPreviewItemData, ListarConversacionesParams } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

import { obtenerPipelinesCrmAction } from '@/app/admin/_lib/actions/pipelineCrm/pipelineCrm.actions';
import { useDebounce } from '@/app/admin/_lib/hooks/useDebounce'; // Asumo que esta ruta es correcta

interface PipelineSimple { id: string; nombre: string; }
interface ListaConversacionesProps { negocioId: string; clienteId: string; }

// --- Iconos de Canal ---
const WhatsAppIcon = () => (<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="currentColor" className="text-green-500 flex-shrink-0"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z" /></svg>);
const WebchatIcon = () => <MessageSquare size={16} className="text-blue-400 flex-shrink-0" />;
const OtherChannelIcon = () => <Globe size={16} className="text-gray-400 flex-shrink-0" />;
// --- Fin Iconos de Canal ---

let supabaseLista: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (supabaseUrl && supabaseAnonKey) {
        supabaseLista = createClient(supabaseUrl, supabaseAnonKey);
    } else {
        console.warn("[ListaConversaciones] Supabase no configurado para Realtime.");
    }
}

export default function ListaConversaciones({ negocioId, clienteId }: ListaConversacionesProps) {
    const [conversations, setConversations] = useState<ConversacionPreviewItemData[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [searchTerm, setSearchTerm] = useState('');
    const debouncedSearchTerm = useDebounce(searchTerm, 500);
    const [filtroStatus, setFiltroStatus] = useState<ListarConversacionesParams['filtroStatus']>('activas');
    const [filtroPipelineId, setFiltroPipelineId] = useState<string>('all');
    const [pipelinesDisponibles, setPipelinesDisponibles] = useState<PipelineSimple[]>([]);
    const [isLoadingPipelines, setIsLoadingPipelines] = useState(true);

    const params = useParams();
    // const pathname = usePathname(); // No es estrictamente necesario si activeConversationId funciona bien
    const activeConversationId = params?.conversacionId as string || '';

    const fetchConversations = useCallback(async () => {
        if (!negocioId) {
            setError("ID de negocio no proporcionado para listar conversaciones.");
            setIsLoading(false);
            setConversations([]);
            return;
        }

        // Mostrar spinner solo si es la carga inicial y no hay error previo
        // o si estamos recargando explícitamente una lista vacía.
        if (conversations.length === 0 && !error) {
            setIsLoading(true);
        }

        const paramsForAction: ListarConversacionesParams = {
            negocioId,
            searchTerm: debouncedSearchTerm || null, // Enviar null si está vacío
            filtroStatus,
            filtroPipelineId: filtroPipelineId === 'all' ? null : filtroPipelineId,
        };

        const result = await listarConversacionesAction(paramsForAction);

        if (result.success && result.data) {
            setConversations(result.data);
            setError(null);
        } else {
            setError(result.error || 'No se pudieron cargar las conversaciones.');
            setConversations([]);
        }
        setIsLoading(false);
    }, [negocioId, debouncedSearchTerm, filtroStatus, filtroPipelineId, error, conversations.length]);

    useEffect(() => {
        async function loadPipelines() {
            if (!negocioId) return;
            setIsLoadingPipelines(true);
            const result = await obtenerPipelinesCrmAction(negocioId); // Asume que el param es solo negocioId
            if (result.success && result.data) {
                // Asegurarse que el mapeo sea correcto si el tipo de result.data es diferente
                setPipelinesDisponibles(result.data.map(p => ({ id: p.id, nombre: p.nombre })));
            } else {
                console.error("Error cargando pipelines:", result.error);
            }
            setIsLoadingPipelines(false);
        }
        loadPipelines();
    }, [negocioId]);

    useEffect(() => {
        // Cargar conversaciones al montar y cuando cambien las dependencias de fetchConversations
        fetchConversations();
    }, [fetchConversations]); // fetchConversations ya tiene sus propias dependencias

    useEffect(() => {
        if (!supabaseLista || !negocioId) return;

        const conversacionChannelName = `crm-lista-conversaciones-updates-${negocioId}`;
        const interaccionChannelName = `crm-lista-interacciones-updates-${negocioId}`;

        let conversacionSubscription: RealtimeChannel | null = null;
        let interaccionSubscription: RealtimeChannel | null = null;

        const handleDbChange = (payload: import('@supabase/supabase-js').RealtimePostgresChangesPayload<Record<string, unknown>>) => {
            console.log(`[ListaConversaciones Realtime] Cambio detectado en ${payload.table} para negocio ${negocioId}:`, payload);
            // Aquí podrías añadir una lógica más inteligente para solo recargar
            // si el cambio realmente afecta a este negocioId, si el payload lo permite.
            // Por ahora, un refetch es lo más simple.
            fetchConversations();
        };

        conversacionSubscription = supabaseLista.channel(conversacionChannelName)
            .on('postgres_changes',
                { event: '*', schema: 'public', table: 'Conversacion' /*, filter: `negocioId=eq.${negocioId}` // Si tu tabla Conversacion tiene negocioId directo */ },
                handleDbChange
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log(`[CRM Lista] Suscrito a ${conversacionChannelName}`);
                else if (err) console.error(`[CRM Lista] Error canal ${conversacionChannelName}:`, err);
            });

        interaccionSubscription = supabaseLista.channel(interaccionChannelName)
            .on('postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'Interaccion' /* Aquí el filtro por negocioId es más complejo, necesitaría un join o un campo negocioId en Interaccion */ },
                handleDbChange
            )
            .subscribe((status, err) => {
                if (status === 'SUBSCRIBED') console.log(`[CRM Lista] Suscrito a ${interaccionChannelName}`);
                else if (err) console.error(`[CRM Lista] Error canal ${interaccionChannelName}:`, err);
            });

        return () => {
            if (supabaseLista) {
                if (conversacionSubscription) supabaseLista.removeChannel(conversacionSubscription).catch(console.error);
                if (interaccionSubscription) supabaseLista.removeChannel(interaccionSubscription).catch(console.error);
            }
        };
    }, [negocioId, fetchConversations]); // Se incluye fetchConversations para que el efecto se re-ejecute si cambia

    const handleRefresh = () => {
        fetchConversations();
    };

    const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}/crm/conversaciones`;

    const getStatusColor = (status: string | null | undefined): string => {
        const s = status?.toLowerCase();
        if (s === 'abierta') return 'bg-green-500';
        if (s === 'en_espera_agente' || s === 'hitl_activo') return 'bg-amber-500';
        if (s === 'cerrada') return 'bg-zinc-600';
        if (s === 'archivada') return 'bg-gray-400';
        return 'bg-zinc-500';
    };

    const getChannelDisplayIcon = (canalOrigen: ConversacionPreviewItemData['canalOrigen'], canalIconoDb?: string | null) => {
        if (canalIconoDb) {
            const iconKey = canalIconoDb.toLowerCase();
            if (iconKey.includes('bot') || iconKey.includes('asistente') || iconKey.includes('ia'))
                return <Bot size={16} className="text-sky-400 flex-shrink-0" />;
            if (iconKey.includes('whatsapp')) return <WhatsAppIcon />;
            if (iconKey.includes('web') || iconKey.includes('chat')) return <WebchatIcon />;
            // Añade más mapeos de string a icono aquí si es necesario
            return <Globe size={16} className="text-gray-400 flex-shrink-0" />;
        }
        if (canalOrigen === 'whatsapp') return <WhatsAppIcon />;
        if (canalOrigen === 'webchat') return <WebchatIcon />;
        return <OtherChannelIcon />;
    };

    return (
        <div className="p-3 flex flex-col h-full max-h-[calc(100vh-var(--admin-header-height,70px)-var(--admin-page-padding,40px))] overflow-hidden"> {/* Ajusta Xpx */}
            <div className="mb-3 flex-shrink-0">
                <div className="flex justify-between items-center mb-1 px-1">
                    <h3 className="text-lg font-semibold text-zinc-100">Conversaciones</h3>
                    <button onClick={handleRefresh} disabled={isLoading && conversations.length === 0} className="p-1.5 text-zinc-400 hover:text-zinc-100 rounded-md hover:bg-zinc-700 focus:outline-none focus:ring-1 focus:ring-blue-500 disabled:opacity-50" title="Actualizar lista">
                        <RefreshCw size={16} className={isLoading && conversations.length === 0 ? "animate-spin" : ""} />
                    </button>
                </div>
                <div className="relative mt-1">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none"><Search size={16} className="text-zinc-500" /></div>
                    <input type="text" placeholder="Buscar por nombre, email, teléfono..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full pl-10 pr-3 py-2 rounded-md bg-zinc-900 border border-zinc-700 text-zinc-300 focus:ring-blue-500 focus:border-blue-500 text-sm" />
                </div>
                <div className="mt-3 flex flex-wrap items-center gap-2 md:gap-4 text-xs border-b border-zinc-700 pb-3 mb-3">
                    <div>
                        <div className="flex items-center gap-1 border border-zinc-700 rounded-md p-0.5">
                            <button
                                onClick={() => setFiltroStatus('activas')}
                                className={`px-2.5 py-1 rounded ${filtroStatus === 'activas' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:bg-zinc-700/50'}`}>
                                Activas
                            </button>
                            <button
                                onClick={() => setFiltroStatus('archivadas')}
                                className={`px-2.5 py-1 rounded ${filtroStatus === 'archivadas' ? 'bg-zinc-600 text-white' : 'text-zinc-400 hover:bg-zinc-700/50'}`}>
                                Archivadas
                            </button>
                        </div>
                    </div>
                    <div className="relative flex-grow">
                        <label htmlFor="pipelineFilter" className="sr-only">Pipeline</label>
                        <div className="absolute inset-y-0 left-0 pl-2 flex items-center pointer-events-none">
                            <Filter size={14} className="text-zinc-500" />
                        </div>
                        <select
                            id="pipelineFilter"
                            value={filtroPipelineId}
                            onChange={(e) => setFiltroPipelineId(e.target.value)}
                            disabled={isLoadingPipelines || pipelinesDisponibles.length === 0}
                            className="w-full text-xs pl-7 pr-8 py-1.5 rounded-md appearance-none bg-zinc-800 border border-zinc-700 text-zinc-300 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70">
                            <option value="all">Todo Pipeline</option>
                            {pipelinesDisponibles.map(p => (
                                <option key={p.id} value={p.id}>{p.nombre}</option>
                            ))}
                        </select>
                        <ChevronDown size={16} className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none" />
                        {isLoadingPipelines && (
                            <Loader2 size={14} className="absolute right-7 top-1/2 -translate-y-1/2 animate-spin text-zinc-400" />
                        )}
                    </div>
                </div>
            </div>

            <div className="flex-grow overflow-y-auto pr-1 -mr-1 custom-scrollbar">
                {isLoading && conversations.length === 0 && !error && (<div className="flex-grow flex items-center justify-center min-h-[200px]"><Loader2 size={24} className="animate-spin text-zinc-400" /></div>)}
                {!isLoading && error && (<div className="flex-grow flex flex-col items-center justify-center text-red-400 p-3 text-center min-h-[200px]"><p className="font-medium">Error:</p><p className="text-sm">{error}</p><button onClick={handleRefresh} className="mt-2 text-xs text-blue-400 hover:underline">Reintentar</button></div>)}
                {!isLoading && !error && conversations.length === 0 && (
                    <div className="flex-grow flex flex-col items-center justify-center text-zinc-500 p-3 text-center min-h-[200px]">
                        <Inbox size={40} className="mb-2" />
                        <p>
                            {
                                debouncedSearchTerm || filtroPipelineId !== 'all' || filtroStatus !== 'activas' ?
                                    'No hay conversaciones que coincidan con los filtros.' :
                                    (filtroStatus === 'activas' ?
                                        'No hay conversaciones archivadas.' :
                                        'No hay conversaciones activas.')}
                        </p>
                    </div>
                )}

                {!isLoading && !error && conversations.length > 0 && (
                    <ul className="space-y-1">
                        {conversations.map((conv) => {
                            const isActive = activeConversationId === conv.id;
                            return (
                                <li key={conv.id}>
                                    <Link href={`${basePath}/${conv.id}`} className={`block p-2.5 rounded-md transition-colors ${isActive ? 'bg-zinc-700 shadow-md' : 'hover:bg-zinc-700/60'}`}>
                                        <div className="flex items-center gap-3">
                                            <div className="relative flex-shrink-0">
                                                {conv.avatarUrl ? (
                                                    <Image src={conv.avatarUrl} alt={conv.leadName || 'Avatar'} width={36} height={36} className="w-9 h-9 rounded-full object-cover border border-zinc-600" />
                                                ) : (
                                                    <div className="w-9 h-9 rounded-full bg-zinc-600 flex items-center justify-center text-zinc-300 text-sm font-medium">
                                                        {conv.leadName?.substring(0, 2).toUpperCase() || '??'}
                                                    </div>
                                                )}
                                                <span className={`absolute bottom-0 right-0 block h-2.5 w-2.5 rounded-full ring-2 ring-zinc-800 ${getStatusColor(conv.status)}`} title={`Estado: ${conv.status}`} />
                                            </div>
                                            <div className="flex-grow overflow-hidden">
                                                <div className="flex justify-between items-start"> {/* items-start para alinear tiempo a la derecha si el texto es largo */}
                                                    <h4 className={`text-sm font-medium truncate ${isActive ? 'text-white' : 'text-zinc-200'}`}>{conv.leadName}</h4>
                                                    <span className={`text-xs flex-shrink-0 ml-2 ${isActive ? 'text-zinc-300' : 'text-zinc-500'}`}>
                                                        {new Date(conv.lastMessageTimestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center gap-1.5 text-xs mt-0.5">
                                                    <span className="flex-shrink-0" title={`Canal: ${conv.canalOrigen || 'Desconocido'}`}>
                                                        {getChannelDisplayIcon(conv.canalOrigen, conv.canalIcono)}
                                                    </span>
                                                    <p className={`truncate ${isActive ? 'text-zinc-300' : 'text-zinc-400'}`}>{conv.lastMessagePreview}</p>
                                                </div>
                                            </div>
                                        </div>
                                    </Link>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}
