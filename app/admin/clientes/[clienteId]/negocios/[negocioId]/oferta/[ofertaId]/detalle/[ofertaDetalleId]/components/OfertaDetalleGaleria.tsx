'use client';

import React from 'react';
import SharedImageGalleryManager, {
    type SharedImageGalleryManagerProps,
    type UpdateGalleryItemDetailsData,
    type ReorderGalleryItemData
} from '@/app/admin/components/shared/SharedImageGalleryManager'; // Ruta al componente compartido

// Importar las actions específicas para OfertaDetalleGaleria
import {
    obtenerImagenesGaleriaDetalleAction,
    agregarImagenAGaleriaDetalleAction,
    actualizarDetallesImagenDetalleGaleriaAction,
    eliminarImagenDeDetalleGaleriaAction,
    actualizarOrdenImagenesDetalleGaleriaAction
} from '@/app/admin/_lib/actions/oferta/ofertaDetalleGaleria.actions';

// Importar el tipo específico y el tipo de datos para actualizar detalles
import {
    type OfertaDetalleGaleriaItemType,
    type ActualizarDetallesImagenDetalleGaleriaData
} from '@/app/admin/_lib/actions/oferta/ofertaDetalleGaleria.schemas';

interface OfertaDetalleGaleriaManagerProps {
    ofertaId: string; // Necesario para construir el path de storage y revalidación
    ofertaDetalleId: string; // Este será el ownerEntityId para SharedImageGalleryManager
    negocioId: string;
    clienteId: string;
    initialData?: OfertaDetalleGaleriaItemType[]; // Para pasar datos ya cargados
}

export default function OfertaDetalleGaleriaManager({
    ofertaId,
    ofertaDetalleId,
    negocioId,
    clienteId,
}: OfertaDetalleGaleriaManagerProps) {

    const MAX_IMAGES_PER_DETALLE_GALLERY = 10; // Definir el límite de imágenes por detalle

    const galleryActions: SharedImageGalleryManagerProps<OfertaDetalleGaleriaItemType>['actions'] = {
        fetchItemsAction: (currentOfertaDetalleId: string) => // ownerEntityId es ofertaDetalleId
            obtenerImagenesGaleriaDetalleAction(currentOfertaDetalleId),

        // Para addItemAction, SharedImageGalleryManager pasa ownerEntityId, negocioId, clienteId, catalogoId, formData.
        // 'catalogoId' no se usa aquí, pero podemos pasarlo como undefined o ignorarlo.
        // La action específica necesita ofertaId, que no es una prop estándar de addItemAction.
        // Lo pasamos a través del closure.
        addItemAction: (currentOfertaDetalleId: string, currentNegocioId: string, currentClienteId: string, _catalogoIdNotUsed: string | undefined, formData: FormData) =>
            agregarImagenAGaleriaDetalleAction(currentOfertaDetalleId, currentNegocioId, currentClienteId, ofertaId, formData),

        updateItemDetailsAction: (
            itemGalleryId: string, // ID del OfertaDetalleGaleriaItem
            currentClienteId: string,
            currentNegocioId: string,
            currentOfertaDetalleId: string, // ownerEntityId
            _catalogoIdNotUsed: string | undefined,
            data: UpdateGalleryItemDetailsData // Tipo genérico del modal
        ) => {
            const dataForAction: ActualizarDetallesImagenDetalleGaleriaData = { // Mapear al tipo específico
                altText: data.altText ?? undefined,
                descripcion: data.descripcion ?? undefined,
            };
            return actualizarDetallesImagenDetalleGaleriaAction(
                itemGalleryId,
                currentClienteId,
                currentNegocioId,
                ofertaId, // Pasar ofertaId para la revalidación
                currentOfertaDetalleId,
                dataForAction
            );
        },

        deleteItemAction: (itemGalleryId: string, currentNegocioId: string, currentClienteId: string, currentOfertaDetalleId: string) =>
            eliminarImagenDeDetalleGaleriaAction(itemGalleryId, currentNegocioId, currentClienteId, ofertaId, currentOfertaDetalleId),

        updateOrderAction: (currentOfertaDetalleId: string, currentNegocioId: string, currentClienteId: string, _catalogoIdNotUsed: string | undefined, orderData: ReorderGalleryItemData[]) =>
            actualizarOrdenImagenesDetalleGaleriaAction(currentOfertaDetalleId, currentNegocioId, currentClienteId, ofertaId, orderData),
    };

    return (
        <SharedImageGalleryManager<OfertaDetalleGaleriaItemType>
            ownerEntityId={ofertaDetalleId} // El ID de la entidad dueña de la galería
            negocioId={negocioId}
            clienteId={clienteId}
            // catalogoId no es relevante aquí, SharedImageGalleryManager lo manejará como undefined
            actions={galleryActions}
            itemDisplayName="imagen del detalle"
            itemDisplayNamePlural="imágenes del detalle"
            maxImages={MAX_IMAGES_PER_DETALLE_GALLERY} // Usar el límite definido
            enableCoverPhotoFeature={false} // Probablemente no necesites foto de portada para la galería de un detalle
        // initialData={initialData} // Si SharedImageGalleryManager acepta esta prop
        />
    );
}