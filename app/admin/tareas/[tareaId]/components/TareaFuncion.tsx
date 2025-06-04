'use client';
import React, { useState, useEffect, useCallback, ChangeEvent } from 'react';
import TareaFuncionParametrosSubcomponente from './TareaFuncionParametros'; // Correcto
import { Settings2, Copy, Save, Loader2, InfoIcon } from 'lucide-react';

// Importar las nuevas acciones y tipos/schemas para TareaFuncion
import {
    obtenerTareaFuncion,
    actualizarDescripcionTareaFuncion
} from '@/app/admin/_lib/actions/tareaFuncion/tareaFuncion.actions';
import {
    type TareaFuncionSimple,
    ActualizarDescripcionTareaFuncionInputSchema, // Para validación en cliente (opcional)
} from '@/app/admin/_lib/actions/tareaFuncion/tareaFuncion.schemas';
// import type { ActionResult } from '@/app/admin/_lib/types';

interface Props {
    tareaFuncionId: string;
    nombreFuncionActual: string; // Nombre derivado de Tarea.nombre, pasado desde TareaEditLayout
    onNombreFuncionClick: () => void;
    // tareaId?: string; // Si se necesita para revalidación o contexto
}

export default function TareaFuncion({ tareaFuncionId, nombreFuncionActual, onNombreFuncionClick }: Props) {
    const [funcionData, setFuncionData] = useState<TareaFuncionSimple | null>(null);
    const [descripcionEdit, setDescripcionEdit] = useState<string>('');
    const [loadingDescripcion, setLoadingDescripcion] = useState(true);
    const [isSavingDescripcion, setIsSavingDescripcion] = useState(false);
    const [errorDescripcion, setErrorDescripcion] = useState<string | null>(null);
    const [successDescripcion, setSuccessDescripcion] = useState<string | null>(null);
    const [validationErrorDescripcion, setValidationErrorDescripcion] = useState<string | null>(null);


    const fieldGroupClasses = "p-4 bg-zinc-900/40 rounded-md border border-zinc-700/80"; // Reutiliza o define clases
    const sectionTitleClasses = "text-base font-semibold text-zinc-100 pb-2 mb-3 flex items-center gap-2";
    const textareaBaseClasses = "text-sm bg-zinc-900 border border-zinc-700 text-white block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder-zinc-500 min-h-[120px] h-auto";
    const buttonSmallClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-3 py-1.5 rounded-md flex items-center gap-1.5 disabled:opacity-50";


    const fetchDescripcion = useCallback(async () => {
        if (!tareaFuncionId) return;
        setLoadingDescripcion(true);
        setErrorDescripcion(null);
        const result = await obtenerTareaFuncion(tareaFuncionId);
        if (result.success && result.data) {
            setFuncionData(result.data);
            setDescripcionEdit(result.data.descripcion || ''); // Cargar descripción existente
        } else {
            setErrorDescripcion(result.error || "No se pudo cargar la descripción de la función.");
        }
        setLoadingDescripcion(false);
    }, [tareaFuncionId]);

    useEffect(() => {
        fetchDescripcion();
    }, [fetchDescripcion]);

    const handleDescripcionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
        setDescripcionEdit(e.target.value);
        setSuccessDescripcion(null);
        setErrorDescripcion(null);
        setValidationErrorDescripcion(null);
    };

    const handleGuardarDescripcion = async () => {
        setSuccessDescripcion(null);
        setErrorDescripcion(null);
        setValidationErrorDescripcion(null);

        const validationResult = ActualizarDescripcionTareaFuncionInputSchema.safeParse({ descripcion: descripcionEdit });
        if (!validationResult.success) {
            setValidationErrorDescripcion(validationResult.error.errors[0]?.message || "Descripción inválida.");
            return;
        }

        setIsSavingDescripcion(true);
        const result = await actualizarDescripcionTareaFuncion({
            tareaFuncionId,
            descripcion: validationResult.data.descripcion,
        });
        if (result.success) {
            setFuncionData(prev => prev && result.data ? { ...prev, descripcion: result.data.descripcion } : prev);
            setDescripcionEdit(result.data?.descripcion || '');
            setSuccessDescripcion("Descripción guardada con éxito.");
        } else {
            setErrorDescripcion(result.error || "No se pudo guardar la descripción.");
            if (result.validationErrors?.descripcion) {
                setValidationErrorDescripcion(result.validationErrors.descripcion.join(', '));
            }
        }
        setIsSavingDescripcion(false);
        setTimeout(() => setSuccessDescripcion(null), 3000); // Limpiar mensaje de éxito
    };

    if (!tareaFuncionId && !loadingDescripcion) { // Si no hay ID después de la carga inicial
        return (
            <div className={fieldGroupClasses}>
                <p className="text-sm text-center text-orange-400 p-3 bg-orange-500/10 rounded-md border border-orange-500/30">
                    <InfoIcon size={16} className="inline mr-2" />
                    Esta tarea aún no tiene una función técnica asociada o el ID no es válido.
                </p>
            </div>
        );
    }

    return (
        <div className={fieldGroupClasses}>
            <div className="flex items-center justify-between mb-1"> {/* Reducido mb */}
                <h3 className={sectionTitleClasses} style={{ borderBottom: 'none', marginBottom: 0 }}>
                    <Settings2 size={17} /> Función Asociada
                </h3>
            </div>
            <div className="mb-3 p-3 bg-zinc-800 rounded-md text-sm">
                <div
                    className="text-zinc-300 flex items-center justify-between cursor-pointer hover:bg-zinc-700/50 p-1 rounded -mx-1"
                    title="Clic para copiar nombre de función"
                    onClick={onNombreFuncionClick}
                >
                    <div>
                        <span className="font-semibold text-zinc-100">Nombre (Derivado):</span>
                        <span className="font-mono text-sky-400 ml-2">{nombreFuncionActual || '(generándose...)'}</span>
                    </div>
                    <Copy size={14} className="text-zinc-400 hover:text-zinc-200" />
                </div>
                <p className="text-xs text-zinc-400 mt-1">
                    ID Función: <span className="font-mono">{tareaFuncionId}</span>
                </p>
            </div>

            {/* Editor de Descripción para IA */}
            <div className="space-y-2 mb-4">
                <label htmlFor={`tf-descripcion-${tareaFuncionId}`} className="text-sm font-medium text-zinc-300 block">
                    Descripción para la IA:
                </label>
                {loadingDescripcion ? (
                    <div className="h-[120px] bg-zinc-800 rounded-md flex items-center justify-center">
                        <Loader2 className="animate-spin text-zinc-500" size={24} />
                    </div>
                ) : errorDescripcion && !funcionData ? (
                    <p className="text-xs text-red-400 p-2 bg-red-900/30 rounded border border-red-700">{errorDescripcion}</p>
                ) : (
                    <textarea
                        id={`tf-descripcion-${tareaFuncionId}`}
                        value={descripcionEdit}
                        onChange={handleDescripcionChange}
                        className={`${textareaBaseClasses} ${validationErrorDescripcion ? 'border-red-500' : ''}`}
                        rows={10}
                        placeholder="Describe detalladamente cuándo y cómo la IA debe usar esta función específica..."
                        disabled={isSavingDescripcion}
                    />
                )}
                {validationErrorDescripcion && <p className="text-xs text-red-400 mt-1">{validationErrorDescripcion}</p>}

                <div className="flex items-center justify-end gap-2 mt-2">
                    {isSavingDescripcion && <Loader2 className="animate-spin text-blue-400" size={16} />}
                    {successDescripcion && <span className="text-xs text-green-400">{successDescripcion}</span>}
                    {errorDescripcion && funcionData && <span className="text-xs text-red-400">{errorDescripcion}</span>} {/* Mostrar error si la carga inicial de datos fue OK pero guardado falló */}

                    <button
                        type="button"
                        onClick={handleGuardarDescripcion}
                        className={buttonSmallClasses}
                        disabled={isSavingDescripcion || loadingDescripcion || descripcionEdit === (funcionData?.descripcion || '')}
                    >
                        <Save size={14} /> Guardar Descripción
                    </button>
                </div>
                <p className="text-xs text-zinc-500 mt-1">
                    Esta descripción es crucial para que la IA entienda el propósito y uso de la función.
                </p>
            </div>

            {/* Subcomponente de Parámetros */}
            <TareaFuncionParametrosSubcomponente
                tareaFuncionId={tareaFuncionId}
            />
        </div>
    );
}