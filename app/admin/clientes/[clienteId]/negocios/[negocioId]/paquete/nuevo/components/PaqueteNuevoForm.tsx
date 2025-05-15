// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/nuevo/components/PaqueteNuevoForm.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button'; // Ajusta ruta
import { Loader2, AlertTriangle, ArrowLeft, Save } from 'lucide-react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import {
    CrearNegocioPaqueteSchema,
    CrearNegocioPaqueteData
} from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.schemas'; // Ajusta ruta
import { crearNegocioPaqueteAction } from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.actions'; // Ajusta ruta

import { obtenerCategoriasPaqueteAction } from '@/app/admin/_lib/actions/negocioPaqueteCategoria/negocioPaqueteCategoria.actions'; // Ajusta ruta
import { NegocioPaqueteCategoriaListItem } from '@/app/admin/_lib/actions/negocioPaqueteCategoria/negocioPaqueteCategoria.schemas'; // Ajusta ruta
import { ActionResult } from '@/app/admin/_lib/types'; // Asegúrate que este tipo esté bien definido

interface PaqueteNuevoFormProps {
    negocioId: string;
    clienteId: string;
}

export default function PaqueteNuevoForm({ negocioId, clienteId }: PaqueteNuevoFormProps) {
    const router = useRouter();
    const [categorias, setCategorias] = useState<NegocioPaqueteCategoriaListItem[]>([]);
    const [isLoadingCategorias, setIsLoadingCategorias] = useState(true);
    const [formError, setFormError] = useState<string | null>(null);
    // Estado para los errores de campo específicos devueltos por la Server Action
    const [fieldErrors, setFieldErrors] = useState<Record<string, string[]> | undefined>(undefined);


    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        // reset, // Eliminado si no se usa, o puedes añadir lógica para usarlo
    } = useForm<CrearNegocioPaqueteData>({
        resolver: zodResolver(CrearNegocioPaqueteSchema),
        defaultValues: {
            nombre: '',
            descripcion: '', // o null si el schema lo permite y es preferible
            precio: 0, // Cambiado de undefined a 0 para satisfacer el tipo number
            negocioPaqueteCategoriaId: undefined, // O '' si el select lo maneja mejor como valor "no seleccionado"
        }
    });

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
        fetchCategorias();
    }, [fetchCategorias]);

    const onSubmit: SubmitHandler<CrearNegocioPaqueteData> = async (data) => {
        setFormError(null);
        setFieldErrors(undefined); // Limpiar errores de campo previos

        // Asegurarse de que negocioPaqueteCategoriaId sea null si es un string vacío (del select)
        const dataToSubmit: CrearNegocioPaqueteData = {
            ...data,
            negocioPaqueteCategoriaId: data.negocioPaqueteCategoriaId === '' ? null : data.negocioPaqueteCategoriaId,
        };

        const result: ActionResult<{ id: string }> = await crearNegocioPaqueteAction(negocioId, clienteId, dataToSubmit);
        if (result.success && result.data) {
            const paqueteId = result.data.id; // Aquí recuperas el ID
            router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/paquete/${paqueteId}`);
        } else {
            setFormError(result.error || "Ocurrió un error desconocido.");
            if (result.errorDetails) { // Usar errorDetails según tu tipo ActionResult actualizado
                setFieldErrors(result.errorDetails);
                // Opcionalmente, mapear a react-hook-form con setError si es necesario
            }
            // También puedes manejar result.errors si es un array de strings
            if (result.errors && result.errors.length > 0) {
                setFormError(prev => prev ? `${prev} ${result.errors?.join(', ') || ''}` : result.errors?.join(', ') || null);
            }
        }
    };

    const handleClose = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/paquete`);
    };

    const containerClasses = "flex flex-col gap-4 p-4 bg-zinc-800 rounded-lg border border-zinc-700 shadow-lg lg:w-1/4 mx-auto";

    const labelClasses = "block text-sm font-medium text-zinc-300 mb-1";
    const inputClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2.5 shadow-sm focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    const selectClasses = `${inputClasses} appearance-none`;
    const errorTextClasses = "text-xs text-red-400 mt-1";

    return (
        <div className={`${containerClasses} p-4 md:p-6 bg-zinc-800 rounded-lg border border-zinc-700 shadow-lg`}>

            <div className="flex items-center justify-between mb-6 pb-3 border-b border-zinc-700">
                <h2 className="text-xl font-semibold text-zinc-100">Crear Nuevo Paquete</h2>

            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
                {formError && !fieldErrors && ( // Mostrar error general solo si no hay errores de campo específicos
                    <div className="bg-red-500/10 border border-red-500/30 text-red-400 p-3 rounded-md flex items-center gap-2">
                        <AlertTriangle size={18} />
                        <p className="text-sm">{formError}</p>
                    </div>
                )}

                <div>
                    <label htmlFor="nombre" className={labelClasses}>
                        Nombre del Paquete <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="nombre"
                        type="text"
                        {...register('nombre')}
                        className={`${inputClasses} ${errors.nombre || fieldErrors?.nombre ? 'border-red-500' : 'border-zinc-700'}`}
                        disabled={isSubmitting}
                    />
                    {errors.nombre && <p className={errorTextClasses}>{errors.nombre.message}</p>}
                    {fieldErrors?.nombre && fieldErrors.nombre.map((err, i) => <p key={i} className={errorTextClasses}>{err}</p>)}
                </div>

                <div>
                    <label htmlFor="precio" className={labelClasses}>
                        Precio (MXN) <span className="text-red-500">*</span>
                    </label>
                    <input
                        id="precio"
                        type="number"
                        step="0.01"
                        {...register('precio', { valueAsNumber: true })} // Asegurar que el valor se trate como número
                        className={`${inputClasses} ${errors.precio || fieldErrors?.precio ? 'border-red-500' : 'border-zinc-700'}`}
                        placeholder="Ej: 299.99"
                        disabled={isSubmitting}
                    />
                    {errors.precio && <p className={errorTextClasses}>{errors.precio.message}</p>}
                    {fieldErrors?.precio && fieldErrors.precio.map((err, i) => <p key={i} className={errorTextClasses}>{err}</p>)}
                </div>

                <div>
                    <label htmlFor="descripcion" className={labelClasses}>
                        Descripción (Opcional)
                    </label>
                    <textarea
                        id="descripcion"
                        {...register('descripcion')}
                        rows={3}
                        className={`${inputClasses} ${errors.descripcion || fieldErrors?.descripcion ? 'border-red-500' : 'border-zinc-700'}`}
                        placeholder="Describe brevemente el paquete..."
                        disabled={isSubmitting}
                    />
                    {errors.descripcion && <p className={errorTextClasses}>{errors.descripcion.message}</p>}
                    {fieldErrors?.descripcion && fieldErrors.descripcion.map((err, i) => <p key={i} className={errorTextClasses}>{err}</p>)}
                </div>

                {!isLoadingCategorias && categorias.length > 0 && (
                    <div>
                        <label htmlFor="negocioPaqueteCategoriaId" className={labelClasses}>
                            Categoría (Opcional)
                        </label>
                        <select
                            id="negocioPaqueteCategoriaId"
                            {...register('negocioPaqueteCategoriaId')}
                            className={`${selectClasses} ${errors.negocioPaqueteCategoriaId || fieldErrors?.negocioPaqueteCategoriaId ? 'border-red-500' : 'border-zinc-700'}`}
                            disabled={isSubmitting}
                            defaultValue="" // Para que la opción "-- Sin categoría --" esté seleccionada por defecto
                        >
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

                <div className="flex items-center justify-between mt-4 gap-2">

                    <Button variant="outline" onClick={handleClose} className="border-zinc-600 hover:bg-zinc-700 text-zinc-300 w-full">
                        <ArrowLeft size={16} className="mr-2" />
                        Cancealar
                    </Button>

                    <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700  w-full">
                        {isSubmitting ? <Loader2 className="animate-spin mr-2" size={18} /> : <Save size={18} className="mr-2" />}
                        {isSubmitting ? 'Guardando...' : 'Crear Paquete'}
                    </Button>
                </div>
            </form>
        </div>
    );
}
