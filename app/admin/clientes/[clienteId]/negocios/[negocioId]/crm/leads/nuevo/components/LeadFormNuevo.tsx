// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/nuevo/components/LeadFormNuevo.tsx
'use client';

import React, { useState, useEffect } from 'react'; // FormEvent ya no es necesario con RHF handleSubmit
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form'; // Importar RHF
import { zodResolver } from '@hookform/resolvers/zod'; // Importar Zod Resolver

// --- NUEVAS IMPORTS ---
import {
    crearLeadAction,
    // obtenerDatosParaFormularioLeadAction // Ya la tenemos refactorizada
} from '@/app/admin/_lib/actions/lead/lead.actions';
import {
    nuevoLeadFormValidationSchema, // Schema para validación del formulario
    type NuevoLeadFormData,        // Tipo para los datos del formulario
    type CrearLeadParams,          // Tipo para el input de la acción
} from '@/app/admin/_lib/actions/lead/lead.schemas';

import { obtenerDatosParaFormularioLeadAction } from '@/app/admin/_lib/actions/lead/lead.actions';

// Componentes UI
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Loader2, Save, ArrowLeft } from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId: string;
}

// Type para el estado de datosSelects, incluyendo crmId
// type DatosParaNuevoLeadForm = DatosFormularioLeadData & { crmId: string | null };


export default function LeadFormNuevo({ negocioId, clienteId }: Props) {
    const router = useRouter();

    // Usar react-hook-form
    const { register, handleSubmit, formState: { errors } } = useForm<NuevoLeadFormData>({
        resolver: zodResolver(nuevoLeadFormValidationSchema),
        defaultValues: {
            nombre: '',
            email: '',    // Inicializar como string vacío
            telefono: '', // Inicializar como string vacío
            valorEstimado: null, // Debe ser null para coincidir con el schema
        },
    });

    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    // Estado para crmId y carga de datos iniciales
    const [crmId, setCrmId] = useState<string | null>(null);
    const [isLoadingInitialData, setIsLoadingInitialData] = useState(true); // Para el spinner inicial

    useEffect(() => {
        let isMounted = true;
        const fetchInitialData = async () => {
            if (!negocioId) {
                if (isMounted) {
                    setSubmitError("ID de negocio no disponible.");
                    setIsLoadingInitialData(false);
                    setCrmId(null);
                }
                return;
            }
            setIsLoadingInitialData(true);
            setSubmitError(null);
            try {
                const result = await obtenerDatosParaFormularioLeadAction({ negocioId });
                if (!isMounted) return;

                if (result.success && result.data) {
                    if (!result.data.crmId) {
                        // Este error ahora se maneja en la action y devuelve crmId: null
                        // throw new Error("CRM no configurado para este negocio. No se puede crear un lead.");
                        setSubmitError("CRM no configurado para este negocio. No se puede crear un lead.");
                        setCrmId(null);
                    } else {
                        setCrmId(result.data.crmId);
                    }
                } else {
                    throw new Error(result.error || "Error cargando datos necesarios para el formulario.");
                }
            } catch (err) {
                if (isMounted) {
                    console.error("Error fetching data for new lead form:", err);
                    setSubmitError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
                    setCrmId(null); // Asegurar que crmId es null si hay error
                }
            } finally {
                if (isMounted) {
                    setIsLoadingInitialData(false);
                }
            }
        };
        fetchInitialData();
        return () => { isMounted = false; };
    }, [negocioId]);


    const onSubmit: SubmitHandler<NuevoLeadFormData> = async (formData) => {
        if (!crmId) { // Doble chequeo, aunque el botón de submit debería estar deshabilitado
            setSubmitError("No se puede crear el lead: falta la configuración del CRM para este negocio.");
            return;
        }
        setSubmitError(null);
        setIsSubmitting(true);

        const paramsForAction: CrearLeadParams = {
            crmId: crmId,
            negocioId: negocioId, // Pasar negocioId a la acción
            datos: formData, // formData ya está validada por Zod
        };

        try {
            const result = await crearLeadAction(paramsForAction); // Nueva Action
            if (result.success && result.data) {
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads/${result.data.id}`);
                router.refresh(); // Para que la lista de leads se actualice
            } else {
                throw new Error(result.error || "Error desconocido al crear el lead.");
            }
        } catch (err) {
            console.error("Error submitting new lead:", err);
            setSubmitError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
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

    if (isLoadingInitialData) {
        return <div className="flex justify-center items-center h-40"><Loader2 className="h-8 w-8 animate-spin text-zinc-400" /> <span className="ml-2 text-zinc-400">Cargando configuración...</span></div>;
    }

    // Si hubo un error CRÍTICO al cargar datos iniciales (ej. crmId no se pudo obtener y es necesario)
    if (submitError && !crmId && !isLoadingInitialData) { // Se muestra si hay error y no se pudo obtener crmId
        return (
            <div className="max-w-3xl mx-auto bg-zinc-800/50 p-6 rounded-lg shadow-md border border-red-700">
                <h2 className="text-lg font-semibold text-red-400 mb-2">Error de Configuración</h2>
                <p className="text-sm text-red-300 mb-4">{submitError}</p>
                <Button variant="outline" onClick={handleCancel} className="bg-transparent hover:bg-zinc-700">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Volver a Leads
                </Button>
            </div>
        );
    }


    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 max-w-3xl bg-zinc-800/50 p-6 rounded-lg shadow-md border border-zinc-700">
            <div>
                <h2 className="text-lg font-semibold text-zinc-100">Crear Nuevo Lead Manualmente</h2>
                <p className="text-sm text-zinc-400 mt-1">Completa los campos para añadir un nuevo prospecto al CRM.</p>
            </div>

            {submitError && crmId && ( // Mostrar errores de submit solo si crmId está presente (es decir, el form es usable)
                <div className="bg-red-900/30 border border-red-600 text-red-400 p-3 rounded-md text-sm">
                    {submitError}
                </div>
            )}

            <div className="grid grid-cols-1 gap-y-5 gap-x-4 sm:grid-cols-6">
                <div className="sm:col-span-6">
                    <label htmlFor="nombre" className={labelClasses}>Nombre Lead <span className="text-red-500">*</span></label>
                    <Input id="nombre" {...register("nombre")} className={inputClasses} disabled={isSubmitting} maxLength={150} />
                    {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
                </div>
                <div className="sm:col-span-3">
                    <label htmlFor="email" className={labelClasses}>Email</label>
                    <Input id="email" type="email" {...register("email")} className={inputClasses} disabled={isSubmitting} />
                    {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                </div>
                <div className="sm:col-span-3">
                    <label htmlFor="telefono" className={labelClasses}>Teléfono</label>
                    <Input id="telefono" type="tel" {...register("telefono")} className={inputClasses} disabled={isSubmitting} />
                    {errors.telefono && <p className="text-xs text-red-400 mt-1">{errors.telefono.message}</p>}
                </div>
                <div className="sm:col-span-3">
                    <label htmlFor="valorEstimado" className={labelClasses}>Valor Estimado (MXN)</label>
                    <Input
                        id="valorEstimado"
                        type="number" // Importante para valueAsNumber
                        step="0.01"
                        {...register("valorEstimado", { valueAsNumber: true })} // Registrar como número
                        className={inputClasses}
                        disabled={isSubmitting}
                        placeholder="0.00"
                    />
                    {errors.valorEstimado && <p className="text-xs text-red-400 mt-1">{errors.valorEstimado.message}</p>}
                </div>
            </div>

            <div className="pt-5 flex justify-end gap-3 border-t border-zinc-700 mt-1">
                <Button type="button" variant="outline" onClick={handleCancel} disabled={isSubmitting} className="bg-transparent hover:bg-zinc-700">
                    <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || isLoadingInitialData || !crmId} className="bg-blue-600 hover:bg-blue-700">
                    {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Crear Lead
                </Button>
            </div>
        </form>
    );
}