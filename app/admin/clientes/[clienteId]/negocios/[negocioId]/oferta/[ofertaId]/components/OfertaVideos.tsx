// // Ruta sugerida: app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/[ofertaId]/components/OfertaVideos.tsx
// 'use client';

// import React from 'react';
// import SharedVideoManager, {
//     type SharedVideoManagerProps,
// } from '@/app/admin/components/shared/SharedVideoManager'; // Ajusta esta ruta si es diferente

// // Actions específicas para OfertaVideos
// import {
//     obtenerVideoDeOfertaAction,
//     guardarVideoOfertaAction,
//     eliminarVideoDeOfertaAction,
//     // testearCompatibilidadVideoOfertaWhatsAppAction, // Importar la nueva action

// } from '@/app/admin/_lib/actions/oferta/ofertaVideos.actions'; // Verifica esta ruta

// // Tipos específicos del video de Oferta y su schema de upsert
// import {
//     type OfertaVideoItemType,
//     UpsertOfertaVideoSchema,       // El schema Zod específico para el formulario
//     type UpsertOfertaVideoData     // El tipo inferido del schema Zod
// } from '@/app/admin/_lib/actions/oferta/ofertaVideos.schemas'; // Verifica esta ruta
// // import { ActionResult } from '@/app/admin/_lib/types';

// interface OfertaVideosProps {
//     ofertaId: string; // Este será el ownerEntityId
//     negocioId: string;
//     clienteId: string;
//     // catalogoId no es necesario para las ofertas
// }

// export default function OfertaVideos({ ofertaId, negocioId, clienteId }: OfertaVideosProps) {

//     // Mapear las actions específicas de OfertaVideos a las props esperadas por SharedVideoManager
//     const videoActions: SharedVideoManagerProps<OfertaVideoItemType, UpsertOfertaVideoData>['actions'] = {
//         fetchVideoAction: (ownerEntityId: string) =>
//             obtenerVideoDeOfertaAction(ownerEntityId),

//         saveVideoAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, _catalogoId: string | undefined, data: UpsertOfertaVideoData, file?: File) =>
//             // La action guardarVideoOfertaAction no espera catalogoId.
//             guardarVideoOfertaAction(ownerEntityId, currentNegocioId, currentClienteId, data, file),

//         deleteVideoAction: (videoId: string, currentNegocioId: string, currentClienteId: string, ownerEntityId: string) =>
//             // La action eliminarVideoDeOfertaAction necesita el ofertaId (ownerEntityId) como último argumento.
//             eliminarVideoDeOfertaAction(videoId, currentNegocioId, currentClienteId, ownerEntityId),

//     };

//     const compatibilityHelpNode = (
//         <>
//             WhatsApp recomienda videos en formato MP4 con códec H.264 (video) y AAC (audio), y un tamaño menor a 16MB.
//             Sube tu video y luego usa el botón &quot;Verificar Compatibilidad&quot; para una prueba preliminar con la API de WhatsApp.
//             Si encuentras problemas, puedes usar un conversor externo como {' '}
//             <a href="https://video-converter.com/es/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">Video converter</a> o similar.
//         </>
//     );

//     return (
//         <SharedVideoManager<OfertaVideoItemType, UpsertOfertaVideoData>
//             ownerEntityId={ofertaId}
//             negocioId={negocioId}
//             clienteId={clienteId}
//             // catalogoId no es aplicable aquí.
//             actions={videoActions}
//             formSchema={UpsertOfertaVideoSchema} // Pasar el schema Zod específico del formulario de OfertaVideos
//             entityDisplayName="oferta" // Nombre para mensajes y UI
//             maxFileSizeMB={25} // Puedes ajustar este límite si es diferente para videos de ofertas
//             videoAspectRatio="aspect-video" // O el aspect ratio que prefieras
//             compatibilityHelpText={compatibilityHelpNode} // Pasar el texto de ayuda

//         />
//     );
// }
import React from 'react'

export default function OfertaVideos() {
    return (
        <div>

        </div>
    )
}
