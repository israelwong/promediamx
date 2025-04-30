'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation'; // Cambiado a 'next/navigation'
// Ajustar rutas según tu estructura
import {
    obtenerUsuariosConRol, // Usar la acción actualizada
    crearUsuario,
    actualizarUsuario,
    eliminarUsuario
} from '@/app/admin/_lib/usuario.actions';
import { obtenerRoles } from '@/app/admin/_lib/rol.actions';
import { Usuario, Rol } from '@/app/admin/_lib/types'; // Importar tipos
import { Loader2, AlertTriangle, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, Users, ShieldAlert, BadgeCheck, BadgeX } from 'lucide-react'; // Iconos

// Extender Usuario para incluir el objeto Rol completo
interface UsuarioConRol extends Usuario {
    rol?: Rol; // Eliminar 'null' para que sea compatible con la interfaz 'Usuario'
}

// Tipo para el formulario modal
type UsuarioFormData = Partial<Pick<Usuario, 'username' | 'email' | 'telefono' | 'password' | 'rolId' | 'status'>>;

export default function UsuariosLista() {
    const [usuarios, setUsuarios] = useState<UsuarioConRol[]>([]);
    const [roles, setRoles] = useState<Rol[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Estados para el Modal
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
    const [usuarioParaEditar, setUsuarioParaEditar] = useState<UsuarioConRol | null>(null);
    const [modalFormData, setModalFormData] = useState<UsuarioFormData>({});
    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalError, setModalError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 md:p-5 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-4 border-b border-zinc-600 pb-3";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2";
    const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-center justify-between gap-3";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
    // Clases Modal
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden"; // max-w-lg
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const statusBadgeClasses = "px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1";


    // --- Función para cargar datos ---
    const fetchData = useCallback(async (isInitialLoad = false) => {
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            // Cargar usuarios y roles en paralelo
            const [usersData, rolesData] = await Promise.all([
                obtenerUsuariosConRol(), // Usar la acción que incluye roles
                obtenerRoles()
            ]);
            setUsuarios(usersData || []);
            setRoles(rolesData || []);
        } catch (err) {
            console.error("Error al obtener usuarios o roles:", err);
            setError("No se pudieron cargar los datos necesarios.");
            setUsuarios([]);
            setRoles([]);
        } finally {
            if (isInitialLoad) setLoading(false);
        }
    }, []);

    // --- Carga inicial ---
    useEffect(() => {
        fetchData(true);
    }, [fetchData]);

    // --- Manejadores del Modal ---
    const openModal = (mode: 'create' | 'edit', usuario?: UsuarioConRol) => {
        setModalMode(mode);
        setUsuarioParaEditar(mode === 'edit' ? usuario || null : null);
        // Poblar formulario: para editar, usar datos existentes; para crear, usar valores por defecto
        setModalFormData(mode === 'edit' && usuario ?
            {
                username: usuario.username,
                email: usuario.email,
                telefono: usuario.telefono,
                rolId: usuario.rolId,
                status: usuario.status
                // NO incluir password al editar
            } :
            {
                username: '',
                email: '',
                telefono: '',
                password: '', // Campo vacío para creación
                rolId: roles.find(r => r.nombre.toLowerCase() === 'cliente')?.id || roles[0]?.id || '', // Rol por defecto (ej: cliente o el primero)
                status: 'activo'
            }
        );
        setIsModalOpen(true);
        setModalError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => {
            setModalMode(null); setUsuarioParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
        }, 300);
    };

    const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setModalFormData(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? ((e.target as HTMLInputElement).checked ? 'activo' : 'inactivo') : value
        }));
        setModalError(null);
    };

    const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validaciones
        if (!modalFormData.username?.trim()) { setModalError("Nombre de usuario es obligatorio."); return; }
        if (!modalFormData.email?.trim()) { setModalError("Email es obligatorio."); return; }
        if (!modalFormData.rolId) { setModalError("Debe seleccionar un rol."); return; }
        if (modalMode === 'create' && !modalFormData.password) { setModalError("La contraseña es obligatoria al crear."); return; }
        // Añadir validación de formato de email, teléfono si es necesario

        setIsSubmittingModal(true); setModalError(null);

        try {
            let result;
            if (modalMode === 'create') {
                // Llamar a crearUsuario con los datos necesarios
                result = await crearUsuario({
                    username: modalFormData.username.trim(),
                    email: modalFormData.email.trim(),
                    telefono: modalFormData.telefono || '', // Enviar string vacío si no hay teléfono
                    password: modalFormData.password || '', // Ya validamos que no esté vacío
                    rolId: modalFormData.rolId,
                    status: modalFormData.status || 'activo',
                });
            } else if (modalMode === 'edit' && usuarioParaEditar?.id) {
                // Llamar a actualizarUsuario solo con los campos editables
                result = await actualizarUsuario(usuarioParaEditar.id, {
                    username: modalFormData.username.trim(),
                    email: modalFormData.email.trim(),
                    telefono: modalFormData.telefono || '',
                    rolId: modalFormData.rolId,
                    status: modalFormData.status || 'activo',
                });
            } else {
                throw new Error("Modo de modal inválido o ID de usuario faltante.");
            }

            if (result?.success) {
                await fetchData(); // Recargar la lista
                closeModal();
            } else {
                throw new Error(result?.error || "Ocurrió un error desconocido.");
            }

        } catch (err) {
            console.error(`Error al ${modalMode === 'create' ? 'crear' : 'actualizar'} usuario:`, err);
            const message = err instanceof Error ? err.message : "Ocurrió un error";
            setModalError(`Error: ${message}`);
            setIsSubmittingModal(false);
        }
    };

    const handleModalDelete = async () => {
        if (!usuarioParaEditar?.id) return;
        // Doble chequeo: rol desde el objeto completo y nombre 'administrador'
        if (usuarioParaEditar.rol?.nombre?.toLowerCase() === 'administrador') {
            setModalError("No se puede eliminar al usuario administrador.");
            return;
        }
        if (confirm(`¿Estás seguro de eliminar al usuario "${usuarioParaEditar.username}"?`)) {
            setIsSubmittingModal(true); setModalError(null);
            try {
                const result = await eliminarUsuario(usuarioParaEditar.id);
                if (result?.success) {
                    await fetchData(); // Recargar lista
                    closeModal();
                } else {
                    throw new Error(result?.error || "Ocurrió un error desconocido.");
                }
            } catch (err) {
                console.error("Error eliminando usuario:", err);
                const message = err instanceof Error ? err.message : "Ocurrió un error";
                setModalError(`Error al eliminar: ${message}`);
                setIsSubmittingModal(false);
            }
        }
    };

    // --- Helper para Status ---
    const getStatusInfo = (status: UsuarioConRol['status']): { text: string; color: string; icon: React.ElementType } => {
        switch (status) {
            case 'activo': return { text: 'Activo', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactivo', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
            default: return { text: status || 'Desconocido', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
        }
    };


    // --- Renderizado ---
    return (
        <div>
            <div className="flex items-center justify-between mb-4">
                <h2 className="text-xl font-bold text-white">Usuarios</h2>
                <button
                    onClick={() => router.back()}
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-opacity-50 transition duration-150 ease-in-out"
                >
                    Cerrar ventaana
                </button>
            </div>
            <div className={containerClasses}>
                {/* Cabecera */}
                <div className={headerClasses}>
                    <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
                        <Users size={16} /> Gestión de Usuarios
                    </h3>
                    <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nuevo usuario">
                        <PlusIcon size={14} /> <span>Crear Usuario</span>
                    </button>
                </div>

                {/* Mensaje de Error General */}
                {error && <p className="mb-4 text-center text-red-400">{error}</p>}

                {/* Contenido Principal: Lista de Usuarios */}
                <div className={listContainerClasses}>
                    {loading ? (
                        <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando usuarios...</span></div>
                    ) : usuarios.length === 0 && !error ? (
                        <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay usuarios definidos.</p></div>
                    ) : (
                        // Lista de Usuarios
                        <ul className='space-y-2'>
                            {usuarios.map((usuario) => {
                                const statusInfo = getStatusInfo(usuario.status);
                                const isAdmin = usuario.rol?.nombre?.toLowerCase() === 'administrador';
                                return (
                                    <li key={usuario.id} className={listItemClasses}>
                                        <div className="flex-grow mr-2 overflow-hidden">
                                            <p className="text-sm font-medium text-zinc-100 truncate" title={usuario.username}>
                                                {usuario.username}
                                                {isAdmin && (
                                                    <span title="Administrador">
                                                        <ShieldAlert size={14} className="inline ml-1.5 text-amber-400" />
                                                    </span>
                                                )}
                                            </p>
                                            <p className="text-xs text-zinc-400 truncate" title={usuario.email}>{usuario.email}</p>
                                            <div className='flex items-center gap-2 mt-1'>
                                                <span className={`${statusBadgeClasses} ${statusInfo.color}`}>
                                                    <statusInfo.icon size={12} />{statusInfo.text}
                                                </span>
                                                <span className="text-xs text-zinc-500 bg-zinc-700 px-1.5 py-0.5 rounded">
                                                    {usuario.rol?.nombre || 'Sin rol'}
                                                </span>
                                            </div>
                                        </div>
                                        <button onClick={() => openModal('edit', usuario)} className={buttonEditClasses} title="Editar Usuario">
                                            <PencilIcon size={16} />
                                        </button>
                                    </li>
                                );
                            })}
                        </ul>
                    )}
                </div>

                {/* Modal para Crear/Editar Usuario */}
                {isModalOpen && (
                    <div className={modalOverlayClasses} onClick={closeModal}>
                        <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                            {/* Cabecera Modal */}
                            <div className={modalHeaderClasses}>
                                <h3 className="text-lg font-semibold text-white">
                                    {modalMode === 'create' ? 'Crear Nuevo Usuario' : 'Editar Usuario'}
                                </h3>
                                <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal">
                                    <XIcon size={20} />
                                </button>
                            </div>
                            {/* Formulario Modal */}
                            <form onSubmit={handleModalFormSubmit}>
                                <div className={modalBodyClasses}>
                                    {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                        <div>
                                            <label htmlFor="modal-username" className={labelBaseClasses}>Username <span className="text-red-500">*</span></label>
                                            <input type="text" id="modal-username" name="username" value={modalFormData.username || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={50} />
                                        </div>
                                        <div>
                                            <label htmlFor="modal-email" className={labelBaseClasses}>Email <span className="text-red-500">*</span></label>
                                            <input type="email" id="modal-email" name="email" value={modalFormData.email || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} />
                                        </div>
                                    </div>
                                    <div>
                                        <label htmlFor="modal-telefono" className={labelBaseClasses}>Teléfono</label>
                                        <input type="tel" id="modal-telefono" name="telefono" value={modalFormData.telefono || ''} onChange={handleModalFormChange} className={inputBaseClasses} disabled={isSubmittingModal} maxLength={20} />
                                    </div>
                                    {/* Mostrar campo de contraseña solo al crear */}
                                    {modalMode === 'create' && (
                                        <div>
                                            <label htmlFor="modal-password" className={labelBaseClasses}>Contraseña <span className="text-red-500">*</span></label>
                                            <input type="password" id="modal-password" name="password" value={modalFormData.password || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} />
                                            <p className="text-xs text-zinc-500 mt-1">La contraseña se guardará encriptada.</p>
                                        </div>
                                    )}
                                    <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                        <div>
                                            <label htmlFor="modal-rolId" className={labelBaseClasses}>Rol <span className="text-red-500">*</span></label>
                                            <select id="modal-rolId" name="rolId" value={modalFormData.rolId || ''} onChange={handleModalFormChange} className={`${inputBaseClasses} appearance-none`} required disabled={isSubmittingModal || roles.length === 0}>
                                                <option value="">-- Selecciona un rol --</option>
                                                {roles.map(rol => (
                                                    <option key={rol.id} value={rol.id}>{rol.nombre}</option>
                                                ))}
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
                                {/* Pie Modal */}
                                <div className={modalFooterClasses}>
                                    {modalMode === 'edit' && (
                                        <button
                                            type="button"
                                            onClick={handleModalDelete}
                                            // Deshabilitar si es el rol administrador
                                            disabled={isSubmittingModal || usuarioParaEditar?.rol?.nombre?.toLowerCase() === 'administrador'}
                                            className={`${buttonBaseClassesModal} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 px-3 py-1.5 mr-auto disabled:bg-red-800/50 disabled:cursor-not-allowed`}
                                            title={usuarioParaEditar?.rol?.nombre?.toLowerCase() === 'administrador' ? "No se puede eliminar al administrador" : "Eliminar usuario"}
                                        >
                                            <Trash2 size={14} /> Eliminar
                                        </button>
                                    )}
                                    <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmittingModal}>Cancelar</button>
                                    <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmittingModal}>
                                        {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                                        {modalMode === 'create' ? 'Crear Usuario' : 'Guardar Cambios'}
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
