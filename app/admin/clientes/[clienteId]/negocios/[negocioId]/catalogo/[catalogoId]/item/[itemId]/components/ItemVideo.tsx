// Sugerencia de Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/item/[itemId]/components/ItemVideo.tsx
'use client';

import React from 'react';
import SharedVideoManager, {
    type SharedVideoManagerProps, // Importar para tipar 'videoActions'
    // type SharedVideoItemBase,     // El componente genérico usa esto como constraint
    // type SharedUpsertVideoData    // El componente genérico usa esto como constraint
} from '@/app/admin/components/shared/SharedVideoManager'; // Ajusta la ruta

// Actions específicas para ItemCatalogoVideos
import {
    obtenerVideoDelItemAction,
    guardarVideoItemAction,
    eliminarVideoDelItemAction
} from '@/app/admin/_lib/actions/catalogo/itemCatalogoVideo.actions';

// Tipos específicos del video de ItemCatalogo y su schema de upsert
import {
    type ItemCatalogoVideoItemType,      // El tipo concreto para T_Item
    UpsertItemCatalogoVideoSchema,       // El schema Zod específico para el formulario
    type UpsertItemCatalogoVideoData   // El tipo concreto para T_UpsertData
} from '@/app/admin/_lib/actions/catalogo/itemCatalogoVideo.schemas'; // Asegúrate que esta ruta es correcta
// import { ActionResult } from '@/app/admin/_lib/types';

interface ItemVideoProps {
    itemId: string; // itemCatalogoId
    negocioId: string;
    clienteId: string;
    catalogoId: string;
}

export default function ItemVideo({ itemId, negocioId, clienteId, catalogoId }: ItemVideoProps) {

    // El tipo de 'actions' debe coincidir con SharedVideoManagerProps<ItemCatalogoVideoItemType, UpsertItemCatalogoVideoData>['actions']
    const videoActions: SharedVideoManagerProps<ItemCatalogoVideoItemType, UpsertItemCatalogoVideoData>['actions'] = {
        fetchVideoAction: (ownerEntityId: string) =>
            obtenerVideoDelItemAction(ownerEntityId), // No cast: la acción devuelve Promise<ActionResult<ItemCatalogoVideoItemType | null>>

        saveVideoAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, currentCatalogoId: string | undefined, data: UpsertItemCatalogoVideoData, file?: File) =>
            // La data que recibe saveVideoAction es UpsertItemCatalogoVideoData
            // y la acción guardarVideoItemAction también espera ese tipo.
            guardarVideoItemAction(ownerEntityId, currentNegocioId, currentClienteId, currentCatalogoId!, data, file), // No cast

        deleteVideoAction: (videoId: string, currentNegocioId: string, currentClienteId: string, ownerEntityId: string, currentCatalogoId: string | undefined) =>
            eliminarVideoDelItemAction(videoId, currentNegocioId, currentClienteId, currentCatalogoId!, ownerEntityId), // No cast
    };

    return (
        <SharedVideoManager<ItemCatalogoVideoItemType, UpsertItemCatalogoVideoData>
            ownerEntityId={itemId}
            negocioId={negocioId}
            clienteId={clienteId}
            catalogoId={catalogoId}
            actions={videoActions}
            formSchema={UpsertItemCatalogoVideoSchema} // Pasar el schema Zod específico
            entityDisplayName="ítem"
            maxFileSizeMB={50}
        />
    );
}
