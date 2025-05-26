// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ConversacionDetalle.tsx
'use client';

import React, { useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation'; // Importar useRouter si ToolsPanel lo necesita indirectamente para refresh
import ChatComponent from './ChatComponent';
import ToolsPanel from './ToolsPanel';

import type {
  ConversationDetailsForPanelData,
  ChatMessageItemCrmData
} from '@/app/admin/_lib/actions/conversacion/conversacion.schemas';
import { MessageSquareWarning } from 'lucide-react'; // Para estados de carga/error

interface ConversacionDetalleProps {
  clienteId: string;
  negocioId: string;
  conversacionId: string; // Sigue siendo útil para pasar a ToolsPanel y como key
  initialConversationDetails: ConversationDetailsForPanelData | null;
  initialMessages: ChatMessageItemCrmData[];
  initialError?: string | null; // Error general de carga (de detalles o mensajes)
}

export default function ConversacionDetalle({
  clienteId,
  negocioId,
  // conversacionId,
  initialConversationDetails,
  initialMessages,
  initialError,
}: ConversacionDetalleProps) {

  console.log(initialConversationDetails)

  // El estado del título del documento se maneja con lo que viene de las props
  useEffect(() => {
    let newTitle = "Chat"; // Título por defecto si no hay detalles
    if (initialConversationDetails?.leadNombre) {
      newTitle = `Chat con ${initialConversationDetails.leadNombre}`;
    } else if (initialConversationDetails) { // Si hay detalles pero no nombre del lead
      newTitle = `Conversación ${initialConversationDetails.id.substring(0, 8)}...`;
    } else if (initialError) { // Si hubo un error cargando los detalles desde el padre
      newTitle = "Error al Cargar Chat";
    }
    // Si initialConversationDetails es null y no hay initialError, podría significar que aún está cargando en el padre,
    // o que es un estado inválido. El padre page.tsx ya maneja el renderizado de error si no hay initialConversationDetails.
    document.title = newTitle;
  }, [initialConversationDetails, initialError]);

  const router = useRouter(); // Para el refresh si ToolsPanel lo necesita

  const handleActionCompleteInToolsPanel = useCallback(() => {
    // Cuando una acción en ToolsPanel (ej. asignar agente, cambiar status) se completa,
    // queremos que los datos se refresquen. router.refresh() re-ejecuta el Server Component padre.
    console.log("[ConversacionDetalle] Acción completada en ToolsPanel. Refrescando datos...");
    router.refresh();
  }, [router]);


  // Si initialConversationDetails es null, significa que el Server Component padre
  // no pudo cargarlos. El padre ya debería haber renderizado un mensaje de error.
  // Sin embargo, añadimos un fallback aquí por si acaso.
  if (!initialConversationDetails) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-zinc-800 rounded-lg border border-zinc-700">
        <MessageSquareWarning size={64} className="text-red-500 mb-6" />
        <h2 className="text-2xl font-semibold text-red-400 mb-2">Error al Cargar Datos</h2>
        <p className="text-zinc-400 max-w-md">
          {initialError || "No se pudieron obtener los detalles de la conversación para mostrar el chat."}
        </p>
      </div>
    );
  }

  // Si llegamos aquí, initialConversationDetails SÍ tiene datos.
  // Pasamos estos datos directamente a ChatComponent.
  return (
    <div className="flex h-full gap-4 md:gap-4">
      <div
        className="flex-grow flex flex-col bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden shadow-md"
      >
        <ChatComponent
          initialConversationDetails={initialConversationDetails}
          initialMessages={initialMessages}
          initialError={initialError} // Pasar el error de mensajes si lo hubo
          negocioId={negocioId}
        />
      </div>

      <aside
        className="w-[300px] md:w-[350px] lg:w-[400px] xl:max-w-md flex-shrink-0 bg-zinc-800 rounded-lg border border-zinc-700 p-4 overflow-y-auto shadow-md custom-scrollbar"
      >
        <ToolsPanel
          // conversacionId={conversacionId}
          negocioId={negocioId}
          clienteId={clienteId}
          onActionComplete={handleActionCompleteInToolsPanel}
          conversationDetails={initialConversationDetails}
        />
      </aside>
    </div>
  );
}