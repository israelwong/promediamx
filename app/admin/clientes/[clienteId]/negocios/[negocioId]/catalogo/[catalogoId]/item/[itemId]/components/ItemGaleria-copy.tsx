// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/item/[itemId]/components/ItemGaleria.tsx
'use client';

import React from 'react';
import SharedImageGalleryManager, {
    type UpdateGalleryItemDetailsData,
    type ReorderGalleryItemData,
    type SharedImageGalleryManagerProps
} from '@/app/admin/components/shared/SharedImageGalleryManager'; // Ajusta la ruta al componente compartido

// Importar las actions específicas para ItemCatalogoGaleria
import {
    obtenerImagenesGaleriaItemAction,
    agregarImagenAGaleriaItemAction,
    actualizarDetallesImagenGaleriaItemAction,
    eliminarImagenDeGaleriaItemAction,
    actualizarOrdenImagenesGaleriaItemAction
} from '@/app/admin/_lib/actions/catalogo/itemCatalogoGaleria.actions'; // Ajusta la ruta

// Importar el tipo específico del ítem de galería de ItemCatalogo
import { type ItemCatalogoGaleriaItemType } from '@/app/admin/_lib/actions/catalogo/itemCatalogoGaleria.schemas';

interface ItemGaleriaProps {
    itemId: string;
    negocioId: string;
    clienteId: string;
    catalogoId: string;
}

const MAX_IMAGES_PER_ITEM_GALLERY = 10; // Definir un máximo de imágenes por ítem de galería

export default function ItemGaleria({ itemId, negocioId, clienteId, catalogoId }: ItemGaleriaProps) {

    // Definir el tipo para el objeto de acciones explícitamente para mayor claridad
    // y para asegurar que coincida con lo que SharedImageGalleryManager espera para T = ItemCatalogoGaleriaItemType
    const galleryActions: SharedImageGalleryManagerProps<ItemCatalogoGaleriaItemType>['actions'] = {
        fetchItemsAction: (ownerEntityId: string) =>
            obtenerImagenesGaleriaItemAction(ownerEntityId), // No se necesita cast, la acción ya devuelve el tipo correcto

        addItemAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, currentCatalogoId: string | undefined, formData: FormData) =>
            agregarImagenAGaleriaItemAction(ownerEntityId, currentNegocioId, currentClienteId, currentCatalogoId!, formData, MAX_IMAGES_PER_ITEM_GALLERY), // No cast

        updateItemDetailsAction: (itemGalleryId: string, currentClienteId: string, currentNegocioId: string, ownerEntityId: string, currentCatalogoId: string | undefined, data: UpdateGalleryItemDetailsData) =>
            actualizarDetallesImagenGaleriaItemAction(itemGalleryId, currentClienteId, currentNegocioId, currentCatalogoId!, ownerEntityId, data), // No cast

        deleteItemAction: (itemGalleryId: string, currentNegocioId: string, currentClienteId: string, ownerEntityId: string, currentCatalogoId: string | undefined) =>
            eliminarImagenDeGaleriaItemAction(itemGalleryId, currentNegocioId, currentClienteId, currentCatalogoId!, ownerEntityId), // No cast

        updateOrderAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, currentCatalogoId: string | undefined, orderData: ReorderGalleryItemData[]) =>
            actualizarOrdenImagenesGaleriaItemAction(ownerEntityId, currentNegocioId, currentClienteId, currentCatalogoId!, orderData), // No cast
    };

    return (
        <SharedImageGalleryManager<ItemCatalogoGaleriaItemType>
            ownerEntityId={itemId}
            negocioId={negocioId}
            clienteId={clienteId}
            catalogoId={catalogoId}
            actions={galleryActions}
            itemDisplayName="foto"
            itemDisplayNamePlural="fotos"
            maxImages={MAX_IMAGES_PER_ITEM_GALLERY}
            enableCoverPhotoFeature={true} // O false si no aplica para la galería de ítems
        // acceptedFileTypes puedes personalizarlo aquí si es diferente del default
        />
    );
}
