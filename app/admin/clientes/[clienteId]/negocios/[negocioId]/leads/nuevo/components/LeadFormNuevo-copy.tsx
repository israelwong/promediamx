// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/nuevo/components/LeadFormNuevo.tsx
'use client';

import React, { useState, useEffect, FormEvent } from 'react';
import { useRouter } from 'next/navigation';

// Importar acciones y tipos
import { crearLeadManual, obtenerDatosParaFormularioLead } from '@/app/admin/_lib/crmLead.actions'; // Ajusta ruta!
import { NuevoLeadFormData, DatosFormularioLead } from '@/app/admin/_lib/types'; // Ajusta ruta!

// Importar componentes UI
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
// --- MultiSelect ya no se importa ---
// import { MultiSelect } from "@/components/ui/multi-select";
import { Loader2, Save, ArrowLeft } from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId: string;
}

type DatosFormularioConCrmId = DatosFormularioLead & { crmId: string | null };

export default function LeadFormNuevo({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [formData, setFormData] = useState<NuevoLeadFormData>({
        nombre: '',
        email: '',
        telefono: '',
        valorEstimado: undefined,
    });
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [crmId, setCrmId] = useState<string | null>(null);
    const [loadingData, setLoadingData] = useState(true);

    // useEffect para cargar crmId y datos de filtros (sin cambios)
    useEffect(() => {
        let isMounted = true;
        const fetchData = async () => {
            if (!isMounted) return;
            setLoadingData(true);
            setError(null);
            try {
                const result = await obtenerDatosParaFormularioLead(negocioId);
                if (!isMounted) return;
                if (result.success && result.data) {
                    const dataWithCrmId = result.data as DatosFormularioConCrmId;
                    if (!dataWithCrmId.crmId) {
                        throw new Error("CRM no configurado para este negocio.");
                    }
                    setCrmId(dataWithCrmId.crmId);
                } else {
                    throw new Error(result.error || "Error cargando datos para el formulario.");
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Error fetching data for new lead form:", err);
                    setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
                    setCrmId(null);
                }
            } finally {
                if (isMounted) {
                    setLoadingData(false);
                }
            }
        };
        fetchData();
        return () => { isMounted = false; };
    }, [negocioId]);


    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value, type } = e.target;
        setFormData(prev => ({
            ...prev,
            [name]: type === 'number' ? (value === '' ? undefined : parseFloat(value)) : value,
        }));
        setError(null);
    };



    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!crmId) {
            setError("No se puede crear el lead: falta información del CRM.");
            return;
        }
        setError(null);
        setIsSubmitting(true);
        try {
            const dataToSubmit = { ...formData };
            const result = await crearLeadManual(crmId, dataToSubmit);
            if (result.success && result.data) {
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads/${result.data.id}`);
            } else {
                throw new Error(result.error || "Error desconocido al crear el lead.");
            }
        } catch (err) {
            console.error("Error submitting new lead:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads`);
    }

    // Clases comunes
    const labelClasses = "block text-sm font-medium text-zinc-300 mb-1";
    const inputClasses = "block w-full rounded-md border-zinc-700 bg-zinc-900 text-zinc-100 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm p-2 disabled:opacity-50";



    if (loadingData) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /></div>;
    }
    if (error && !crmId) {
        return <div className="text-center text-red-500 p-4 bg-zinc-800 rounded-md border border-red-700">{error}</div>;
    }
    if (!crmId) {
        return null;
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 max-w-3xl bg-zinc-800/50 p-6 rounded-lg shadow-md border border-zinc-700">

            <div>
                <h2 className="text-lg font-semibold text-zinc-300">Crear Nuevo Lead</h2>
                <p className="text-sm text-zinc-400">Completa los campos requeridos para crear un nuevo lead.</p>
            </div>

            {error && crmId && (
                <div className="bg-red-900/30 border border-red-600 text-red-400 p-3 rounded-md text-sm">
                    {error}
                </div>
            )}
            {/* Campos Principales (sin cambios) */}
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                    <label htmlFor="nombre" className={labelClasses}>Nombre Lead <span className="text-red-500">*</span></label>
                    <Input id="nombre" name="nombre" required value={formData.nombre} onChange={handleChange} className={inputClasses} disabled={isSubmitting} maxLength={150} />
                </div>
                <div className="sm:col-span-3">
                    <label htmlFor="email" className={labelClasses}>Email</label>
                    <Input id="email" name="email" type="email" value={formData.email || ''} onChange={handleChange} className={inputClasses} disabled={isSubmitting} />
                </div>
                <div className="sm:col-span-3">
                    <label htmlFor="telefono" className={labelClasses}>Teléfono</label>
                    <Input id="telefono" name="telefono" type="tel" value={formData.telefono || ''} onChange={handleChange} className={inputClasses} disabled={isSubmitting} />
                </div>
                <div className="sm:col-span-3">
                    <label htmlFor="valorEstimado" className={labelClasses}>Valor Estimado (MXN)</label>
                    <Input id="valorEstimado" name="valorEstimado" type="number" step="0.01" value={formData.valorEstimado ?? ''} onChange={handleChange} className={inputClasses} disabled={isSubmitting} placeholder="0.00" />
                </div>
            </div>



            {/* Botones de Acción */}
            <div className="pt-5 flex justify-end gap-3">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting} className="bg-transparent hover:bg-zinc-700">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || loadingData || !crmId} className="bg-blue-600 hover:bg-blue-700">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Crear Lead
                </Button>
            </div>
        </form>
    );
}
