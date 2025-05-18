// Sugerencia de Ruta: @/app/admin/_components/shared/SharedVideoManager.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useDropzone, FileWithPath } from 'react-dropzone';
import { Button } from '@/app/components/ui/button';
import {
    UploadCloud, Trash2, Loader2, AlertTriangle, CheckCircle, Save, FileVideo
} from 'lucide-react';
import { useForm, SubmitHandler, Controller, Path, DeepPartial, useWatch, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ActionResult } from '@/app/admin/_lib/types';

// --- Tipos Genéricos y Schemas Base ---
export const SharedTipoVideoEnumSchema = z.enum(['SUBIDO', 'YOUTUBE', 'VIMEO', 'OTRO_URL']);
export type SharedTipoVideoType = z.infer<typeof SharedTipoVideoEnumSchema>;

export interface SharedVideoItemBase {
    id: string;
    videoUrl: string;
    tipoVideo: SharedTipoVideoType;
    titulo?: string | null;
    descripcion?: string | null;
    tamañoBytes?: number | null;
    createdAt: Date | string;
    updatedAt: Date | string;
}

export const SharedUpsertVideoDataSchema = z.object({
    tipoVideo: SharedTipoVideoEnumSchema,
    videoUrl: z.string().max(1024).optional().nullable(),
    titulo: z.string().max(150).optional().nullable(),
    descripcion: z.string().max(500).optional().nullable(),
}).refine(data => {
    if (data.tipoVideo !== SharedTipoVideoEnumSchema.enum.SUBIDO) {
        if (!data.videoUrl || data.videoUrl.trim() === '') return false;
        try { new URL(data.videoUrl); return true; } catch { return false; }
    }
    return true;
}, { message: "Se requiere una URL válida para el tipo de video seleccionado.", path: ["videoUrl"] });
export type SharedUpsertVideoData = z.infer<typeof SharedUpsertVideoDataSchema>;

// --- Props del Componente Reutilizable ---
export interface SharedVideoManagerProps<
    T_Item extends SharedVideoItemBase,
    T_UpsertData extends SharedUpsertVideoData
> {
    ownerEntityId: string;
    negocioId: string;
    clienteId: string;
    catalogoId?: string;

    actions: {
        fetchVideoAction: (ownerEntityId: string) => Promise<ActionResult<T_Item | null>>;
        saveVideoAction: (ownerEntityId: string, negocioId: string, clienteId: string, catalogoId: string | undefined, data: T_UpsertData, file?: File) => Promise<ActionResult<T_Item>>;
        deleteVideoAction: (videoId: string, negocioId: string, clienteId: string, ownerEntityId: string, catalogoId: string | undefined) => Promise<ActionResult<void>>;
    };

    formSchema: z.ZodType<T_UpsertData>;
    maxFileSizeMB?: number;
    videoAspectRatio?: string;
    entityDisplayName?: string;
}

export default function SharedVideoManager<
    T_Item extends SharedVideoItemBase,
    T_UpsertData extends SharedUpsertVideoData
>({
    ownerEntityId, negocioId, clienteId, catalogoId,
    actions,
    formSchema,
    maxFileSizeMB = 50,
    videoAspectRatio = "aspect-video",
    entityDisplayName = "entidad"
}: SharedVideoManagerProps<T_Item, T_UpsertData>) {

    const [currentVideo, setCurrentVideo] = useState<T_Item | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null); // Error general de carga
    const [formMessage, setFormMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
    const [selectedFile, setSelectedFile] = useState<File | null>(null);

    const MAX_VIDEO_SIZE_BYTES = maxFileSizeMB * 1024 * 1024;

    const {
        control,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting: isFormSubmitting },
    } = useForm<T_UpsertData>({
        resolver: zodResolver(formSchema),
        defaultValues: { // Usar DefaultValues para el tipo
            tipoVideo: SharedTipoVideoEnumSchema.enum.SUBIDO,
            videoUrl: '',
            titulo: '',
            descripcion: '',
        } as DefaultValues<T_UpsertData>,
    });

    const tipoVideoActual = useWatch({
        control,
        name: "tipoVideo" as Path<T_UpsertData>
    });

    const fetchVideo = useCallback(async () => {
        setIsLoading(true); setError(null); setFormMessage(null);
        const result = await actions.fetchVideoAction(ownerEntityId);
        if (result.success) {
            const videoData = result.data || null;
            setCurrentVideo(videoData ? { ...videoData, createdAt: new Date(videoData.createdAt), updatedAt: new Date(videoData.updatedAt) } as T_Item : null);

            const defaultVals: DefaultValues<T_UpsertData> = videoData ? ({ // Usar DefaultValues
                tipoVideo: videoData.tipoVideo,
                videoUrl: videoData.tipoVideo !== SharedTipoVideoEnumSchema.enum.SUBIDO ? videoData.videoUrl : '',
                titulo: videoData.titulo || '',
                descripcion: videoData.descripcion || '',
            } as DefaultValues<T_UpsertData>) : ({
                tipoVideo: SharedTipoVideoEnumSchema.enum.SUBIDO,
                videoUrl: '', titulo: '', descripcion: ''
            } as DefaultValues<T_UpsertData>);
            reset(defaultVals);
        } else {
            setError(result.error || `Error al cargar el video para ${entityDisplayName}.`);
        }
        setIsLoading(false);
    }, [ownerEntityId, actions, reset, entityDisplayName]);

    useEffect(() => { fetchVideo(); }, [fetchVideo]);

    const onDrop = useCallback((acceptedFiles: FileWithPath[]) => {
        if (acceptedFiles.length > 0) {
            const file = acceptedFiles[0];
            if (file.size > MAX_VIDEO_SIZE_BYTES) {
                setFormMessage({ type: 'error', text: `El archivo "${file.name}" excede ${maxFileSizeMB}MB.` });
                setSelectedFile(null); return;
            }
            setSelectedFile(file); setFormMessage(null);
        }
    }, [maxFileSizeMB, MAX_VIDEO_SIZE_BYTES]);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: { 'video/*': ['.mp4', '.mov', '.avi', '.webm', '.mkv'] },
        multiple: false,
        disabled: !!currentVideo || tipoVideoActual !== SharedTipoVideoEnumSchema.enum.SUBIDO || isFormSubmitting, // Deshabilitar si hay video o no es SUBIDO
    });

    const onSubmitHandler: SubmitHandler<T_UpsertData> = async (dataFromForm) => {
        setFormMessage(null);
        let fileToSubmit: File | undefined = undefined;
        const dataForAction: T_UpsertData = { ...dataFromForm };

        // Si ya hay un video, y no se está subiendo uno nuevo,
        // usamos el tipo y URL del video actual para la acción (actualización de metadatos).
        if (currentVideo && !selectedFile) {
            dataForAction.tipoVideo = currentVideo.tipoVideo;
            if (currentVideo.tipoVideo === SharedTipoVideoEnumSchema.enum.SUBIDO) {
                dataForAction.videoUrl = currentVideo.videoUrl; // Mantener URL si es SUBIDO y no hay nuevo archivo
            }
        }

        if (dataForAction.tipoVideo === SharedTipoVideoEnumSchema.enum.SUBIDO) {
            if (selectedFile) {
                fileToSubmit = selectedFile;
            } else if (!currentVideo || currentVideo.tipoVideo !== SharedTipoVideoEnumSchema.enum.SUBIDO) {
                setFormMessage({ type: 'error', text: "Por favor, selecciona un archivo de video para subir." });
                return;
            }
        }

        const result = await actions.saveVideoAction(ownerEntityId, negocioId, clienteId, catalogoId, dataForAction, fileToSubmit);
        if (result.success && result.data) {
            const savedVideoData = result.data;
            setCurrentVideo(savedVideoData ? { ...savedVideoData, createdAt: new Date(savedVideoData.createdAt), updatedAt: new Date(savedVideoData.updatedAt) } as T_Item : null);
            setSelectedFile(null); // Limpiar archivo seleccionado después de guardar
            const resetData = {
                tipoVideo: result.data.tipoVideo,
                videoUrl: result.data.tipoVideo !== SharedTipoVideoEnumSchema.enum.SUBIDO ? result.data.videoUrl : '',
                titulo: result.data.titulo || '',
                descripcion: result.data.descripcion || '',
            } as DeepPartial<T_UpsertData>;
            reset(resetData as DefaultValues<T_UpsertData>);
            setFormMessage({ type: 'success', text: "Video guardado con éxito." });
        } else {
            setFormMessage({ type: 'error', text: result.error || "Error al guardar el video." });
        }
        setTimeout(() => setFormMessage(null), 5000);
    };

    const handleDeleteVideo = async () => {
        if (currentVideo && confirm("¿Estás seguro de que quieres eliminar este video?")) {
            setFormMessage(null);
            const result = await actions.deleteVideoAction(currentVideo.id, negocioId, clienteId, ownerEntityId, catalogoId);
            if (result.success) {
                setCurrentVideo(null); setSelectedFile(null);
                reset({ tipoVideo: SharedTipoVideoEnumSchema.enum.SUBIDO, videoUrl: '', titulo: '', descripcion: '' } as DefaultValues<T_UpsertData>);
                setFormMessage({ type: 'success', text: "Video eliminado con éxito." });
            } else {
                setFormMessage({ type: 'error', text: result.error || "Error al eliminar el video." });
            }
            setTimeout(() => setFormMessage(null), 5000);
        }
    };

    const cardContainerClasses = "bg-zinc-800/70 rounded-lg border border-zinc-700 p-4 md:p-6 space-y-6";
    const labelClasses = "block text-sm font-medium text-zinc-300 mb-1";
    const inputClasses = "block w-full bg-zinc-900 border-zinc-700 text-zinc-200 rounded-md p-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 placeholder:text-zinc-500 sm:text-sm";
    const selectClasses = `${inputClasses} appearance-none`;
    const errorTextClasses = "text-xs text-red-400 mt-1";
    let dropzoneComputedClasses = `mt-1 flex flex-col justify-center items-center p-6 border-2 border-dashed rounded-md transition-colors min-h-[150px] `;
    // Deshabilitar dropzone si hay un video actual
    if (!!currentVideo || tipoVideoActual !== SharedTipoVideoEnumSchema.enum.SUBIDO || isFormSubmitting) {
        dropzoneComputedClasses += `border-zinc-700 bg-zinc-900 opacity-50 cursor-not-allowed`;
    } else if (isDragActive) {
        dropzoneComputedClasses += `border-blue-500 bg-blue-500/10`;
    } else if (selectedFile) {
        dropzoneComputedClasses += `border-green-500 bg-green-500/5`;
    } else {
        dropzoneComputedClasses += `border-zinc-600 hover:border-blue-400 cursor-pointer`;
    }

    if (isLoading) return <div className={`${cardContainerClasses} flex items-center justify-center`}><Loader2 size={32} className="animate-spin text-zinc-400" /><p className="ml-3 text-zinc-400">Cargando video...</p></div>;
    if (error && !currentVideo) return <div className={`${cardContainerClasses} text-center`}><AlertTriangle size={32} className="mx-auto mb-2 text-red-500" /><p className="text-red-400">{error}</p><Button onClick={fetchVideo} variant="outline" className="mt-4">Reintentar</Button></div>;

    const mostrarControlesFuenteVideo = !currentVideo;

    return (
        <div className={cardContainerClasses}>
            <h3 className="text-base font-semibold text-zinc-100 mb-0">Video Principal de {entityDisplayName.charAt(0).toUpperCase() + entityDisplayName.slice(1)}</h3>
            {currentVideo && (
                <div className="mb-4">
                    <h4 className="text-sm font-medium text-zinc-200 mb-2">Video Actual:</h4>
                    <div className={`${videoAspectRatio} bg-black rounded-md overflow-hidden border border-zinc-700`}>
                        {currentVideo.tipoVideo === SharedTipoVideoEnumSchema.enum.SUBIDO ? (
                            <video src={currentVideo.videoUrl} controls className="w-full h-full object-contain"><p>Tu navegador no soporta videos.</p></video>
                        ) : currentVideo.videoUrl.includes("youtube.com/embed") || currentVideo.videoUrl.includes("youtu.be/") ? (
                            <iframe src={currentVideo.videoUrl.includes("youtu.be/") ? `https://www.youtube.com/embed/${currentVideo.videoUrl.split('/').pop()}` : currentVideo.videoUrl} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowFullScreen className="w-full h-full"></iframe>
                        ) : currentVideo.videoUrl.includes("vimeo.com") ? (
                            <iframe src={`https://player.vimeo.com/video/${currentVideo.videoUrl.split('/').pop()?.split('?')[0]}?title=0&byline=0&portrait=0`} className="w-full h-full" frameBorder="0" allow="autoplay; fullscreen; picture-in-picture" allowFullScreen title={currentVideo.titulo || "Vimeo video player"}></iframe>
                        ) : (
                            <div className="w-full h-full flex items-center justify-center bg-zinc-900 p-4"><a href={currentVideo.videoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline break-all text-center">Ver video en enlace externo</a></div>
                        )}
                    </div>
                    <Button onClick={handleDeleteVideo} variant="destructive" size="sm" className="mt-3 bg-red-700/20 text-red-400 hover:bg-red-600 hover:text-red-100 border border-red-700/30 hover:border-red-600" disabled={isFormSubmitting}><Trash2 size={14} className="mr-1.5" /> Eliminar Video</Button>
                </div>
            )}

            <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-4">
                {mostrarControlesFuenteVideo && (
                    <>
                        <div>
                            <label htmlFor={"tipoVideo" as Path<T_UpsertData>} className={labelClasses}>Fuente del Video</label>
                            <Controller
                                name={"tipoVideo" as Path<T_UpsertData>}
                                control={control}
                                render={({ field }) => (
                                    <select {...field} id="tipoVideoShared" className={`${selectClasses} ${errors.tipoVideo ? 'border-red-500' : ''}`} disabled={isFormSubmitting}
                                        value={field.value || SharedTipoVideoEnumSchema.enum.SUBIDO}
                                        onChange={(e) => {
                                            const newType = e.target.value as SharedTipoVideoType;
                                            field.onChange(newType); setSelectedFile(null);
                                            // No limpiar videoUrl aquí si el usuario está cambiando de idea antes de guardar
                                            // setValue("videoUrl" as Path<T_UpsertData>, ''); 
                                        }}>
                                        <option value={SharedTipoVideoEnumSchema.enum.SUBIDO}>Subir archivo de video</option>
                                        <option value={SharedTipoVideoEnumSchema.enum.YOUTUBE}>Enlace de YouTube</option>
                                        <option value={SharedTipoVideoEnumSchema.enum.VIMEO}>Enlace de Vimeo</option>
                                        <option value={SharedTipoVideoEnumSchema.enum.OTRO_URL}>Otro Enlace (URL directa)</option>
                                    </select>
                                )}
                            />
                            {errors.tipoVideo && <p className={errorTextClasses}>{String(errors.tipoVideo.message)}</p>}
                        </div>

                        {tipoVideoActual === SharedTipoVideoEnumSchema.enum.SUBIDO && (
                            <div>
                                <label className={labelClasses}>Seleccionar Archivo de Video</label>
                                <div {...getRootProps({ className: dropzoneComputedClasses })}>
                                    <input {...getInputProps()} />
                                    <div className="text-center space-y-1">
                                        <UploadCloud size={32} className={`mx-auto ${selectedFile ? 'text-green-500' : 'text-zinc-500'}`} />
                                        {selectedFile ? (
                                            <>
                                                <p className="text-sm text-green-400 font-medium">Archivo listo:</p>
                                                <p className="text-xs text-zinc-300 bg-zinc-700 px-2 py-1 rounded inline-block"><FileVideo size={14} className="inline mr-1.5" />{selectedFile.name} ({(selectedFile.size / 1024 / 1024).toFixed(2)} MB)</p>
                                                <Button type="button" variant="link" size="sm" className="text-red-500 hover:text-red-400 text-xs p-0 h-auto mt-1" onClick={(e) => { e.stopPropagation(); setSelectedFile(null); }}>Quitar</Button>
                                            </>
                                        ) : (<p className="text-sm text-zinc-400">Arrastra y suelta o <span className="font-semibold text-blue-400">haz clic</span>.</p>)}
                                        <p className="text-xs text-zinc-500 mt-1">Máx {maxFileSizeMB}MB. Formatos: MP4, MOV, etc.</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {tipoVideoActual !== SharedTipoVideoEnumSchema.enum.SUBIDO && (
                            <div>
                                <label htmlFor={"videoUrl" as Path<T_UpsertData>} className={labelClasses}>Enlace del Video <span className="text-red-500">*</span></label>
                                <Controller
                                    name={"videoUrl" as Path<T_UpsertData>}
                                    control={control}
                                    render={({ field }) => (
                                        <input {...field} id="videoUrlShared" type="url"
                                            className={`${inputClasses} ${errors.videoUrl ? 'border-red-500' : ''}`}
                                            placeholder={tipoVideoActual === SharedTipoVideoEnumSchema.enum.YOUTUBE ? "Ej: https://www.youtube.com/watch?v=VIDEO_ID" : tipoVideoActual === SharedTipoVideoEnumSchema.enum.VIMEO ? "Ej: https://vimeo.com/VIDEO_ID" : "Ej: https://ejemplo.com/video.mp4"}
                                            disabled={isFormSubmitting}
                                            value={field.value || ''}
                                        />
                                    )}
                                />
                                {errors.videoUrl && <p className={errorTextClasses}>{errors.videoUrl.message as string}</p>}
                            </div>
                        )}
                    </>
                )}

                <div>
                    <label htmlFor={"titulo" as Path<T_UpsertData>} className={labelClasses}>Título del Video (Opcional)</label>
                    <Controller name={"titulo" as Path<T_UpsertData>} control={control} render={({ field }) => <input {...field} id="tituloShared" type="text" className={`${inputClasses} ${errors.titulo ? 'border-red-500' : ''}`} placeholder="Ej: Video Promocional" disabled={isFormSubmitting} value={field.value || ''} />} />
                    {errors.titulo && <p className={errorTextClasses}>{String(errors.titulo.message)}</p>}
                </div>
                <div>
                    <label htmlFor={"descripcion" as Path<T_UpsertData>} className={labelClasses}>Descripción del Video (Opcional)</label>
                    <Controller name={"descripcion" as Path<T_UpsertData>} control={control} render={({ field }) => <textarea {...field} id="descripcionVideoShared" rows={2} className={`${inputClasses} ${errors.descripcion ? 'border-red-500' : ''}`} placeholder="Breve descripción..." disabled={isFormSubmitting} value={field.value || ''} />} />
                    {errors.descripcion && <p className={errorTextClasses}>{errors.descripcion.message as string}</p>}
                </div>

                {formMessage && (
                    <div className={`p-3 rounded-md flex items-center gap-2 text-sm mt-4 ${formMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                        {formMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                        <p>{formMessage.text}</p>
                    </div>
                )}
                <div className="flex justify-end pt-2">
                    <Button type="submit" disabled={isFormSubmitting || isLoading} className="bg-blue-600 hover:bg-blue-700 min-w-[150px]">
                        {isFormSubmitting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                        {isFormSubmitting ? 'Guardando...' : (currentVideo ? 'Actualizar Video' : 'Guardar Video')}
                    </Button>
                </div>
            </form>
        </div>
    );
}
