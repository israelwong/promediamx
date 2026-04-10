// // Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/[paqueteId]/components/PaqueteVideo.tsx
// 'use client';

// import React from 'react';
// import SharedVideoManager, {
//     type SharedVideoManagerProps,
// } from '@/app/admin/components/shared/SharedVideoManager'; // Ajusta esta ruta si es diferente

// // Actions específicas para NegocioPaqueteVideo
// import {
//     obtenerVideoDelPaqueteAction,
//     guardarVideoPaqueteAction,
//     eliminarVideoDelPaqueteAction
// } from '@/app/admin/_lib/actions/negocioPaqueteVideo/negocioPaqueteVideo.actions'; // Verifica esta ruta

// // Tipos específicos del video de NegocioPaquete y su schema de upsert
// import {
//     type NegocioPaqueteVideoItem as NegocioPaqueteVideoItemType, // Renombrar para claridad con el genérico
//     UpsertNegocioPaqueteVideoSchema,       // El schema Zod específico para el formulario
//     type UpsertNegocioPaqueteVideoData   // El tipo inferido del schema específico
// } from '@/app/admin/_lib/actions/negocioPaqueteVideo/negocioPaqueteVideo.schemas'; // Verifica esta ruta
// // import { ActionResult } from '@/app/admin/_lib/types';

// interface PaqueteVideoProps {
//     paqueteId: string; // Este será el ownerEntityId
//     negocioId: string;
//     clienteId: string;
// }

// export default function PaqueteVideo({ paqueteId, negocioId, clienteId }: PaqueteVideoProps) {

//     // Mapear las actions específicas de NegocioPaqueteVideo a las props esperadas por SharedVideoManager
//     const videoActions: SharedVideoManagerProps<NegocioPaqueteVideoItemType, UpsertNegocioPaqueteVideoData>['actions'] = {
//         fetchVideoAction: (ownerEntityId: string) =>
//             obtenerVideoDelPaqueteAction(ownerEntityId),

//         saveVideoAction: (ownerEntityId: string, currentNegocioId: string, currentClienteId: string, _catalogoId: string | undefined, data: UpsertNegocioPaqueteVideoData, file?: File) =>
//             // La action guardarVideoPaqueteAction no espera catalogoId, así que _catalogoId no se usa.
//             guardarVideoPaqueteAction(ownerEntityId, currentNegocioId, currentClienteId, data, file),

//         deleteVideoAction: (videoId: string, currentNegocioId: string, currentClienteId: string, ownerEntityId: string) =>
//             // La action eliminarVideoDelPaqueteAction necesita el paqueteId como último argumento, que es ownerEntityId.
//             eliminarVideoDelPaqueteAction(videoId, currentNegocioId, currentClienteId, ownerEntityId),
//     };

//     return (
//         <SharedVideoManager<NegocioPaqueteVideoItemType, UpsertNegocioPaqueteVideoData>
//             ownerEntityId={paqueteId}
//             negocioId={negocioId}
//             clienteId={clienteId}
//             // catalogoId no es aplicable aquí, por lo que no se pasa.
//             // SharedVideoManager lo recibirá como undefined y las actions de paquete no lo usan.
//             actions={videoActions}
//             formSchema={UpsertNegocioPaqueteVideoSchema} // Pasar el schema Zod específico del formulario de NegocioPaqueteVideo
//             entityDisplayName="paquete" // Nombre para mensajes y UI
//             maxFileSizeMB={50} // Límite que ya tenías en tu PaqueteVideo.tsx original
//         // videoAspectRatio="aspect-video" // Puedes dejar el default o especificarlo
//         />
//     );
// }
