'use client';

import React from 'react';
import SharedImageGalleryManager, {
    type SharedImageGalleryManagerProps,
    // type UpdateGalleryItemDetailsData, // Reexportado desde shared
    // type ReorderGalleryItemData        // Reexportado desde shared
} from '@/app/admin/components/shared/SharedImageGalleryManager'; // Ajusta la ruta a tu Shared Component

// Importar las acciones específicas para TareaGaleria
import {
    obtenerImagenesGaleriaTareaAction,
    agregarImagenAGaleriaTareaAction,
    actualizarDetallesImagenGaleriaTareaAction,
    eliminarImagenDeGaleriaTareaAction,
    actualizarOrdenImagenesGaleriaTareaAction
} from '@/app/admin/_lib/actions/tarea/tareaGaleria.actions'; // Ajusta la ruta

// Importar el tipo específico del ítem de la galería de Tarea
import { type TareaGaleriaItemType } from '@/app/admin/_lib/actions/tarea/tareaGaleria.schemas'; // Ajusta la ruta

interface TareaGaleriaProps {
    tareaId: string;
    // Tarea no tiene clienteId o negocioId directamente en su modelo.
    // Si SharedImageGalleryManager REQUIERE estos props, necesitaremos
    // obtenerlos de otra forma o modificar SharedImageGalleryManager para hacerlos opcionales.
    // Por ahora, asumimos que podemos pasar placeholders o undefined si las actions no los usan.
    // Para la revalidación de paths, las actions de TareaGaleria usan getPathToTareaEdicion(tareaId)
    // que no depende de clienteId/negocioId.
    // Si el storage path en imageHandler.actions.ts o subirImagenAGaleriaTareaAction lo necesita,
    // entonces SÍ necesitaríamos obtener el negocioId de la tarea.
    // En el ejemplo de ItemGaleria, negocioId y clienteId eran importantes.
    // Aquí, si una Tarea puede no estar ligada a un Negocio, es un problema.
    // Solución temporal: pasar un string vacío o un ID de "sistema" si es mandatorio
    // y las acciones internas no lo usan.
    // OJO: Tu SharedImageGalleryManagerProps tiene clienteId y negocioId como string, NO opcionales.
    // Esto requiere que TareaGaleriaProps también los reciba o los obtenga.
    // Si Tarea SIEMPRE pertenece a un Negocio (a través de AsistenteVirtual, por ejemplo),
    // entonces esta info se podría cargar en la página de edición de Tarea y pasarla aquí.
    // Por ahora, pasaré strings vacíos como placeholders, pero esto necesita revisión.
    // negocioIdPlaceholder: string; // Deberías obtener el negocioId real de la tarea si es posible
    // clienteIdPlaceholder: string; // Deberías obtener el clienteId real si es posible
}

export default function TareaGaleria({ tareaId }: TareaGaleriaProps) {

    // Mapear las acciones específicas de TareaGaleria al formato esperado por SharedImageGalleryManager
    const galleryActions: SharedImageGalleryManagerProps<TareaGaleriaItemType>['actions'] = {
        fetchItemsAction: (ownerId: string) => // ownerId es tareaId
            obtenerImagenesGaleriaTareaAction(ownerId),

        // SharedImageGalleryManager pasa: ownerEntityId, negocioId, clienteId, catalogoId, formData
        // Aquí, ownerEntityId es tareaId.
        // catalogoId será undefined.
        addItemAction: (ownerId, negocioId, clienteId, _catalogoId_no_usado, formData) =>
            agregarImagenAGaleriaTareaAction(ownerId, negocioId, clienteId, undefined, formData, 5), // Límite de 5 imágenes

        // SharedImageGalleryManager pasa: itemGalleryId, clienteId, negocioId, ownerEntityId, catalogoId, data
        updateItemDetailsAction: (itemGaleriaId, clienteId, negocioId, ownerId, _catalogoId_no_usado, data) =>
            actualizarDetallesImagenGaleriaTareaAction(itemGaleriaId, clienteId, negocioId, ownerId, undefined, data),

        // SharedImageGalleryManager pasa: itemGalleryId, negocioId, clienteId, ownerEntityId, catalogoId
        deleteItemAction: (itemGaleriaId, negocioId, clienteId, ownerId,) =>
            eliminarImagenDeGaleriaTareaAction(itemGaleriaId, negocioId, clienteId, ownerId),

        // SharedImageGalleryManager pasa: ownerEntityId, negocioId, clienteId, catalogoId, orderData
        updateOrderAction: (ownerId, negocioId, clienteId, _catalogoId_no_usado, orderData) =>
            actualizarOrdenImagenesGaleriaTareaAction(ownerId, negocioId, clienteId, undefined, orderData),
    };

    return (
        <SharedImageGalleryManager<TareaGaleriaItemType>
            ownerEntityId={tareaId}
            negocioId={''}
            clienteId={''}
            // catalogoId no es relevante para TareaGaleria, SharedImageGalleryManager lo pasa como undefined
            actions={galleryActions}
            itemDisplayName="imagen de tarea"
            itemDisplayNamePlural="imágenes de tarea"
            maxImages={5} // Límite específico para la galería de tareas
            enableCoverPhotoFeature={true} // La primera imagen será la portada
            // Opciones de compresión personalizadas si es necesario para iconos vs. galería
            imageCompressionOptions={{
                maxSizeMB: 1, // Ligeramente más grande que iconos
                maxWidthOrHeight: 1024, // Resolución moderada
            }}
        // acceptedFileTypes se pueden dejar por defecto o personalizar
        />
    );
}