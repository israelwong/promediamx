'use client';

import React, { useState, useCallback, useEffect } from 'react';
import ChatComponent from '../components/ChatComponent';
import ToolsPanel from '../components/ToolsPanel';
import { obtenerDetallesConversacionParaPanelAction } from '@/app/admin/_lib/crmConversacion.actions';
import { ConversationDetailsForPanel } from '@/app/admin/_lib/crmConversacion.types';

interface Props {
  clienteId: string;
  negocioId: string;
  conversacionId: string;
}

export default function ConversacionDetalle({ clienteId, negocioId, conversacionId }: Props) {

  const [refreshChatTrigger, setRefreshChatTrigger] = useState(0);
  const [pageTitleData, setPageTitleData] = useState<ConversationDetailsForPanel | null>(null);
  const [isTitleDataLoading, setIsTitleDataLoading] = useState(true);

  const handleForceChatRefresh = useCallback(() => {
    // console.log("[ConversationDetailPage] Forzando refresco del chat...");
    setRefreshChatTrigger(prev => prev + 1);
  }, []);

  useEffect(() => {
    let isActive = true;
    if (conversacionId) {

      setIsTitleDataLoading(true); // Indicar que estamos cargando datos para el título
      // console.log(`[TitleEffect Fetch] Iniciando carga para conversacionId: ${conversacionId}`);
      obtenerDetallesConversacionParaPanelAction(conversacionId).then(result => {
        if (isActive) {
          if (result.success && result.data) {
            // console.log("[TitleEffect Fetch] Datos para título cargados:", result.data);
            setPageTitleData(result.data);
          } else {
            console.error("[TitleEffect Fetch] Error al cargar detalles para el título:", result.error);
            setPageTitleData(null);
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
      // console.log("[TitleEffect Fetch] Cleanup - isActive=false");
    };
  }, [conversacionId]);

  useEffect(() => {
    let newTitle = "Conversaciones - CRM"; // Título por defecto para la sección

    if (conversacionId) { // Estamos en una página de conversación específica
      if (isTitleDataLoading) {
        newTitle = "Cargando Chat... - CRM";
      } else if (pageTitleData && pageTitleData.leadNombre) {
        newTitle = `Chat con ${pageTitleData.leadNombre} - CRM`;
      } else {
        newTitle = "Chat - CRM"; // Si no hay nombre de lead o falló la carga
      }
    }

    console.log(`[TitleEffect Set] Estableciendo título a: "${newTitle}" (isTitleDataLoading: ${isTitleDataLoading}, pageTitleData: ${JSON.stringify(pageTitleData)})`);
    document.title = newTitle;

    // Opcional: Limpieza al desmontar el componente.
    // Esto es útil si quieres que el título vuelva a un estado más general
    // cuando el usuario navega fuera de esta página específica.
    // return () => {
    //   console.log("[TitleEffect Set] Cleanup - Restableciendo título a un valor general (ej. Panel CRM)");
    //   document.title = "Panel CRM"; // O el título de tu aplicación/layout padre
    // };
  }, [conversacionId, pageTitleData, isTitleDataLoading]);

  return (
    <div className="flex h-full gap-4 md:gap-6">
      <div
        className="
          flex-grow flex flex-col bg-zinc-800 rounded-lg
          border border-zinc-700 overflow-hidden shadow-md 
        "
        style={{ flexBasis: '0', minWidth: '60%' }}
      >
        <ChatComponent
          conversacionId={conversacionId}
          negocioId={negocioId}
          refreshTrigger={refreshChatTrigger}
        />
      </div>

      <aside
        className="
          w-full md:w-1/3 lg:w-2/5 xl:w-1/3 flex-shrink-0
          bg-zinc-800 rounded-lg border border-zinc-700
          p-4 overflow-y-auto shadow-md
        "
        style={{ flexBasis: '0', minWidth: '300px' }}
      >
        <ToolsPanel
          conversacionId={conversacionId}
          negocioId={negocioId}
          clienteId={clienteId}
          onActionComplete={handleForceChatRefresh}
        />
      </aside>
    </div>
  );
}