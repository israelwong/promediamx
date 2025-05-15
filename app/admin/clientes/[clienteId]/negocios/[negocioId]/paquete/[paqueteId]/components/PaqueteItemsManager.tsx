// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/[paqueteId]/components/PaqueteItemsManager.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Button } from '@/app/components/ui/button';
import {
    Loader2,
    AlertTriangle,
    CheckSquare,
    PlusCircle,
    XCircle,
    Save,
    ImageOff,
    ChevronDown,
    ChevronUp,
    BookOpen // Icono para Catálogo
} from 'lucide-react';
import Image from 'next/image';

import {
    ItemCatalogoParaSeleccion,
} from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.schemas'; // Ajusta ruta
import {
    obtenerItemsCatalogoPorNegocioAction,
    obtenerItemsPaqueteActualAction,
    actualizarItemsDePaqueteAction,
} from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.actions'; // Ajusta ruta

interface PaqueteItemsManagerProps {
    negocioId: string;
    paqueteId: string;
    clienteId: string;
}

// --- Componente para el Acordeón de Catálogos ---
interface CatalogoAccordionItemProps {
    catalogoNombre: string;
    items: ItemCatalogoParaSeleccion[];
    itemsSeleccionadosIds: Set<string>;
    onToggleItem: (itemId: string) => void;
}

function CatalogoAccordionItem({ catalogoNombre, items, itemsSeleccionadosIds, onToggleItem }: CatalogoAccordionItemProps) {
    const [isOpen, setIsOpen] = useState(true); // Abierto por defecto

    const listItemClasses = "flex items-start gap-3 p-2 rounded-md hover:bg-zinc-700/70 transition-colors";
    const textMutedClasses = "text-xs text-zinc-400";
    const placeholderImageClasses = "w-16 h-16 bg-zinc-700 rounded border-2 border-dashed border-zinc-600 flex items-center justify-center text-zinc-500";

    return (
        <div className="border-b border-zinc-700 last:border-b-0">
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center justify-between w-full p-3 text-left text-zinc-200 hover:bg-zinc-700/50 transition-colors rounded-t-md"
            >
                <div className="flex items-center gap-2">
                    <BookOpen size={18} className="text-blue-400 flex-shrink-0" />
                    <span className="font-medium">{catalogoNombre} ({items.length})</span>
                </div>
                {isOpen ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
            </button>
            {isOpen && (
                <ul className="p-2 space-y-2 bg-zinc-800/30 rounded-b-md">
                    {items.map(item => {
                        const isSelected = itemsSeleccionadosIds.has(item.id);
                        return (
                            <li key={item.id} className={`${listItemClasses} ${isSelected ? 'bg-blue-600/10' : ''}`}>
                                {item.imagenPortadaUrl ? (
                                    <Image
                                        src={item.imagenPortadaUrl}
                                        alt={`Portada de ${item.nombre}`}
                                        width={64} height={64}
                                        className="w-16 h-16 object-cover rounded flex-shrink-0 border border-zinc-600"
                                        onError={(e) => {
                                            const target = e.target as HTMLImageElement;
                                            target.onerror = null;
                                            target.src = "https://placehold.co/64x64/404040/9ca3af?text=Img";
                                        }}
                                    />
                                ) : (
                                    <div className={`${placeholderImageClasses} flex-shrink-0`}>
                                        <ImageOff size={24} />
                                    </div>
                                )}
                                <div className="flex-grow">
                                    <span className="text-zinc-100 text-sm font-medium block">{item.nombre}</span>
                                    {item.itemCategoriaNombre && ( // Mostrar categoría del ítem si existe
                                        <p className={`${textMutedClasses} text-xs`}>Categoría Ítem: {item.itemCategoriaNombre}</p>
                                    )}
                                    {item.descripcion && (
                                        <p className={`${textMutedClasses} line-clamp-2 text-xs`}>{item.descripcion}</p>
                                    )}
                                    <p className={`${textMutedClasses} text-xs mt-0.5`}>Precio: ${item.precio.toFixed(2)}</p>
                                </div>
                                <Button
                                    variant="ghost" size="icon"
                                    onClick={() => onToggleItem(item.id)}
                                    className={`p-1 h-auto self-start ${isSelected ? 'text-red-400 hover:text-red-300' : 'text-blue-400 hover:text-blue-300'}`}
                                    aria-label={isSelected ? 'Quitar ítem' : 'Agregar ítem'}
                                >
                                    {isSelected ? <XCircle size={20} /> : <PlusCircle size={20} />}
                                </Button>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}


export default function PaqueteItemsManager({ negocioId, paqueteId, clienteId }: PaqueteItemsManagerProps) {
    const [todosLosItemsNegocio, setTodosLosItemsNegocio] = useState<ItemCatalogoParaSeleccion[]>([]);
    const [itemsSeleccionadosIds, setItemsSeleccionadosIds] = useState<Set<string>>(new Set());

    const [isLoadingDisponibles, setIsLoadingDisponibles] = useState(true);
    const [isLoadingSeleccionados, setIsLoadingSeleccionados] = useState(true);
    const [isSaving, setIsSaving] = useState(false);

    const [errorCargaDisponibles, setErrorCargaDisponibles] = useState<string | null>(null);
    const [errorCargaSeleccionados, setErrorCargaSeleccionados] = useState<string | null>(null);
    const [errorGuardado, setErrorGuardado] = useState<string | null>(null);
    const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

    const fetchTodosLosItems = useCallback(async () => {
        if (!negocioId) return;
        setIsLoadingDisponibles(true);
        setErrorCargaDisponibles(null);
        const result = await obtenerItemsCatalogoPorNegocioAction(negocioId);
        if (result.success && result.data) {
            setTodosLosItemsNegocio(result.data);
        } else {
            setErrorCargaDisponibles(result.error || "Error al cargar ítems disponibles.");
        }
        setIsLoadingDisponibles(false);
    }, [negocioId]);

    const fetchItemsPaquete = useCallback(async () => {
        if (!paqueteId) return;
        setIsLoadingSeleccionados(true);
        setErrorCargaSeleccionados(null);
        const result = await obtenerItemsPaqueteActualAction(paqueteId);
        if (result.success && result.data) {
            setItemsSeleccionadosIds(new Set(result.data));
        } else {
            setErrorCargaSeleccionados(result.error || "Error al cargar ítems del paquete.");
        }
        setIsLoadingSeleccionados(false);
    }, [paqueteId]);

    useEffect(() => {
        fetchTodosLosItems();
        fetchItemsPaquete();
    }, [fetchTodosLosItems, fetchItemsPaquete]);

    const handleToggleItem = (itemId: string) => {
        setItemsSeleccionadosIds(prevIds => {
            const newIds = new Set(prevIds);
            if (newIds.has(itemId)) {
                newIds.delete(itemId);
            } else {
                newIds.add(itemId);
            }
            return newIds;
        });
        setSaveSuccess(null);
        setErrorGuardado(null);
    };

    const handleGuardarCambios = async () => {
        setIsSaving(true);
        setErrorGuardado(null);
        setSaveSuccess(null);
        const result = await actualizarItemsDePaqueteAction(
            paqueteId, clienteId, negocioId, { itemCatalogoIds: Array.from(itemsSeleccionadosIds) }
        );
        if (result.success) {
            setSaveSuccess("Ítems del paquete actualizados con éxito.");
            setTimeout(() => setSaveSuccess(null), 4000);
        } else {
            setErrorGuardado(result.error || "Error al guardar los cambios.");
        }
        setIsSaving(false);
    };

    // Agrupar ítems por NOMBRE DE CATÁLOGO para el acordeón
    const itemsAgrupadosPorCatalogo = useMemo(() => {
        const agrupados: Record<string, ItemCatalogoParaSeleccion[]> = {};
        todosLosItemsNegocio.forEach(item => {
            // Usar catalogoNombre para la agrupación. Asumimos que siempre existe.
            const catalogoKey = item.catalogoNombre;
            if (!agrupados[catalogoKey]) {
                agrupados[catalogoKey] = [];
            }
            if (!itemsSeleccionadosIds.has(item.id)) {
                agrupados[catalogoKey].push(item);
            }
        });
        for (const key in agrupados) {
            if (agrupados[key].length === 0) {
                delete agrupados[key];
            }
        }
        return agrupados;
    }, [todosLosItemsNegocio, itemsSeleccionadosIds]);

    const itemsAgregadosAlPaquete = useMemo(() => {
        return todosLosItemsNegocio.filter(item => itemsSeleccionadosIds.has(item.id));
    }, [todosLosItemsNegocio, itemsSeleccionadosIds]);

    const sumatoriaPreciosAgregados = useMemo(() => {
        return itemsAgregadosAlPaquete.reduce((sum, item) => sum + item.precio, 0);
    }, [itemsAgregadosAlPaquete]);

    const cardClasses = "bg-zinc-800/50 border border-zinc-700 rounded-lg p-0";
    const listContainerClasses = "max-h-[400px] md:max-h-[500px] overflow-y-auto";
    const textMutedClasses = "text-xs text-zinc-400";

    if (isLoadingDisponibles || isLoadingSeleccionados) {
        return (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-4 md:p-6 flex items-center justify-center min-h-[300px]">
                <Loader2 size={32} className="animate-spin text-zinc-400" />
                <p className="ml-3 text-zinc-400">Cargando ítems...</p>
            </div>
        );
    }

    return (
        <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-4 md:p-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Columna 1: Ítems Disponibles (agrupados por Catálogo) */}
                <div className={cardClasses}>
                    <h4 className="text-md font-semibold text-zinc-200 p-4 border-b border-zinc-700">
                        Ítems Disponibles en Catálogo
                    </h4>
                    {errorCargaDisponibles ? (
                        <p className="text-red-400 text-sm p-4">{errorCargaDisponibles}</p>
                    ) : Object.keys(itemsAgrupadosPorCatalogo).length === 0 ? (
                        <p className={`${textMutedClasses} p-4`}>No hay más ítems disponibles para agregar o todos ya están en el paquete.</p>
                    ) : (
                        <div className={listContainerClasses}>
                            {Object.entries(itemsAgrupadosPorCatalogo).map(([catalogoNombre, items]) => (
                                <CatalogoAccordionItem
                                    key={catalogoNombre}
                                    catalogoNombre={catalogoNombre}
                                    items={items}
                                    itemsSeleccionadosIds={itemsSeleccionadosIds}
                                    onToggleItem={handleToggleItem}
                                />
                            ))}
                        </div>
                    )}
                </div>

                {/* Columna 2: Ítems Agregados al Paquete */}
                <div className={cardClasses}>
                    <h4 className="text-md font-semibold text-zinc-200 p-4 border-b border-zinc-700">
                        Ítems Agregados a este Paquete
                    </h4>
                    {errorCargaSeleccionados ? (
                        <p className="text-red-400 text-sm p-4">{errorCargaSeleccionados}</p>
                    ) : itemsAgregadosAlPaquete.length === 0 ? (
                        <p className={`${textMutedClasses} p-4`}>Aún no has agregado ítems a este paquete.</p>
                    ) : (
                        <ul className={`${listContainerClasses} p-2 space-y-2`}>
                            {itemsAgregadosAlPaquete.map(item => (
                                <li key={item.id} className="flex items-start gap-3 p-2 rounded-md hover:bg-zinc-700/70 transition-colors bg-zinc-800/30">
                                    {item.imagenPortadaUrl ? (
                                        <Image
                                            src={item.imagenPortadaUrl}
                                            alt={`Portada de ${item.nombre}`}
                                            width={48} height={48}
                                            className="w-12 h-12 object-cover rounded flex-shrink-0 border border-zinc-600"
                                            onError={(e) => {
                                                const target = e.target as HTMLImageElement;
                                                target.onerror = null;
                                                target.src = "https://placehold.co/48x48/404040/9ca3af?text=Img";
                                            }}
                                        />
                                    ) : (
                                        <div className="w-12 h-12 bg-zinc-700 rounded border-2 border-dashed border-zinc-600 flex items-center justify-center text-zinc-500 flex-shrink-0">
                                            <ImageOff size={20} />
                                        </div>
                                    )}
                                    <div className="flex-grow">
                                        <span className="text-zinc-100 text-sm font-medium block">{item.nombre}</span>
                                        {/* Mostrar el nombre del catálogo al que pertenece el ítem agregado */}
                                        <p className={`${textMutedClasses} text-xs`}>Del Catálogo: {item.catalogoNombre}</p>
                                        {item.itemCategoriaNombre && <p className={`${textMutedClasses} text-xs`}>Categoría Ítem: {item.itemCategoriaNombre}</p>}
                                        <p className={`${textMutedClasses} text-xs mt-0.5`}>Precio: ${item.precio.toFixed(2)}</p>
                                    </div>
                                    <Button variant="ghost" size="icon" onClick={() => handleToggleItem(item.id)} className="text-red-400 hover:text-red-300 p-1 h-auto self-start">
                                        <XCircle size={20} />
                                    </Button>
                                </li>
                            ))}
                        </ul>
                    )}
                    {itemsAgregadosAlPaquete.length > 0 && (
                        <div className="mt-auto p-4 border-t border-zinc-700">
                            <p className="text-sm text-zinc-400">
                                Suma de precios individuales (informativo):
                                <span className="font-semibold text-zinc-200 ml-1">
                                    ${sumatoriaPreciosAgregados.toFixed(2)} MXN
                                </span>
                            </p>
                        </div>
                    )}
                </div>
            </div>

            <div className="mt-6 space-y-3">
                {saveSuccess && (
                    <div className="bg-green-500/10 border border-green-500/30 text-green-300 p-3 rounded-md flex items-center gap-2 text-sm">
                        <CheckSquare size={18} /> <p>{saveSuccess}</p>
                    </div>
                )}
                {errorGuardado && (
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md flex items-center gap-2 text-sm">
                        <AlertTriangle size={18} /> <p>{errorGuardado}</p>
                    </div>
                )}
                <div className="flex justify-end">
                    <Button
                        onClick={handleGuardarCambios}
                        disabled={isSaving || isLoadingDisponibles || isLoadingSeleccionados}
                        className="bg-blue-600 hover:bg-blue-700 min-w-[180px]"
                    >
                        {isSaving ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                        {isSaving ? 'Guardando Ítems...' : 'Guardar Cambios en Ítems'}
                    </Button>
                </div>
            </div>
        </div>
    );
}
