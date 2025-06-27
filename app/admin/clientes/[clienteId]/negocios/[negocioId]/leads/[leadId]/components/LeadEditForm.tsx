// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/[leadId]/components/LeadEditForm.tsx
'use client';

import React, { useState, useEffect } from 'react'; // Añadido useEffect
import { useRouter } from 'next/navigation';

// --- NUEVAS IMPORTS ---
import {
    actualizarLeadAction,
    eliminarLeadAction
} from '@/app/admin/_lib/actions/lead/lead.actions';
import type {
    ActualizarLeadFormData, // Para el estado del formulario
    ActualizarLeadParams,   // Para el input de la acción de actualizar
    LeadDetalleData,        // Para el prop leadInicial
    DatosFormularioLeadData // Para el prop datosSelects
    // EliminarLeadParams    // El tipo se infiere en la llamada
} from '@/app/admin/_lib/actions/lead/lead.schemas';
import { actualizarLeadFormValidationSchema } from '@/app/admin/_lib/actions/lead/lead.schemas'; // Para validación

// Componentes UI (sin cambios en importación)
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Loader2, Save, ArrowLeft, Trash } from 'lucide-react';
import { useForm, Controller, SubmitHandler } from 'react-hook-form'; // Importar para react-hook-form
import { zodResolver } from '@hookform/resolvers/zod'; // Importar resolver


interface Props {
    leadInicial: LeadDetalleData; // Usar el nuevo tipo Zod
    datosSelects: DatosFormularioLeadData | null; // Usar el nuevo tipo Zod
    negocioId: string;
    clienteId: string;
}

export default function LeadFormEditar({ leadInicial, datosSelects, negocioId, clienteId }: Props) {
    const router = useRouter();

    // Usar react-hook-form para manejar el estado del formulario y la validación
    const { register, handleSubmit, control, formState: { errors }, reset } = useForm({
        resolver: zodResolver(actualizarLeadFormValidationSchema),
        defaultValues: {
            nombre: leadInicial.nombre,
            telefono: leadInicial.telefono || '', // Mantener como string vacío para el input
            valorEstimado: leadInicial.valorEstimado ?? undefined, // Si es null o undefined, queda undefined
            status: leadInicial.status || '', // Select necesita string vacío para placeholder o valor
            pipelineId: leadInicial.pipelineId || undefined, // undefined si es null para que el placeholder del Select funcione
            canalId: leadInicial.canalId || undefined,
            agenteId: leadInicial.agenteId || undefined,
            etiquetaIds: leadInicial.etiquetaIds ?? [], // Asegura que siempre sea un array
        },
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null); // Renombrado de 'error' a 'submitError'

    // Resetear el formulario si leadInicial cambia
    useEffect(() => {
        reset({
            nombre: leadInicial.nombre,
            telefono: leadInicial.telefono || '',
            valorEstimado: leadInicial.valorEstimado !== undefined && leadInicial.valorEstimado !== undefined ? String(leadInicial.valorEstimado) : '',
            status: leadInicial.status || '',
            pipelineId: leadInicial.pipelineId || undefined,
            canalId: leadInicial.canalId || undefined,
            agenteId: leadInicial.agenteId || undefined,
            etiquetaIds: leadInicial.etiquetaIds || [],
        });
    }, [leadInicial, reset]);


    const onSubmit: SubmitHandler<ActualizarLeadFormData> = async (formData) => {
        setSubmitError(null);
        setIsSubmitting(true);

        console.log("Datos del formulario antes de enviar:", formData);

        const paramsForAction: ActualizarLeadParams = {
            leadId: leadInicial.id,
            datos: formData, // formData ya está validada por Zod y con transformaciones aplicadas
        };

        try {
            const result = await actualizarLeadAction(paramsForAction); // Nueva Action
            if (result.success && result.data) {
                // Opcional: Mostrar un toast de éxito
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads`);
                router.refresh(); // Para asegurar que la lista se actualice si vuelves atrás
            } else {
                throw new Error(result.error || "Error desconocido al actualizar el lead.");
            }
        } catch (err) {
            console.error("Error submitting lead update:", err);
            setSubmitError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads`);
    };

    const handleDeleteLead = async () => {
        if (confirm("¿Estás seguro de que deseas eliminar este lead? Esta acción no se puede deshacer.")) {
            setSubmitError(null);
            setIsSubmitting(true);
            try {
                const result = await eliminarLeadAction({ leadId: leadInicial.id }); // Nueva Action
                if (result.success) {
                    router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads`);
                    router.refresh();
                } else {
                    throw new Error(result.error || "Error desconocido al eliminar el lead.");
                }
            } catch (err) {
                console.error("Error deleting lead:", err);
                setSubmitError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    // Clases (sin cambios)
    const labelClasses = "block text-sm font-medium text-zinc-300 mb-1";
    const inputClasses = "block w-full rounded-md border-zinc-700 bg-zinc-900 text-zinc-100 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm p-2 disabled:opacity-50";
    // const selectTriggerClasses = `${inputClasses} flex justify-between items-center`;
    const etiquetaButtonContainerClasses = "flex flex-wrap gap-2 pt-1";
    const etiquetaButtonBaseClasses = "inline-flex items-center rounded-full border px-3 py-1 text-xs font-medium transition-colors duration-150 ease-in-out cursor-pointer disabled:opacity-50";
    const etiquetaButtonInactiveClasses = "bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700 hover:border-zinc-600";
    const etiquetaButtonActiveClasses = "bg-blue-600 border-blue-500 text-white ring-2 ring-blue-500 ring-offset-1 ring-offset-zinc-900";
    const colorDotClasses = "w-2 h-2 rounded-full inline-block mr-1.5 border border-zinc-500";


    useEffect(() => {
        if (datosSelects) {
            console.log("Datos para canales:", datosSelects.canales);
            console.log("Datos para etiquetas:", datosSelects.etiquetas);
            console.log("Datos para pipelines:", datosSelects.pipelines);
            console.log("Datos para Canales:", datosSelects.canales);
            console.log("Datos para Agentes:", datosSelects.agentes);
        }
    }, [datosSelects]);


    return (
        <div className="bg-zinc-800/50 p-4 sm:p-6 rounded-lg shadow-md">
            <div className="mb-4"> {/* Encabezado movido aquí */}
                <h2 className="text-lg font-semibold text-zinc-100">Editar Lead</h2>
                <p className="text-sm text-zinc-400 mt-1">Actualiza la información y asignaciones de este lead.</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
                {submitError && (
                    <div className="bg-red-900/30 border border-red-600 text-red-400 p-3 rounded-md text-sm">
                        {submitError}
                    </div>
                )}

                {/* Campos Principales */}
                <div className="grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-6">
                        <label htmlFor="nombre" className={labelClasses}>Nombre Lead <span className="text-red-500">*</span></label>
                        <Input id="nombre" {...register("nombre")} className={inputClasses} disabled={isSubmitting} maxLength={150} />
                        {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="email" className={labelClasses}>Email (No editable)</label>
                        <Input id="email" name="email" type="email" defaultValue={leadInicial.email || ''} className={`${inputClasses} bg-zinc-800 cursor-not-allowed`} disabled readOnly />
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="telefono" className={labelClasses}>Teléfono</label>
                        <Input id="telefono" {...register("telefono")} className={inputClasses} disabled={isSubmitting} />
                        {errors.telefono && <p className="text-xs text-red-400 mt-1">{errors.telefono.message}</p>}
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="valorEstimado" className={labelClasses}>Valor Estimado (MXN)</label>
                        <Input id="valorEstimado" type="number" step="0.01" {...register("valorEstimado", { valueAsNumber: true })} className={inputClasses} disabled={isSubmitting} placeholder="0.00" />
                        {errors.valorEstimado && <p className="text-xs text-red-400 mt-1">{errors.valorEstimado.message}</p>}
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="status" className={labelClasses}>Status Lead</label>
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <select {...field} id="status" className={inputClasses} disabled={isSubmitting} value={field.value ?? ''}>
                                    <option value="">-- Seleccionar Status --</option>
                                    <option value="nuevo">Nuevo</option>
                                    <option value="contactado">Contactado</option>
                                    <option value="calificado">Calificado</option>
                                    <option value="propuesta">Propuesta Enviada</option>
                                    <option value="negociacion">Negociación</option>
                                    <option value="seguimiento">Seguimiento</option>
                                </select>
                            )}
                        />
                        {errors.status && <p className="text-xs text-red-400 mt-1">{errors.status.message}</p>}
                    </div>
                </div>

                {/* Selects y Badges para Relaciones */}
                <div className="grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-6">
                    <div className="sm:col-span-3">
                        <label htmlFor="pipelineId" className={labelClasses}>Etapa Pipeline</label>
                        <Controller
                            name="pipelineId"
                            control={control}
                            render={({ field }) => (
                                <select
                                    {...field}
                                    id="pipelineId"
                                    className={inputClasses}
                                    disabled={isSubmitting || !datosSelects}
                                    value={field.value ?? ''}
                                >
                                    <option value="">-- Seleccionar etapa --</option>
                                    {datosSelects?.pipelines.map(p => (
                                        <option key={p.id} value={p.id}>{p.nombre}</option>
                                    ))}
                                </select>
                            )}
                        />
                        {errors.pipelineId && <p className="text-xs text-red-400 mt-1">{errors.pipelineId.message}</p>}
                    </div>
                    {/* Repetir Controller para canalId y agenteId de manera similar */}
                    <div className="sm:col-span-3">
                        <label htmlFor="canalId" className={labelClasses}>Canal Origen</label>
                        <Controller
                            name="canalId"
                            control={control}
                            render={({ field }) => (
                                <select
                                    {...field}
                                    id="canalId"
                                    className={inputClasses}
                                    disabled={isSubmitting || !datosSelects}
                                    value={field.value ?? ''}
                                >
                                    <option value="">-- Seleccionar canal --</option>
                                    {datosSelects?.canales.map(canal => (
                                        <option key={canal.id} value={canal.id}>
                                            {canal.nombre}
                                        </option>
                                    ))}
                                </select>
                            )}
                        />
                        {errors.canalId && <p className="text-xs text-red-400 mt-1">{errors.canalId.message}</p>}
                    </div>
                    <div className="sm:col-span-3">
                        <label htmlFor="agenteId" className={labelClasses}>Agente Asignado</label>
                        <Controller
                            name="agenteId"
                            control={control}
                            render={({ field }) => (
                                <select
                                    {...field}
                                    id="agenteId"
                                    className={inputClasses}
                                    disabled={isSubmitting || !datosSelects}
                                    value={field.value ?? ''}
                                >
                                    <option value="">-- Seleccionar agente --</option>
                                    {datosSelects?.agentes.map(agente => (
                                        <option key={agente.id} value={agente.id}>
                                            {agente.nombre}
                                        </option>
                                    ))}
                                </select>
                            )}
                        />
                        {errors.agenteId && <p className="text-xs text-red-400 mt-1">{errors.agenteId.message}</p>}
                    </div>

                    <div className="sm:col-span-3">
                        <label className={labelClasses}>Etiquetas</label>
                        <Controller
                            name="etiquetaIds"
                            control={control}
                            render={({ field }) => (
                                <div className={etiquetaButtonContainerClasses}>
                                    {datosSelects?.etiquetas && datosSelects.etiquetas.length > 0 ? (
                                        datosSelects.etiquetas.map(etiqueta => {
                                            const isSelected = field.value?.includes(etiqueta.id);
                                            return (
                                                <button
                                                    key={etiqueta.id}
                                                    type="button"
                                                    onClick={() => {
                                                        // Toggle etiqueta
                                                        const current = field.value || [];
                                                        const newEtiquetas = isSelected
                                                            ? current.filter((id: string) => id !== etiqueta.id)
                                                            : [...current, etiqueta.id];
                                                        field.onChange(newEtiquetas);
                                                        setSubmitError(null);
                                                    }}
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
                                        <span className="text-xs text-zinc-500 italic">No hay etiquetas definidas.</span>
                                    )}
                                </div>
                            )}
                        />
                        {errors.etiquetaIds && <p className="text-xs text-red-400 mt-1">{errors.etiquetaIds.message}</p>}
                    </div>
                </div>

                {/* Botones de Acción */}
                <div className="pt-5 flex flex-col sm:flex-row justify-between gap-3 border-t border-zinc-700 mt-1">
                    <Button
                        type="button"
                        variant="ghost"
                        onClick={handleDeleteLead}
                        disabled={isSubmitting}
                        className="text-red-500 hover:bg-red-900/50 hover:text-red-400 order-last sm:order-first"
                    >
                        <Trash className="mr-2 h-4 w-4" />
                        Eliminar Lead
                    </Button>
                    <div className="flex gap-3 justify-end">
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