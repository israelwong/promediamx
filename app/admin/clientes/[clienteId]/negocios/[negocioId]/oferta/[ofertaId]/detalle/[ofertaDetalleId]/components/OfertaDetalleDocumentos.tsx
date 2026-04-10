'use client';

import React from 'react';
import SharedDocumentManager, {
    type SharedDocumentManagerProps,
    type UpdateDocumentDetailsData, // Tipo genérico del modal de SharedDocumentManager
    type ReorderDocumentItemData
} from '@/app/admin/components/shared/SharedDocumentManager'; // Ruta al componente compartido

// Importar las actions específicas para OfertaDetalleDocumento
import {
    obtenerDocumentosDetalleOfertaAction,
    agregarDocumentoADetalleOfertaAction,
    actualizarDetallesDocumentoDetalleAction,
    eliminarDocumentoDeDetalleOfertaAction,
    actualizarOrdenDocumentosDetalleOfertaAction
} from '@/app/admin/_lib/actions/oferta/ofertaDetalleDocumento.actions';

// Importar el tipo específico y el tipo de datos para actualizar detalles
import {
    type OfertaDetalleDocumentoItemType as OriginalOfertaDetalleDocumentoItemType,
    type ActualizarDetallesDocumentoDetalleData // Tipo específico para la action
} from '@/app/admin/_lib/actions/oferta/ofertaDetalleDocumento.schemas';

// Asegura que 'orden' nunca sea undefined, solo number o null
type OfertaDetalleDocumentoItemType = Omit<OriginalOfertaDetalleDocumentoItemType, 'orden'> & {
    orden: number | null;
};

interface OfertaDetalleDocumentosManagerProps {
    ofertaId: string; // Necesario para construir el path de storage y revalidación
    ofertaDetalleId: string; // Este será el ownerEntityId para SharedDocumentManager
    negocioId: string;
    clienteId: string;
    initialDocumentos?: OfertaDetalleDocumentoItemType[]; // Para pasar datos ya cargados
}

export default function OfertaDetalleDocumentosManager({
    ofertaId,
    ofertaDetalleId,
    negocioId,
    clienteId
}: OfertaDetalleDocumentosManagerProps) {

    const documentActions: SharedDocumentManagerProps<OfertaDetalleDocumentoItemType>['actions'] = {
        fetchItemsAction: async (currentOfertaDetalleId: string) => {
            const result = await obtenerDocumentosDetalleOfertaAction(currentOfertaDetalleId);
            return {
                ...result,
                data: Array.isArray(result.data)
                    ? result.data.map((item) => ({
                        ...item,
                        orden: item.orden === undefined ? null : item.orden,
                    }))
                    : result.data,
            };
        },

        addItemAction: async (
            currentOfertaDetalleId: string,
            currentNegocioId: string,
            currentClienteId: string,
            formData: FormData
        ) => {
            const result = await agregarDocumentoADetalleOfertaAction(
                currentOfertaDetalleId,
                currentNegocioId,
                currentClienteId,
                ofertaId,
                formData
            );
            return {
                ...result,
                data: result.data
                    ? {
                        ...result.data,
                        orden: result.data.orden === undefined ? null : result.data.orden,
                    }
                    : result.data,
            };
        },

        updateItemDetailsAction: (
            documentoItemId: string, // ID del OfertaDetalleDocumentoItem
            currentClienteId: string,
            currentNegocioId: string,
            currentOfertaDetalleId: string, // ownerEntityId
            data: UpdateDocumentDetailsData // Tipo genérico del modal
        ) => {
            const dataForAction: ActualizarDetallesDocumentoDetalleData = { // Mapear al tipo específico
                documentoNombre: data.documentoNombre ?? undefined,
                descripcion: data.descripcion ?? undefined,
            };
            return actualizarDetallesDocumentoDetalleAction(
                documentoItemId,
                currentClienteId,
                currentNegocioId,
                ofertaId, // Pasar ofertaId para la revalidación
                currentOfertaDetalleId,
                dataForAction
            ).then(result => ({
                ...result,
                data: result.data
                    ? {
                        ...result.data,
                        orden: result.data.orden === undefined ? null : result.data.orden,
                    }
                    : result.data,
            }));
        },

        deleteItemAction: (documentoItemId: string, currentNegocioId: string, currentClienteId: string, currentOfertaDetalleId: string) =>
            eliminarDocumentoDeDetalleOfertaAction(documentoItemId, currentNegocioId, currentClienteId, ofertaId, currentOfertaDetalleId),

        updateOrderAction: (currentOfertaDetalleId: string, currentNegocioId: string, currentClienteId: string, orderData: ReorderDocumentItemData[]) =>
            actualizarOrdenDocumentosDetalleOfertaAction(currentOfertaDetalleId, currentNegocioId, currentClienteId, ofertaId, orderData),
    };

    const MAX_DOCUMENTS_PER_DETALLE = 10; // Definir el límite de documentos por detalle
    const MAX_DOC_SIZE_MB_DETALLE = 10; // Definir el límite de tamaño de documento en MB

    return (
        <SharedDocumentManager<OfertaDetalleDocumentoItemType>
            ownerEntityId={ofertaDetalleId}
            negocioId={negocioId}
            clienteId={clienteId}
            actions={documentActions}
            itemDisplayName="documento del detalle"
            itemDisplayNamePlural="documentos del detalle"
            maxDocuments={MAX_DOCUMENTS_PER_DETALLE} // Usar el límite definido en las actions
            maxFileSizeMB={MAX_DOC_SIZE_MB_DETALLE} // Usar el límite definido
            // initialData={initialDocumentos} // Si SharedDocumentManager acepta esta prop
            acceptedFileTypes={{
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'text/plain': ['.txt'],
            }}
        />
    );
}