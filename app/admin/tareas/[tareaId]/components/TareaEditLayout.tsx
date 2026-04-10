// Ruta actual: app/admin/tareas/[tareaId]/components/TareaEditLayout.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { obtenerTareaPorId } from '@/app/admin/_lib/actions/tarea/tarea.actions';
import type { TareaParaEditar } from '@/app/admin/_lib/actions/tarea/tarea.schemas';
import { Loader2 } from 'lucide-react';

// Componentes de las pestañas y los que irán dentro
import TareaEditarForm from './TareaEditarForm';
import TareaFuncion from './TareaFuncion';
import TareaGaleria from './TareaGaleria';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"; // Importa tus componentes de Tabs

// Función para convertir a camelCase (se mantiene igual)
function toCamelCase(str: string): string {
    const cleanedStr = str
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^\w\s]/gi, '')
        .trim();
    if (!cleanedStr) return ''; // Devuelve string vacío si la entrada limpia es vacía
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
    const [activeTab, setActiveTab] = useState("detalles"); // Estado para la pestaña activa

    // Clases para los contenedores de contenido de las pestañas y el contenedor de TareaFuncion
    const contentContainerClasses = "p-4 md:p-6 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg mt-0"; // Quitado mt-6 si TabsContent lo maneja o no se necesita
    // El TabsContent ya tiene mt-4 por defecto desde la guía de estilos.
    // Ajustar si es necesario, o aplicar a cada TabsContent.

    const fetchTareaData = useCallback(async () => {
        if (!tareaId) {
            setError("ID de tarea no válido.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);
        const result = await obtenerTareaPorId(tareaId);
        if (result.success && result.data) {
            setTareaOriginal(result.data);
            setCurrentTareaNombre(result.data.nombre);
            // Asegurarse que toCamelCase no falle si result.data.nombre es inesperado
            const nombreFuncionCalculado = result.data.tareaFuncion?.nombre || toCamelCase(result.data.nombre || '');
            setDerivedFuncionNombre(nombreFuncionCalculado);
        } else {
            setError(result.error || "No se pudo cargar la tarea.");
            setTareaOriginal(null); // Asegurar que tareaOriginal sea null en caso de error
        }
        setLoading(false);
    }, [tareaId]);

    useEffect(() => {
        fetchTareaData();
    }, [fetchTareaData]); // fetchTareaData ya incluye tareaId como dependencia

    const handleTareaNombreChange = useCallback((nuevoNombre: string) => {
        setCurrentTareaNombre(nuevoNombre);
        setDerivedFuncionNombre(toCamelCase(nuevoNombre || '')); // Asegurar que no falle con null/undefined
    }, []);

    const handleCopyFuncionNombre = useCallback(() => {
        if (derivedFuncionNombre) {
            navigator.clipboard.writeText(derivedFuncionNombre)
                .then(() => {
                    // Opcional: Mostrar notificación de éxito (ej. con react-hot-toast)
                    // toast.success("Nombre de función copiado al portapapeles");
                })
                .catch(err => {
                    console.error('Error al copiar nombre de función:', err);
                    // toast.error("Error al copiar nombre de función");
                });
        }
    }, [derivedFuncionNombre]);

    // Callback para ser pasado a TareaEditarForm para que pueda notificar al layout
    // que necesita recargar los datos de la tarea.
    // const handleTareaUpdateSuccess = useCallback(async () => {
    //     console.log("Tarea actualizada, TareaEditLayout re-fetcheando datos...");
    //     await fetchTareaData(); // Vuelve a cargar los datos de la tarea
    // }, [fetchTareaData]);


    if (loading) {
        return <div className="p-6 flex justify-center items-center h-64"><Loader2 className='animate-spin h-8 w-8 text-blue-500' /></div>;
    }
    if (error) {
        return <div className="p-6 text-center text-red-400 bg-red-900/20 border border-red-600/50 rounded-lg">{error}</div>;
    }
    if (!tareaOriginal) {
        return <div className="p-6 text-center text-zinc-400">Tarea no encontrada. Es posible que haya sido eliminada o el ID sea incorrecto.</div>;
    }

    return (
        <>
            {/* Columna Izquierda (lg:col-span-3): Ahora con Pestañas */}
            <div className="lg:col-span-3 flex flex-col">
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full flex flex-col">
                    <TabsList className="grid w-full grid-cols-2 mb-0 bg-zinc-800 border border-zinc-700 rounded-t-lg rounded-b-none p-0 h-auto">
                        {/* Ajusta el padding y altura de TabsList y TabsTrigger según tu Guía de Estilos para tabs.tsx */}
                        <TabsTrigger
                            value="detalles"
                            className="py-3 data-[state=active]:bg-zinc-700 data-[state=active]:text-white rounded-tl-md rounded-tr-none rounded-b-none"
                        >
                            Detalles de Tarea
                        </TabsTrigger>
                        <TabsTrigger
                            value="galeria"
                            className="py-3 data-[state=active]:bg-zinc-700 data-[state=active]:text-white rounded-tr-md rounded-tl-none rounded-b-none"
                        >
                            Galería de Tarea
                        </TabsTrigger>
                    </TabsList>

                    {/* El TabsContent ya suele tener un mt-4 por defecto, por eso se quita de contentContainerClasses */}
                    <TabsContent value="detalles" className={`${contentContainerClasses} rounded-t-none flex-grow`}>
                        <TareaEditarForm
                            tareaId={tareaId}
                            initialData={tareaOriginal}
                            currentNombre={currentTareaNombre}
                            onNombreChange={handleTareaNombreChange}
                        // onTareaUpdateSuccess={handleTareaUpdateSuccess} // Pasar el callback
                        />
                    </TabsContent>
                    <TabsContent value="galeria" className={`${contentContainerClasses} rounded-t-none flex-grow`}>
                        <TareaGaleria
                            tareaId={tareaId}
                        />
                    </TabsContent>
                </Tabs>
            </div>

            {/* Columna Derecha (lg:col-span-2): TareaFuncion */}
            <div className="lg:col-span-2 flex flex-col gap-6">
                {/* TareaFuncion ya tiene sus propios estilos de contenedor (fieldGroupClasses) */}
                {tareaOriginal.tareaFuncion && tareaOriginal.tareaFuncion.id ? (
                    <TareaFuncion
                        tareaFuncionId={tareaOriginal.tareaFuncion.id}
                        nombreFuncionActual={derivedFuncionNombre}
                        onNombreFuncionClick={handleCopyFuncionNombre}
                    />
                ) : (
                    <div className={contentContainerClasses}>
                        <p className="text-sm text-center text-zinc-400">
                            No hay una función técnica directamente asociada o lista para configurar para esta tarea.
                            Se generará una al guardar el nombre de la tarea si no existe.
                        </p>
                    </div>
                )}
            </div>
        </>
    );
}