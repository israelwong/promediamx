// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/[paqueteId]/components/PaqueteEditarForm.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Loader2, AlertTriangle, ArrowLeft, Save, Trash2, CheckCircle } from 'lucide-react'; // Añadido CheckCircle
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    ActualizarNegocioPaqueteSchema,
    ActualizarNegocioPaqueteData,
    NegocioPaqueteParaEditar
} from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.schemas';
import {
    obtenerNegocioPaqueteParaEditarAction,
    actualizarNegocioPaqueteAction,
    eliminarNegocioPaqueteAction
} from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.actions';

import { obtenerCategoriasPaqueteAction } from '@/app/admin/_lib/actions/negocioPaqueteCategoria/negocioPaqueteCategoria.actions';
import { NegocioPaqueteCategoriaListItem } from '@/app/admin/_lib/actions/negocioPaqueteCategoria/negocioPaqueteCategoria.schemas';
import { ActionResult } from '@/app/admin/_lib/types';

interface PaqueteEditarFormProps {
    negocioId: string;
    clienteId: string;
    paqueteId: string;
}

export default function PaqueteEditarForm({ negocioId, clienteId, paqueteId }: PaqueteEditarFormProps) {
    const router = useRouter();
    const [initialLoading, setInitialLoading] = useState(true);
    const [categorias, setCategorias] = useState<NegocioPaqueteCategoriaListItem[]>([]);
    const [isLoadingCategorias, setIsLoadingCategorias] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);
    const [formSuccess, setFormSuccess] = useState<string | null>(null); // Nuevo estado para mensajes de éxito
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);
    const [isDeleting, setIsDeleting] = useState(false);

    const {
        register,
        handleSubmit,
        reset,
        // setValue,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<ActualizarNegocioPaqueteData>({
        resolver: zodResolver(ActualizarNegocioPaqueteSchema),
        defaultValues: {
            nombre: '',
            descripcionCorta: '',
            descripcion: '',
            precio: 0,
            linkPago: '',
            status: 'activo',
            negocioPaqueteCategoriaId: undefined,
        }
    });

    const fetchPaqueteData = useCallback(async () => {
        if (!paqueteId) return;
        setInitialLoading(true);
        setFormError(null);
        setFormSuccess(null);
        const result = await obtenerNegocioPaqueteParaEditarAction(paqueteId);
        if (result.success && result.data) {
            const paquete = result.data;
            reset({
                nombre: paquete.nombre,
                descripcionCorta: paquete.descripcionCorta || '',
                descripcion: paquete.descripcion || '',
                precio: paquete.precio,
                linkPago: paquete.linkPago || '',
                status: paquete.status,
                negocioPaqueteCategoriaId: paquete.negocioPaqueteCategoriaId || undefined,
            });
        } else {
            setFormError(result.error || "No se pudo cargar el paquete para editar.");
        }
        setInitialLoading(false);
    }, [paqueteId, reset]);

    const fetchCategorias = useCallback(async () => {
        if (!negocioId) return;
        setIsLoadingCategorias(true);
        const result = await obtenerCategoriasPaqueteAction(negocioId);
        if (result.success && result.data) {
            setCategorias(result.data);
        } else {
            console.error("Error al cargar categorías:", result.error);
            setCategorias([]);
        }
        setIsLoadingCategorias(false);
    }, [negocioId]);

    useEffect(() => {
        fetchPaqueteData();
        fetchCategorias();
    }, [fetchPaqueteData, fetchCategorias]);

    const onSubmit: SubmitHandler<ActualizarNegocioPaqueteData> = async (data) => {
        setFormError(null);
        setFormSuccess(null);
        setFieldErrors(undefined);

        const dataToSubmit: ActualizarNegocioPaqueteData = {
            ...data,
            negocioPaqueteCategoriaId: data.negocioPaqueteCategoriaId === '' ? null : data.negocioPaqueteCategoriaId,
        };

        const result: ActionResult<NegocioPaqueteParaEditar> = await actualizarNegocioPaqueteAction(
            paqueteId,
            clienteId,
            negocioId,
            dataToSubmit
        );

        if (result.success) {
            if (result.data) {
                reset(result.data);
            }
            setFormSuccess("Paquete actualizado con éxito!");
            // Limpiar mensaje de éxito después de unos segundos
            setTimeout(() => setFormSuccess(null), 5000);
        } else {
            setFormError(result.error || "Ocurrió un error desconocido al actualizar.");
            if (result.errorDetails) {
                setFieldErrors(result.errorDetails);
            }
        }
    };

    const handleDelete = async () => {
        setFormError(null);
        setFormSuccess(null);
        if (confirm("¿Estás seguro de que quieres eliminar este paquete? Esta acción no se puede deshacer.")) {
            setIsDeleting(true);
            const result = await eliminarNegocioPaqueteAction(paqueteId, clienteId, negocioId);
            if (result.success) {
                // No establecer formSuccess aquí ya que vamos a redirigir
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/paquete`);
            } else {
                setFormError(result.error || "No se pudo eliminar el paquete.");
            }
            setIsDeleting(false);
        }
    };

    const handleClose = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/paquete`);
    };

    const labelClasses = "block text-sm font-medium text-zinc-300 mb-1";
    const inputClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2.5 shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const selectClasses = `${inputClasses} appearance-none`;
    const errorTextClasses = "text-xs text-red-400 mt-1";
    // const successTextClasses = "text-xs text-green-400 mt-1";


    if (initialLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-80 p-6 bg-zinc-800 rounded-lg border border-zinc-700 shadow-lg">
                <Loader2 size={48} className="animate-spin mb-4 text-zinc-400" />
                <p className="text-zinc-400">Cargando datos del paquete...</p>
            </div>
        );
    }

    // Error de carga inicial (cuando el paquete no se pudo cargar)
    if (formError && !isSubmitting && !initialLoading && !Object.keys(errors).length && !fieldErrors && !isDirty) {
        return (
            <div className="bg-zinc-800 rounded-lg border border-zinc-700 shadow-lg p-6 text-center">
                <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
                <p className="mb-2 text-lg font-semibold text-red-400">Error al Cargar Paquete</p>
                <p className="text-red-500 mb-4">{formError}</p>
                <Button onClick={handleClose} variant="outline" className="border-zinc-600 hover:bg-zinc-700">
                    Volver a la lista
                </Button>
            </div>
        );
    }

    return (
        <div className="p-4 md:p-6 bg-zinc-800 rounded-lg border border-zinc-700 shadow-lg">
            <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-700">
                <h3 className="text-lg font-semibold text-zinc-100">Editar Paquete</h3>
                <Button variant="outline" onClick={handleClose} className="border-zinc-600 hover:bg-zinc-700 text-zinc-300">
                    <ArrowLeft size={16} className="mr-2" />
                    Cerrar
                </Button>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {/* Campos del formulario... */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <div className="md:col-span-2">
                        <label htmlFor="nombre" className={labelClasses}>
                            Nombre del Paquete <span className="text-red-500">*</span>
                        </label>
                        <input id="nombre" type="text" {...register('nombre')}
                            className={`${inputClasses} ${errors.nombre || fieldErrors?.nombre ? 'border-red-500' : 'border-zinc-700'}`}
                            disabled={isSubmitting || isDeleting} />
                        {errors.nombre && <p className={errorTextClasses}>{errors.nombre.message}</p>}
                        {fieldErrors?.nombre && fieldErrors.nombre.map((err, i) => <p key={i} className={errorTextClasses}>{err}</p>)}
                    </div>
                    <div>
                        <label htmlFor="precio" className={labelClasses}>
                            Precio (MXN) <span className="text-red-500">*</span>
                        </label>
                        <input id="precio" type="number" step="0.01" {...register('precio', { valueAsNumber: true })}
                            className={`${inputClasses} ${errors.precio || fieldErrors?.precio ? 'border-red-500' : 'border-zinc-700'}`}
                            disabled={isSubmitting || isDeleting} />
                        {errors.precio && <p className={errorTextClasses}>{errors.precio.message}</p>}
                        {fieldErrors?.precio && fieldErrors.precio.map((err, i) => <p key={i} className={errorTextClasses}>{err}</p>)}
                    </div>
                </div>

                <div>
                    <label htmlFor="status" className={labelClasses}>
                        Estado <span className="text-red-500">*</span>
                    </label>
                    <select id="status" {...register('status')}
                        className={`${selectClasses} ${errors.status || fieldErrors?.status ? 'border-red-500' : 'border-zinc-700'}`}
                        disabled={isSubmitting || isDeleting}>
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                    {errors.status && <p className={errorTextClasses}>{errors.status.message}</p>}
                    {fieldErrors?.status && fieldErrors.status.map((err, i) => <p key={i} className={errorTextClasses}>{err}</p>)}
                </div>

                <div>
                    <label htmlFor="descripcionCorta" className={labelClasses}>
                        Descripción Corta (Resumen)
                    </label>
                    <textarea id="descripcionCorta" {...register('descripcionCorta')} rows={2}
                        className={`${inputClasses} ${errors.descripcionCorta || fieldErrors?.descripcionCorta ? 'border-red-500' : 'border-zinc-700'}`}
                        placeholder="Un resumen breve para listados..."
                        disabled={isSubmitting || isDeleting} />
                    {errors.descripcionCorta && <p className={errorTextClasses}>{errors.descripcionCorta.message}</p>}
                    {fieldErrors?.descripcionCorta && fieldErrors.descripcionCorta.map((err, i) => <p key={i} className={errorTextClasses}>{err}</p>)}
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelClasses}>
                        Descripción Amplia
                    </label>
                    <textarea id="descripcion" {...register('descripcion')} rows={4}
                        className={`${inputClasses} ${errors.descripcion || fieldErrors?.descripcion ? 'border-red-500' : 'border-zinc-700'}`}
                        placeholder="Detalles completos del paquete..."
                        disabled={isSubmitting || isDeleting} />
                    {errors.descripcion && <p className={errorTextClasses}>{errors.descripcion.message}</p>}
                    {fieldErrors?.descripcion && fieldErrors.descripcion.map((err, i) => <p key={i} className={errorTextClasses}>{err}</p>)}
                </div>

                <div>
                    <label htmlFor="linkPago" className={labelClasses}>
                        Enlace de Pago (Opcional)
                    </label>
                    <input id="linkPago" type="url" {...register('linkPago')}
                        className={`${inputClasses} ${errors.linkPago || fieldErrors?.linkPago ? 'border-red-500' : 'border-zinc-700'}`}
                        placeholder="https://ejemplo.com/pagar"
                        disabled={isSubmitting || isDeleting} />
                    {errors.linkPago && <p className={errorTextClasses}>{errors.linkPago.message}</p>}
                    {fieldErrors?.linkPago && fieldErrors.linkPago.map((err, i) => <p key={i} className={errorTextClasses}>{err}</p>)}
                </div>

                {!isLoadingCategorias && (
                    <div>
                        <label htmlFor="negocioPaqueteCategoriaId" className={labelClasses}>
                            Categoría (Opcional)
                        </label>
                        <select id="negocioPaqueteCategoriaId" {...register('negocioPaqueteCategoriaId')}
                            className={`${selectClasses} ${errors.negocioPaqueteCategoriaId || fieldErrors?.negocioPaqueteCategoriaId ? 'border-red-500' : 'border-zinc-700'}`}
                            disabled={isSubmitting || isLoadingCategorias || isDeleting}
                            defaultValue="">
                            <option value="">-- Sin categoría --</option>
                            {categorias.map((cat) => (
                                <option key={cat.id} value={cat.id}>
                                    {cat.nombre}
                                </option>
                            ))}
                        </select>
                        {errors.negocioPaqueteCategoriaId && <p className={errorTextClasses}>{errors.negocioPaqueteCategoriaId.message}</p>}
                        {fieldErrors?.negocioPaqueteCategoriaId && fieldErrors.negocioPaqueteCategoriaId.map((err, i) => <p key={i} className={errorTextClasses}>{err}</p>)}
                    </div>
                )}
                {isLoadingCategorias && (
                    <div className="flex items-center text-sm text-zinc-400">
                        <Loader2 size={16} className="animate-spin mr-2" /> Cargando categorías...
                    </div>
                )}

                {/* Sección de Mensajes de Éxito/Error (Arriba de los botones) */}
                <div className="space-y-3">
                    {formSuccess && (
                        <div className="bg-green-500/10 border border-green-500/30 text-green-300 p-3 rounded-md flex items-center gap-2 text-sm">
                            <CheckCircle size={18} />
                            <p>{formSuccess}</p>
                        </div>
                    )}
                    {formError && !fieldErrors && !Object.keys(errors).length && ( // Mostrar error general de submit si no hay otros de campo
                        <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md flex items-center gap-2 text-sm">
                            <AlertTriangle size={18} />
                            <p>{formError}</p>
                        </div>
                    )}
                </div>

                {/* Botones de Acción */}
                <div className="flex flex-col sm:flex-row justify-between items-center pt-6 border-t border-zinc-700 gap-4">
                    <Button
                        type="button"
                        variant="destructive"
                        onClick={handleDelete}
                        disabled={isSubmitting || isDeleting || initialLoading}
                        className="w-full sm:w-1/2 bg-red-700/20 text-red-400 hover:bg-red-600 hover:text-red-100 border border-red-700/30 hover:border-red-600"
                    >
                        {isDeleting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Trash2 size={18} className="mr-2" />}
                        {isDeleting ? 'Eliminando...' : 'Eliminar Paquete'}
                    </Button>
                    <Button
                        type="submit"
                        disabled={isSubmitting || isDeleting || initialLoading || !isDirty}
                        className="w-full sm:w-1/2 bg-blue-600 hover:bg-blue-700"
                    >
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
