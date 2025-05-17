// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/categoria/components/CategoriasLista.tsx
// O el contenido de page.tsx en esa ruta
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Button } from '@/app/components/ui/button'; // Ajusta ruta
import { PlusCircle, Edit3, Trash2, GripVertical, Loader2, AlertTriangle, HelpCircle } from 'lucide-react';
// import Link from 'next/link'; // Asegúrate de tener instalado next/link

import {
    obtenerCategoriasPaqueteAction,
    crearCategoriaPaqueteAction,
    actualizarCategoriaPaqueteAction,
    eliminarCategoriaPaqueteAction,
    actualizarOrdenCategoriasPaqueteAction
} from '@/app/admin/_lib/actions/negocioPaqueteCategoria/negocioPaqueteCategoria.actions'; // Ajusta ruta
import {
    NegocioPaqueteCategoriaListItem,
    // UpsertNegocioPaqueteCategoriaData,
    ReordenarCategoriasPaqueteData
} from '@/app/admin/_lib/actions/negocioPaqueteCategoria/negocioPaqueteCategoria.schemas'; // Ajusta ruta

// DND-Kit imports (necesitarás instalar @dnd-kit/core, @dnd-kit/sortable, @dnd-kit/utilities)
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    DragEndEvent,
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

import { useRouter } from 'next/navigation';

// --- Componente Modal (Simplificado) ---
interface CategoryModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSubmit: (nombre: string) => Promise<void>;
    initialNombre?: string;
    mode: 'create' | 'edit';
    isLoading: boolean;
}

function CategoryModal({ isOpen, onClose, onSubmit, initialNombre = '', mode, isLoading: isSubmitting }: CategoryModalProps) {
    const [nombre, setNombre] = useState(initialNombre);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        setNombre(initialNombre); // Resetear nombre cuando cambia initialNombre (al abrir para editar)
        setError(null);
    }, [initialNombre, isOpen]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError(null);
        if (!nombre.trim()) {
            setError("El nombre no puede estar vacío.");
            return;
        }
        try {
            await onSubmit(nombre.trim());
            // El cierre del modal y reseteo de nombre se manejan en el componente padre tras éxito
        } catch (submissionError: unknown) {
            if (submissionError instanceof Error) {
                setError(submissionError.message || "Error al guardar.");
            } else {
                setError("Error al guardar.");
            }
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
            <div className="bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-md border border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-100 mb-4">
                    {mode === 'create' ? 'Nueva Categoría' : 'Editar Categoría'}
                </h3>
                <form onSubmit={handleSubmit}>
                    <input
                        type="text"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        placeholder="Nombre de la categoría"
                        className="bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 mb-1"
                        disabled={isSubmitting}
                    />
                    {error && <p className="text-xs text-red-400 mt-1 mb-3">{error}</p>}
                    <div className="mt-6 flex justify-end gap-3">
                        <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting} className="border-zinc-600 hover:bg-zinc-700">
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                            {isSubmitting ? <Loader2 className="animate-spin mr-2" size={16} /> : null}
                            {mode === 'create' ? 'Crear' : 'Guardar Cambios'}
                        </Button>
                    </div>
                </form>
            </div>
        </div>
    );
}


// --- Componente Item para la Lista Ordenable ---
interface SortableCategoryItemProps {
    categoria: NegocioPaqueteCategoriaListItem;
    onEdit: (categoria: NegocioPaqueteCategoriaListItem) => void;
    onDelete: (id: string) => void;
    isDeleting: boolean;
    currentDeletingId: string | null;
}

function SortableCategoryItem({ categoria, onEdit, onDelete, isDeleting, currentDeletingId }: SortableCategoryItemProps) {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging,
    } = useSortable({ id: categoria.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
        zIndex: isDragging ? 10 : undefined,
    };

    const isCurrentDeleting = isDeleting && currentDeletingId === categoria.id;

    return (
        <li
            ref={setNodeRef}
            style={style}
            className="bg-zinc-800/50 border border-zinc-700 rounded-md p-3 flex items-center justify-between gap-3 hover:bg-zinc-700/50"
        >
            <div className="flex items-center gap-3 flex-grow">
                <button {...attributes} {...listeners} className="cursor-grab p-1 text-zinc-500 hover:text-zinc-300">
                    <GripVertical size={18} />
                </button>
                <span className="text-zinc-200">{categoria.nombre}</span>
            </div>
            <div className="flex items-center gap-2">
                <Button variant="ghost" size="sm" onClick={() => onEdit(categoria)} className="text-zinc-400 hover:text-blue-400 p-1 h-auto">
                    <Edit3 size={16} />
                </Button>
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => onDelete(categoria.id)}
                    disabled={isCurrentDeleting}
                    className="text-zinc-400 hover:text-red-400 p-1 h-auto"
                >
                    {isCurrentDeleting ? <Loader2 className="animate-spin" size={16} /> : <Trash2 size={16} />}
                </Button>
            </div>
        </li>
    );
}

// --- Componente Principal de la Lista ---
interface CategoriasListaProps {
    negocioId: string;
    clienteId: string;
}

export default function CategoriasLista({ negocioId, clienteId }: CategoriasListaProps) {
    const [categorias, setCategorias] = useState<NegocioPaqueteCategoriaListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [currentCategory, setCurrentCategory] = useState<NegocioPaqueteCategoriaListItem | null>(null);
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [currentDeletingId, setCurrentDeletingId] = useState<string | null>(null);
    const router = useRouter();

    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
    );

    const fetchCategorias = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        const result = await obtenerCategoriasPaqueteAction(negocioId);
        if (result.success && result.data) {
            setCategorias(result.data);
        } else {
            setError(result.error || "Error desconocido al cargar categorías.");
            setCategorias([]); // Limpiar en caso de error
        }
        setIsLoading(false);
    }, [negocioId]);

    useEffect(() => {
        fetchCategorias();
    }, [fetchCategorias]);

    const handleOpenCreateModal = () => {
        setModalMode('create');
        setCurrentCategory(null);
        setIsModalOpen(true);
    };

    const handleOpenEditModal = (categoria: NegocioPaqueteCategoriaListItem) => {
        setModalMode('edit');
        setCurrentCategory(categoria);
        setIsModalOpen(true);
    };

    const handleModalClose = () => {
        setIsModalOpen(false);
        setCurrentCategory(null);
        setIsSubmittingModal(false); // Asegurar que el loader se apague
    };

    const handleModalSubmit = async (nombre: string) => {
        setIsSubmittingModal(true);
        let result;
        if (modalMode === 'create') {
            result = await crearCategoriaPaqueteAction(negocioId, clienteId, { nombre });
        } else if (currentCategory) {
            result = await actualizarCategoriaPaqueteAction(currentCategory.id, negocioId, clienteId, { nombre });
        }

        if (result && result.success) {
            handleModalClose();
            fetchCategorias(); // Re-fetch para actualizar la lista
        } else if (result) {
            // Error ya se maneja dentro del modal, o podrías pasarlo aquí
            throw new Error(result.error || "Error desconocido al guardar.");
        }
        setIsSubmittingModal(false);
    };

    const handleDeleteCategory = async (id: string) => {
        if (confirm("¿Estás seguro de que quieres eliminar esta categoría? Los paquetes asociados no se eliminarán, pero perderán esta categoría.")) {
            setIsDeleting(true);
            setCurrentDeletingId(id);
            const result = await eliminarCategoriaPaqueteAction(id, negocioId, clienteId);
            if (result.success) {
                fetchCategorias(); // Re-fetch
            } else {
                alert("Error al eliminar: " + result.error); // O usar un sistema de notificaciones mejor
            }
            setIsDeleting(false);
            setCurrentDeletingId(null);
        }
    };

    const handleDragEnd = async (event: DragEndEvent) => {
        const { active, over } = event;
        if (active.id !== over?.id && over) {
            const oldIndex = categorias.findIndex((c) => c.id === active.id);
            const newIndex = categorias.findIndex((c) => c.id === over.id);
            const newOrderedCategorias = arrayMove(categorias, oldIndex, newIndex);

            // Actualiza el estado local inmediatamente para feedback visual
            setCategorias(newOrderedCategorias);

            // Prepara los datos para la Server Action (solo id y nuevo orden)
            const ordenesParaGuardar: ReordenarCategoriasPaqueteData = newOrderedCategorias.map((cat, index) => ({
                id: cat.id,
                orden: index,
            }));

            setIsSavingOrder(true);
            const result = await actualizarOrdenCategoriasPaqueteAction(negocioId, clienteId, ordenesParaGuardar);
            if (!result.success) {
                // Hubo un error, podríamos revertir el orden visual o mostrar un error
                alert("Error al guardar el nuevo orden: " + result.error);
                fetchCategorias(); // Re-fetch para volver al estado de la BD
            }
            // Si es exitoso, la lista ya está visualmente actualizada. Se podría re-fetch para asegurar consistencia.
            // Opcional: fetchCategorias(); si se quiere estar 100% seguro o si hay lógica de orden en backend compleja
            setIsSavingOrder(false);
        }
    };


    if (isLoading && categorias.length === 0) { // Mostrar loader solo en la carga inicial
        return (
            <div className="flex flex-col items-center justify-center h-60 p-6 text-zinc-400">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p>Cargando categorías...</p>
            </div>
        );
    }

    if (error && categorias.length === 0) { // Mostrar error solo si no hay datos que mostrar
        return (
            <div className="bg-zinc-800 border border-zinc-700 rounded-lg p-6 text-center">
                <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
                <p className="mb-2 text-lg font-semibold text-red-400">Error al cargar</p>
                <p className="text-red-500 mb-4">{error}</p>
                <Button onClick={fetchCategorias} disabled={isLoading}>
                    {isLoading ? <Loader2 className="animate-spin mr-2" size={16} /> : null} Reintentar
                </Button>
            </div>
        );
    }

    const handleCerrarVentana = () => {
        router.back();
    };

    return (
        <div className="p-0 md:p-0"> {/* Asumiendo que el padding viene de la página contenedora */}
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-zinc-700">
                <h2 className="text-xl font-semibold text-zinc-100">
                    Gestionar Categorías de Paquetes
                </h2>
                <div className="flex items-center gap-2">
                    <Button variant='outline' onClick={handleOpenCreateModal} >
                        <PlusCircle size={18} className="mr-2" />
                        Nueva Categoría
                    </Button>

                    <Button variant='destructive'
                        onClick={() => handleCerrarVentana()}>
                        Cerrar ventana
                    </Button>

                </div>
            </div>

            {isSavingOrder && (
                <div className="mb-3 text-sm text-blue-300 flex items-center">
                    <Loader2 className="animate-spin mr-2" size={16} /> Guardando orden...
                </div>
            )}

            {/* {hasUnsavedOrderChanges && !isSavingOrder && (
        <div className="mb-3 flex justify-end">
           <Button onClick={handleSaveOrderClick} disabled={isSavingOrder} size="sm" className="bg-green-600 hover:bg-green-700">
            <Save size={16} className="mr-2" />
            Guardar Orden Manualmente
          </Button>
        </div>
      )} */}


            {categorias.length === 0 && !isLoading && !error && (
                <div className="bg-zinc-800/30 border border-dashed border-zinc-700 rounded-lg p-6 py-12 text-center text-zinc-400">
                    <HelpCircle size={48} className="mx-auto mb-4 text-zinc-500" />
                    <p className="mb-2 text-lg font-semibold text-zinc-300">Sin Categorías</p>
                    <p className="mb-6">Aún no has creado ninguna categoría para tus paquetes.</p>
                    <Button onClick={handleOpenCreateModal}>
                        <PlusCircle size={18} className="mr-2" />
                        Crear Primera Categoría
                    </Button>
                </div>
            )}

            {categorias.length > 0 && (
                <DndContext
                    sensors={sensors}
                    collisionDetection={closestCenter}
                    onDragEnd={handleDragEnd}
                >
                    <SortableContext items={categorias.map(c => c.id)} strategy={verticalListSortingStrategy}>
                        <ul className="space-y-2">
                            {categorias.map((categoria) => (
                                <SortableCategoryItem
                                    key={categoria.id}
                                    categoria={categoria}
                                    onEdit={handleOpenEditModal}
                                    onDelete={handleDeleteCategory}
                                    isDeleting={isDeleting}
                                    currentDeletingId={currentDeletingId}
                                />
                            ))}
                        </ul>
                    </SortableContext>
                </DndContext>
            )}

            <CategoryModal
                isOpen={isModalOpen}
                onClose={handleModalClose}
                onSubmit={handleModalSubmit}
                initialNombre={modalMode === 'edit' && currentCategory ? currentCategory.nombre : ''}
                mode={modalMode}
                isLoading={isSubmittingModal}
            />
        </div>
    );
}
