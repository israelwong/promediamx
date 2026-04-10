'use client';

import React from 'react';
import SharedDocumentManager, {
    type SharedDocumentManagerProps,
    type UpdateDocumentDetailsData,
    type ReorderDocumentItemData,
} from '@/app/admin/components/shared/SharedDocumentManager'; // Ajusta la ruta a donde guardes SharedDocumentManager

// Importar las actions específicas para OfertaDocumento
import {
    obtenerDocumentosOfertaAction,
    agregarDocumentoAOfertaAction,
    actualizarDetallesDocumentoOfertaAction,
    eliminarDocumentoDeOfertaAction,
    actualizarOrdenDocumentosOfertaAction
} from '@/app/admin/_lib/actions/oferta/ofertaDocumento.actions'; // Ajusta la ruta

// Importar el tipo específico del ítem de documento de Oferta
import {
    type OfertaDocumentoItemType,
    type ActualizarDetallesDocumentoOfertaData // Este es el tipo Zod para la data de la action de actualizar
} from '@/app/admin/_lib/actions/oferta/ofertaDocumento.schemas'; // Ajusta la ruta

interface OfertaDocumentosManagerProps {
    ofertaId: string;
    negocioId: string;
    clienteId: string;
    // Podrías pasar initialDocumentos como prop si OfertaEditarManager los carga
    // initialDocumentos?: OfertaDocumentoItemType[]; 
}

export default function OfertaDocumentosManager({ ofertaId, negocioId, clienteId }: OfertaDocumentosManagerProps) {

    // Mapear las actions específicas de OfertaDocumento a las props esperadas por SharedDocumentManager
    // El tipo genérico T_Item para SharedDocumentManagerProps será OfertaDocumentoItemType
    const documentActions: SharedDocumentManagerProps<OfertaDocumentoItemType>['actions'] = {
        fetchItemsAction: (currentOfertaId: string) => // ownerEntityId es ofertaId aquí
            obtenerDocumentosOfertaAction(currentOfertaId),

        addItemAction: (currentOfertaId: string, currentNegocioId: string, currentClienteId: string, formData: FormData) =>
            agregarDocumentoAOfertaAction(currentOfertaId, currentNegocioId, currentClienteId, formData),

        updateItemDetailsAction: (
            documentoId: string, // itemId es documentoId
            currentClienteId: string,
            currentNegocioId: string,
            currentOfertaId: string, // ownerEntityId es ofertaId
            data: UpdateDocumentDetailsData // Este es el tipo genérico del modal
        ) => {
            // Mapear/validar 'data' al tipo específico que espera la action
            const dataForAction: ActualizarDetallesDocumentoOfertaData = {
                documentoNombre: data.documentoNombre ?? undefined, // Zod schema se encarga de '' a null
                descripcion: data.descripcion ?? undefined,
            };
            return actualizarDetallesDocumentoOfertaAction(
                documentoId,
                currentClienteId,
                currentNegocioId,
                currentOfertaId,
                dataForAction
            );
        },

        deleteItemAction: (documentoId: string, currentNegocioId: string, currentClienteId: string, currentOfertaId: string) =>
            eliminarDocumentoDeOfertaAction(documentoId, currentNegocioId, currentClienteId, currentOfertaId),

        updateOrderAction: (currentOfertaId: string, currentNegocioId: string, currentClienteId: string, orderData: ReorderDocumentItemData[]) =>
            actualizarOrdenDocumentosOfertaAction(currentOfertaId, currentNegocioId, currentClienteId, orderData),
    };

    return (
        <SharedDocumentManager<OfertaDocumentoItemType>
            ownerEntityId={ofertaId}
            negocioId={negocioId}
            clienteId={clienteId}
            actions={documentActions}
            itemDisplayName="documento"
            itemDisplayNamePlural="documentos"
            maxDocuments={5} // Puedes ajustar este límite
            maxFileSizeMB={10} // Límite de tamaño por archivo
            acceptedFileTypes={{ // Ejemplo de tipos de archivo aceptados
                'application/pdf': ['.pdf'],
                'application/msword': ['.doc'],
                'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
                'text/plain': ['.txt'],
                'application/vnd.ms-excel': ['.xls', '.xlsx'],
                'application/vnd.ms-powerpoint': ['.ppt', '.pptx'],
            }}
        />
    );
}