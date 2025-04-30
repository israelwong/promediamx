'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// Ajusta rutas según tu estructura
import {
    obtenerCanalesCRM,
    crearCanalCRM,
    editarCanalCRM,
    eliminarCanalCRM
} from '@/app/admin/_lib/crmCanal.actions'; // Asegúrate que las acciones estén aquí
import { CanalCRM } from '@/app/admin/_lib/types'; // Importar tipo
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, Share2 } from 'lucide-react'; // Iconos (Share2 para Canal)

interface Props {
    crmId: string;
}

// Tipo para el formulario modal
type CanalFormData = Partial<Pick<CanalCRM, 'nombre' | 'status'>>;

export default function CRMCanal({ crmId }: Props) {
    const [canales, setCanales] = useState<CanalCRM[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [canalParaEditar, setCanalParaEditar] = useState<CanalCRM | null>(null);
    const [modalFormData, setModalFormData] = useState<CanalFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2";
    const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-center justify-between gap-3";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
    // Clases Modal
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-md flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";

    // --- Carga de datos ---
    const fetchCanales = useCallback(async (isInitialLoad = false) => {
        if (!crmId) return;
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const data = await obtenerCanalesCRM(crmId);
            setCanales(data || []);
        } catch (err) {
            console.error("Error al obtener los canales:", err);
            setError("No se pudieron cargar los canales.");
            setCanales([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [crmId]);

    useEffect(() => {
        fetchCanales(true);
    }, [fetchCanales]);

    // --- Manejadores Modal ---
    const openModal = (mode: 'create' | 'edit', canal?: CanalCRM) => {
        setModalMode(mode);
        setCanalParaEditar(mode === 'edit' ? canal || null : null);
        setModalFormData(mode === 'edit' && canal ? { nombre: canal.nombre, status: canal.status } : { nombre: '', status: 'activo' });
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setCanalParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        setModalError(null);
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombre?.trim()) { setModalError("El nombre es obligatorio."); return; }
        setIsSubmittingModal(true); setModalError(null);

        try {
            let result;
            const dataToSend = {
                nombre: modalFormData.nombre.trim(),
                status: modalFormData.status || 'activo',
            };

            if (modalMode === 'create') {
                result = await crearCanalCRM({ crmId: crmId, nombre: dataToSend.nombre });
            } else if (modalMode === 'edit' && canalParaEditar?.id) {
                result = await editarCanalCRM(canalParaEditar.id, dataToSend);
            } else {
                throw new Error("Modo inválido o ID faltante.");
            }

            if (result?.success) {
                await fetchCanales(); closeModal();
            } else { throw new Error(result?.error || "Error desconocido."); }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} canal:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!canalParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar el canal "${canalParaEditar.nombre}"? Considera reasignar los Leads asociados.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarCanalCRM(canalParaEditar.id);
                if (result?.success) { await fetchCanales(); closeModal(); }
                else { throw new Error(result?.error || "Error desconocido."); }
            } catch (err) {
                console.error("Error eliminando canal:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
                setIsSubmittingModal(false);
            }
        }
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <Share2 size={16} /> Canales de Adquisición
                </h3>
                <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nuevo canal">
                    <PlusIcon size={14} /> <span>Crear Canal</span>
                </button>
            </div>

            {/* Errores generales */}
            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}

            {/* Contenido Principal: Lista */}
            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando canales...</span></div>
                ) : canales.length === 0 && !error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay canales definidos.</p></div>
                ) : (
                    // Lista de Canales (No arrastrable)
                    <ul className='space-y-2'>
                        {canales.map((canal) => (
                            <li key={canal.id} className={listItemClasses}>
                                <span className="text-sm font-medium text-zinc-200 flex-grow truncate" title={canal.nombre}>
                                    {canal.nombre}
                                </span>
                                {/* Opcional: Mostrar status */}
                                {/* <span className={`text-xs px-1.5 py-0.5 rounded ${canal.status === 'activo' ? 'bg-green-500/20 text-green-400' : 'bg-zinc-600 text-zinc-400'}`}>{canal.status}</span> */}
                                <button onClick={() => openModal('edit', canal)} className={buttonEditClasses} title="Editar Canal">
                                    <PencilIcon size={16} />
                                </button>
                            </li>
                        ))}
                    </ul>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Nuevo Canal' : 'Editar Canal'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div>
                                    <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre Canal <span className="text-red-500">*</span></label>
                                    <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={50} placeholder="Ej: WhatsApp, Facebook Leads" />
                                </div>
                                {/* Opcional: Editar status si es necesario */}
                                {/* <div>
                                    <label htmlFor="modal-status" className={labelBaseClasses}>Status</label>
                                    <select id="modal-status" name="status" value={modalFormData.status || 'activo'} onChange={handleModalFormChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmittingModal}>
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                    </select>
                                </div> */}
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClassesModal} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmittingModal}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                                    {modalMode === 'create' ? 'Crear' : 'Guardar'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
