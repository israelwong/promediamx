// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ConversacionDetalle.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react'; // Asegúrate de importar useState
import { useRouter } from 'next/navigation'; // useRouter para el refresh
import ChatComponent from './ChatComponent';
import ToolsPanel from './ToolsPanel';

import type {
  ConversationDetailsForPanelData,
  ChatMessageItemCrmData,
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
// Necesitamos el schema Zod para parsear el payload de Realtime
import { conversacionDetailsForPanelSchema } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';

import { MessageSquareWarning, Loader2 } from 'lucide-react'; // Importar Loader2
import { createClient, SupabaseClient, RealtimeChannel } from '@supabase/supabase-js'; // Supabase

interface ConversacionDetalleProps {
  clienteId: string;
  negocioId: string;
  conversacionId: string; // ID de la conversación actual, crucial para el filtro de Realtime
  initialConversationDetails: ConversationDetailsForPanelData | null;
  initialMessages: ChatMessageItemCrmData[];
  initialError?: string | null;
}

// Supabase client (igual que en ChatComponent)
let supabase: SupabaseClient | null = null;
if (typeof window !== 'undefined') {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (supabaseUrl && supabaseAnonKey) {
    supabase = createClient(supabaseUrl, supabaseAnonKey);
  } else {
    console.warn("[ConversacionDetalle V2] Supabase URL o Anon Key no definidas.");
  }
}

export default function ConversacionDetalle({
  clienteId,
  negocioId,
  conversacionId, // Usaremos este para la suscripción
  initialConversationDetails,
  initialMessages,
  initialError,
}: ConversacionDetalleProps) {

  // --- ESTADO PARA LOS DETALLES DE LA CONVERSACIÓN, MANEJADO AQUÍ ---
  const [currentDetails, setCurrentDetails] =
    useState<ConversationDetailsForPanelData | null>(initialConversationDetails);

  // --- EFECTO PARA ACTUALIZAR EL ESTADO SI LAS PROPS INICIALES CAMBIAN ---
  useEffect(() => {
    console.log("[ConversacionDetalle V2] Props iniciales cambiaron, actualizando currentDetails. Nuevo ID:", initialConversationDetails?.id);
    setCurrentDetails(initialConversationDetails);

    // Actualizar título del documento
    let newTitle = "Chat";
    if (initialConversationDetails?.leadNombre) newTitle = `Chat con ${initialConversationDetails.leadNombre}`;
    else if (initialConversationDetails?.id) newTitle = `Conversación ${initialConversationDetails.id.substring(0, 8)}...`;
    else if (initialError) newTitle = "Error al Cargar Chat";
    document.title = newTitle;
  }, [initialConversationDetails, initialError]);


  // --- LISTENER DE REALTIME PARA ACTUALIZACIONES DE LA TABLA 'Conversacion' ---
  useEffect(() => {
    // Solo suscribirse si tenemos un conversacionId válido
    if (!supabase || !conversacionId) {
      console.log(`[ConversacionDetalle Realtime] No se suscribe. Supabase: ${!!supabase}, ConvID: ${conversacionId}`);
      return;
    }

    const channelName = `db-conversacion-update-${conversacionId}`; // Nombre de canal único
    console.log(`[ConversacionDetalle Realtime] Suscribiendo a ${channelName} para UPDATES en tabla 'Conversacion'`);

    const channel: RealtimeChannel = supabase.channel(channelName)
      .on<ConversationDetailsForPanelData>( // El tipo aquí es lo que esperas en payload.new
        'postgres_changes',
        {
          event: 'UPDATE',
          schema: 'public',
          table: 'Conversacion',
          filter: `id=eq.${conversacionId}`
        },
        (payload) => {
          console.log("[ConversacionDetalle Realtime-Conv] Payload UPDATE CONVERSACION recibido:", payload);
          if (payload.new && payload.new.id === conversacionId) {
            // Validar y parsear el payload.new con tu schema Zod
            // payload.new viene directamente de la BD, así que updatedAt será string
            const parsedDetails = conversacionDetailsForPanelSchema.safeParse(payload.new);

            if (parsedDetails.success) {
              const newDetailsFromRealtime = parsedDetails.data;
              setCurrentDetails(prevDetails => {
                // Solo actualizar si realmente hay cambios para evitar bucles o renders innecesarios
                if (!prevDetails ||
                  prevDetails.status !== newDetailsFromRealtime.status ||
                  (newDetailsFromRealtime.updatedAt && prevDetails.updatedAt && // Asegurarse que ambos existan para comparar
                    new Date(newDetailsFromRealtime.updatedAt).getTime() > new Date(prevDetails.updatedAt).getTime()) ||
                  (newDetailsFromRealtime.updatedAt && !prevDetails.updatedAt) // Si antes no había updatedAt
                ) {
                  console.log(`[ConversacionDetalle Realtime-Conv] Actualizando currentDetails por Realtime. Nuevo status: ${newDetailsFromRealtime.status}, Prev status: ${prevDetails?.status}`);
                  return newDetailsFromRealtime;
                }
                // console.log("[ConversacionDetalle Realtime-Conv] Sin cambios relevantes en status o updatedAt para aplicar desde Realtime.");
                return prevDetails;
              });
            } else {
              console.warn("[ConversacionDetalle Realtime-Conv] Error Zod parseando payload.new de Conversacion:", parsedDetails.error.flatten().fieldErrors, "Raw payload.new:", payload.new);
            }
          } else {
            console.log("[ConversacionDetalle Realtime-Conv] Payload de update no es para la conversación actual o no tiene 'new' data.");
          }
        }
      )
      .subscribe((status, err) => {
        if (status === 'SUBSCRIBED') {
          console.log(`[ConversacionDetalle Realtime-Conv] Suscrito exitosamente a ${channelName}`);
        } else if (err) {
          console.error(`[ConversacionDetalle Realtime-Conv] Error en canal ${channelName}:`, err);
        } else {
          console.log(`[ConversacionDetalle Realtime-Conv] Estado del canal ${channelName}: ${status}`);
        }
      });

    return () => {
      if (supabase && channel) {
        console.log(`[ConversacionDetalle Realtime-Conv] Desuscribiendo de ${channelName}`);
        supabase.removeChannel(channel).catch(e => console.error(`[ConversacionDetalle Realtime-Conv] Error al remover canal ${channelName}:`, e));
      }
    };
  }, [conversacionId]); // La dependencia principal es el ID de la conversación

  const router = useRouter();
  const handleActionCompleteInToolsPanel = useCallback(() => {
    console.log("[ConversacionDetalle] ToolsPanel onActionComplete: Refrescando datos del servidor (router.refresh).");
    router.refresh();
  }, [router]);

  // Lógica de renderizado si los datos iniciales no llegan o hay error
  if (!initialConversationDetails && !initialError && !currentDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4">
        <Loader2 size={48} className="text-zinc-400 animate-spin mb-4" />
        <p className="text-zinc-500">Cargando detalles de la conversación...</p>
      </div>
    );
  }

  if (!currentDetails && initialError) { // Si hubo un error al cargar los datos iniciales
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-zinc-800 rounded-lg border border-zinc-700">
        <MessageSquareWarning size={64} className="text-red-500 mb-6" />
        <h2 className="text-2xl font-semibold text-red-400 mb-2">Error al Cargar Datos</h2>
        <p className="text-zinc-400 max-w-md">{initialError}</p>
      </div>
    );
  }

  // Si currentDetails es null después de todo (ej. la conversación no existe y no hubo error inicial)
  if (!currentDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-zinc-800 rounded-lg border border-zinc-700">
        <MessageSquareWarning size={64} className="text-amber-500 mb-6" />
        <h2 className="text-2xl font-semibold text-amber-400 mb-2">Conversación no encontrada</h2>
        <p className="text-zinc-400 max-w-md">
          No se pudieron cargar los detalles para esta conversación. Puede que el ID no sea válido o haya sido eliminada.
        </p>
      </div>
    );
  }

  // Si llegamos aquí, currentDetails (manejado por este componente y Realtime) SÍ tiene datos.
  return (
    <div className="flex h-full gap-4 md:gap-4">
      <div className="flex-grow flex flex-col bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden shadow-md">
        <ChatComponent
          conversationDetails={currentDetails} // <--- PASAR EL ESTADO ACTUALIZABLE
          initialConversationDetails={initialConversationDetails}
          initialMessages={initialMessages}
          initialError={initialError}
          negocioId={negocioId}
        />
      </div>
      <aside className="w-[300px] md:w-[350px] lg:w-[400px] xl:max-w-md flex-shrink-0 bg-zinc-800 rounded-lg border border-zinc-700 p-4 overflow-y-auto shadow-md custom-scrollbar">
        <ToolsPanel
          negocioId={negocioId}
          clienteId={clienteId}
          onActionComplete={handleActionCompleteInToolsPanel}
          conversationDetails={currentDetails} // <--- PASAR EL ESTADO ACTUALIZABLE
        />
      </aside>
    </div>
  );
}