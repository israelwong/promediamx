// Ruta sugerida: app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/[ofertaId]/components/OfertaVideos.tsx
'use client';

import React from 'react';
import SharedVideoManager, {
    type SharedVideoManagerProps,
    // Los siguientes tipos son para referencia de lo que SharedVideoManager espera internamente
    // type SharedVideoItemBase, 
    // type SharedUpsertVideoData 
} from '@/app/admin/components/shared/SharedVideoManager'; // Ajusta esta ruta si es diferente

// Actions específicas para OfertaVideos
import {
    obtenerVideoDeOfertaAction,
    guardarVideoOfertaAction,
    eliminarVideoDeOfertaAction
} from '@/app/admin/_lib/actions/oferta/ofertaVideos.actions'; // Verifica esta ruta

// Tipos específicos del video de Oferta y su schema de upsert
import {
    type OfertaVideoItemType,
    UpsertOfertaVideoSchema,       // El schema Zod específico para el formulario
    type UpsertOfertaVideoData     // El tipo inferido del schema Zod
} from '@/app/admin/_lib/actions/oferta/ofertaVideos.schemas'; // Verifica esta ruta
// import { ActionResult } from '@/app/admin/_lib/types';

interface OfertaVideosProps {
    ofertaId: string; // Este será el ownerEntityId
    negocioId: string;
    clienteId: string;
    // catalogoId no es necesario para las ofertas
}

export default function OfertaVideos({ ofertaId, negocioId, clienteId }: OfertaVideosProps) {

    // Mapear las actions específicas de OfertaVideos a las props esperadas por SharedVideoManager
    const videoActions: SharedVideoManagerProps<OfertaVideoItemType, UpsertOfertaVideoData>['actions'] = {
        fetchVideoAction: (ownerEntityId: string) =>
            obtenerVideoDeOfertaAction(ownerEntityId),

        saveVideoAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, _catalogoId: string | undefined, data: UpsertOfertaVideoData, file?: File) =>
            // La action guardarVideoOfertaAction no espera catalogoId.
            guardarVideoOfertaAction(ownerEntityId, currentNegocioId, currentClienteId, data, file),

        deleteVideoAction: (videoId: string, currentNegocioId: string, currentClienteId: string, ownerEntityId: string) =>
            // La action eliminarVideoDeOfertaAction necesita el ofertaId (ownerEntityId) como último argumento.
            eliminarVideoDeOfertaAction(videoId, currentNegocioId, currentClienteId, ownerEntityId),
    };

    return (
        <SharedVideoManager<OfertaVideoItemType, UpsertOfertaVideoData>
            ownerEntityId={ofertaId}
            negocioId={negocioId}
            clienteId={clienteId}
            // catalogoId no es aplicable aquí.
            actions={videoActions}
            formSchema={UpsertOfertaVideoSchema} // Pasar el schema Zod específico del formulario de OfertaVideos
            entityDisplayName="oferta" // Nombre para mensajes y UI
            maxFileSizeMB={25} // Puedes ajustar este límite si es diferente para videos de ofertas
            videoAspectRatio="aspect-video" // O el aspect ratio que prefieras
        />
    );
}
