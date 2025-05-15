'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
// import { useRouter } from 'next/navigation'; // No se usa activamente

import {
    obtenerFuncionDeTarea,
    obtenerFuncionesTareaConParametros,
    asociarFuncionATarea
} from '@/app/admin/_lib/tareaFuncion.actions';

import {
    FuncionConDetalles
} from '@/app/admin/_lib/tareaFuncion.type';

import {
    Loader2,
    Cog,
    PlusIcon,
    LinkIcon,
    UnlinkIcon,
    AlertTriangleIcon,
    XIcon,
    InfoIcon,
    CheckIcon,
    Settings2 // Otro icono posible para función
} from 'lucide-react';

interface TareaFuncionAsociadaProps {
    tareaId: string;
}

export default function TareaFuncionAsociada({ tareaId }: TareaFuncionAsociadaProps) {
    // const router = useRouter(); 
    const [funcionAsociada, setFuncionAsociada] = useState<FuncionConDetalles | null>(null);
    const [todasLasFunciones, setTodasLasFunciones] = useState<FuncionConDetalles[]>([]);
    const [selectedFuncionId, setSelectedFuncionId] = useState<string>('');
    const [funcionParaPreview, setFuncionParaPreview] = useState<FuncionConDetalles | null>(null);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [parametroCopiadoId, setParametroCopiadoId] = useState<string | null>(null);

    // --- NUEVO ESTADO para controlar la visibilidad del selector ---
    const [mostrarSelector, setMostrarSelector] = useState(false);


    // Clases de UI
    const sectionContainerClasses = "bg-zinc-800 rounded-lg shadow-md";
    const headerSectionClasses = "flex items-center justify-between border-b border-zinc-700 pb-3 px-4 pt-4 sm:px-6"; // Eliminado mb-4
    const headerTitleClasses = "text-base sm:text-lg font-semibold text-zinc-100 flex items-center gap-2.5"; // Aumentado gap
    const contentPaddingClasses = "p-4 sm:p-6";

    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out";
    const buttonSecondaryClasses = "bg-zinc-700 hover:bg-zinc-600 text-zinc-200 text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-150 ease-in-out";
    const buttonDangerClasses = "bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 disabled:opacity-50";

    const selectBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const paramTagDisplayClasses = "text-xs px-2 py-1 rounded-full bg-zinc-700 text-zinc-300 inline-flex items-center gap-1.5 whitespace-nowrap";
    const paramTagButtonClasses = `${paramTagDisplayClasses} cursor-pointer hover:bg-zinc-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800`;

    const alertErrorClasses = "text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2";
    const previewContainerClasses = "mt-4 p-3 sm:p-4 border border-zinc-700 rounded-md bg-zinc-900/30 space-y-3"; // Ajustado padding
    const copiedNotificationClasses = "absolute -top-2.5 -right-2.5 bg-green-500 text-white text-[10px] px-1.5 py-0.5 rounded-full shadow-lg flex items-center gap-1 z-10";


    const cargarDatos = useCallback(async () => {
        setLoading(true);
        setError(null);
        setFuncionParaPreview(null);
        setSelectedFuncionId('');
        setMostrarSelector(false); // Resetear visibilidad del selector
        try {
            const [funcionActual, disponibles] = await Promise.all([
                obtenerFuncionDeTarea(tareaId),
                obtenerFuncionesTareaConParametros()
            ]);

            setFuncionAsociada(funcionActual ? { ...funcionActual, orden: funcionActual.orden ?? undefined } : null);
            setTodasLasFunciones((disponibles || []).map(funcion => ({
                ...funcion,
                orden: funcion.orden ?? undefined,
            })));
            if (funcionActual) {
                setMostrarSelector(false); // Si ya hay una asociada, no mostrar selector al inicio
            }

        } catch (err) {
            console.error("Error al cargar datos de función:", err);
            setError(err instanceof Error ? err.message : "No se pudo cargar la información de la función.");
        } finally {
            setLoading(false);
        }
    }, [tareaId]);

    useEffect(() => {
        cargarDatos();
    }, [cargarDatos]);

    useEffect(() => {
        if (selectedFuncionId && mostrarSelector) { // Solo actualizar preview si el selector está visible
            const func = todasLasFunciones.find(f => f.id === selectedFuncionId);
            setFuncionParaPreview(func || null);
        } else {
            setFuncionParaPreview(null);
        }
    }, [selectedFuncionId, todasLasFunciones, mostrarSelector]);

    const handleAsociar = async () => {
        if (!selectedFuncionId || !funcionParaPreview) {
            setError("Por favor, selecciona una función válida para asociar.");
            return;
        }
        setIsSubmitting(true);
        setError(null);
        try {
            const result = await asociarFuncionATarea(tareaId, selectedFuncionId);
            if (result.success) {
                await cargarDatos(); // Recarga todo, lo que ocultará el selector
            } else {
                setError(result.error || "Error al asociar la función.");
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : "Error al asociar la función.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDesvincular = async () => {
        if (!funcionAsociada) return;
        if (confirm(`¿Estás seguro de que quieres desvincular la función "${funcionAsociada.nombreVisible}" de esta tarea?`)) {
            setIsSubmitting(true);
            setError(null);
            try {
                const result = await asociarFuncionATarea(tareaId, null);
                if (result.success) {
                    setFuncionAsociada(null); // Importante para que se muestre la opción de asociar
                    setSelectedFuncionId('');
                    setFuncionParaPreview(null);
                    setMostrarSelector(false); // Ocultar selector después de desvincular
                    await cargarDatos(); // Recargar lista de funciones disponibles
                } else {
                    setError(result.error || "Error al desvincular la función.");
                }
            } catch (err) {
                setError(err instanceof Error ? err.message : "Error al desvincular la función.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    const copiarAlPortapapeles = (texto: string, parametroId: string) => {
        if (!texto) return;
        navigator.clipboard.writeText(texto).then(() => {
            setParametroCopiadoId(parametroId);
            setTimeout(() => setParametroCopiadoId(null), 2000);
        }).catch(err => {
            console.error('Error al copiar texto: ', err);
        });
    };

    const renderParametros = (parametros?: FuncionConDetalles['parametrosRequeridos'], permitirCopia = false) => {
        if (!parametros || parametros.length === 0) {
            return <p className="text-xs sm:text-sm text-zinc-500 italic">Sin parámetros estándar.</p>;
        }
        return (
            <div className="flex flex-wrap gap-2 items-start">
                {parametros.map(pr => pr.parametroRequerido ? (
                    <div key={pr.parametroRequerido.id} className="relative">
                        {permitirCopia ? (
                            <button
                                type="button"
                                onClick={() => copiarAlPortapapeles(pr.parametroRequerido!.nombreInterno || '', pr.parametroRequerido!.id)}
                                className={paramTagButtonClasses}
                                title={`Copiar ID: ${pr.parametroRequerido.nombreInterno}\nTipo: ${pr.parametroRequerido.tipoDato}\n${'descripcion' in pr.parametroRequerido ? pr.parametroRequerido.descripcion : ''}`}
                            >
                                {pr.parametroRequerido.nombreVisible}
                                {pr.esObligatorio && <span className="ml-1 text-amber-400 font-bold">*</span>}
                            </button>
                        ) : (
                            <span
                                className={paramTagDisplayClasses}
                                title={`ID: ${pr.parametroRequerido.nombreInterno}\nTipo: ${pr.parametroRequerido.tipoDato}${'descripcion' in pr.parametroRequerido ? `\n${pr.parametroRequerido.descripcion}` : ''}`}
                            >
                                {pr.parametroRequerido.nombreVisible}
                                {pr.esObligatorio && <span className="ml-1 text-amber-400 font-bold">*</span>}
                            </span>
                        )}
                        {permitirCopia && parametroCopiadoId === pr.parametroRequerido.id && (
                            <span className={copiedNotificationClasses}>
                                <CheckIcon size={10} /> Copiado
                            </span>
                        )}
                    </div>
                ) : null)}
            </div>
        );
    };

    const renderFuncionAsociada = () => {
        if (!funcionAsociada) return null;
        return (
            <div className="space-y-3 sm:space-y-4">
                <div>
                    <h4 className="text-sm sm:text-md font-semibold text-zinc-100">{funcionAsociada.nombreVisible}</h4>
                    {funcionAsociada.nombreInterno && <p className="text-xs text-zinc-400 font-mono">({funcionAsociada.nombreInterno})</p>}
                </div>
                {funcionAsociada.descripcion && (
                    <p className="text-xs sm:text-sm text-zinc-300 bg-zinc-900/50 p-3 rounded-md border border-zinc-700 flex items-start gap-2">
                        <InfoIcon size={16} className="text-blue-400 flex-shrink-0 mt-0.5" />
                        <span>{funcionAsociada.descripcion}</span>
                    </p>
                )}
                <div>
                    <h5 className="text-xs sm:text-sm font-medium text-zinc-200 mb-2">Parámetros Requeridos:</h5>
                    {renderParametros(funcionAsociada.parametrosRequeridos, true)}
                </div>
                <div className="pt-3 sm:pt-4 border-t border-zinc-700">
                    <button
                        onClick={handleDesvincular}
                        className={buttonDangerClasses}
                        disabled={isSubmitting}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={16} /> : <UnlinkIcon size={16} />}
                        Desvincular Función
                    </button>
                </div>
            </div>
        );
    };

    const renderAccionesParaAsociar = () => {
        if (funcionAsociada) return null; // Si ya hay una asociada, no mostrar esto

        if (!mostrarSelector) {
            return (
                <div className="text-center py-4 space-y-3">
                    <Settings2 size={36} className="text-zinc-500 mx-auto" />
                    <p className="text-sm text-zinc-500 px-10">
                        Esta tarea no tiene una función de automatización asociada.
                    </p>
                    <div className="flex flex-col sm:flex-row justify-center items-center gap-3 pt-2">
                        <button
                            onClick={() => setMostrarSelector(true)}
                            className={buttonSecondaryClasses}
                            disabled={loading || todasLasFunciones.length === 0}
                        >
                            <LinkIcon size={16} />
                            Buscar
                        </button>
                        <span className="text-sm text-zinc-500 hidden sm:inline">o</span>
                        <Link href="/admin/tareas/funciones/nueva" legacyBehavior>
                            <a className={buttonPrimaryClasses}>
                                <PlusIcon size={16} />
                                Crear
                            </a>
                        </Link>
                    </div>
                    {todasLasFunciones.length === 0 && !loading && (
                        <p className="text-xs text-zinc-500 mt-2">No hay funciones globales disponibles para asociar. Primero crea una.</p>
                    )}
                </div>
            );
        }

        // Si mostrarSelector es true:
        return (
            <div className="space-y-4">
                <div>
                    <label htmlFor="select-funcion" className="block mb-1.5 text-sm font-medium text-zinc-300">
                        Selecciona una Función Global para asociar:
                    </label>
                    <select
                        id="select-funcion"
                        value={selectedFuncionId}
                        onChange={(e) => setSelectedFuncionId(e.target.value)}
                        className={selectBaseClasses}
                        disabled={isSubmitting || todasLasFunciones.length === 0}
                    >
                        <option value="" disabled={selectedFuncionId !== ""}>-- Elige una función --</option>
                        {todasLasFunciones.map(func => (
                            <option key={func.id} value={func.id}>
                                {func.nombreVisible}
                            </option>
                        ))}
                    </select>
                </div>

                {funcionParaPreview && (
                    <div className={previewContainerClasses}>
                        <h5 className="text-sm font-semibold text-zinc-100">{funcionParaPreview.nombreVisible}</h5>
                        {funcionParaPreview.nombreInterno && <p className="text-xs text-zinc-400 font-mono">ID: ({funcionParaPreview.nombreInterno})</p>}
                        {funcionParaPreview.descripcion && (
                            <p className="text-xs text-zinc-300 mt-1 line-clamp-2" title={funcionParaPreview.descripcion}>
                                {funcionParaPreview.descripcion}
                            </p>
                        )}
                        <div className="mt-2">
                            <p className="text-xs font-medium text-zinc-200 mb-1">Parámetros:</p>
                            {renderParametros(funcionParaPreview.parametrosRequeridos, false)}
                        </div>
                    </div>
                )}

                <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
                    {funcionParaPreview && (
                        <button
                            onClick={handleAsociar}
                            className={buttonPrimaryClasses}
                            disabled={!selectedFuncionId || isSubmitting}
                        >
                            {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <LinkIcon size={18} />}
                            Confirmar
                        </button>
                    )}
                    <button
                        type="button"
                        onClick={() => {
                            setMostrarSelector(false);
                            setSelectedFuncionId('');
                            setFuncionParaPreview(null);
                        }}
                        className={`${buttonSecondaryClasses.replace(
                            'bg-zinc-700', 'bg-zinc-600').replace('hover:bg-zinc-600', 'hover:bg-zinc-500')
                            } flex mx-auto`} // Un poco más claro para cancelar
                    >
                        <XIcon size={16} /> Cancelar
                    </button>
                </div>
                <div className="pt-4 text-center">
                    <p className="text-sm text-zinc-400 mb-2">¿No encuentras la función que necesitas?</p>
                    <Link href="/admin/tareas/funciones/nueva" legacyBehavior>
                        <a className={`${buttonPrimaryClasses} inline-flex`}> {/* inline-flex para que no ocupe todo el ancho */}
                            <PlusIcon size={16} />
                            Crear Nueva Función
                        </a>
                    </Link>
                </div>
            </div>
        );
    };

    return (
        <div className={sectionContainerClasses}>
            <div className={headerSectionClasses}>
                <h3 className={headerTitleClasses}>
                    <Cog size={18} />
                    Función de Automatización
                </h3>
            </div>

            <div className={contentPaddingClasses}>
                {loading && (
                    <div className="flex items-center justify-center py-10 text-zinc-400">
                        <Loader2 className="h-6 w-6 animate-spin mr-2" />
                        <span>Cargando...</span>
                    </div>
                )}
                {error && !loading && (
                    <div className={alertErrorClasses}>
                        <AlertTriangleIcon size={18} /> <span>{error}</span>
                    </div>
                )}
                {!loading && !error && (
                    <>
                        {funcionAsociada ? renderFuncionAsociada() : renderAccionesParaAsociar()}
                    </>
                )}
            </div>
        </div>
    );
}
