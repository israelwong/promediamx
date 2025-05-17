// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/[paqueteId]/components/PaqueteGaleria.tsx
'use client';

import React from 'react';
import SharedImageGalleryManager, {
    type SharedImageGalleryManagerProps, // Para tipar el objeto de acciones
    // type GalleryItemBase, // Para referencia del tipo base que espera el shared component
    type UpdateGalleryItemDetailsData,
    type ReorderGalleryItemData
} from '@/app/admin/components/shared/SharedImageGalleryManager'; // Ajusta esta ruta si es diferente

// Importar las actions específicas para NegocioPaqueteGaleria
import {
    obtenerImagenesGaleriaPaqueteAction,
    agregarImagenAGaleriaPaqueteAction,
    actualizarDetallesImagenGaleriaPaqueteAction,
    eliminarImagenDeGaleriaPaqueteAction,
    actualizarOrdenImagenesGaleriaPaqueteAction
} from '@/app/admin/_lib/actions/negocioPaqueteGaleria/negocioPaqueteGaleria.actions'; // Verifica esta ruta

// Importar el tipo específico del ítem de galería de NegocioPaquete
import { type NegocioPaqueteGaleriaItem } from '@/app/admin/_lib/actions/negocioPaqueteGaleria/negocioPaqueteGaleria.schemas'; // Verifica esta ruta
// import { ActionResult } from '@/app/admin/_lib/types';

interface PaqueteGaleriaProps {
    paqueteId: string; // Este será el ownerEntityId
    negocioId: string;
    clienteId: string;
}

export default function PaqueteGaleria({ paqueteId, negocioId, clienteId }: PaqueteGaleriaProps) {

    // Mapear las actions específicas de NegocioPaqueteGaleria a las props esperadas por SharedImageGalleryManager
    // El tipo genérico T_Item para SharedImageGalleryManagerProps será NegocioPaqueteGaleriaItem
    const galleryActions: SharedImageGalleryManagerProps<NegocioPaqueteGaleriaItem>['actions'] = {
        fetchItemsAction: (ownerEntityId: string) =>
            obtenerImagenesGaleriaPaqueteAction(ownerEntityId),

        addItemAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, _catalogoId: string | undefined, formData: FormData) =>
            // _catalogoId no se usa para la galería de paquetes, pero la firma de la action en SharedImageGalleryManager lo incluye.
            // La action específica agregarImagenAGaleriaPaqueteAction no lo necesita.
            agregarImagenAGaleriaPaqueteAction(ownerEntityId, currentNegocioId, currentClienteId, formData),

        updateItemDetailsAction: (itemGalleryId: string, currentClienteId: string, currentNegocioId: string, ownerEntityId: string, _catalogoId: string | undefined, data: UpdateGalleryItemDetailsData) =>
            actualizarDetallesImagenGaleriaPaqueteAction(
                itemGalleryId,
                currentClienteId,
                currentNegocioId,
                ownerEntityId,
                {
                    ...data,
                    altText: data.altText === null ? undefined : data.altText,
                    descripcion: data.descripcion === null ? undefined : data.descripcion,
                }
            ),

        deleteItemAction: (itemGalleryId: string, currentNegocioId: string, currentClienteId: string, ownerEntityId: string) =>
            eliminarImagenDeGaleriaPaqueteAction(itemGalleryId, currentNegocioId, currentClienteId, ownerEntityId),

        updateOrderAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, _catalogoId: string | undefined, orderData: ReorderGalleryItemData[]) =>
            actualizarOrdenImagenesGaleriaPaqueteAction(ownerEntityId, currentNegocioId, currentClienteId, orderData),
    };

    return (
        <SharedImageGalleryManager<NegocioPaqueteGaleriaItem> // Especificar el tipo concreto del ítem de galería
            ownerEntityId={paqueteId}
            negocioId={negocioId}
            clienteId={clienteId}
            // catalogoId no es relevante para la galería de paquetes, por lo que no se pasa
            actions={galleryActions}
            itemDisplayName="imagen del paquete"
            itemDisplayNamePlural="imágenes del paquete"
            maxImages={10} // Límite que tenías en tu PaqueteGaleria.tsx original
            enableCoverPhotoFeature={true} // Asumiendo que la primera imagen es la portada del paquete
        // acceptedFileTypes y imageCompressionOptions usarán los defaults de SharedImageGalleryManager
        // o puedes personalizarlos aquí si es necesario.
        />
    );
}
