// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/agentes/components/CRMAgentes.tsx
'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// Ajusta rutas según tu estructura
import {
    obtenerAgentesCRM, // <-- Acción refactorizada
    crearAgenteCRM,
    editarAgenteCRM,
    eliminarAgenteCRM
} from '@/app/admin/_lib/crmAgente.actions'; // Ajusta ruta!
import { Agente } from '@/app/admin/_lib/types'; // Ajusta ruta!
import { Loader2, ListChecks, PencilIcon, Trash2, Save, XIcon, UserCog, UserPlus, BadgeCheck, BadgeX, AlertTriangle } from 'lucide-react'; // Iconos

interface Props {
    negocioId: string;
}

// Interfaz extendida para el estado local (puede incluir conteos si la acción los devuelve)
interface AgenteConDatos extends Agente {
    _count?: { Lead?: number };
}

// Tipo para el formulario modal
type AgenteFormData = Partial<Pick<Agente, 'nombre' | 'email' | 'telefono' | 'password' | 'rol' | 'status'>>;

// --- Componente Principal ---
export default function CRMAgentes({ negocioId }: Props) {
    const [agentes, setAgentes] = useState<AgenteConDatos[]>([]);
    const [crmId, setCrmId] = useState<string | null>(null); // <-- Estado para crmId
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [agenteParaEditar, setAgenteParaEditar] = useState<AgenteConDatos | null>(null);
    const [modalFormData, setModalFormData] = useState<AgenteFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind (sin cambios)
    const containerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-4 md:p-6 flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2"; // Añadido space-y-2
    const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-center justify-between gap-3";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const statusBadgeClasses = "px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1";


    // --- Carga de datos (Modificada) ---
    const fetchAgentes = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) {
            setError("ID de negocio no disponible.");
            setLoading(false);
            return;
        }
        if (isInitialLoad) setLoading(true);
        setError(null);
        setCrmId(null); // Resetear crmId
        setAgentes([]); // Limpiar agentes

        try {
            // Llamar a la acción refactorizada
            const result = await obtenerAgentesCRM(negocioId);

            if (result.success && result.data) {
                // Almacenar crmId y agentes
                setCrmId(result.data.crmId);
                setAgentes(result.data.agentes || []);
                if (!result.data.crmId) {
                    setError("CRM no encontrado para este negocio. Debe configurarse primero.");
                }
            } else {
                throw new Error(result.error || "Error desconocido al cargar agentes.");
            }
        } catch (err) {
            console.error("Error al obtener los agentes:", err);
            setError(`No se pudieron cargar los agentes: ${err instanceof Error ? err.message : "Error desconocido"}`);
            setAgentes([]);
            setCrmId(null);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchAgentes(true);
    }, [fetchAgentes]);

    // --- Manejadores Modal ---
    const openModal = (mode: 'create' | 'edit', agente?: AgenteConDatos) => {
        // Solo permitir crear si tenemos crmId
        if (mode === 'create' && !crmId) {
            setError("No se puede crear un agente sin un CRM configurado.");
            return;
        }
        setModalMode(mode);
        setAgenteParaEditar(mode === 'edit' ? agente || null : null);
        setModalFormData(mode === 'edit' && agente ?
            {
                nombre: agente.nombre,
                email: agente.email, // Email se muestra pero no se edita
                telefono: agente.telefono,
                rol: agente.rol,
                status: agente.status
            } :
            {
                nombre: '',
                email: '',
                telefono: '',
                password: '',
                rol: 'agente_ventas',
                status: 'activo'
            }
        );
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => { /* ... (sin cambios) ... */
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setAgenteParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setModalFormData(prev => ({ ...prev, [name]: value }));
        setModalError(null);
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validaciones
        if (!modalFormData.nombre?.trim()) { setModalError("Nombre es obligatorio."); return; }
        if (!modalFormData.email?.trim() || !/\S+@\S+\.\S+/.test(modalFormData.email)) { setModalError("Email inválido u obligatorio."); return; }
        if (modalMode === 'create' && !modalFormData.password) { setModalError("La contraseña es obligatoria al crear."); return; }
        // Validar longitud contraseña si es necesario
        // if (modalMode === 'create' && modalFormData.password && modalFormData.password.length < 8) { setModalError("La contraseña debe tener al menos 8 caracteres."); return; }

        setIsSubmittingModal(true); setModalError(null);

        try {
            let result;
            if (modalMode === 'create') {
                if (!crmId) throw new Error("crmId no está disponible para crear el agente."); // Verificación extra
                // Llamar a crearAgenteCRM con los datos necesarios
                result = await crearAgenteCRM({
                    crmId: crmId, // <--- Usar crmId del estado
                    nombre: modalFormData.nombre.trim(),
                    email: modalFormData.email.trim(),
                    telefono: modalFormData.telefono || null, // Convertir undefined a null
                    password: modalFormData.password || '',
                    rol: modalFormData.rol || 'agente_ventas',
                    status: modalFormData.status || 'activo',
                });
            } else if (modalMode === 'edit' && agenteParaEditar?.id) {
                // Llamar a editarAgenteCRM solo con los campos editables
                result = await editarAgenteCRM(agenteParaEditar.id, {
                    nombre: modalFormData.nombre.trim(),
                    // email: modalFormData.email.trim(), // Email no se edita
                    telefono: modalFormData.telefono || undefined, // Pasar undefined si está vacío
                    rol: modalFormData.rol || 'agente_ventas',
                    status: modalFormData.status || 'activo',
                });
            } else {
                throw new Error("Modo inválido o ID faltante.");
            }

            if (result?.success) {
                await fetchAgentes(); // Recargar lista
                closeModal();
            } else { throw new Error(result?.error || "Error desconocido."); }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} agente:`, err);
            setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
        } finally {
            setIsSubmittingModal(false); // Asegurar que se desactive
        }
    };

    const handleModalDelete = async () => {
        if (!agenteParaEditar?.id) return;
        if (confirm(`¿Estás seguro de eliminar al agente "${agenteParaEditar.nombre || agenteParaEditar.email}"? Los leads asignados quedarán sin agente.`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarAgenteCRM(agenteParaEditar.id);
                if (result?.success) { await fetchAgentes(); closeModal(); }
                else { throw new Error(result?.error || "Error desconocido."); }
            } catch (err) {
                console.error("Error eliminando agente:", err);
                setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
            } finally {
                setIsSubmittingModal(false);
            }
        }
    };

    // --- Helper para Status (sin cambios) ---
    const getStatusInfo = (status: AgenteConDatos['status']): { text: string; color: string; icon: React.ElementType } => {
        switch (status) {
            case 'activo': return { text: 'Activo', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactivo', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
            default: return { text: status || 'Desconocido', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
        }
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                    <UserCog size={16} /> Gestionar Agentes
                </h3>
                <button
                    onClick={() => openModal('create')}
                    className={buttonPrimaryClasses}
                    title={!crmId ? "Configura el CRM primero" : "Crear nuevo agente"}
                    disabled={!crmId || loading} // Deshabilitar si no hay crmId o cargando
                >
                    <UserPlus size={14} /> <span>Invitar Agente</span>
                </button>
            </div>

            {/* Errores generales */}
            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}

            {/* Contenido Principal: Lista */}
            <div className={listContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando agentes...</span></div>
                ) : agentes.length === 0 && !error && crmId ? ( // Mostrar solo si hay crmId pero no agentes
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay agentes definidos.</p></div>
                ) : !crmId && !loading && !error ? ( // Mensaje si no hay CRM
                    <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>El CRM no está configurado.</p></div>
                ) : agentes.length > 0 ? (
                    // Lista de Agentes
                    <ul className='space-y-2'> {/* Restaurado space-y-2 */}
                        {agentes.map((agente) => {
                            const statusInfo = getStatusInfo(agente.status);
                            const leadCount = agente._count?.Lead ?? 0; // Usar conteo
                            return (
                                <li key={agente.id} className={listItemClasses}>
                                    <div className="flex-grow mr-2 overflow-hidden">
                                        <p className="text-sm font-medium text-zinc-100 truncate" title={agente.nombre || agente.email}>
                                            {agente.nombre || `Agente (${agente.email})`}
                                        </p>
                                        <p className="text-xs text-zinc-400 truncate" title={agente.email}>{agente.email}</p>
                                        <div className='flex items-center flex-wrap gap-2 mt-1'> {/* flex-wrap para móvil */}
                                            <span className={`${statusBadgeClasses} ${statusInfo.color}`}>
                                                <statusInfo.icon size={12} />{statusInfo.text}
                                            </span>
                                            <span className="text-xs text-zinc-500 bg-zinc-700 px-1.5 py-0.5 rounded">
                                                {agente.rol || 'Agente'}
                                            </span>
                                            {/* Mostrar conteo de leads */}
                                            <span className="text-xs text-zinc-400" title={`${leadCount} leads asignados`}>{leadCount} leads</span>
                                        </div>
                                    </div>
                                    <button onClick={() => openModal('edit', agente)} className={buttonEditClasses} title="Editar Agente">
                                        <PencilIcon size={16} />
                                    </button>
                                </li>
                            );
                        })}
                    </ul>
                ) : null /* No mostrar nada si hay error */}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className={modalOverlayClasses} onClick={closeModal}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Invitar Nuevo Agente' : 'Editar Agente'}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleModalFormSubmit}>
                            <div className={modalBodyClasses}>
                                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                    <div>
                                        <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                                        <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} />
                                    </div>
                                    <div>
                                        <label htmlFor="modal-email" className={labelBaseClasses}>Email <span className="text-red-500">*</span></label>
                                        {/* Email es editable en creación, no en edición */}
                                        <input type="email" id="modal-email" name="email" value={modalFormData.email || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal || modalMode === 'edit'} />
                                        {modalMode === 'edit' && <p className="text-xs text-zinc-500 mt-1">El email no se puede cambiar.</p>}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="modal-telefono" className={labelBaseClasses}>Teléfono</label>
                                    <input type="tel" id="modal-telefono" name="telefono" value={modalFormData.telefono || ''} onChange={handleModalFormChange} className={inputBaseClasses} disabled={isSubmittingModal} maxLength={20} />
                                </div>
                                {modalMode === 'create' && (
                                    <div>
                                        <label htmlFor="modal-password" className={labelBaseClasses}>Contraseña Inicial <span className="text-red-500">*</span></label>
                                        <input type="password" id="modal-password" name="password" value={modalFormData.password || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} />
                                        {/* <p className="text-xs text-zinc-500 mt-1">El agente deberá cambiarla si implementas esa función.</p> */}
                                    </div>
                                )}
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                    <div>
                                        <label htmlFor="modal-rol" className={labelBaseClasses}>Rol</label>
                                        <select id="modal-rol" name="rol" value={modalFormData.rol || 'agente_ventas'} onChange={handleModalFormChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmittingModal}>
                                            <option value="agente_ventas">Agente de Ventas</option>
                                            <option value="supervisor_crm">Supervisor CRM</option>
                                            <option value="admin_crm">Admin CRM</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="modal-status" className={labelBaseClasses}>Status</label>
                                        <select id="modal-status" name="status" value={modalFormData.status || 'activo'} onChange={handleModalFormChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmittingModal}>
                                            <option value="activo">Activo</option>
                                            <option value="inactivo">Inactivo</option>
                                        </select>
                                    </div>
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClassesModal} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                                <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmittingModal}>Cancelar</button>
                                <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmittingModal}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                                    {modalMode === 'create' ? 'Crear Agente' : 'Guardar Cambios'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}
