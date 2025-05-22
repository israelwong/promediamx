'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { obtenerTareaPorId } from '@/app/admin/_lib/actions/tarea/tarea.actions';
import type { TareaParaEditar } from '@/app/admin/_lib/actions/tarea/tarea.schemas';
import { Loader2 } from 'lucide-react';
import TareaEditarForm from './TareaEditarForm';
import TareaFuncion from './TareaFuncion';
import TareaGaleria from './TareaGaleria'; // Asegúrate de que este componente esté definido y exportado correctamente

// Función para convertir a camelCase (debe estar accesible o definida aquí)
function toCamelCase(str: string): string {
    // Elimina acentos y caracteres especiales, luego convierte a camelCase
    const cleanedStr = str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Quita acentos
        .replace(/[^\w\s]/gi, '') // Quita caracteres especiales
        .trim();
    if (!cleanedStr) return '';
    return cleanedStr
        .split(/\s+/)
        .map((word, index) => {
            if (index === 0) return word.toLowerCase();
            return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
        })
        .join('');
}

interface Props {
    tareaId: string;
}

export default function TareaEditLayout({ tareaId }: Props) {
    const [tareaOriginal, setTareaOriginal] = useState<TareaParaEditar | null>(null);
    const [currentTareaNombre, setCurrentTareaNombre] = useState<string>('');
    const [derivedFuncionNombre, setDerivedFuncionNombre] = useState<string>('');
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const pageContainerClasses = "p-4 md:p-6 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg";


    // Carga inicial de datos
    useEffect(() => {
        if (!tareaId) {
            setError("ID de tarea no válido.");
            setLoading(false);
            return;
        }
        const fetchTareaData = async () => {
            setLoading(true);
            setError(null);
            const result = await obtenerTareaPorId(tareaId);
            if (result.success && result.data) {
                setTareaOriginal(result.data);
                setCurrentTareaNombre(result.data.nombre);
                setDerivedFuncionNombre(result.data.tareaFuncion?.nombre || toCamelCase(result.data.nombre));
            } else {
                setError(result.error || "No se pudo cargar la tarea.");
            }
            setLoading(false);
        };
        fetchTareaData();
    }, [tareaId]);

    // Manejador para cuando cambia el nombre de la tarea en TareaEditarForm
    const handleTareaNombreChange = useCallback((nuevoNombre: string) => {
        setCurrentTareaNombre(nuevoNombre);
        setDerivedFuncionNombre(toCamelCase(nuevoNombre));
    }, []);

    // Lógica para copiar al portapapeles
    const handleCopyFuncionNombre = useCallback(() => {
        if (derivedFuncionNombre) {
            navigator.clipboard.writeText(derivedFuncionNombre)
                .then(() => {
                    // Opcional: Mostrar una notificación de éxito
                    // console.log('Nombre de función copiado!');
                })
                .catch(err => {
                    console.error('Error al copiar nombre de función:', err);
                });
        }
    }, [derivedFuncionNombre]);

    if (loading) {
        return <div className="p-6 flex justify-center items-center h-64"><Loader2 className='animate-spin h-8 w-8 text-blue-500' /></div>;
    }
    if (error) {
        return <div className="p-6 text-center text-red-400">{error}</div>;
    }
    if (!tareaOriginal) {
        return <div className="p-6 text-center text-zinc-400">Tarea no encontrada.</div>;
    }

    return (
        <>
            {/* Columna para TareaEditarForm */}
            <div className="lg:col-span-3">
                <div className={pageContainerClasses}>
                    <TareaEditarForm
                        tareaId={tareaId}
                        initialData={tareaOriginal} // Pasar todos los datos iniciales
                        currentNombre={currentTareaNombre} // El nombre actual que se está editando
                        onNombreChange={handleTareaNombreChange} // Callback para actualizar
                    />
                </div>
            </div>

            {/* Columna para TareaFuncion y TareaGaleria */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                {tareaOriginal.tareaFuncion && ( // Solo renderizar si existe tareaFuncion
                    <TareaFuncion
                        tareaFuncionId={tareaOriginal.tareaFuncion.id}
                        nombreFuncionActual={derivedFuncionNombre} // Pasar el nombre derivado para visualización en vivo
                        onNombreFuncionClick={handleCopyFuncionNombre} // Pasar la función de copiado
                    />
                )}
                <div className={`flex-1 h-full ${pageContainerClasses}`}> {/* Aplicar estilos al contenedor de galería */}
                    {/* Aquí va el componente de galería de imagenes */}
                    <TareaGaleria
                        tareaId={tareaId}
                    />
                </div>
            </div>
        </>
    );
}