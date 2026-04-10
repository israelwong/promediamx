'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

import { createCliente } from '@/app/admin/_lib/actions/cliente/cliente.actions';
import { createClienteAdminSchema } from '@/app/admin/_lib/actions/cliente/cliente.schemas';
import type { CreateClienteAdminInput } from '@/app/admin/_lib/actions/cliente/cliente.schemas';

import { Loader2, Save, AlertCircle, CheckCircle } from 'lucide-react';

export default function ClienteNuevoForm() {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<CreateClienteAdminInput>({
        resolver: zodResolver(createClienteAdminSchema),
        defaultValues: {
            nombre: '',
            email: '',
            telefono: '',
        },
    });

    const onSubmit = (data: CreateClienteAdminInput) => {
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            const result = await createCliente(data);
            if (result.success && result.data) {
                setSuccess(`Cliente "${result.data.nombre}" creado con éxito. Redirigiendo...`);
                reset();
                setTimeout(() => {
                    // Redirigir a la página de detalles del nuevo cliente
                    if (result.data) {
                        router.push(`/admin/clientes/${result.data.id}`);
                    }
                }, 2000);
            } else {
                setError(result.error || "Ocurrió un error desconocido.");
            }
        });
    };

    // Clases de Tailwind para consistencia
    const inputGroupClasses = "mb-4";
    const labelClasses = "block text-sm font-medium text-zinc-300 mb-1";
    const inputClasses = "block w-full px-3 py-2 bg-zinc-800 border border-zinc-700 rounded-md text-zinc-100 placeholder-zinc-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition";
    const errorTextClasses = "mt-1 text-xs text-red-400";
    const buttonClasses = "w-full inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900";

    return (
        <div className="max-w-2xl mx-auto bg-zinc-900 p-6 md:p-8 rounded-lg border border-zinc-800 shadow-xl">
            <h2 className="text-2xl font-bold text-white mb-6">Crear Nuevo Cliente</h2>
            <form onSubmit={handleSubmit(onSubmit)} noValidate>
                {/* Campo Nombre */}
                <div className={inputGroupClasses}>
                    <label htmlFor="nombre" className={labelClasses}>Nombre del Cliente</label>
                    <input
                        id="nombre"
                        type="text"
                        {...register('nombre')}
                        className={`${inputClasses} ${errors.nombre ? 'border-red-500' : 'border-zinc-700'}`}
                        placeholder="Ej: Juan Pérez"
                        disabled={isPending || isSubmitting}
                    />
                    {errors.nombre && <p className={errorTextClasses}>{errors.nombre.message}</p>}
                </div>

                {/* Campo Email */}
                <div className={inputGroupClasses}>
                    <label htmlFor="email" className={labelClasses}>Correo Electrónico</label>
                    <input
                        id="email"
                        type="email"
                        {...register('email')}
                        className={`${inputClasses} ${errors.email ? 'border-red-500' : 'border-zinc-700'}`}
                        placeholder="Ej: cliente@ejemplo.com"
                        disabled={isPending || isSubmitting}
                    />
                    {errors.email && <p className={errorTextClasses}>{errors.email.message}</p>}
                </div>

                {/* Campo Teléfono */}
                <div className={inputGroupClasses}>
                    <label htmlFor="telefono" className={labelClasses}>Teléfono</label>
                    <input
                        id="telefono"
                        type="tel"
                        {...register('telefono')}
                        className={`${inputClasses} ${errors.telefono ? 'border-red-500' : 'border-zinc-700'}`}
                        placeholder="Ej: 5512345678"
                        disabled={isPending || isSubmitting}
                    />
                    {errors.telefono && <p className={errorTextClasses}>{errors.telefono.message}</p>}
                </div>

                {/* Mensajes de estado */}
                {error && (
                    <div className="my-4 flex items-center gap-2 rounded-md bg-red-900/20 p-3 text-sm text-red-400 border border-red-500/30">
                        <AlertCircle className="h-5 w-5" />
                        <span>{error}</span>
                    </div>
                )}
                {success && (
                    <div className="my-4 flex items-center gap-2 rounded-md bg-green-900/20 p-3 text-sm text-green-400 border border-green-500/30">
                        <CheckCircle className="h-5 w-5" />
                        <span>{success}</span>
                    </div>
                )}


                {/* Botón de Enviar */}
                <div className="mt-8">
                    <button
                        type="submit"
                        disabled={isPending || isSubmitting}
                        className={`${buttonClasses} ${isPending || isSubmitting ? 'bg-zinc-600 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'}`}
                    >
                        {(isPending || isSubmitting) ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                Creando Cliente...
                            </>
                        ) : (
                            <>
                                <Save className="mr-2 h-4 w-4" />
                                Guardar Cliente
                            </>
                        )}
                    </button>
                </div>
            </form>
        </div>
    );
}
