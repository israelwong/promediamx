'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// Ajusta rutas según tu estructura
import {
    obtenerRoles,
    crearRol,
    actualizarRol,
    eliminarRol
} from '@/app/admin/_lib/unused/rol.actions'; // Asegúrate que las acciones estén aquí
import { Rol } from '@/app/admin/_lib/types'; // Importar tipo Rol
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, ShieldCheck } from 'lucide-react'; // Iconos

// Tipo para el formulario dentro del modal
type RolFormData = Partial<Pick<Rol, 'nombre' | 'descripcion'>>; // Solo nombre y descripción

export default function RolLista() {
    const [roles, setRoles] = useState<Rol[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [rolParaEditar, setRolParaEditar] = useState<Rol | null>(null);
    const [modalFormData, setModalFormData] = useState<RolFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind (reutilizadas y ajustadas)
    const containerClasses = "p-4 md:p-5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-4 border-b border-zinc-600 pb-3";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2"; // Espacio entre items
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
    const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm"; // Botones modal un poco más grandes

    // --- Función para cargar roles ---
    const fetchRoles = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const data = await obtenerRoles();
            // Ordenar roles (opcional, ej. por nombre)
            const sortedData = (data || []).sort((a, b) => a.nombre.localeCompare(b.nombre));
            const rolesWithUsuarios = sortedData.map(rol => ({
                ...rol,
                usuarios: (rol.usuarios || []).map(usuario => ({
                    ...usuario,
                    rolid: usuario.rolId ?? '', // Ensure rolid is always a string
                }))
            }));
            setRoles(rolesWithUsuarios);
        } catch (err) {
            console.error("Error al obtener los roles:", err);
            setError("No se pudieron cargar los roles.");
            setRoles([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    // --- Carga inicial ---
    useEffect(() => {
        fetchRoles(true);
    }, [fetchRoles]);

    // --- Manejadores del Modal ---
    const openModal = (mode: 'create' | 'edit', rol?: Rol) => {
        setModalMode(mode);
        setRolParaEditar(mode === 'edit' ? rol || null : null);
        setModalFormData(mode === 'edit' && rol ? { nombre: rol.nombre, descripcion: rol.descripcion } : { nombre: '', descripcion: '' });
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setRolParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        setModalError(null);
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!modalFormData.nombre?.trim()) {
            setModalError("El nombre del rol es obligatorio."); return;
        }
        setIsSubmittingModal(true); setModalError(null);

        try {
            const dataToSend = {
                nombre: modalFormData.nombre.trim(),
                descripcion: modalFormData.descripcion?.trim() || null,
            };

            let result;
            if (modalMode === 'create') {
                // Asegurarse que el tipo coincida con lo que espera crearRol
                result = await crearRol(dataToSend as Rol); // Castear si es necesario
            } else if (modalMode === 'edit' && rolParaEditar?.id) {
                // Asegurarse que el tipo coincida con lo que espera actualizarRol
                result = await actualizarRol(rolParaEditar.id, dataToSend as Rol);
            } else {
                throw new Error("Modo de modal inválido o ID de rol faltante.");
            }

            if (result?.success) {
                await fetchRoles(); // Recargar la lista
                closeModal();
            } else {
                throw new Error(result?.error || "Ocurrió un error desconocido.");
            }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} rol:`, err);
            const message = err instanceof Error ? err.message : "Ocurrió un error";
            setModalError(`Error: ${message}`);
            // No cerrar modal en error, mantener isSubmitting false para reintentar
            setIsSubmittingModal(false);
        }
        // No poner finally aquí si el modal se cierra antes en caso de éxito
    };

    const handleModalDelete = async () => {
        if (!rolParaEditar?.id) return;
        // Añadir advertencia sobre usuarios asociados
        if (confirm(`¿Estás seguro de eliminar el rol "${rolParaEditar.nombre}"? Esto podría afectar a los usuarios con este rol.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarRol(rolParaEditar.id);
                if (result?.success) {
                    await fetchRoles(); // Recargar lista
                    closeModal();
                } else {
                    throw new Error(result?.error || "Ocurrió un error desconocido.");
                }
            } catch (err) {
                console.error("Error eliminando rol:", err);
                const message = err instanceof Error ? err.message : "Ocurrió un error";
                setModalError(`Error al eliminar: ${message}`);
                setIsSubmittingModal(false); // Permitir reintentar o cerrar
            }
        }
    };

    // --- Renderizado ---
    return (
        <div>

            <div className="flex items-center justify-between mb-4">
                <h2 className="text-2xl font-bold text-white mb-4">Gestión de Roles</h2>
                <button onClick={() => window.history.back()} className="bg-red-700 border border-red-600 rounded px-3 py-1 text-zinc-200 flex items-center space-x-1">
                    <XIcon size={16} />
                    <span>Cerrar ventana</span>
                </button>

            </div>

            <div className={containerClasses}>
                {/* Cabecera */}
                <div className={headerClasses}>
                    <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                        <ShieldCheck size={16} /> Roles de Usuario
                    </h3>
                    <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nuevo rol">
                        <PlusIcon size={14} /> <span>Crear Rol</span>
                    </button>
                </div>

                {/* Mensaje de Error General */}
                {error && <p className="mb-4 text-center text-red-400">{error}</p>}

                {/* Contenido Principal: Lista de Roles */}
                <div className={listContainerClasses}>
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando roles...</span></div>
                    ) : roles.length === 0 && !error ? (
                        <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay roles definidos.</p></div>
                    ) : (
                        // Lista de Roles
                        <ul className='space-y-2'>
                            {roles.map((rol) => (
                                <li key={rol.id} className={listItemClasses}>
                                    <div className="flex-grow mr-2 overflow-hidden">
                                        <p className="text-sm font-medium text-zinc-100 truncate" title={rol.nombre}>
                                            {rol.nombre}
                                        </p>
                                        {rol.descripcion && (
                                            <p className="text-xs text-zinc-400 line-clamp-1" title={rol.descripcion}>
                                                {rol.descripcion}
                                            </p>
                                        )}
                                    </div>
                                    <button onClick={() => openModal('edit', rol)} className={buttonEditClasses} title="Editar Rol">
                                        <PencilIcon size={16} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                </div>

                {/* Modal para Crear/Editar Rol */}
                {isModalOpen && (
                    <div className={modalOverlayClasses} onClick={closeModal}>
                        <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                            {/* Cabecera Modal */}
                            <div className={modalHeaderClasses}>
                                <h3 className="text-lg font-semibold text-white">
                                    {modalMode === 'create' ? 'Crear Nuevo Rol' : 'Editar Rol'}
                                </h3>
                                <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal">
                                    <XIcon size={20} />
                                </button>
                            </div>
                            {/* Formulario Modal */}
                            <form onSubmit={handleModalFormSubmit}>
                                <div className={modalBodyClasses}>
                                    {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                    <div>
                                        <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre del Rol <span className="text-red-500">*</span></label>
                                        <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={50} />
                                    </div>
                                    <div>
                                        <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción</label>
                                        <textarea id="modal-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={textareaBaseClasses} disabled={isSubmittingModal} rows={3} maxLength={200} />
                                    </div>
                                </div>
                                {/* Pie Modal */}
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

        </div>
    );
}