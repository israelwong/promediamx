'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import {
    obtenerClientePorId,
    actualizarClientePorId,
    archivarClientePorId,
} from '@/app/admin/_lib/actions/cliente/cliente.actions'; // Ajustada la ruta

// Importar tipos y esquemas Zod
import {
    ActualizarClienteInputSchema,
    type ActualizarClienteInput,
    type ClienteParaEditar
} from '@/app/admin/_lib/actions/cliente/cliente.schemas';


import { Loader2, Save, Archive, AlertTriangleIcon } from 'lucide-react';
import { Button } from '@/app/components/ui/button'; // Asumiendo que tienes este componente
import { Input } from '@/app/components/ui/input';   // Asumiendo que tienes este componente

interface Props {
    clienteId: string;
}

// Usar el tipo inferido de Zod para el estado del formulario, pero parcial porque se carga.
type ClienteEditFormState = Partial<ActualizarClienteInput>;

export default function ClienteEditarForm({ clienteId }: Props) {

    const [clienteOriginal, setClienteOriginal] = useState<ClienteParaEditar | null>(null);
    const [formData, setFormData] = useState<ClienteEditFormState>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [validationErrors, setValidationErrors] = useState<Partial<Record<keyof ActualizarClienteInput, string[]>>>({});
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // ... (Clases de Tailwind como las definiste, o puedes ajustarlas)
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 h-10";
    const containerClasses = "p-4 md:p-6 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-lg flex flex-col w-full";
    const valueDisplayClasses = "bg-zinc-950 border border-zinc-700 text-zinc-400 block w-full rounded-md p-2 min-h-[40px] text-sm";
    const sectionTitleClasses = "text-lg font-semibold text-white mt-4 mb-2";


    useEffect(() => {
        if (!clienteId) {
            setError("ID de cliente no válido."); setLoading(false); return;
        }
        const fetchCliente = async () => {
            setLoading(true); setError(null); setSuccessMessage(null); setValidationErrors({});
            const result = await obtenerClientePorId(clienteId);
            if (result.success && result.data) {
                setClienteOriginal(result.data);
                // Poblar formData con campos de ClienteParaEditar que coinciden con ActualizarClienteInput
                setFormData({
                    nombre: result.data.nombre,
                    email: result.data.email,
                    telefono: result.data.telefono,
                    rfc: result.data.rfc ?? undefined, // Usar undefined si es null para Zod opcional
                    curp: result.data.curp ?? undefined,
                    razonSocial: result.data.razonSocial ?? undefined,
                    status: result.data.status as 'activo' | 'inactivo' | 'archivado', // Asegurar tipo
                    stripeCustomerId: result.data.stripeCustomerId ?? undefined,
                });
            } else {
                setError(result.error || `No se encontró el cliente con ID: ${clienteId}`);
                setClienteOriginal(null); setFormData({});
            }
            setLoading(false);
        };
        fetchCliente();
    }, [clienteId]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | boolean | undefined;

        if (type === 'checkbox') {
            const inputEl = e.target as HTMLInputElement;
            if (name === 'status') { // Asumiendo que 'status' se maneja con el toggle
                finalValue = inputEl.checked ? 'activo' : 'inactivo';
            } else {
                finalValue = inputEl.checked;
            }
        } else {
            finalValue = value === '' ? undefined : value; // Para que Zod opcional funcione bien
        }
        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null); setValidationErrors({});
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setError(null); setSuccessMessage(null); setValidationErrors({});

        const dataToValidate: ActualizarClienteInput = {
            nombre: formData.nombre,
            email: formData.email,
            telefono: formData.telefono,
            rfc: formData.rfc || null, // Convertir undefined a null si el schema lo espera así
            curp: formData.curp || null,
            razonSocial: formData.razonSocial || null,
            status: formData.status || 'inactivo',
            stripeCustomerId: formData.stripeCustomerId || null,
        };

        const validationResult = ActualizarClienteInputSchema.safeParse(dataToValidate);
        if (!validationResult.success) {
            setValidationErrors(validationResult.error.flatten().fieldErrors as Partial<Record<keyof ActualizarClienteInput, string[]>>);
            setError("Por favor, corrige los errores indicados.");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await actualizarClientePorId(clienteId, validationResult.data);
            if (result.success && result.data) {
                setSuccessMessage("Cliente actualizado correctamente.");
                // Actualizar clienteOriginal con los datos devueltos para reflejar cambios
                setClienteOriginal(result.data);
                // Opcionalmente, resetear formData a los nuevos datos de result.data
                setFormData({
                    nombre: result.data.nombre,
                    email: result.data.email,
                    // ... otros campos ...
                });
            } else {
                setError(result.error || "Error desconocido al actualizar.");
                if (result.validationErrors) {
                    setValidationErrors(result.validationErrors as Partial<Record<keyof ActualizarClienteInput, string[]>>);
                }
            }
        } catch (err: unknown) {
            setError(`Error al actualizar: ${err instanceof Error ? err.message : String(err)}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleArchive = async () => {
        if (confirm("¿Estás seguro de archivar este cliente?")) {
            setIsSubmitting(true); setError(null); setSuccessMessage(null);
            try {
                const result = await archivarClientePorId(clienteId);
                if (result.success && result.data) {
                    setSuccessMessage("Cliente archivado correctamente.");
                    if (result.data) {
                        setClienteOriginal(prev => prev ? { ...prev, status: result.data!.status as 'activo' | 'inactivo' | 'archivado' } : null);
                    }
                    if (result.data) {
                        setFormData(prev => ({ ...prev, status: result.data!.status as 'activo' | 'inactivo' | 'archivado' }));
                    }
                } else {
                    setError(result.error || "Error desconocido al archivar.");
                }
            } catch (err: unknown) {
                setError(`Error al archivar: ${err instanceof Error ? err.message : String(err)}`);
            } finally {
                setIsSubmitting(false);
            }
        }
    };

    if (loading) { /* ... (mismo render de loading) ... */
        return <div className={containerClasses}><p className="text-center text-zinc-300 flex items-center justify-center gap-2 w-full"><Loader2 className='animate-spin' size={18} /> Cargando cliente...</p></div>;
    }
    if (error && !clienteOriginal && !isSubmitting) { /* ... (mismo render de error si no hay clienteOriginal) ... */
        return <div className={`${containerClasses} border border-red-500`}><p className="text-center text-red-400">{error}</p></div>;
    }
    if (!clienteOriginal) { /* ... (mismo render si no se encuentra) ... */
        return <div className={containerClasses}><p className="text-center text-zinc-400">Cliente no encontrado.</p></div>;
    }

    return (
        <div className={containerClasses}>
            <div className='border-b border-zinc-700 pb-3 mb-6 flex flex-col sm:flex-row items-start justify-between gap-4'>
                <div>
                    <h2 className="text-xl font-semibold text-white leading-tight">{clienteOriginal.nombre || 'Editar Cliente'}</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">ID: {clienteId}</p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                    <span className={`${labelBaseClasses} mb-0`}>Status:</span>
                    <label className="relative inline-flex items-center cursor-pointer" title={`Status: ${formData.status}`}>
                        <input type="checkbox" id="status-toggle" name="status" checked={formData.status === 'activo'} onChange={handleChange} className="sr-only peer" disabled={isSubmitting || formData.status === 'archivado'} />
                        <div className={`w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer ${formData.status === 'archivado' ? 'opacity-50 cursor-not-allowed' : ''} peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all`}></div>
                        <span className="ml-3 text-sm font-medium text-zinc-300 capitalize">{formData.status}</span>
                    </label>
                </div>
            </div>

            {/* Notificaciones Globales del Formulario */}
            {error && !isSubmitting && Object.keys(validationErrors).length === 0 && (
                <p className="mb-4 text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2"><AlertTriangleIcon size={16} /> {error}</p>
            )}
            {successMessage && <p className="mb-4 text-sm text-green-400 bg-green-500/10 p-3 rounded-md border border-green-500/30">{successMessage}</p>}


            <form onSubmit={handleSubmit} className="space-y-5 flex-grow" noValidate>
                {/* Campos del formulario */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre Completo <span className="text-red-500">*</span></label>
                    <Input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} className={`${inputBaseClasses} ${validationErrors.nombre ? 'border-red-500' : ''}`} required disabled={isSubmitting} />
                    {validationErrors.nombre && <p className="text-xs text-red-400 mt-1">{validationErrors.nombre.join(', ')}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="email" className={labelBaseClasses}>Email <span className="text-red-500">*</span></label>
                        <Input type="email" id="email" name="email" value={formData.email || ''} onChange={handleChange} className={`${inputBaseClasses} ${validationErrors.email ? 'border-red-500' : ''}`} required disabled={isSubmitting} />
                        {validationErrors.email && <p className="text-xs text-red-400 mt-1">{validationErrors.email.join(', ')}</p>}
                    </div>
                    <div>
                        <label htmlFor="telefono" className={labelBaseClasses}>Teléfono <span className="text-red-500">*</span></label>
                        <Input type="tel" id="telefono" name="telefono" value={formData.telefono || ''} onChange={handleChange} className={`${inputBaseClasses} ${validationErrors.telefono ? 'border-red-500' : ''}`} required disabled={isSubmitting} />
                        {validationErrors.telefono && <p className="text-xs text-red-400 mt-1">{validationErrors.telefono.join(', ')}</p>}
                    </div>
                </div>

                <h3 className={`${sectionTitleClasses}`}>Información Fiscal (Opcional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="rfc" className={labelBaseClasses}>RFC</label>
                        <Input type="text" id="rfc" name="rfc" value={formData.rfc || ''} onChange={handleChange} className={`${inputBaseClasses} ${validationErrors.rfc ? 'border-red-500' : ''}`} disabled={isSubmitting} />
                        {validationErrors.rfc && <p className="text-xs text-red-400 mt-1">{validationErrors.rfc.join(', ')}</p>}
                    </div>
                    <div>
                        <label htmlFor="curp" className={labelBaseClasses}>CURP</label>
                        <Input type="text" id="curp" name="curp" value={formData.curp || ''} onChange={handleChange} className={`${inputBaseClasses} ${validationErrors.curp ? 'border-red-500' : ''}`} disabled={isSubmitting} />
                        {validationErrors.curp && <p className="text-xs text-red-400 mt-1">{validationErrors.curp.join(', ')}</p>}
                    </div>
                </div>
                <div>
                    <label htmlFor="razonSocial" className={labelBaseClasses}>Razón Social</label>
                    <Input type="text" id="razonSocial" name="razonSocial" value={formData.razonSocial || ''} onChange={handleChange} className={`${inputBaseClasses} ${validationErrors.razonSocial ? 'border-red-500' : ''}`} disabled={isSubmitting} />
                    {validationErrors.razonSocial && <p className="text-xs text-red-400 mt-1">{validationErrors.razonSocial.join(', ')}</p>}
                </div>

                {/* Stripe Customer ID (Solo lectura o para admin avanzado) */}
                <div>
                    <label htmlFor="stripeCustomerId" className={labelBaseClasses}>Stripe Customer ID (Info)</label>
                    <Input type="text" id="stripeCustomerId" name="stripeCustomerId" value={formData.stripeCustomerId || ''} onChange={handleChange} className={`${inputBaseClasses} bg-zinc-950 text-zinc-400`} disabled={isSubmitting} placeholder="Se asignará al crear suscripción" />
                    {/* <div className={valueDisplayClasses}>{formData.stripeCustomerId || 'No asignado'}</div> */}
                </div>


                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <div><label className={labelBaseClasses}>Fecha Creación</label><div className={valueDisplayClasses}>{clienteOriginal?.createdAt ? new Date(clienteOriginal.createdAt).toLocaleDateString('es-MX') : 'N/A'}</div></div>
                    <div><label className={labelBaseClasses}>Última Actualización</label><div className={valueDisplayClasses}>{clienteOriginal?.updatedAt ? new Date(clienteOriginal.updatedAt).toLocaleString('es-MX') : 'N/A'}</div></div>
                </div>

                <div className="pt-6 space-y-3 border-t border-zinc-700 mt-auto"> {/* mt-auto para empujar al fondo si el form es corto */}
                    <div className="flex flex-col sm:flex-row gap-3">
                        {/* <Button type="button" onClick={handleCancel} variant="outline" className="w-full sm:w-auto border-zinc-600 hover:bg-zinc-700" disabled={isSubmitting}>
                            <ArrowLeft size={16} className="mr-2"/> Volver
                        </Button> */}
                        <Button type="submit" className="w-full sm:flex-grow bg-blue-600 hover:bg-blue-700 focus:ring-blue-500" disabled={isSubmitting || loading}>
                            {isSubmitting ? <Loader2 className='animate-spin mr-2' size={18} /> : <Save size={16} className="mr-2" />}
                            {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                        </Button>
                    </div>
                    {formData.status !== 'archivado' && (
                        <div className="text-center pt-2">
                            <Button type="button" variant="ghost" onClick={handleArchive} className='text-amber-500 hover:text-amber-400 text-sm p-1 disabled:opacity-50' disabled={isSubmitting}>
                                <Archive size={14} className="mr-1.5" /> Archivar Cliente
                            </Button>
                        </div>
                    )}
                </div>
            </form>
        </div>
    );
}