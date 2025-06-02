'use client';

import React, { useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
    UpdateOfertaDetalleInputSchema, // Schema Zod para los datos del formulario de edición
    type OfertaDetalleCompletoType, // Para el tipo de initialData
} from '@/app/admin/_lib/actions/oferta/ofertaDetalle.schemas';
import {
    updateOfertaDetalleAction,
    eliminarOfertaDetalleAction
} from '@/app/admin/_lib/actions/oferta/ofertaDetalle.actions';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { toast } from 'react-hot-toast';
import { Loader2, Save, Trash2, InfoIcon } from 'lucide-react';


interface OfertaDetalleFormProps {
    ofertaId: string;
    negocioId: string;
    clienteId: string;
    initialData: OfertaDetalleCompletoType; // En modo edición, initialData es requerido
    ofertaDetalleIdToEdit: string;
}

// Definimos el schema que usará el formulario.
// UpdateOfertaDetalleInputSchema define los campos que el usuario PUEDE editar en este form.
const currentFormSchema = UpdateOfertaDetalleInputSchema;

// Tipos para el formulario basados en el schema Zod
type FormInputValues = z.input<typeof currentFormSchema>;   // Lo que el form maneja y Zod espera como ENTRADA
type FormOutputValues = z.output<typeof currentFormSchema>; // Lo que Zod devuelve DESPUÉS de validar (y lo que recibe onSubmit)


export default function OfertaDetalleEditarForm({
    ofertaId,
    negocioId,
    clienteId,
    initialData,
    ofertaDetalleIdToEdit,
}: OfertaDetalleFormProps) {
    const router = useRouter();

    // defaultValues deben ser del tipo FormInputValues.
    // Para campos con .default() en Zod, podemos pasar 'undefined' aquí,
    // y Zod aplicará el default. Para otros, el valor inicial o null/undefined.
    const defaultFormValues: DefaultValues<FormInputValues> = useMemo(() => ({
        tituloDetalle: initialData.tituloDetalle || '',
        contenido: initialData.contenido || '',
        tipoDetalle: initialData.tipoDetalle === undefined ? undefined : (initialData.tipoDetalle || null), // string | null | undefined
        palabrasClave: initialData.palabrasClave === undefined ? undefined : (initialData.palabrasClave || []), // string[] | undefined
        estadoContenido: initialData.estadoContenido || undefined, // Zod tomará el default si es undefined
    }), [initialData]);

    const {
        control,
        handleSubmit,
        register,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<FormInputValues, unknown, FormOutputValues>({ // TFieldValues, TContext, TTransformedValues
        resolver: zodResolver(currentFormSchema),
        defaultValues: defaultFormValues,
    });

    useEffect(() => {
        // Sincronizar el formulario con initialData cuando cambie
        reset({
            tituloDetalle: initialData.tituloDetalle || '',
            contenido: initialData.contenido || '',
            tipoDetalle: initialData.tipoDetalle === undefined ? undefined : (initialData.tipoDetalle || null),
            palabrasClave: initialData.palabrasClave === undefined ? undefined : (initialData.palabrasClave || []),
            estadoContenido: initialData.estadoContenido || undefined, // Dejar que Zod maneje el default
        });
    }, [initialData, reset]);

    const onSubmit: SubmitHandler<FormOutputValues> = async (data) => {
        // 'data' aquí es FormOutputValues (z.infer), ya validada y con defaults/transformaciones.
        const loadingToastId = toast.loading("Actualizando detalle...");
        try {
            // UpdateOfertaDetalleInputType es FormOutputValues
            const result = await updateOfertaDetalleAction(ofertaDetalleIdToEdit, data, clienteId, negocioId, ofertaId);

            toast.dismiss(loadingToastId);
            if (result.success && result.data) {
                toast.success(`Detalle "${result.data.tituloDetalle}" actualizado exitosamente.`);
                // Resetear el form con los nuevos datos guardados para actualizar 'isDirty'
                // y reflejar los valores transformados por Zod si los hay (ej. default).
                const resetData: DefaultValues<FormInputValues> = {
                    tituloDetalle: result.data.tituloDetalle,
                    contenido: result.data.contenido,
                    tipoDetalle: result.data.tipoDetalle,
                    palabrasClave: result.data.palabrasClave,
                    estadoContenido: result.data.estadoContenido,
                };
                reset(resetData);
                router.refresh();
            } else {
                const errorMsg = result.errorDetails
                    ? Object.values(result.errorDetails).flat().join('; ')
                    : result.error || "No se pudo actualizar el detalle.";
                toast.error(errorMsg);
            }
        } catch (err) {
            toast.dismiss(loadingToastId);
            toast.error(err instanceof Error ? err.message : "Ocurrió un error inesperado al actualizar.");
        }
    };

    // Adaptado para este componente (no hay isEditMode, ofertaDetalleIdToEdit siempre existe)

    const handleEliminar = async () => {
        if (!ofertaDetalleIdToEdit) { // ofertaDetalleIdToEdit es una prop de este form
            toast.error("ID de detalle no disponible para eliminar.");
            return;
        }
        if (!confirm("¿Estás seguro de que deseas eliminar este detalle? Esta acción no se puede deshacer.")) {
            return;
        }

        const loadingToastId = toast.loading("Eliminando detalle...");
        try {
            const result = await eliminarOfertaDetalleAction(
                ofertaDetalleIdToEdit,
                negocioId, // prop
                clienteId, // prop
                ofertaId   // prop
            );
            toast.dismiss(loadingToastId);

            if (result.success) {
                toast.success("Detalle eliminado exitosamente. Redirigiendo...");

                // *** PUNTO CRÍTICO: LA REDIRECCIÓN ***
                // Debes redirigir a una página que NO sea la del detalle eliminado.
                // Generalmente, es la página de la oferta principal.
                // router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`);
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`);


                // router.refresh() aquí refrescaría la página a la que acabas de redirigir,
                // lo cual es bueno para asegurar que la lista de detalles (si está en esa página) se actualice.
                // La action ya hace revalidatePath, por lo que el refresh del router podría ser redundante,
                // pero no dañino.
                // Lo importante es que el router.push te saque de la URL del detalle eliminado.

            } else {
                toast.error(result.error || "No se pudo eliminar el detalle.");
            }
        } catch (err) {
            toast.dismiss(loadingToastId);
            toast.error(err instanceof Error ? err.message : "Ocurrió un error inesperado al eliminar.");
        }
    };

    const ESTADO_CONTENIDO_OPTIONS = [
        { value: 'PUBLICADO', label: 'Publicado (Visible para el asistente)' },
        { value: 'BORRADOR', label: 'Borrador (No visible para el asistente)' },
        { value: 'ARCHIVADO', label: 'Archivado (Oculto)' },
    ];

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <section className="space-y-4">
                <h2 className="text-lg font-semibold text-zinc-100 border-b border-zinc-700 pb-3 mb-5 flex items-center gap-2">
                    <InfoIcon size={20} className="text-blue-400" />
                    Información del Detalle
                </h2>
                <div>
                    <Label htmlFor="tituloDetalle" className="text-sm">Título / Pregunta Clave <span className="text-red-500">*</span></Label>
                    <Input id="tituloDetalle" {...register("tituloDetalle")} disabled={isSubmitting} />
                    {errors.tituloDetalle && <p className="text-xs text-red-400 mt-1">{errors.tituloDetalle.message}</p>}
                </div>

                <div>
                    <Label htmlFor="contenido" className="text-sm">Contenido / Respuesta <span className="text-red-500">*</span></Label>
                    <Textarea id="contenido" {...register("contenido")} rows={8} disabled={isSubmitting} />
                    {errors.contenido && <p className="text-xs text-red-400 mt-1">{errors.contenido.message}</p>}
                </div>

                <div>
                    <Label htmlFor="tipoDetalle" className="text-sm">Tipo de Detalle (Opcional)</Label>
                    <Input id="tipoDetalle" {...register("tipoDetalle")} placeholder="Ej: FAQ, Beneficio, Condición Específica" disabled={isSubmitting} />
                    {errors.tipoDetalle && <p className="text-xs text-red-400 mt-1">{errors.tipoDetalle.message}</p>}
                </div>

                <div>
                    <Label htmlFor="palabrasClave" className="text-sm">Palabras Clave (Opcional, separadas por coma)</Label>
                    <Controller
                        name="palabrasClave" // El tipo de field.value aquí será string[] | undefined
                        control={control}
                        render={({ field }) => (
                            <Input
                                id="palabrasClave"
                                placeholder="Ej: envío, garantía, devolución"
                                disabled={isSubmitting}
                                value={Array.isArray(field.value) ? field.value.join(', ') : ''}
                                onChange={(e) => {
                                    const values = e.target.value.split(',').map(kw => kw.trim()).filter(Boolean);
                                    field.onChange(values.length > 0 ? values : undefined); // Pasar undefined si está vacío para que Zod aplique default
                                }}
                            />
                        )}
                    />
                    <p className="text-xs text-zinc-400 mt-1">Ayudan al asistente a encontrar este detalle con mayor precisión.</p>
                    {errors.palabrasClave && <p className="text-xs text-red-400 mt-1">{typeof errors.palabrasClave.message === 'string' ? errors.palabrasClave.message : 'Error en palabras clave'}</p>}
                </div>

                <div>
                    <Label htmlFor="estadoContenido" className="text-sm">Estado del Contenido <span className="text-red-500">*</span></Label>
                    <Controller
                        name="estadoContenido" // field.value aquí será string (no undefined debido a default de Zod)
                        control={control}
                        render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                <SelectTrigger id="estadoContenido"><SelectValue placeholder="Selecciona estado..." /></SelectTrigger>
                                <SelectContent>
                                    {ESTADO_CONTENIDO_OPTIONS.map(opt => (
                                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        )}
                    />
                    {errors.estadoContenido && <p className="text-xs text-red-400 mt-1">{errors.estadoContenido.message}</p>}
                </div>
            </section>

            <div className="flex flex-col sm:flex-row justify-end items-center gap-3 pt-6 border-t border-zinc-600 mt-8">
                <Button type="button" variant="destructive" onClick={handleEliminar} disabled={isSubmitting} className="w-full sm:w-auto">
                    <Trash2 size={16} className="mr-1.5" /> Eliminar Detalle
                </Button>
                <Button type="button" variant="outline" onClick={() => router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`)} disabled={isSubmitting} className="w-full sm:w-auto">
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting || !isDirty} className="min-w-[150px] w-full sm:w-auto">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                    Guardar Cambios
                </Button>
            </div>
        </form>
    );
}