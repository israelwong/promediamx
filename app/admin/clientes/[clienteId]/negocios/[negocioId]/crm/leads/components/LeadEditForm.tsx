// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/[leadId]/components/LeadFormEditar.tsx
'use client';

import React, { useState, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Importar acciones y tipos
import { editarLead, eliminarLead } from '@/app/admin/_lib/crmLead.actions'; // Ajusta ruta!
import { EditarLeadFormData, DatosFormularioLead, LeadDetallesEditar } from '@/app/admin/_lib/types'; // Ajusta ruta!

// Importar componentes UI
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Loader2, Save, ArrowLeft, Trash } from 'lucide-react';

interface Props {
    leadInicial: LeadDetallesEditar;
    datosSelects: DatosFormularioLead | null;
    negocioId: string;
    clienteId: string;
}

export default function LeadFormEditar({ leadInicial, datosSelects, negocioId, clienteId }: Props) {
    const router = useRouter();
    const [formData, setFormData] = useState<EditarLeadFormData>({
        nombre: leadInicial.nombre,
        telefono: leadInicial.telefono || '',
        valorEstimado: leadInicial.valorEstimado ?? undefined,
        status: leadInicial.status,
        pipelineId: leadInicial.pipelineId || null,
        canalId: leadInicial.canalId || null,
        agenteId: leadInicial.agenteId || null,
        // Inicializar etiquetaIds desde leadInicial
        etiquetaIds: leadInicial.etiquetas?.map(e => e.etiqueta.id) || [],
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Los datos para los selects vienen como prop

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value,
        }));
        setError(null);
    };

    const handleSelectChange = (name: keyof EditarLeadFormData, value: string) => {
        const finalValue = value === 'null' ? null : value;
        setFormData(prev => ({
            ...prev,
            [name]: finalValue,
        }));
        setError(null);
    };

    // --- Manejador para click en badge de etiqueta ---
    const handleEtiquetaToggle = (etiquetaId: string) => {
        setFormData(prev => {
            const currentEtiquetas = prev.etiquetaIds || [];
            const isSelected = currentEtiquetas.includes(etiquetaId);
            const newEtiquetas = isSelected
                ? currentEtiquetas.filter(id => id !== etiquetaId) // Quitar
                : [...currentEtiquetas, etiquetaId]; // Añadir
            return { ...prev, etiquetaIds: newEtiquetas };
        });
        setError(null);
    }
    // --- FIN MANEJADOR ---

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null);
        setIsSubmitting(true);
        try {
            const dataToSubmit = { ...formData, etiquetaIds: formData.etiquetaIds || [] };
            const result = await editarLead(leadInicial.id, dataToSubmit);
            if (result.success && result.data) {
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads`);
                // Opcional: router.refresh();
            } else {
                throw new Error(result.error || "Error desconocido al actualizar el lead.");
            }
        } catch (err) {
            console.error("Error submitting lead update:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads`);
    }

    const handleDeleteLead = async (leadId: string) => {
        // Confirmar antes de eliminar el lead
        if (confirm("¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer.")) {
            try {
                setIsSubmitting(true);
                const result = await eliminarLead(leadId);
                if (result.success) {
                    router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads`);
                } else {
                    throw new Error(result.error || "Error desconocido al eliminar el lead.");
                }
            } catch (err) {
                console.error("Error deleting lead:", err);
                setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
            } finally {
                setIsSubmitting(false);
            }
        }
    }

    // Clases comunes
    const labelClasses = "block text-sm font-medium text-zinc-300 mb-1";
    const inputClasses = "block w-full rounded-md border-zinc-700 bg-zinc-900 text-zinc-100 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm p-2 disabled:opacity-50";
    const selectTriggerClasses = `${inputClasses} flex justify-between items-center`;

    // --- Clases para etiquetas clickeables (reutilizadas) ---
    const etiquetaButtonContainerClasses = "flex flex-wrap gap-2 pt-1";
    const etiquetaButtonBaseClasses = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ease-in-out cursor-pointer disabled:opacity-50";
    const etiquetaButtonInactiveClasses = "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600";
    const etiquetaButtonActiveClasses = "bg-blue-600 border-blue-500 text-white ring-2 ring-blue-500 ring-offset-1 ring-offset-zinc-900";
    const colorDotClasses = "w-2 h-2 rounded-full inline-block mr-1.5 border border-zinc-500";


    return (
        <div className="bg-zinc-800/50 p-6 rounded-lg shadow-md">

            <div>
                <h2 className="text-lg font-semibold text-zinc-200 mb-4">Editar Lead</h2>
                <p className="text-sm text-zinc-400 mb-4">Actualiza la información y asignaciones de este lead.</p>
            </div>

            {/* Formulario */}
            <form onSubmit={handleSubmit} className="space-y-6">
                {error && (
                    <div className="bg-red-900/30 border border-red-600 text-red-400 p-3 rounded-md text-sm">
                        {error}
                    </div>
                )}

                {/* Campos Principales */}
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                        <label htmlFor="nombre" className={labelClasses}>Nombre Lead <span className="text-red-500">*</span></label>
                        <Input id="nombre" name="nombre" required value={formData.nombre} onChange={handleChange} className={inputClasses} disabled={isSubmitting} maxLength={150} />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="email" className={labelClasses}>Email (No editable)</label>
                        <Input id="email" name="email" type="email" value={leadInicial.email || ''} className={`${inputClasses} bg-zinc-800 cursor-not-allowed`} disabled readOnly />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="telefono" className={labelClasses}>Teléfono</label>
                        <Input id="telefono" name="telefono" type="tel" value={formData.telefono || ''} onChange={handleChange} className={inputClasses} disabled={isSubmitting} />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="valorEstimado" className={labelClasses}>Valor Estimado (MXN)</label>
                        <Input id="valorEstimado" name="valorEstimado" type="number" step="0.01" value={formData.valorEstimado ?? ''} onChange={handleChange} className={inputClasses} disabled={isSubmitting} placeholder="0.00" />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="status" className={labelClasses}>Status Lead</label>
                        <select id="status" name="status" value={formData.status} onChange={handleChange} className={inputClasses} disabled={isSubmitting} required>
                            <option value="nuevo">Nuevo</option>
                            <option value="contactado">Contactado</option>
                            <option value="calificado">Calificado</option>
                            <option value="propuesta">Propuesta Enviada</option>
                            <option value="negociacion">Negociación</option>
                            <option value="seguimiento">Seguimiento</option>
                            {/* Considera añadir status finales si aplican */}
                            {/* <option value="ganado">Ganado</option> */}
                            {/* <option value="perdido">Perdido</option> */}
                        </select>
                    </div>
                </div>

                {/* Selects y Badges para Relaciones */}
                <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="pipelineId" className={labelClasses}>Etapa Pipeline</label>
                        <Select value={formData.pipelineId ?? 'null'} onValueChange={(v) => handleSelectChange('pipelineId', v)} disabled={isSubmitting || !datosSelects}>
                            <SelectTrigger className={selectTriggerClasses}><SelectValue placeholder="Seleccionar etapa..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="null">Ninguna</SelectItem>
                                {datosSelects?.pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="canalId" className={labelClasses}>Canal Origen</label>
                        <Select value={formData.canalId ?? 'null'} onValueChange={(v) => handleSelectChange('canalId', v)} disabled={isSubmitting || !datosSelects}>
                            <SelectTrigger className={selectTriggerClasses}><SelectValue placeholder="Seleccionar canal..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="null">Ninguno</SelectItem>
                                {datosSelects?.canales.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="agenteId" className={labelClasses}>Agente Asignado</label>
                        <Select value={formData.agenteId ?? 'null'} onValueChange={(v) => handleSelectChange('agenteId', v)} disabled={isSubmitting || !datosSelects}>
                            <SelectTrigger className={selectTriggerClasses}><SelectValue placeholder="Seleccionar agente..." /></SelectTrigger>
                            <SelectContent>
                                <SelectItem value="null">Ninguno</SelectItem>
                                {datosSelects?.agentes.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                            </SelectContent>
                        </Select>
                    </div>
                    {/* --- ETIQUETAS COMO BADGES CLICKEABLES --- */}
                    <div className="sm:col-span-3">
                        <label className={labelClasses}>Etiquetas</label>
                        <div className={etiquetaButtonContainerClasses}>
                            {datosSelects?.etiquetas && datosSelects.etiquetas.length > 0 ? (
                                datosSelects.etiquetas.map(etiqueta => {
                                    const isSelected = formData.etiquetaIds?.includes(etiqueta.id);
                                    return (
                                        <button
                                            key={etiqueta.id}
                                            type="button"
                                            onClick={() => handleEtiquetaToggle(etiqueta.id)}
                                            disabled={isSubmitting || !datosSelects}
                                            className={`${etiquetaButtonBaseClasses} ${isSelected ? etiquetaButtonActiveClasses : etiquetaButtonInactiveClasses}`}
                                            title={etiqueta.nombre}
                                        >
                                            {etiqueta.color && (
                                                <span className={colorDotClasses} style={{ backgroundColor: etiqueta.color }}></span>
                                            )}
                                            {etiqueta.nombre}
                                        </button>
                                    );
                                })
                            ) : (
                                <span className="text-xs text-zinc-500 italic">No hay etiquetas definidas en la configuración.</span>
                            )}
                        </div>
                    </div>
                    {/* --- FIN ETIQUETAS --- */}
                </div>

                {/* Botones de Acción */}
                <div className="pt-5 flex justify-between gap-3">

                    <Button
                        type="button"
                        variant="ghost"
                        onClick={() => handleDeleteLead(leadInicial.id)} disabled={isSubmitting}
                        className="text-red-800">
                        <Trash className="mr-2 h-4 w-4" />
                        Eliminar
                    </Button>

                    <div className="flex gap-3">
                        <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting} className="bg-transparent hover:bg-zinc-700">
                            <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
                        </Button>
                        <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
                            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Cambios
                        </Button>
                    </div>
                </div>
            </form>
        </div>
    );
}
