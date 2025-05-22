'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ChatComponent from './ChatComponent';
import ToolsPanel from './ToolsPanel';

// --- NUEVAS IMPORTS ---
import { obtenerDetallesConversacionAction } from '@/app/admin/_lib/actions/conversacion/conversacion.actions'; // Nueva ruta
import type { ConversationDetailsForPanelData } from '@/app/admin/_lib/actions/conversacion/conversacion.schemas'; // Nuevo tipo de Zod

interface Props {
  clienteId: string;
  negocioId: string;
  conversacionId: string;
}

export default function ConversacionDetalle({ clienteId, negocioId, conversacionId }: Props) {
  const [refreshChatTrigger, setRefreshChatTrigger] = useState(0);
  // Usar el nuevo tipo inferido de Zod
  const [pageTitleData, setPageTitleData] = useState<ConversationDetailsForPanelData | null>(null);
  const [isTitleDataLoading, setIsTitleDataLoading] = useState(true);
  const [errorPageTitle, setErrorPageTitle] = useState<string | null>(null); // Estado para errores específicos de esta carga

  const handleForceChatRefresh = useCallback(() => {
    setRefreshChatTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isActive = true;
    if (conversacionId) {
      setIsTitleDataLoading(true);
      setErrorPageTitle(null); // Limpiar error anterior

      // Llamar a la nueva action con el parámetro encapsulado
      obtenerDetallesConversacionAction({ conversacionId }).then(result => {
        if (isActive) {
          if (result.success && result.data) {
            setPageTitleData(result.data);
          } else {
            setPageTitleData(null);
            setErrorPageTitle(result.error || "No se pudieron cargar los datos para el título.");
            console.error("Error al cargar datos para título:", result.error);
          }
          setIsTitleDataLoading(false);
        }
      });
    } else {
      setPageTitleData(null);
      setIsTitleDataLoading(false);
    }
    return () => {
      isActive = false;
    };
  }, [conversacionId]);

  useEffect(() => {
    let newTitle = "Conversaciones - CRM";

    if (conversacionId) {
      if (isTitleDataLoading) {
        newTitle = "Cargando Chat...";
      } else if (pageTitleData && pageTitleData.leadNombre) {
        newTitle = `Chat con ${pageTitleData.leadNombre}`;
      } else if (errorPageTitle) {
        newTitle = "Error al cargar Chat";
      }
      else {
        newTitle = "Chat";
      }
    }
    // console.log(`[TitleEffect Set] Estableciendo título a: "${newTitle}"`); // Reducir verbosidad del log
    document.title = newTitle;
  }, [conversacionId, pageTitleData, isTitleDataLoading, errorPageTitle]);

  // Si hay un error cargando los datos esenciales para el título, podrías mostrar un mensaje de error más prominente.
  // Por ahora, el componente principal se renderizará y el título reflejará el estado de carga/error.

  return (
    <div className="flex h-full gap-4 md:gap-4">
      <div
        className="flex-grow flex flex-col bg-zinc-800 rounded-lg border border-zinc-700 overflow-hidden shadow-md"
      // Quitado style={{ flexBasis: '0', minWidth: '60%' }} para que flex-grow funcione sin restricciones fijas de base,
      // a menos que tengas una razón específica para el flex-basis 0.
      // El layout padre (LayoutConversaciones) ya usa flex-1 para esta área.
      >
        <ChatComponent
          conversacionId={conversacionId}
          negocioId={negocioId} // ChatComponent podría necesitarlo para enviar mensajes con contexto de asistente
          refreshTrigger={refreshChatTrigger}
        // Podrías pasarle pageTitleData.agenteCrmActual si ChatComponent necesita saber el agente
        // agenteActual={pageTitleData?.agenteCrmActual || null}
        />
      </div>

      <aside
        className="w-[300px] md:max-w-sm lg:max-w-md xl:max-w-lg flex-shrink-0 bg-zinc-800 rounded-lg border border-zinc-700 p-4 overflow-y-auto shadow-md"
      // Ajustado el ancho para ser más flexible con max-w-* en lugar de porcentajes fijos
      // Quitado style={{ flexBasis: '0', minWidth: '300px' }} por la misma razón.
      // El layout padre es flex, por lo que se ajustará.
      >
        <ToolsPanel
          conversacionId={conversacionId}
          negocioId={negocioId} // ToolsPanel podría necesitarlo
          clienteId={clienteId} // ToolsPanel podría necesitarlo
          onActionComplete={handleForceChatRefresh}
        // Pasar los detalles iniciales de la conversación al ToolsPanel
        // para evitar que ToolsPanel tenga que hacer su propia llamada inicial para los mismos datos.
        // Esto es opcional y depende de cómo esté estructurado ToolsPanel.
        // initialConversationDetails={pageTitleData}
        // isLoadingConversationDetails={isTitleDataLoading}
        />
      </aside>
    </div>
  );
}