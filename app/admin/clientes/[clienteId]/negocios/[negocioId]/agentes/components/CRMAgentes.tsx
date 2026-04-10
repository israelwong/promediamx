// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/agentes/components/CRMAgentes.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// Nuevas Actions y Schemas/Tipos Zod
import {
    listarAgentesCrmAction,
    crearAgenteCrmAction,
    editarAgenteCrmAction,
    eliminarAgenteCrmAction
} from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.actions'; // Ajusta la ruta si la moviste
import {
    crearAgenteCrmFormSchema, // Para el formulario de creación
    editarAgenteCrmFormSchema, // Para el formulario de edición
    type AgenteCrmData,
    type CrearAgenteCrmFormData,
    type EditarAgenteCrmFormData,
    rolAgenteCrmEnum, // Para el select de Rol
    statusAgenteCrmEnum // Para el select de Status
} from '@/app/admin/_lib/actions/agenteCrm/agenteCrm.schemas'; // Ajusta la ruta
import type { ActionResult } from '@/app/admin/_lib/types';

import { Loader2, ListChecks, UserPlus, PencilIcon, Trash2, Save, XIcon, UserCog, BadgeCheck, BadgeX, AlertTriangle } from 'lucide-react';
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";

interface Props {
    negocioId: string;
}

// Usar el tipo de Zod para el formulario modal (unión si son diferentes)
type AgenteModalFormData = CrearAgenteCrmFormData | EditarAgenteCrmFormData;

export default function CRMAgentes({ negocioId }: Props) {
    const [agentes, setAgentes] = useState<AgenteCrmData[]>([]);
    const [crmId, setCrmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
    const [agenteParaEditar, setAgenteParaEditar] = useState<AgenteCrmData | null>(null);

    const [isSubmittingModal, setIsSubmittingModal] = useState(false);
    const [modalSubmitError, setModalSubmitError] = useState<string | null>(null);

    const {
        register: registerModal,
        handleSubmit: handleSubmitModal,
        reset: resetModal,
        control: controlModal,
        formState: { errors: modalFormErrors }
    } = useForm<AgenteModalFormData>({ // Usar la unión de tipos
        resolver: zodResolver(modalMode === 'create' ? crearAgenteCrmFormSchema : editarAgenteCrmFormSchema),
        // defaultValues se establecen en openModal
    });
    const schemaActualParaResolver = modalMode === 'create' ? crearAgenteCrmFormSchema : editarAgenteCrmFormSchema;
    console.log("Schema usado para resolver:", schemaActualParaResolver.shape); // Para ver sus campos


    // Clases UI
    const containerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-4 md:p-6 flex flex-col h-full";
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2";
    const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-center justify-between gap-3 hover:bg-zinc-700/30 transition-colors";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap disabled:opacity-60";
    const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700 disabled:opacity-50";
    const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
    const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden";
    const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
    const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
    const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 text-sm";
    // const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";
    const statusBadgeClasses = "px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1";


    const fetchAgentes = useCallback(async (isInitialLoad = false) => {
        if (!negocioId) { setError("ID de negocio no disponible."); if (isInitialLoad) setLoading(false); return; }
        if (isInitialLoad) setLoading(true);
        setError(null);
        try {
            const result = await listarAgentesCrmAction({ negocioId });
            if (result.success && result.data) {
                setCrmId(result.data.crmId);
                setAgentes(result.data.agentes || []);
                if (!result.data.crmId && isInitialLoad) {
                    setError("CRM no configurado. Por favor, configura el CRM para añadir agentes.");
                }
            } else { throw new Error(result.error || "Error cargando agentes."); }
        } catch (err) {
            setError(`No se pudieron cargar los agentes: ${err instanceof Error ? err.message : "Error"}`);
            setAgentes([]); setCrmId(null);
        } finally { if (isInitialLoad) setLoading(false); }
    }, [negocioId]);

    useEffect(() => { fetchAgentes(true); }, [fetchAgentes]);

    const openModal = (mode: 'create' | 'edit', agente?: AgenteCrmData) => {
        if (mode === 'create' && !crmId) { setError("CRM no configurado."); return; }
        setModalMode(mode);
        setAgenteParaEditar(mode === 'edit' ? agente || null : null);

        if (mode === 'edit' && agente) {
            resetModal({ // Reset para editar (sin password)
                nombre: agente.nombre || '',
                // email no se edita, se mostrará el original
                telefono: agente.telefono || '',
                rol: agente.rol || 'agente_ventas',
                status: agente.status || 'activo',
            } as EditarAgenteCrmFormData); // Cast porque el tipo base de useForm es la unión
        } else { // Modo crear
            resetModal({ // Reset para crear (con password)
                nombre: '',
                email: '',
                telefono: '',
                password: '', // Campo para nueva contraseña
                rol: 'agente_ventas',
                status: 'activo',
            } as CrearAgenteCrmFormData);
        }
        setIsModalOpen(true);
        setModalSubmitError(null);
    };

    const closeModal = () => {
        setIsModalOpen(false);
        setTimeout(() => { // Delay para animación de salida
            setModalMode('create');
            setAgenteParaEditar(null);
            resetModal({ nombre: '', email: '', telefono: '', password: '', rol: 'agente_ventas', status: 'activo' });
            setModalSubmitError(null);
        }, 200);
    };

    const onModalFormSubmit: SubmitHandler<AgenteModalFormData> = async (formData) => {
        setIsSubmittingModal(true); setModalSubmitError(null);
        try {
            let result: ActionResult<AgenteCrmData | null>;

            if (modalMode === 'create') {
                if (!crmId) throw new Error("ID de CRM no disponible.");
                // Asegurarse de que formData aquí es del tipo CrearAgenteCrmFormData
                const createData = formData as CrearAgenteCrmFormData;
                if (!createData.password) { // Validación extra si Zod no lo hizo obligatorio
                    setModalSubmitError("La contraseña es obligatoria al crear.");
                    setIsSubmittingModal(false); return;
                }
                result = await crearAgenteCrmAction({
                    crmId: crmId,
                    datos: createData
                });
            } else if (modalMode === 'edit' && agenteParaEditar?.id) {
                // Asegurarse de que formData es del tipo EditarAgenteCrmFormData
                // y no incluye password si no se debe enviar
                const { ...editData } = formData as CrearAgenteCrmFormData; // Excluir password y email
                result = await editarAgenteCrmAction({
                    agenteId: agenteParaEditar.id,
                    datos: editData as EditarAgenteCrmFormData // Cast después de excluir
                });
            } else { throw new Error("Modo inválido o ID faltante."); }

            if (result?.success && result.data) { await fetchAgentes(false); closeModal(); }
            else { throw new Error(result?.error || "Error al guardar."); }
        } catch (err) {
            setModalSubmitError(`Error: ${err instanceof Error ? err.message : "Error"}`);
        } finally { setIsSubmittingModal(false); }
    };

    const handleModalDelete = async () => {
        if (!agenteParaEditar?.id) return;
        if (confirm(`¿Eliminar agente "${agenteParaEditar.nombre || agenteParaEditar.email}"?`)) {
            setIsSubmittingModal(true); setModalSubmitError(null);
            try {
                const result = await eliminarAgenteCrmAction({ agenteId: agenteParaEditar.id });
                if (result?.success) { await fetchAgentes(false); closeModal(); }
                else { throw new Error(result?.error || "Error al eliminar."); }
            } catch (err) {
                setModalSubmitError(`Error: ${err instanceof Error ? err.message : "Error"}`);
            } finally { setIsSubmittingModal(false); }
        }
    };

    const getStatusInfo = (status?: AgenteCrmData['status']): { text: string; color: string; icon: React.ElementType } => {
        switch (status) {
            case 'activo': return { text: 'Activo', color: 'bg-green-500/20 text-green-300', icon: BadgeCheck };
            case 'inactivo': return { text: 'Inactivo', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
            default: return { text: status || 'Desconocido', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
        }
    };

    return (
        <div className={containerClasses}>
            <div className={headerClasses}>
                <h3 className="text-base font-semibold text-white flex items-center gap-2"><UserCog size={16} /> Gestionar Agentes</h3>
                <Button onClick={() => openModal('create')} className={buttonPrimaryClasses} disabled={!crmId || loading} title={!crmId && !loading ? "Configura CRM" : ""}>
                    <UserPlus size={14} /> <span>Invitar Agente</span>
                </Button>
            </div>

            {error && <p className="mb-3 text-center text-sm text-red-400 bg-red-900/20 p-2 rounded-md border border-red-600/50">{error}</p>}

            <div className={listContainerClasses}>
                {loading ? (<div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /><span>Cargando...</span></div>)
                    : agentes.length === 0 && crmId ? (<div className="flex flex-col items-center justify-center text-center py-10 min-h-[100px]"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay agentes creados.</p></div>)
                        : !crmId && !loading && !error ? (<div className="flex flex-col items-center justify-center text-center py-10 min-h-[100px]"><ListChecks className="h-10 w-10 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>CRM no configurado.</p></div>)
                            : agentes.length > 0 && crmId ? (
                                <ul className='space-y-2'>
                                    {agentes.map((agente) => {
                                        const statusInfo = getStatusInfo(agente.status);
                                        const leadCount = agente._count?.Lead ?? 0;
                                        return (
                                            <li key={agente.id} className={listItemClasses}>
                                                <div className="flex-grow mr-2 overflow-hidden">
                                                    <p className="text-sm font-medium text-zinc-100 truncate" title={agente.nombre || agente.email}>
                                                        {agente.nombre || `Agente (${agente.email})`}
                                                    </p>
                                                    <p className="text-xs text-zinc-400 truncate" title={agente.email}>{agente.email}</p>
                                                    <div className='flex items-center flex-wrap gap-2 mt-1.5'>
                                                        <span className={`${statusBadgeClasses} ${statusInfo.color}`}>
                                                            <statusInfo.icon size={12} />{statusInfo.text}
                                                        </span>
                                                        <span className="text-xs text-zinc-500 bg-zinc-700 px-1.5 py-0.5 rounded capitalize">
                                                            {agente.rol?.replace('_', ' ') || 'Agente'}
                                                        </span>
                                                        <span className="text-xs text-zinc-400" title={`${leadCount} leads asignados`}>{leadCount} Lead(s)</span>
                                                    </div>
                                                </div>
                                                <button onClick={() => openModal('edit', agente)} className={buttonEditClasses} title="Editar Agente" disabled={isSubmittingModal}>
                                                    <PencilIcon size={14} />
                                                </button>
                                            </li>
                                        );
                                    })}
                                </ul>
                            ) : null}
            </div>

            {isModalOpen && (
                <div className={modalOverlayClasses}>
                    <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
                        <div className={modalHeaderClasses}>
                            <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Invitar Nuevo Agente' : `Editar Agente: ${agenteParaEditar?.nombre || agenteParaEditar?.email || ''}`}</h3>
                            <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500"><XIcon size={20} /></button>
                        </div>
                        <form onSubmit={handleSubmitModal(onModalFormSubmit)}>
                            <div className={modalBodyClasses}>
                                {modalSubmitError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalSubmitError}</p>}
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                    <div>
                                        <label htmlFor="modal-ag-nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                                        <Input type="text" id="modal-ag-nombre" {...registerModal("nombre")} className={inputBaseClasses} disabled={isSubmittingModal} />
                                        {modalFormErrors.nombre && <p className="text-xs text-red-400 mt-1">{modalFormErrors.nombre.message}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="modal-ag-email" className={labelBaseClasses}>Email <span className="text-red-500">*</span></label>
                                        <Input type="email" id="modal-ag-email"
                                            {...(modalMode === 'create' ? registerModal("email") : {})} // Solo registrar en modo 'create'
                                            defaultValue={modalMode === 'edit' ? agenteParaEditar?.email : undefined}
                                            className={inputBaseClasses}
                                            disabled={isSubmittingModal || modalMode === 'edit'}
                                            readOnly={modalMode === 'edit'}
                                        />
                                        {modalMode === 'edit' && <p className="text-xs text-zinc-500 mt-1">El email no se puede cambiar.</p>}
                                        {modalMode === 'create' && 'email' in modalFormErrors && modalFormErrors.email && (
                                            <p className="text-xs text-red-400 mt-1">{modalFormErrors.email.message}</p>
                                        )}
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="modal-ag-telefono" className={labelBaseClasses}>Teléfono</label>
                                    <Input type="tel" id="modal-ag-telefono" {...registerModal("telefono")} className={inputBaseClasses} disabled={isSubmittingModal} />
                                    {modalFormErrors.telefono && <p className="text-xs text-red-400 mt-1">{modalFormErrors.telefono.message}</p>}
                                </div>
                                {modalMode === 'create' && (
                                    <div>
                                        <label htmlFor="modal-ag-password" className={labelBaseClasses}>Contraseña Inicial <span className="text-red-500">*</span></label>
                                        <Input type="password" id="modal-ag-password" {...registerModal("password")} className={inputBaseClasses} disabled={isSubmittingModal} />
                                        {modalMode === 'create' && 'password' in modalFormErrors && modalFormErrors.password && (
                                            <p className="text-xs text-red-400 mt-1">{modalFormErrors.password.message}</p>
                                        )}
                                    </div>
                                )}
                                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                                    <div>
                                        <label htmlFor="modal-ag-rol" className={labelBaseClasses}>Rol</label>
                                        <Controller
                                            name="rol"
                                            control={controlModal}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmittingModal}>
                                                    <SelectTrigger id="modal-ag-rol" className={inputBaseClasses}><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {rolAgenteCrmEnum.options.map(option => (
                                                            <SelectItem key={option} value={option} className="capitalize">{option.replace('_', ' ')}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {modalFormErrors.rol && <p className="text-xs text-red-400 mt-1">{modalFormErrors.rol.message}</p>}
                                    </div>
                                    <div>
                                        <label htmlFor="modal-ag-status" className={labelBaseClasses}>Status</label>
                                        <Controller
                                            name="status"
                                            control={controlModal}
                                            render={({ field }) => (
                                                <Select value={field.value} onValueChange={field.onChange} disabled={isSubmittingModal}>
                                                    <SelectTrigger id="modal-ag-status" className={inputBaseClasses}><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        {statusAgenteCrmEnum.options.map(option => (
                                                            <SelectItem key={option} value={option} className="capitalize">{option}</SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                        {modalFormErrors.status && <p className="text-xs text-red-400 mt-1">{modalFormErrors.status.message}</p>}
                                    </div>
                                </div>
                            </div>
                            <div className={modalFooterClasses}>
                                {modalMode === 'edit' && agenteParaEditar && (
                                    <Button type="button" onClick={handleModalDelete} variant="destructive" size="sm" className="mr-auto" disabled={isSubmittingModal}>
                                        <Trash2 size={14} className="mr-1.5" /> Eliminar
                                    </Button>)}
                                <Button type="button" variant="ghost" size="sm" onClick={closeModal} disabled={isSubmittingModal}>Cancelar</Button>
                                <Button type="submit" size="sm" className={buttonPrimaryClasses} disabled={isSubmittingModal || (modalMode === 'create' && !crmId)}>
                                    {isSubmittingModal ? <Loader2 className='animate-spin mr-2 h-4 w-4' /> : <Save size={14} className="mr-1.5" />}
                                    {modalMode === 'create' ? 'Crear Agente' : 'Guardar Cambios'}
                                </Button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
}