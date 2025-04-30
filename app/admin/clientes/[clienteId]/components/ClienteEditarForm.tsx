'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta las rutas según tu estructura
import {
    obtenerClientePorId, // !! NECESITAS CREAR O IMPORTAR ESTA FUNCIÓN !!
    actualizarClientePorId,
    archivarClientePorId,
    // eliminarClientePorId // Si prefieres eliminar en lugar de archivar
} from '@/app/admin/_lib/cliente.actions'; // Asumiendo acciones aquí
import { Cliente } from '@/app/admin/_lib/types'; // Importar tipo Cliente
import { Loader2, Save, Archive } from 'lucide-react'; // Iconos

interface Props {
    clienteId: string;
}

// Tipo para los datos editables en este formulario
// Excluimos campos no editables o relaciones complejas
type ClienteEditFormData = Partial<Omit<Cliente,
    'id' | 'password' | 'createdAt' | 'updatedAt' | 'contrato' | 'negocio' | 'AsistenteVirtual' | 'cotizaciones'
>>;

export default function ClienteEditarForm({ clienteId }: Props) {
    const router = useRouter();

    const [clienteOriginal, setClienteOriginal] = useState<Cliente | null>(null);
    const [formData, setFormData] = useState<ClienteEditFormData>({});
    const [loading, setLoading] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false); // Para guardar o archivar
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md h-full flex flex-col w-full"; // Contenedor general
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";
    const valueDisplayClasses = "bg-zinc-950 border border-zinc-700 text-zinc-400 block w-full rounded-md p-2 min-h-[40px] text-sm";
    const sectionTitleClasses = "text-lg font-semibold text-white mt-4";

    // --- Efecto para cargar datos del Cliente ---
    useEffect(() => {
        if (!clienteId) {
            setError("No se proporcionó un ID de cliente."); setLoading(false); return;
        }
        setLoading(true); setError(null); setSuccessMessage(null);

        const fetchCliente = async () => {
            try {
                // !! NECESITAS CREAR/IMPORTAR obtenerClientePorId !!
                const data = await obtenerClientePorId(clienteId);
                if (data) {
                    setClienteOriginal({
                        ...data,
                        nombre: data.nombre ?? undefined, // Convert null to undefined for compatibility
                    });
                    // Poblar formData con campos editables
                    const { ...editableData } = data;
                    setFormData({
                        ...editableData,
                        nombre: editableData.nombre ?? undefined, // Convert null to undefined
                        email: editableData.email ?? undefined, // Convert null to undefined
                        telefono: editableData.telefono ?? undefined, // Convert null to undefined
                        rfc: editableData.rfc ?? undefined, // Convert null to undefined
                        curp: editableData.curp ?? undefined, // Convert null to undefined
                        razonSocial: editableData.razonSocial ?? undefined, // Convert null to undefined
                        status: editableData.status ?? 'inactivo', // Default status
                    });
                } else {
                    setError(`No se encontró el cliente con ID: ${clienteId}`);
                    setClienteOriginal(null); setFormData({});
                }
            } catch (err) {
                console.error("Error fetching cliente:", err);
                setError("No se pudo cargar la información del cliente.");
                setClienteOriginal(null); setFormData({});
            } finally { setLoading(false); }
        };
        fetchCliente();
    }, [clienteId]);

    // --- Manejadores ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean | null;

        if (type === 'checkbox') {
            const input = e.target as HTMLInputElement;
            if (name === 'status') finalValue = input.checked ? 'activo' : 'inactivo';
            else finalValue = input.checked;
        } else {
            finalValue = value;
        }
        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validación básica (puedes añadir más)
        if (!formData.nombre?.trim() || !formData.email?.trim() || !formData.telefono?.trim()) {
            setError("Nombre, Email y Teléfono son obligatorios."); return;
        }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            // Construir objeto solo con los datos editables
            const dataToSend: Partial<Cliente> = {
                nombre: formData.nombre?.trim(),
                email: formData.email?.trim(),
                telefono: formData.telefono?.trim(),
                rfc: formData.rfc?.trim() || null,
                curp: formData.curp?.trim() || null,
                razonSocial: formData.razonSocial?.trim() || null,
                status: formData.status || 'inactivo',
                // No enviar password, createdAt, updatedAt, relaciones
            };

            await actualizarClientePorId(clienteId, dataToSend);
            setSuccessMessage("Cliente actualizado correctamente.");
            // Actualizar estado original local si es necesario (opcional)
            setClienteOriginal(prev => prev ? { ...prev, ...dataToSend } : null);

        } catch (err) {
            console.error("Error updating cliente:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al actualizar: ${errorMessage}`);
        } finally { setIsSubmitting(false); }
    };

    const handleCancel = () => { router.back(); };

    const handleArchive = async () => {
        if (confirm("¿Estás seguro de archivar este cliente? Podrás reactivarlo más tarde.")) {
            setIsSubmitting(true); setError(null); setSuccessMessage(null);
            try {
                await archivarClientePorId(clienteId);
                setSuccessMessage("Cliente archivado correctamente.");
                // Actualizar estado local para reflejar el cambio
                setFormData(prev => ({ ...prev, status: 'archivado' }));
                setClienteOriginal(prev => prev ? { ...prev, status: 'archivado' } : null);
                // Opcional: redirigir a la lista después de un tiempo
                // setTimeout(() => router.push('/admin/clientes'), 1500);
            } catch (err) {
                console.error("Error archiving cliente:", err);
                const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
                setError(`Error al archivar: ${errorMessage}`);
            } finally { setIsSubmitting(false); }
        }
    };

    // --- Renderizado ---
    if (loading) {
        return <div className={containerClasses}>
            <p className="text-center text-zinc-300 flex items-center justify-center gap-2 w-full">
                <Loader2 className='animate-spin' size={18} /> Cargando cliente...</p>
        </div>;
    }
    if (error && !clienteOriginal) {
        return <div className={`${containerClasses} border border-red-500`}><p className="text-center text-red-400">{error}</p></div>;
    }
    if (!clienteOriginal) {
        return <div className={containerClasses}><p className="text-center text-zinc-400">Cliente no encontrado.</p></div>;
    }

    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className='border-b border-zinc-700 pb-3 mb-6 flex flex-col sm:flex-row items-start justify-between gap-4'>
                <div>
                    <h2 className="text-xl font-semibold text-white leading-tight">Detalles del Cliente</h2>
                    <p className="text-xs text-zinc-400 mt-0.5">ID: {clienteId}</p>
                </div>
                <div className="flex items-center gap-3 pt-1">
                    <span className={`${labelBaseClasses} mb-0`}>Status:</span>
                    <label className="relative inline-flex items-center cursor-pointer" title={`Status: ${formData.status}`}>
                        <input type="checkbox" id="status" name="status" checked={formData.status === 'activo'} onChange={handleChange} className="sr-only peer" disabled={isSubmitting} />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-green-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-0.5 after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
                        <span className="ml-3 text-sm font-medium text-zinc-300">{formData.status === 'activo' ? 'Activo' : 'Archivado'}</span>
                    </label>
                </div>
            </div>

            {/* Mensajes Globales */}
            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            {/* Formulario en una sola columna */}
            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* Información de Contacto */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre Completo <span className="text-red-500">*</span></label>
                    <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="email" className={labelBaseClasses}>Email <span className="text-red-500">*</span></label>
                        <input type="email" id="email" name="email" value={formData.email || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="telefono" className={labelBaseClasses}>Teléfono <span className="text-red-500">*</span></label>
                        <input type="tel" id="telefono" name="telefono" value={formData.telefono || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                    </div>
                </div>

                {/* Información Fiscal (Opcional) */}
                <h3 className={`${sectionTitleClasses} mt-6`}>Información Fiscal (Opcional)</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="rfc" className={labelBaseClasses}>RFC</label>
                        <input type="text" id="rfc" name="rfc" value={formData.rfc || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} />
                    </div>
                    <div>
                        <label htmlFor="curp" className={labelBaseClasses}>CURP</label>
                        <input type="text" id="curp" name="curp" value={formData.curp || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} />
                    </div>
                </div>
                <div>
                    <label htmlFor="razonSocial" className={labelBaseClasses}>Razón Social</label>
                    <input type="text" id="razonSocial" name="razonSocial" value={formData.razonSocial || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} />
                </div>

                {/* Fechas solo lectura */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4">
                    <div>
                        <label className={labelBaseClasses}>Fecha Creación</label>
                        <div className={valueDisplayClasses}>{clienteOriginal?.createdAt ? new Date(clienteOriginal.createdAt).toLocaleDateString() : 'N/A'}</div>
                    </div>
                    <div>
                        <label className={labelBaseClasses}>Última Actualización</label>
                        <div className={valueDisplayClasses}>{clienteOriginal?.updatedAt ? new Date(clienteOriginal.updatedAt).toLocaleString() : 'N/A'}</div>
                    </div>
                </div>


                {/* Botones de Acción */}
                <div className="pt-6 space-y-2 border-t border-zinc-700 mt-6">
                    <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting || loading}>
                        {isSubmitting && !error ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Guardando...</span> : <><Save size={16} /> Guardar Cambios</>}
                    </button>
                    <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                        Cancelar / Volver
                    </button>
                    {/* Botón Archivar (solo si no está archivado) */}
                    {formData.status !== 'archivado' && (
                        <div className="flex justify-center pt-2">
                            <button type="button" onClick={handleArchive} className='text-amber-500 hover:text-amber-400 text-sm p-1 disabled:opacity-50' disabled={isSubmitting}>
                                <span className='flex items-center gap-1.5'><Archive size={14} /> Archivar Cliente</span>
                            </button>
                        </div>
                    )}

                </div>
            </form>
        </div>
    );
}
