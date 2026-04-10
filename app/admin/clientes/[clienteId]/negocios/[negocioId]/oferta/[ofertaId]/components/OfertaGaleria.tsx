// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/[paqueteId]/components/PaqueteGaleria.tsx
'use client';

import React from 'react';
import SharedImageGalleryManager, {
    type SharedImageGalleryManagerProps,
    type UpdateGalleryItemDetailsData, // Este tipo es genérico para el modal
    type ReorderGalleryItemData        // Este tipo es genérico para el DND
} from '@/app/admin/components/shared/SharedImageGalleryManager'; // Ruta corregida

// Importar las actions específicas para NegocioPaqueteGaleria
import {
    obtenerImagenesGaleriaOfertaAction,
    agregarImagenAGaleriaOfertaAction,
    actualizarDetallesImagenGaleriaOfertaAction,
    eliminarImagenDeGaleriaOfertaAction,
    actualizarOrdenImagenesGaleriaOfertaAction
} from '@/app/admin/_lib/actions/oferta/ofertaGaleria.actions';

// Importar el tipo específico del ítem de galería de NegocioPaquete
import {
    type OfertaGaleriaItemType,
    type ActualizarDetallesImagenGaleriaOfertaData // Este es el tipo Zod para la data de la action
} from '@/app/admin/_lib/actions/oferta/ofertaGaleria.schemas'; // Verifica esta ruta

interface OfertaGaleriaProps {
    ofertaId: string; // Corregido: ownerEntityId será ofertaId
    negocioId: string;
    clienteId: string;
}

export default function OfertaGaleria({ ofertaId, negocioId, clienteId }: OfertaGaleriaProps) {

    // Mapear las actions específicas de NegocioPaqueteGaleria a las props esperadas por SharedImageGalleryManager
    // El tipo genérico T_Item para SharedImageGalleryManagerProps será NegocioPaqueteGaleriaItem
    const galleryActions: SharedImageGalleryManagerProps<OfertaGaleriaItemType>['actions'] = {
        fetchItemsAction: (ownerEntityId: string) =>
            obtenerImagenesGaleriaOfertaAction(ownerEntityId),

        addItemAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, _ofertaId: string | undefined, formData: FormData) =>
            // La action específica agregarImagenAGaleriaPaqueteAction no necesita catalogoId
            agregarImagenAGaleriaOfertaAction(ownerEntityId, currentNegocioId, currentClienteId, formData),

        updateItemDetailsAction: (
            itemGalleryId: string,
            currentClienteId: string,
            currentNegocioId: string,
            ownerEntityId: string,
            _catalogoId: string | undefined, // No usado por la action de paquete
            data: UpdateGalleryItemDetailsData // Este es el tipo genérico del modal
        ) => {
            // Mapear/validar 'data' al tipo específico que espera la action de paquete si es necesario,
            // o asegurar que ActualizarDetallesImagenGaleriaPaqueteData sea compatible.
            // El schema Zod ActualizarDetallesImagenGaleriaPaqueteSchema ya usa .transform() para convertir '' a null.
            const dataForAction: ActualizarDetallesImagenGaleriaOfertaData = {
                altText: data.altText ?? undefined, // Convert null to undefined for type compatibility
                descripcion: data.descripcion ?? undefined, // Convert null to undefined for type compatibility
            };
            return actualizarDetallesImagenGaleriaOfertaAction(
                itemGalleryId,
                currentClienteId,
                currentNegocioId,
                ownerEntityId, // este es paqueteId
                dataForAction
            );
        },

        deleteItemAction: (itemGalleryId: string, currentNegocioId: string, currentClienteId: string, ownerEntityId: string) =>
            eliminarImagenDeGaleriaOfertaAction(itemGalleryId, currentNegocioId, currentClienteId, ownerEntityId),


        updateOrderAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, _catalogoId: string | undefined, orderData: ReorderGalleryItemData[]) =>
            actualizarOrdenImagenesGaleriaOfertaAction(ownerEntityId, currentNegocioId, currentClienteId, orderData),
    };

    return (
        <SharedImageGalleryManager<OfertaGaleriaItemType>
            ownerEntityId={ofertaId} // Corregido para usar paqueteId
            negocioId={negocioId}
            clienteId={clienteId}
            // catalogoId no es relevante aquí
            actions={galleryActions}
            itemDisplayName="imagen de la oferta"
            itemDisplayNamePlural="imágenes de la oferta"
            maxImages={10}
            enableCoverPhotoFeature={true}
        />
    );
}
