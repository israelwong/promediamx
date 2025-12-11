// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/components/ListaPaquetes.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image'; // Para mostrar imágenes
import { Button } from '@/app/components/ui/button';
import {
    PlusCircle,
    Edit3,
    Trash2,
    HelpCircle,
    Loader2,
    AlertTriangle,
    GripVertical,
    Settings2, // Icono para Gestionar Categorías
    ImageIcon,
    Video as VideoIconLucide, // Renombrado para evitar conflicto con etiqueta <video>
    Link as LinkIconLucide, // Renombrado
    CheckCircle,
    Package
} from 'lucide-react';

import {
    obtenerPaquetesPorNegocioAction,
    actualizarOrdenPaquetesAction,
    eliminarNegocioPaqueteAction // Importar la acción de eliminar
} from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.actions';
import {
    NegocioPaqueteListItem,
    ReordenarPaquetesData
} from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.schemas';
// import { ActionResult } from '@/app/admin/_lib/types';

// DND-Kit imports
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface ListaPaquetesProps {
    negocioId: string;
    clienteId: string;
}

// --- Componente DraggablePaqueteItem ---
interface DraggablePaqueteItemProps {
    paquete: NegocioPaqueteListItem;
    basePath: string;
    onDelete: (paqueteId: string) => Promise<void>;
    isDeleting: boolean;
    currentDeletingId: string | null;
}

function DraggablePaqueteItem({ paquete, basePath, onDelete, isDeleting, currentDeletingId }: DraggablePaqueteItemProps) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: paquete.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.6 : 1,
        boxShadow: isDragging ? '0 10px 15px -3px rgba(0, 0, 0, 0.2), 0 4px 6px -2px rgba(0, 0, 0, 0.1)' : 'none',
    };

    const cardClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md group transition-all hover:border-zinc-600 hover:shadow-xl";
    const textPrimaryClasses = "text-zinc-100";
    const textSecondaryClasses = "text-zinc-400 text-sm";
    const textPriceClasses = "text-base font-semibold text-blue-400";
    const badgeClasses = "text-xs font-medium px-2 py-0.5 rounded-full";
    const statusColors: { [key: string]: string } = {
        activo: "bg-green-500/20 text-green-300",
        inactivo: "bg-zinc-600/20 text-zinc-400",
    };
    const iconIndicatorClasses = "w-3.5 h-3.5 inline-block mr-1 text-zinc-500 group-hover:text-zinc-300";

    const isCurrentItemDeleting = isDeleting && currentDeletingId === paquete.id;

    return (
        <li ref={setNodeRef} style={style} className={`${cardClasses} p-4`}>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
                {/* Drag Handle y Imagen de Portada */}
                <div className="flex-shrink-0 flex items-center gap-3 sm:gap-2">
                    <button {...attributes} {...listeners} className="cursor-grab p-1 text-zinc-500 hover:text-zinc-300 self-start sm:self-center">
                        <GripVertical size={20} />
                    </button>
                    {paquete.imagenPortadaUrl ? (
                        <Image
                            src={paquete.imagenPortadaUrl}
                            alt={`Portada de ${paquete.nombre}`}
                            width={80} // Reducido un poco para mejor ajuste
                            height={80}
                            className="w-20 h-20 object-cover rounded border border-zinc-600"
                        />
                    ) : (
                        <div className="w-20 h-20 bg-zinc-700 rounded border-2 border-dashed border-zinc-600 flex items-center justify-center text-zinc-500">
                            <ImageIcon size={28} />
                        </div>
                    )}
                </div>

                {/* Información del Paquete */}
                <div className="flex-grow min-w-0"> {/* min-w-0 para que el truncado funcione bien en flex */}
                    <div className="flex items-center justify-between mb-1">
                        <Link href={`${basePath}/${paquete.id}`} className="block truncate">
                            <h3 className={`text-base font-semibold ${textPrimaryClasses} group-hover:text-blue-400 transition-colors truncate`}>
                                {paquete.nombre}
                            </h3>
                        </Link>
                        <span className={`${badgeClasses} ${statusColors[paquete.status.toLowerCase()] || statusColors.inactivo} ml-2 flex-shrink-0`}>
                            {paquete.status}
                        </span>
                    </div>

                    {paquete.negocioPaqueteCategoria?.nombre && (
                        <p className={`text-xs font-medium text-teal-400 mb-1`}>
                            Categoría: {paquete.negocioPaqueteCategoria.nombre}
                        </p>
                    )}

                    <p className={`${textSecondaryClasses} line-clamp-2 mb-2 text-xs`}>
                        {paquete.descripcionCorta || "Sin descripción corta."}
                    </p>

                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500 mb-2">
                        {paquete.tieneGaleria && <span className="flex items-center" title="Tiene galería de imágenes"><ImageIcon className={iconIndicatorClasses} /> Galería</span>}
                        {paquete.tieneVideo && <span className="flex items-center" title="Tiene video"><VideoIconLucide className={iconIndicatorClasses} /> Video</span>}
                        {paquete.linkPagoConfigurado && <span className="flex items-center" title="Tiene link de pago"><LinkIconLucide className={iconIndicatorClasses} /> Link Pago</span>}
                    </div>
                    <p className={`text-xs ${textSecondaryClasses}`}>
                        Creado: {new Date(paquete.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                </div>

                {/* Precio y Acciones */}
                <div className="flex-shrink-0 flex flex-col items-start sm:items-end gap-2 mt-3 sm:mt-0">
                    <p className={textPriceClasses}>
                        ${paquete.precio.toFixed(2)} MXN
                    </p>
                    <div className="flex items-center gap-2">
                        <Link href={`${basePath}/${paquete.id}`}>
                            <Button variant="outline" size="sm" className="text-zinc-300 border-zinc-600 hover:bg-zinc-700 hover:text-zinc-100">
                                <Edit3 size={14} className="mr-1.5" /> Editar
                            </Button>
                        </Link>
                        <Button
                            variant="outline"
                            size="sm"
                            className="text-red-400 border-red-700/40 hover:bg-red-700/20 hover:text-red-300 hover:border-red-700/60"
                            onClick={() => onDelete(paquete.id)}
                            disabled={isCurrentItemDeleting}
                        >
                            {isCurrentItemDeleting ? <Loader2 size={14} className="animate-spin mr-1.5" /> : <Trash2 size={14} className="mr-1.5" />}
                            {isCurrentItemDeleting ? 'Borrando...' : 'Eliminar'}
                        </Button>
                    </div>
                </div>
            </div>
        </li>
    );
}

export default function ListaPaquetes({ negocioId, clienteId }: ListaPaquetesProps) {

    const [paquetes, setPaquetes] = useState<NegocioPaqueteListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentDeletingId, setCurrentDeletingId] = useState<string | null>(null);
    const [operationMessage, setOperationMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const fetchPaquetes = useCallback(async () => {
        if (negocioId) {
            setIsLoading(true);
            setError(null);
            // setOperationMessage(null); // No limpiar aquí para que persista después de re-fetch por DND
            const result = await obtenerPaquetesPorNegocioAction(negocioId);
            if (result.success && result.data) {
                setPaquetes(result.data);
            } else {
                setError(result.error || "Error desconocido al cargar los paquetes.");
                setPaquetes([]);
            }
            setIsLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchPaquetes();
    }, [fetchPaquetes]);

    const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}/paquetes`;

    const sensors = useSensors(
        useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), // Evitar activar DND con clics simples
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = paquetes.findIndex((p) => p.id === active.id);
            const newIndex = paquetes.findIndex((p) => p.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;

            const newOrderedPaquetes = arrayMove(paquetes, oldIndex, newIndex);
            setPaquetes(newOrderedPaquetes);

            const ordenesParaGuardar: ReordenarPaquetesData = newOrderedPaquetes.map((paq, index) => ({
                id: paq.id,
                orden: index,
            }));

            setIsSavingOrder(true);
            setOperationMessage(null);
            const result = await actualizarOrdenPaquetesAction(negocioId, clienteId, ordenesParaGuardar);
            if (!result.success) {
                setOperationMessage({ type: 'error', text: result.error || "Error al guardar el nuevo orden." });
                fetchPaquetes();
            } else {
                setOperationMessage({ type: 'success', text: "Orden de paquetes guardado." });
                // Actualizar el campo 'orden' en el estado local para reflejar el guardado
                const paquetesConOrdenActualizado = newOrderedPaquetes.map((paq, index) => ({ ...paq, orden: index }));
                setPaquetes(paquetesConOrdenActualizado);
            }
            setIsSavingOrder(false);
            setTimeout(() => setOperationMessage(null), 3000);
        }
    };

    const handleDeletePaquete = async (paqueteIdToDelete: string) => {
        if (confirm("¿Estás seguro de que quieres eliminar este paquete? Esta acción no se puede deshacer.")) {
            setIsDeleting(true);
            setCurrentDeletingId(paqueteIdToDelete);
            setOperationMessage(null);
            const result = await eliminarNegocioPaqueteAction(paqueteIdToDelete, clienteId, negocioId);
            if (result.success) {
                setOperationMessage({ type: 'success', text: "Paquete eliminado con éxito." });
                fetchPaquetes();
            } else {
                setOperationMessage({ type: 'error', text: result.error || "No se pudo eliminar el paquete." });
            }
            setIsDeleting(false);
            setCurrentDeletingId(null);
            setTimeout(() => setOperationMessage(null), 3000);
        }
    };

    if (isLoading && paquetes.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center h-60 p-6 text-zinc-400">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p>Cargando paquetes...</p>
            </div>
        );
    }

    if (error && paquetes.length === 0) {
        return (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-6 text-center">
                <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
                <p className="mb-2 text-lg font-semibold text-red-400">Error al cargar los paquetes</p>
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchPaquetes} variant="outline" className="border-zinc-600 hover:bg-zinc-700">Reintentar</Button>
            </div>
        );
    }

    return (
        <div className="space-y-6 bg-zinc-800 p-6 rounded-lg shadow-md">
            <div className="flex flex-wrap items-center justify-between gap-4 pb-3 mb-4 border-b border-zinc-700">
                <h2 className="text-xl font-semibold">
                    <Package size={24} className="inline-block mr-2 text-blue-500" />
                    Paquetes del Negocio
                </h2>
                <div className="flex items-center gap-3">
                    <Link href={`${basePath}/categoria`}>
                        <Button variant="outline" className="border-zinc-600 hover:bg-zinc-700 text-zinc-300">
                            <Settings2 size={16} className="mr-2" />
                            Gestionar Categorías
                        </Button>
                    </Link>
                    <Link href={`${basePath}/nuevo`}>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <PlusCircle size={18} className="mr-2" />
                            Nuevo Paquete
                        </Button>
                    </Link>
                </div>
            </div>

            {operationMessage && (
                <div className={`p-3 rounded-md flex items-center gap-2 text-sm ${operationMessage.type === 'success' ? 'bg-green-500/10 border border-green-500/30 text-green-300' : 'bg-red-500/10 border border-red-500/30 text-red-400'}`}>
                    {operationMessage.type === 'success' ? <CheckCircle size={18} /> : <AlertTriangle size={18} />}
                    <p>{operationMessage.text}</p>
                </div>
            )}
            {isSavingOrder && (
                <div className="text-sm text-blue-300 flex items-center justify-end"> {/* Alineado a la derecha */}
                    <Loader2 className="animate-spin mr-2" size={16} /> Guardando nuevo orden...
                </div>
            )}

            {paquetes.length === 0 && !isLoading && !error && ( // Añadido !error aquí
                <div className="bg-zinc-800 border border-dashed border-zinc-700 rounded-lg p-6 py-12 text-center text-zinc-400">
                    <HelpCircle size={48} className="mx-auto mb-4 text-zinc-500" />
                    <p className="mb-2 text-lg font-semibold text-zinc-300">Aún no hay paquetes creados.</p>
                    <p className="mb-6">Comienza creando tu primer paquete de servicios o productos para este negocio.</p>
                    <Link href={`${basePath}/nuevo`}>
                        <Button className="bg-blue-600 hover:bg-blue-700">
                            <PlusCircle size={18} className="mr-2" />
                            Crear Mi Primer Paquete
                        </Button>
                    </Link>
                </div>
            )}
            {paquetes.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={paquetes.map(p => p.id)} strategy={verticalListSortingStrategy}>
                        <ul className="space-y-4">
                            {paquetes.map((paquete) => (
                                <DraggablePaqueteItem
                                    key={paquete.id}
                                    paquete={paquete}
                                    basePath={basePath}
                                    onDelete={handleDeletePaquete}
                                    isDeleting={isDeleting}
                                    currentDeletingId={currentDeletingId}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
            )}
        </div>
    );
}
