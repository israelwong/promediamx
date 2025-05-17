// // Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/[paqueteId]/components/PaqueteVideo.tsx
// 'use client';

// import React, { useState, useEffect, useCallback } from 'react';
// import { useDropzone } from 'react-dropzone';
// import { Button } from '@/app/components/ui/button';
// import {
//     UploadCloud,
//     Trash2,
//     Loader2,
//     AlertTriangle,
//     CheckCircle,
//     Save,
//     FileVideo
// } from 'lucide-react';

// import {
//     NegocioPaqueteVideoItem,
//     UpsertNegocioPaqueteVideoData,
//     UpsertNegocioPaqueteVideoSchema,
//     TipoVideoEnum,
//     TipoVideo
// } from '@/app/admin/_lib/actions/negocioPaqueteVideo/negocioPaqueteVideo.schemas';
// import {
//     obtenerVideoDelPaqueteAction,
//     guardarVideoPaqueteAction,
//     eliminarVideoDelPaqueteAction
// } from '@/app/admin/_lib/actions/negocioPaqueteVideo/negocioPaqueteVideo.actions';
// import { useForm, SubmitHandler, Controller } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';

// const MAX_VIDEO_SIZE_MB = 50;
// const MAX_VIDEO_SIZE_BYTES = MAX_VIDEO_SIZE_MB * 1024 * 1024;

// interface PaqueteVideoProps {
//     paqueteId: string;
//     negocioId: string;
//     clienteId: string;
// }

// export default function PaqueteVideo({ paqueteId, negocioId, clienteId }: PaqueteVideoProps) {
//     const [currentVideo, setCurrentVideo] = useState<NegocioPaqueteVideoItem | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [error, setError] = useState<string | null>(null);
//     const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

//     const [selectedFile, setSelectedFile] = useState<File | null>(null);
//     // const fileInputRef = useRef<HTMLInputElement>(null); // No es estrictamente necesario con useDropzone

//     const {
//         register,
//         handleSubmit,
//         control,
//         setValue,
//         watch,
//         reset,
//         formState: { errors, isSubmitting },
//     } = useForm<UpsertNegocioPaqueteVideoData>({
//         resolver: zodResolver(UpsertNegocioPaqueteVideoSchema),
//         defaultValues: {
//             tipoVideo: TipoVideoEnum.enum.SUBIDO,
//             videoUrl: '',
//             titulo: '',
//             descripcion: '',
//         }
//     });

//     const tipoVideoActual = watch('tipoVideo');

//     const fetchVideo = useCallback(async () => {
//         setIsLoading(true);
//         setError(null);
//         const result = await obtenerVideoDelPaqueteAction(paqueteId);
//         if (result.success) {
//             setCurrentVideo(result.data || null);
//             if (result.data) {
//                 reset({
//                     tipoVideo: result.data.tipoVideo,
//                     videoUrl: result.data.tipoVideo !== TipoVideoEnum.enum.SUBIDO ? result.data.videoUrl : '',
//                     titulo: result.data.titulo || '',
//                     descripcion: result.data.descripcion || '',
//                 });
//             } else {
//                 reset({
//                     tipoVideo: TipoVideoEnum.enum.SUBIDO,
//                     videoUrl: '',
//                     titulo: '',
//                     descripcion: '',
//                 });
//             }
//         } else {
//             setError(result.error || "Error al cargar el video.");
//         }
//         setIsLoading(false);
//     }, [paqueteId, reset]);

//     useEffect(() => {
//         fetchVideo();
//     }, [fetchVideo]);

//     const onDrop = useCallback((acceptedFiles: File[]) => {
//         if (acceptedFiles.length > 0) {
//             const file = acceptedFiles[0];
//             // console.log("[PaqueteVideo] onDrop - Archivo seleccionado/arrastrado:", file);
//             if (file.size > MAX_VIDEO_SIZE_BYTES) {
//                 setFormMessage({ type: 'error', text: `El archivo "${file.name}" excede el límite de ${MAX_VIDEO_SIZE_MB}MB.` });
//                 setSelectedFile(null);
//                 return;
//             }
//             setSelectedFile(file);
//             setFormMessage(null);
//         }
//     }, []);

//     const { getRootProps, getInputProps, isDragActive } = useDropzone({
//         onDrop,
//         accept: { 'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'] },
//         multiple: false,
//         disabled: tipoVideoActual !== TipoVideoEnum.enum.SUBIDO || isSubmitting, // Deshabilitar si no es tipo SUBIDO o si se está enviando
//         // noClick: false, // Dejar que el div raíz sea clickeable por defecto
//     });

//     const onSubmit: SubmitHandler<UpsertNegocioPaqueteVideoData> = async (data) => {
//         setFormMessage(null);
//         let fileToSubmit: File | undefined = undefined;

//         if (data.tipoVideo === TipoVideoEnum.enum.SUBIDO) {
//             if (selectedFile) {
//                 fileToSubmit = selectedFile;
//             } else if (!currentVideo || currentVideo.tipoVideo !== TipoVideoEnum.enum.SUBIDO) {
//                 setFormMessage({ type: 'error', text: "Por favor, selecciona un archivo de video para subir." });
//                 return;
//             }
//         } else {
//             if (!data.videoUrl || data.videoUrl.trim() === '') {
//                 setFormMessage({ type: 'error', text: "Por favor, ingresa la URL del video." });
//                 return;
//             }
//         }

//         const result = await guardarVideoPaqueteAction(paqueteId, negocioId, clienteId, data, fileToSubmit);
//         if (result.success && result.data) {
//             setCurrentVideo(result.data);
//             setSelectedFile(null);
//             reset({
//                 tipoVideo: result.data.tipoVideo,
//                 videoUrl: result.data.tipoVideo !== TipoVideoEnum.enum.SUBIDO ? result.data.videoUrl : '',
//                 titulo: result.data.titulo || '',
//                 descripcion: result.data.descripcion || '',
//             });
//             setFormMessage({ type: 'success', text: "Video guardado con éxito." });
//         } else {
//             setFormMessage({ type: 'error', text: result.error || "Error al guardar el video." });
//         }
//         setTimeout(() => setFormMessage(null), 5000);
//     };

//     const handleDeleteVideo = async () => {
//         if (currentVideo && confirm("¿Estás seguro de que quieres eliminar este video?")) {
//             setFormMessage(null);
//             const result = await eliminarVideoDelPaqueteAction(currentVideo.id, negocioId, clienteId, paqueteId);
//             if (result.success) {
//                 setCurrentVideo(null);
//                 setSelectedFile(null);
//                 reset({ tipoVideo: TipoVideoEnum.enum.SUBIDO, videoUrl: '', titulo: '', descripcion: '' });
//                 setFormMessage({ type: 'success', text: "Video eliminado con éxito." });
//             } else {
//                 setFormMessage({ type: 'error', text: result.error || "Error al eliminar el video." });
//             }
//             setTimeout(() => setFormMessage(null), 5000);
//         }
//     };

//     const labelClasses = "block text-sm font-medium text-zinc-300 mb-1";
//     const inputClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2.5 shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
//     const selectClasses = `${inputClasses} appearance-none`;
//     const errorTextClasses = "text-xs text-red-400 mt-1";

//     // Clases para Dropzone, simplificadas para prueba y luego se pueden componer
//     let dropzoneComputedClasses = `${"mt-1 flex flex-col justify-center items-center p-6 border-2 border-dashed rounded-md transition-colors"} `;
//     if (tipoVideoActual !== TipoVideoEnum.enum.SUBIDO || isSubmitting) {
//         dropzoneComputedClasses += `${"border-zinc-700 bg-zinc-900 opacity-50 cursor-not-allowed"}`;
//     } else if (isDragActive) {
//         dropzoneComputedClasses += `${"border-blue-500 bg-blue-500/10"}`;
//     } else if (selectedFile) {
//         dropzoneComputedClasses += `${"border-green-500"}`;
//     } else {
//         dropzoneComputedClasses += `${"border-zinc-600 hover:border-blue-400 cursor-pointer"}`;
//     }


//     if (isLoading) {
//         return (
//             <div className="bg-zinc-800/70 rounded-lg border border-zinc-700 p-6 flex items-center justify-center min-h-[200px]">
//                 <Loader2 size={32} className="animate-spin text-zinc-400" /> <p className="ml-3 text-zinc-400">Cargando video...</p>
//             </div>
//         );
//     }
//     if (error && !currentVideo) {
//         return (
//             <div className="bg-zinc-800/70 rounded-lg border border-zinc-700 p-6 text-center">
//                 <AlertTriangle size={32} className="mx-auto mb-2 text-red-500" />
//                 <p className="text-red-400">{error}</p>
//                 <Button onClick={fetchVideo} variant="outline" className="mt-4 border-zinc-600 hover:bg-zinc-700">Reintentar</Button>
//             </div>
//         );
//     }

//     const mostrarAreaDeSubida = tipoVideoActual === TipoVideoEnum.enum.SUBIDO;
//     // Condición para mostrar el input de reemplazo: si hay un video actual de tipo SUBIDO y no hay un nuevo archivo seleccionado.
//     //   const mostrarInputReemplazoSimple = currentVideo && currentVideo.tipoVideo === TipoVideoEnum.enum.SUBIDO && !selectedFile;

//     return (
//         <div className="bg-zinc-800/70 rounded-lg border border-zinc-700 p-4 md:p-6 space-y-6">

//             {currentVideo && (
//                 <div className="mb-6">
//                     <h4 className="text-md font-medium text-zinc-200 mb-2">Video Actual:</h4>
//                     <div className="aspect-video bg-black rounded-md overflow-hidden border border-zinc-700">
//                         {currentVideo.tipoVideo === TipoVideoEnum.enum.SUBIDO ? (
//                             <video src={currentVideo.videoUrl} controls className="w-full h-full object-contain">
//                                 Tu navegador no soporta el tag de video.
//                             </video>
//                         ) : currentVideo.videoUrl.includes("youtube.com") || currentVideo.videoUrl.includes("youtu.be") ? (
//                             <iframe
//                                 src={currentVideo.videoUrl.includes("embed") ? currentVideo.videoUrl :
//                                     `https://www.youtube.com/embed/${currentVideo.videoUrl.split('v=')[1]?.split('&')[0] || currentVideo.videoUrl.split('/').pop()}`
//                                 }
//                                 title="YouTube video player"
//                                 frameBorder="0"
//                                 allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
//                                 allowFullScreen
//                                 className="w-full h-full"
//                             ></iframe>
//                         ) : currentVideo.videoUrl.includes("vimeo.com") ? (
//                             <iframe
//                                 src={`https://player.vimeo.com/video/${currentVideo.videoUrl.split('/').pop()?.split('?')[0]}?title=0&byline=0&portrait=0`}
//                                 className="w-full h-full"
//                                 frameBorder="0"
//                                 allow="autoplay; fullscreen; picture-in-picture"
//                                 allowFullScreen
//                                 title={currentVideo.titulo || "Vimeo video player"}>
//                             </iframe>
//                         ) : (
//                             <div className="w-full h-full flex items-center justify-center bg-zinc-900">
//                                 <a href={currentVideo.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all p-4 text-center">
//                                     Ver video en enlace externo: {currentVideo.videoUrl}
//                                 </a>
//                             </div>
//                         )}
//                     </div>
//                     <Button
//                         onClick={handleDeleteVideo}
//                         variant="destructive"
//                         size="sm"
//                         className="mt-3 bg-red-700/20 text-red-400 hover:bg-red-600 hover:text-red-100 border border-red-700/30 hover:border-red-600"
//                         disabled={isSubmitting}
//                     >
//                         <Trash2 size={14} className="mr-1.5" /> Eliminar Video Actual
//                     </Button>
//                 </div>
//             )}

//             <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
//                 <div>
//                     <label htmlFor="tipoVideo" className={labelClasses}>Fuente del Video</label>
//                     <Controller
//                         name="tipoVideo"
//                         control={control}
//                         render={({ field }) => (
//                             <select
//                                 {...field}
//                                 className={`${selectClasses} ${errors.tipoVideo ? 'border-red-500' : ''}`}
//                                 disabled={isSubmitting}
//                                 onChange={(e) => {
//                                     const newType = e.target.value as TipoVideo;
//                                     field.onChange(newType);
//                                     setSelectedFile(null);
//                                     if (newType !== TipoVideoEnum.enum.SUBIDO) {
//                                         setValue('videoUrl', currentVideo && currentVideo.tipoVideo === newType ? currentVideo.videoUrl : '');
//                                     } else {
//                                         setValue('videoUrl', '');
//                                     }
//                                 }}
//                             >
//                                 <option value={TipoVideoEnum.enum.SUBIDO}>Subir archivo de video</option>
//                                 <option value={TipoVideoEnum.enum.YOUTUBE}>Enlace de YouTube</option>
//                                 <option value={TipoVideoEnum.enum.VIMEO}>Enlace de Vimeo</option>
//                                 <option value={TipoVideoEnum.enum.OTRO_URL}>Otro Enlace (URL directa)</option>
//                             </select>
//                         )}
//                     />
//                     {errors.tipoVideo && <p className={errorTextClasses}>{errors.tipoVideo.message}</p>}
//                 </div>

//                 {mostrarAreaDeSubida && ( // Condición principal para mostrar la UI de subida
//                     <div>
//                         <label className={labelClasses}>
//                             {currentVideo && currentVideo.tipoVideo === TipoVideoEnum.enum.SUBIDO && !selectedFile
//                                 ? 'Reemplazar Archivo de Video'
//                                 : 'Seleccionar Archivo de Video'}
//                         </label>

//                         {/* Dropzone se muestra si no hay video actual de tipo SUBIDO, o si hay un archivo seleccionado */}
//                         {(!currentVideo || currentVideo.tipoVideo !== TipoVideoEnum.enum.SUBIDO || selectedFile) ? (
//                             <div {...getRootProps({ className: dropzoneComputedClasses })}>
//                                 <input {...getInputProps()} />
//                                 <div className="text-center space-y-1">
//                                     <UploadCloud size={32} className={`mx-auto ${selectedFile ? 'text-green-500' : 'text-zinc-500'}`} />
//                                     {selectedFile ? (
//                                         <>
//                                             <p className="text-sm text-green-400 font-medium">Archivo listo para subir:</p>
//                                             <p className="text-xs text-zinc-300 bg-zinc-700 px-2 py-1 rounded inline-block">
//                                                 <FileVideo size={14} className="inline mr-1.5" />
//                                                 {selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)
//                                             </p>
//                                             <Button type="button" variant="link" size="sm" className="text-red-500 hover:text-red-400 text-xs p-0 h-auto mt-1"
//                                                 onClick={(e) => {
//                                                     e.stopPropagation();
//                                                     setSelectedFile(null);
//                                                 }}>
//                                                 Quitar archivo
//                                             </Button>
//                                         </>
//                                     ) : (
//                                         <p className="text-sm text-zinc-400">
//                                             Arrastra y suelta un video aquí, o{' '}
//                                             <span className="font-semibold text-blue-400">haz clic en esta área</span>.
//                                         </p>
//                                     )}
//                                     <p className="text-xs text-zinc-500 mt-1">Formatos: MP4, MOV, AVI, WEBM, MKV. Máx {MAX_VIDEO_SIZE_MB}MB.</p>
//                                     <p className="text-xs text-zinc-500">Recomendación: videos cortos (15-60s).</p>
//                                 </div>
//                             </div>
//                         ) : (
//                             // Mostrar un input nativo simple para reemplazar si ya hay un video subido y no se ha seleccionado uno nuevo
//                             <div className="mt-1">
//                                 <input
//                                     type="file"
//                                     id="videoFileReplace"
//                                     onChange={(e) => {
//                                         if (e.target.files && e.target.files.length > 0) {
//                                             onDrop(Array.from(e.target.files)); // Reutilizar onDrop
//                                         }
//                                     }}
//                                     accept="video/mp4,video/quicktime,video/x-msvideo,video/webm,video/x-matroska"
//                                     className="block w-full text-sm text-zinc-400 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-600/20 file:text-blue-300 hover:file:bg-blue-600/30 disabled:opacity-50"
//                                     disabled={isSubmitting}
//                                 />
//                             </div>
//                         )}
//                     </div>
//                 )}

//                 {tipoVideoActual !== TipoVideoEnum.enum.SUBIDO && (
//                     <div>
//                         <label htmlFor="videoUrl" className={labelClasses}>Enlace del Video <span className="text-red-500">*</span></label>
//                         <input id="videoUrl" type="url" {...register('videoUrl')}
//                             className={`${inputClasses} ${errors.videoUrl ? 'border-red-500' : ''}`}
//                             placeholder={
//                                 tipoVideoActual === TipoVideoEnum.enum.YOUTUBE ? "Ej: https://www.youtube.com/watch?v=..." :
//                                     tipoVideoActual === TipoVideoEnum.enum.VIMEO ? "Ej: https://vimeo.com/..." :
//                                         "Ej: https://ejemplo.com/video.mp4"
//                             }
//                             disabled={isSubmitting} />
//                         {errors.videoUrl && <p className={errorTextClasses}>{errors.videoUrl.message}</p>}
//                     </div>
//                 )}

//                 <div>
//                     <label htmlFor="titulo" className={labelClasses}>Título del Video (Opcional)</label>
//                     <input id="titulo" type="text" {...register('titulo')}
//                         className={`${inputClasses} ${errors.titulo ? 'border-red-500' : ''}`}
//                         placeholder="Ej: Reel Promocional Paquete Bodas"
//                         disabled={isSubmitting} />
//                     {errors.titulo && <p className={errorTextClasses}>{errors.titulo.message}</p>}
//                 </div>

//                 <div>
//                     <label htmlFor="descripcionVideo" className={labelClasses}>Descripción del Video (Opcional)</label>
//                     <textarea id="descripcionVideo" {...register('descripcion')} rows={2}
//                         className={`${inputClasses} ${errors.descripcion ? 'border-red-500' : ''}`}
//                         placeholder="Breve descripción del contenido del video..."
//                         disabled={isSubmitting} />
//                     {errors.descripcion && <p className={errorTextClasses}>{errors.descripcion.message}</p>}
//                 </div>

//                 {formMessage && (
//                     <div className={`p-3 rounded-md flex items-center gap-2 text-sm mt-4 ${formMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
//                         {formMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
//                         <p>{formMessage.text}</p>
//                     </div>
//                 )}

//                 <div className="flex justify-end pt-4">
//                     <Button type="submit" disabled={isSubmitting || isLoading} className="bg-blue-600 hover:bg-blue-700 min-w-[150px]">
//                         {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
//                         {isSubmitting ? 'Guardando...' : (currentVideo ? 'Actualizar Video' : 'Guardar Video')}
//                     </Button>
//                 </div>
//             </form>
//         </div>
//     );
// }
