// 'use client';

// import React from 'react';
// import SharedVideoManager, {
//     type SharedVideoManagerProps,
//     // SharedUpsertVideoData, // No es necesario importar si usamos el específico de abajo
// } from '@/app/admin/components/shared/SharedVideoManager';

// // Actions específicas para OfertaDetalleVideo
// import {
//     obtenerVideoDeDetalleOfertaAction,
//     guardarVideoDetalleOfertaAction,
//     eliminarVideoDeDetalleOfertaAction,
// } from '@/app/admin/_lib/actions/oferta/ofertaDetalleVideos.actions';

// // Tipos específicos del video de OfertaDetalle y su schema de upsert
// import {
//     type OfertaDetalleVideoItemType,
//     UpsertOfertaDetalleVideoSchema,
//     type UpsertOfertaDetalleVideoData,
// } from '@/app/admin/_lib/actions/oferta/ofertaDetalleVideos.schemas';

// interface OfertaDetalleVideoManagerProps {
//     ofertaId: string; // Necesario para construir el path de storage y revalidación en las actions
//     ofertaDetalleId: string; // Este será el ownerEntityId
//     negocioId: string;
//     clienteId: string;
//     initialVideoData?: OfertaDetalleVideoItemType | null; // Para pasar datos ya cargados
// }

// export default function OfertaDetalleVideoManager({
//     ofertaId,
//     ofertaDetalleId,
//     negocioId,
//     clienteId
// }: OfertaDetalleVideoManagerProps) {
//     const MAX_VIDEO_SIZE_MB_SERVER_DETALLE = 16; // Límite de tu plataforma para este tipo de video

//     const videoActions: SharedVideoManagerProps<OfertaDetalleVideoItemType, UpsertOfertaDetalleVideoData>['actions'] = {
//         fetchVideoAction: (currentOfertaDetalleId: string) => // ownerEntityId es ofertaDetalleId
//             obtenerVideoDeDetalleOfertaAction(currentOfertaDetalleId),

//         saveVideoAction: (currentOfertaDetalleId: string, currentNegocioId: string, currentClienteId: string, _catalogoIdNotUsed: string | undefined, data: UpsertOfertaDetalleVideoData, file?: File) =>
//             guardarVideoDetalleOfertaAction(currentOfertaDetalleId, currentNegocioId, currentClienteId, ofertaId, data, file),

//         deleteVideoAction: (videoId: string, currentNegocioId: string, currentClienteId: string, currentOfertaDetalleId: string) =>
//             eliminarVideoDeDetalleOfertaAction(videoId, currentNegocioId, currentClienteId, ofertaId, currentOfertaDetalleId),
//     };

//     const compatibilityHelpNode = (
//         <>
//             <strong>Para WhatsApp:</strong> Se recomienda MP4 (H.264/AAC), &lt;16MB.
//             La plataforma aceptará otros formatos para WebChat, pero podrían no enviarse por WhatsApp.
//             Si no estás seguro, convierte tu video usando {' '}
//             <a href="https://video-converter.com/es/" target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">este conversor online</a>.
//         </>
//     );

//     return (
//         <SharedVideoManager<OfertaDetalleVideoItemType, UpsertOfertaDetalleVideoData>
//             ownerEntityId={ofertaDetalleId}
//             negocioId={negocioId}
//             clienteId={clienteId}
//             // catalogoId no es aplicable aquí
//             actions={videoActions}
//             formSchema={UpsertOfertaDetalleVideoSchema} // Pasar el schema Zod específico
//             entityDisplayName="detalle de oferta"
//             maxFileSizeMB={MAX_VIDEO_SIZE_MB_SERVER_DETALLE} // Límite de tu plataforma para este tipo de video
//             videoAspectRatio="aspect-video"
//             compatibilityHelpText={compatibilityHelpNode}
//         // initialData={initialVideoData} // Si SharedVideoManager acepta prop initialData
//         />
//     );
// }