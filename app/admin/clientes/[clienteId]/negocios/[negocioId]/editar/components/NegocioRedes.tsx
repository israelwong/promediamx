'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// import { useRouter } from 'next/navigation'; // Puede ser útil para navegación futura

// --- Actions and Types ---
import {
    obtenerRedesSocialesNegocio,
    crearRedSocialNegocio,
    actualizarRedSocialNegocio,
    eliminarRedSocialNegocio,
    actualizarOrdenRedesSociales,
    RedSocialOrdenData,
    UpsertRedSocialInput
} from '@/app/admin/_lib/redesNegocio.actions'; // Ajusta la ruta
import { NegocioRedSocial, ActionResult } from '@/app/admin/_lib/types'; // O tu tipo NegocioRedSocial
// --- Icons ---

import {
    Loader2, ListX, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, Link as LinkIconLucide, GripVertical,
    Facebook, Instagram, Linkedin, Youtube, Twitter, Globe, Mail, Phone, MessageSquare, // Common social icons
    AlertCircle, CheckCircle // For feedback
} from 'lucide-react';

// --- DnD Imports ---
import {
    DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface Props {
    negocioId: string;
}

// --- Mapeo de Nombres a Iconos (sin cambios) ---
const IconMap: { [key: string]: React.ElementType } = {
    facebook: Facebook, instagram: Instagram, linkedin: Linkedin, youtube: Youtube,
    twitter: Twitter, x: Twitter, website: Globe, web: Globe, sitio: Globe,
    email: Mail, correo: Mail, whatsapp: MessageSquare, telefono: Phone, link: LinkIconLucide,
    // Añade más mapeos aquí...
};

// --- Componente Interno para la Fila Arrastrable (sin cambios) ---
function SortableRedSocialItem({ redSocial, onEditClick, onDeleteClick }: {
    redSocial: NegocioRedSocial;
    onEditClick: (rs: NegocioRedSocial) => void;
    onDeleteClick: (id: string) => void;
}) {
    const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: redSocial.id });
    const style = { transform: CSS.Transform.toString(transform), transition, opacity: isDragging ? 0.7 : 1, zIndex: isDragging ? 10 : undefined, cursor: isDragging ? 'grabbing' : 'grab' };
    const lowerCaseName = redSocial.nombreRed.toLowerCase();
    const IconComponent = IconMap[lowerCaseName] || LinkIconLucide;
    const listItemClasses = `flex items-center gap-3 py-2 px-2 border-b border-zinc-700 transition-colors ${isDragging ? 'bg-zinc-600 shadow-lg' : 'hover:bg-zinc-700/50'}`;
    const buttonClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
    const deleteButtonClasses = "text-zinc-400 hover:text-red-500 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";

    return (
        <li ref={setNodeRef} style={style} className={listItemClasses}>
            <button {...attributes} {...listeners} data-dndkit-drag-handle className="cursor-grab touch-none text-zinc-500 hover:text-zinc-300 flex-shrink-0 focus:outline-none focus:ring-1 focus:ring-blue-500 rounded" aria-label="Mover red social" onClick={(e) => e.stopPropagation()}> <GripVertical size={18} /> </button>
            <IconComponent size={18} className="text-zinc-400 flex-shrink-0" />
            <div className="flex-grow mr-2 overflow-hidden">
                <p className="text-sm font-medium text-zinc-200 truncate" title={redSocial.nombreRed}> {redSocial.nombreRed} </p>
                <a href={redSocial.url} target="_blank" rel="noopener noreferrer" className="text-xs text-blue-400 hover:text-blue-300 truncate block" title={redSocial.url} onClick={(e) => e.stopPropagation()}> {redSocial.url} </a>
            </div>
            <button onClick={(e) => { e.stopPropagation(); onEditClick(redSocial); }} className={buttonClasses} title="Editar Red Social"> <PencilIcon size={14} /> </button>
            <button onClick={(e) => { e.stopPropagation(); onDeleteClick(redSocial.id); }} className={deleteButtonClasses} title="Eliminar Red Social"> <Trash2 size={14} /> </button>
        </li>
    );
}

// --- Componente Principal ---
export default function NegocioRedes({ negocioId }: Props) {
    const [redes, setRedes] = useState<NegocioRedSocial[]>([]);
    const [loading, setLoading] = useState(true);
    const [isSavingOrder, setIsSavingOrder] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [redParaEditar, setRedParaEditar] = useState<NegocioRedSocial | null>(null);
    const [modalFormData, setModalFormData] = useState<UpsertRedSocialInput>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases Tailwind
    // --- AJUSTE: Contenedor principal con padding ---
    const containerClasses = "flex flex-col";
    // --- AJUSTE: Contenedor de lista con flex-grow y overflow ---
    const listContainerClasses = "flex-grow overflow-y-auto mb-3 -mr-1 pr-1"; // Margen inferior para separar del botón
    const crearButtonClasses = "w-full border-2 border-dashed border-zinc-600 hover:border-blue-500 text-zinc-400 hover:text-blue-400 rounded-lg p-2 flex items-center justify-center gap-2 text-sm font-medium transition-colors duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex-shrink-0"; // flex-shrink-0 para evitar que se encoja
    // Clases Modal (sin cambios)
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const buttonBaseClasses = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";

    // Sensores DnD (sin cambios)
    const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }), useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }));

    // --- Carga de datos (sin cambios) ---
    const fetchRedes = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) return;
        if (isInitialLoad) setLoading(true); setError(null);
        try {
            const data = await obtenerRedesSocialesNegocio(negocioId);
            const redesConOrden = (data || []).map((red, index) => ({ ...red, orden: red.orden ?? index }));
            setRedes(redesConOrden);
        } catch (err) { console.error("Error al obtener redes sociales:", err); setError("No se pudieron cargar las redes sociales."); setRedes([]); }
        finally { if (isInitialLoad) setLoading(false); }
    }, [negocioId]);

    useEffect(() => { fetchRedes(true); }, [fetchRedes]);

    // --- Limpiar mensaje de éxito (sin cambios) ---
    useEffect(() => { let timer: NodeJS.Timeout; if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); } return () => clearTimeout(timer); }, [successMessage]);

    // --- Manejadores del Modal (sin cambios) ---
    const openModal = (mode: 'create' | 'edit', red?: NegocioRedSocial) => { setModalMode(mode); setRedParaEditar(mode === 'edit' ? red || null : null); setModalFormData(mode === 'edit' && red ? { nombreRed: red.nombreRed, url: red.url, icono: red.icono } : { nombreRed: '', url: '', icono: '' }); setIsModalOpen(true); setModalError(null); };
    const closeModal = () => { setIsModalOpen(false); setTimeout(() => { setModalMode(null); setRedParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false); }, 300); };
    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement>) => { const { name, value } = e.target; setModalFormData(prev => ({ ...prev, [name]: value })); setModalError(null); };
    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault(); if (!modalFormData.nombreRed?.trim() || !modalFormData.url?.trim()) { setModalError("Nombre de red y URL son obligatorios."); return; }
        setIsSubmittingModal(true); setModalError(null); setSuccessMessage(null);
        try {
            let result: ActionResult<NegocioRedSocial>; const dataToSend = { nombreRed: modalFormData.nombreRed.trim(), url: modalFormData.url.trim(), icono: modalFormData.icono?.trim() || null, };
            if (modalMode === 'create') { result = await crearRedSocialNegocio(negocioId, dataToSend.nombreRed, dataToSend.url, dataToSend.icono); }
            else if (modalMode === 'edit' && redParaEditar?.id) { result = await actualizarRedSocialNegocio(redParaEditar.id, dataToSend); }
            else { throw new Error("Modo inválido o ID faltante."); }
            if (result.success) { await fetchRedes(); closeModal(); setSuccessMessage(modalMode === 'create' ? 'Red social añadida.' : 'Red social actualizada.'); }
            else { throw new Error(result.error || "Error desconocido."); }
        } catch (err) { console.error(`Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} red social:`, err); setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`); }
        finally { setIsSubmittingModal(false); }
    };
    const handleModalDelete = async () => {
        if (!redParaEditar?.id) return;
        if (confirm(`¿Eliminar el enlace para "${redParaEditar.nombreRed}"?`)) {
            setIsSubmittingModal(true); setModalError(null); setSuccessMessage(null);
            try { const result = await eliminarRedSocialNegocio(redParaEditar.id); if (result.success) { await fetchRedes(); closeModal(); setSuccessMessage('Red social eliminada.'); } else { throw new Error(result.error || "Error desconocido."); } }
            catch (err) { console.error("Error eliminando red social:", err); setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`); }
            finally { setIsSubmittingModal(false); }
        }
    };

    // --- Manejador Drag End (sin cambios) ---
    const handleDragEndRedes = useCallback(async (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = redes.findIndex((r) => r.id === active.id); const newIndex = redes.findIndex((r) => r.id === over.id);
            if (oldIndex === -1 || newIndex === -1) return;
            const reorderedRedes = arrayMove(redes, oldIndex, newIndex); setRedes(reorderedRedes);
            const ordenData: RedSocialOrdenData[] = reorderedRedes.map(({ id }, index) => ({ id, orden: index }));
            setIsSavingOrder(true); setError(null); setSuccessMessage(null);
            try { await actualizarOrdenRedesSociales(ordenData); setSuccessMessage("Orden guardado."); }
            catch (saveError) { console.error('Error al guardar el orden:', saveError); setError('Error al guardar orden.'); fetchRedes(); }
            finally { setIsSavingOrder(false); }
        }
    }, [redes, fetchRedes]);

    // --- Renderizado Interno ---
    const renderInternalContent = () => {
        if (loading) return <div className="flex items-center justify-center py-6 text-zinc-400"><Loader2 className="h-4 w-4 animate-spin mr-2" /><span>Cargando...</span></div>;
        if (error && !isSavingOrder) return <div className="flex flex-col items-center justify-center text-center py-6"><ListX className="h-6 w-6 text-red-400 mb-2" /><p className="text-red-400 text-sm">{error}</p></div>;

        return (
            <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEndRedes}>
                <SortableContext items={redes.map(r => r.id)} strategy={verticalListSortingStrategy}>
                    {redes.length === 0 && !error ? (
                        <div className="flex flex-col items-center justify-center text-center py-6"><ListChecks className="h-6 w-6 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay redes sociales añadidas.</p></div>
                    ) : (
                        <ul className='divide-y divide-zinc-700'>
                            {redes.map((red) => (
                                <SortableRedSocialItem key={red.id} redSocial={red} onEditClick={openModal.bind(null, 'edit')} onDeleteClick={handleModalDelete} />
                            ))}
                        </ul>
                    )}
                </SortableContext>
            </DndContext>
        );
    }

    // --- Renderizado Principal ---
    return (
        <div className={containerClasses}>
            {/* Título (Opcional, si el contenedor padre no lo tiene) */}
            {/* <h3 className="text-base font-semibold text-white mb-3 flex items-center gap-2"><Share2 size={16}/> Redes Sociales</h3> */}

            {/* Mensajes Globales */}
            {isSavingOrder && (<div className="mb-2 flex items-center justify-center text-xs text-blue-300"> <Loader2 className="h-3 w-3 animate-spin mr-1.5" />Guardando orden... </div>)}
            {successMessage && (<p className="mb-2 text-center text-xs text-green-400 bg-green-900/30 p-1 rounded border border-green-600/50"> <CheckCircle size={12} className="inline mr-1" /> {successMessage} </p>)}
            {error && !isSavingOrder && (<p className="mb-2 text-center text-xs text-red-400 bg-red-900/30 p-1 rounded border border-red-600/50"> <AlertCircle size={12} className="inline mr-1" /> {error} </p>)}

            {/* --- AJUSTE: Contenedor de lista con flex-grow y overflow --- */}
            <div className={listContainerClasses}>
                {renderInternalContent()}
            </div>

            {/* --- AJUSTE: Botón Crear fuera del contenedor scrollable --- */}
            {!loading && !error && (
                <div className="mt-3 flex-shrink-0"> {/* Evita que el botón se encoja */}
                    <button
                        onClick={() => openModal('create')}
                        className={crearButtonClasses}
                        title="Añadir nueva red social"
                    >
                        <PlusIcon size={16} />
                        <span>Añadir Red Social</span>
                    </button>
                </div>
            )}
            {/* ------------------------------------------------------- */}

            {/* Modal */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}> <h3 className="text-lg font-semibold text-white"> {modalMode === 'create' ? 'Añadir Red Social' : 'Editar Red Social'} </h3> <button onClick={closeModal} className="text-zinc-400 hover:text-white" aria-label="Cerrar modal"> <XIcon size={20} /> </button> </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div> <label htmlFor="modal-nombreRed" className={labelBaseClasses}>Nombre Red <span className="text-red-500">*</span></label> <input type="text" id="modal-nombreRed" name="nombreRed" value={modalFormData.nombreRed || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={50} placeholder="Ej: Facebook, Sitio Web, WhatsApp" /> <p className="text-xs text-zinc-500 mt-1">Usado para identificar el icono (si es común).</p> </div>
                                <div> <label htmlFor="modal-url" className={labelBaseClasses}>URL Completa <span className="text-red-500">*</span></label> <input type="url" id="modal-url" name="url" value={modalFormData.url || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} placeholder="https://..." /> </div>
                                <div> <label htmlFor="modal-icono" className={labelBaseClasses}>Icono (Opcional)</label> <input type="text" id="modal-icono" name="icono" value={modalFormData.icono || ''} onChange={handleModalFormChange} className={inputBaseClasses} disabled={isSubmittingModal} maxLength={50} placeholder="Nombre icono Lucide (ej: phone)" /> <p className="text-xs text-zinc-500 mt-1">Si se deja vacío, se intentará usar un icono por defecto basado en el nombre.</p> </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClasses} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 text-sm px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClasses} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500 text-sm`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClasses} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-sm`} disabled={isSubmittingModal}> {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />} {modalMode === 'create' ? 'Añadir' : 'Guardar'} </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
