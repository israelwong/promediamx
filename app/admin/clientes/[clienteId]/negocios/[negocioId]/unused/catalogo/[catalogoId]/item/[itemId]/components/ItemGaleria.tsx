// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/item/[itemId]/components/ItemGaleria.tsx
'use client';

import React from 'react';
import SharedImageGalleryManager, {
    type SharedImageGalleryManagerProps,
    // type GalleryItemBase, // Para referencia, el tipo T se infiere
    type UpdateGalleryItemDetailsData,
    type ReorderGalleryItemData
} from '@/app/admin/components/shared/SharedImageGalleryManager'; // Ajusta la ruta

import {
    obtenerImagenesGaleriaItemAction,
    agregarImagenAGaleriaItemAction,
    actualizarDetallesImagenGaleriaItemAction,
    eliminarImagenDeGaleriaItemAction,
    actualizarOrdenImagenesGaleriaItemAction
} from '@/app/admin/_lib/actions/catalogo/itemCatalogoGaleria.actions';

import { type ItemCatalogoGaleriaItemType } from '@/app/admin/_lib/actions/catalogo/itemCatalogoGaleria.schemas';
// import { ActionResult } from '@/app/admin/_lib/types';

interface ItemGaleriaProps {
    itemId: string; // itemCatalogoId
    negocioId: string;
    clienteId: string;
    catalogoId: string;
}

export default function ItemGaleria({ itemId, negocioId, clienteId, catalogoId }: ItemGaleriaProps) {

    const galleryActions: SharedImageGalleryManagerProps<ItemCatalogoGaleriaItemType>['actions'] = {
        fetchItemsAction: (ownerEntityId: string) =>
            obtenerImagenesGaleriaItemAction(ownerEntityId),

        addItemAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, currentCatalogoId: string | undefined, formData: FormData) =>
            agregarImagenAGaleriaItemAction(ownerEntityId, currentNegocioId, currentClienteId, currentCatalogoId!, formData, 12),

        updateItemDetailsAction: (itemGalleryId: string, currentClienteId: string, currentNegocioId: string, ownerEntityId: string, currentCatalogoId: string | undefined, data: UpdateGalleryItemDetailsData) =>
            actualizarDetallesImagenGaleriaItemAction(itemGalleryId, currentClienteId, currentNegocioId, currentCatalogoId!, ownerEntityId, data),

        deleteItemAction: (itemGalleryId: string, currentNegocioId: string, currentClienteId: string, ownerEntityId: string, currentCatalogoId: string | undefined) =>
            eliminarImagenDeGaleriaItemAction(itemGalleryId, currentNegocioId, currentClienteId, currentCatalogoId!, ownerEntityId),

        updateOrderAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, currentCatalogoId: string | undefined, orderData: ReorderGalleryItemData[]) =>
            actualizarOrdenImagenesGaleriaItemAction(ownerEntityId, currentNegocioId, currentClienteId, currentCatalogoId!, orderData),
    };

    return (
        <SharedImageGalleryManager<ItemCatalogoGaleriaItemType>
            ownerEntityId={itemId} // Este es el itemCatalogoId
            negocioId={negocioId}
            clienteId={clienteId}
            catalogoId={catalogoId} // Pasar catalogoId para las actions y revalidación
            actions={galleryActions}
            itemDisplayName="imagen de ítem"
            itemDisplayNamePlural="imágenes de ítem"
            maxImages={12} // Límite específico para la galería de ítems
            enableCoverPhotoFeature={true} // La primera imagen será la portada del ítem
        // Podrías personalizar imageCompressionOptions o acceptedFileTypes aquí si es necesario
        />
    );
}
