'use client';

import React, { useState, useEffect, useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';

// --- NUEVAS IMPORTACIONES CENTRALIZADAS ---
import { getClienteById, updateCliente, archiveCliente, deleteClienteDefinitivamente } from '@/app/admin/_lib/actions/cliente/cliente.actions';
import { updateClienteSchema } from '@/app/admin/_lib/actions/cliente/cliente.schemas';
import type { UpdateClienteInput, ClienteParaEditar } from '@/app/admin/_lib/actions/cliente/cliente.schemas';

// --- UI y Iconos ---
import { Loader2, Save, Archive, AlertCircle, CheckCircle } from 'lucide-react';
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Switch } from '@/app/components/ui/switch'; // Asumiendo que existe un Switch en tu UI

interface Props {
    clienteId: string;
}

export default function ClienteEditarForm({ clienteId }: Props) {
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [clienteData, setClienteData] = useState<ClienteParaEditar | null>(null);

    const {
        control,
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<UpdateClienteInput>({
        resolver: zodResolver(updateClienteSchema),
    });

    // --- CARGA DE DATOS ---
    useEffect(() => {
        if (!clienteId) return;

        startTransition(async () => {
            const result = await getClienteById(clienteId);
            if (result.success && result.data) {
                setClienteData(result.data);
                // `reset` de react-hook-form puebla el formulario con los datos iniciales
                reset({
                    ...result.data,
                    rfc: result.data.rfc ?? undefined,
                    curp: result.data.curp ?? undefined,
                    razonSocial: result.data.razonSocial ?? undefined,
                    stripeCustomerId: result.data.stripeCustomerId ?? undefined,
                });
            } else {
                setError(result.error || "No se pudo cargar la información del cliente.");
                setClienteData(null);
            }
        });
    }, [clienteId, reset]);

    // --- MANEJO DEL ENVÍO ---
    const onSubmit = (data: UpdateClienteInput) => {
        setError(null);
        setSuccess(null);

        startTransition(async () => {
            const result = await updateCliente(clienteId, data);
            if (result.success) {
                setSuccess('Cliente actualizado con éxito.');
                reset(result.data); // Resetea el form al nuevo estado "limpio"
            } else {
                setError(result.error || "Ocurrió un error al actualizar.");
            }
        });
    };

    // --- MANEJO DE ARCHIVAR ---
    const handleArchive = () => {
        if (!confirm("¿Estás seguro de que deseas archivar este cliente? Esta acción no se puede deshacer fácilmente.")) return;
        startTransition(async () => {
            const result = await archiveCliente(clienteId);
            if (result.success && result.data) {
                setSuccess('Cliente archivado con éxito.');
                reset({ ...clienteData, status: 'archivado' }); // Actualiza el estado visual del form
            } else {
                setError(result.error || 'No se pudo archivar el cliente.');
            }
        });
    }

    // --- MANEJO DE ELIMINACIÓN DEFINITIVA ---
    const handleDelete = () => {
        if (!confirm("¿Estás seguro de que deseas eliminar este cliente? Esta acción es irreversible.")) return;
        startTransition(async () => {
            const result = await deleteClienteDefinitivamente(clienteId);
            if (result.success) {
                setSuccess('Cliente eliminado con éxito.');
                // Aquí podrías redirigir o limpiar el formulario
                window.location.href = '/admin/clientes';
                reset(); // Limpia el formulario
            } else {
                setError(result.error || 'No se pudo eliminar el cliente.');
            }
        });
    }

    // --- RENDERIZADO ---
    const isLoading = isPending || (!clienteData && !error);
    if (isLoading) {
        return <div className="p-6 bg-zinc-800/50 border border-zinc-700 rounded-lg flex items-center justify-center"><Loader2 className='animate-spin mr-2' /> Cargando...</div>;
    }
    if (error && !clienteData) {
        return <div className="p-6 bg-red-900/20 border border-red-500/30 rounded-lg text-red-400">{error}</div>;
    }
    if (!clienteData) {
        return <div className="p-6 bg-zinc-800/50 border border-zinc-700 rounded-lg">No se encontró el cliente.</div>;
    }

    return (
        <div className="p-4 md:p-6 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-lg">
            <div className='border-b border-zinc-700 pb-3 mb-6'>
                <h2 className="text-xl font-semibold text-white">{clienteData.nombre || 'Editar Cliente'}</h2>
                <p className="text-xs text-zinc-400 mt-0.5">ID: {clienteId}</p>
            </div>

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-5" noValidate>
                {/* --- SECCIÓN PRINCIPAL --- */}
                <div className="space-y-2">
                    <Label htmlFor="nombre">Nombre Completo</Label>
                    <Input id="nombre" {...register('nombre')} disabled={isSubmitting} />
                    {errors.nombre && <p className="text-xs text-red-400">{errors.nombre.message}</p>}
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="email">Email</Label>
                        <Input id="email" type="email" {...register('email')} disabled={isSubmitting} />
                        {errors.email && <p className="text-xs text-red-400">{errors.email.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input id="telefono" type="tel" {...register('telefono')} disabled={isSubmitting} />
                        {errors.telefono && <p className="text-xs text-red-400">{errors.telefono.message}</p>}
                    </div>
                </div>

                {/* --- SECCIÓN FISCAL (Opcional) --- */}
                <h3 className="text-lg font-semibold text-white pt-4 border-t border-zinc-700">Información Fiscal</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-2">
                        <Label htmlFor="rfc">RFC</Label>
                        <Input id="rfc" {...register('rfc')} disabled={isSubmitting} />
                        {errors.rfc && <p className="text-xs text-red-400">{errors.rfc.message}</p>}
                    </div>
                    <div className="space-y-2">
                        <Label htmlFor="curp">CURP</Label>
                        <Input id="curp" {...register('curp')} disabled={isSubmitting} />
                        {errors.curp && <p className="text-xs text-red-400">{errors.curp.message}</p>}
                    </div>
                </div>
                <div className="space-y-2">
                    <Label htmlFor="razonSocial">Razón Social</Label>
                    <Input id="razonSocial" {...register('razonSocial')} disabled={isSubmitting} />
                    {errors.razonSocial && <p className="text-xs text-red-400">{errors.razonSocial.message}</p>}
                </div>

                {/* --- SECCIÓN AVANZADA --- */}
                <h3 className="text-lg font-semibold text-white pt-4 border-t border-zinc-700">Avanzado</h3>
                <Controller
                    control={control}
                    name="status"
                    render={({ field }) => (
                        <div className="flex items-center justify-between p-3 bg-zinc-900/50 rounded-lg">
                            <Label htmlFor="status-switch">Estado del Cliente</Label>
                            <div className="flex items-center gap-3">
                                <Switch
                                    id="status-switch"
                                    checked={field.value === 'activo'}
                                    onCheckedChange={(checked) => field.onChange(checked ? 'activo' : 'inactivo')}
                                    disabled={isSubmitting || field.value === 'archivado'}
                                />
                                <span className="text-sm font-medium text-zinc-300 capitalize">{field.value}</span>
                            </div>
                        </div>
                    )}
                />

                {/* --- NOTIFICACIONES --- */}
                {error && <div className="flex items-center gap-2 rounded-md bg-red-900/20 p-3 text-sm text-red-400"><AlertCircle size={16} /><span>{error}</span></div>}
                {success && <div className="flex items-center gap-2 rounded-md bg-green-900/20 p-3 text-sm text-green-400"><CheckCircle size={16} /><span>{success}</span></div>}


                {/* --- ACCIONES --- */}
                <div className="pt-6 space-y-3 border-t border-zinc-700">
                    <Button type="submit" className="w-full" disabled={isSubmitting || !isDirty}>
                        {isSubmitting ? <Loader2 className='animate-spin mr-2' /> : <Save size={16} className="mr-2" />}
                        {isSubmitting ? 'Guardando...' : 'Guardar Cambios'}
                    </Button>


                    {clienteData.status !== 'archivado' && (
                        <Button
                            type="button"
                            variant="ghost"
                            onClick={handleArchive}
                            className="w-full bg-amber-500 text-white hover:text-amber-400 hover:bg-amber-500/10"
                            disabled={isSubmitting}
                        >
                            <Archive size={16} className="mr-2" />
                            Archivar Cliente
                        </Button>
                    )}
                    {/* Eliminar Cliente */}
                    <Button
                        type="button"
                        variant="destructive"
                        className="w-full mt-2"
                        disabled={isSubmitting}
                        onClick={handleDelete}
                    >
                        Eliminar Cliente
                    </Button>
                </div>
            </form>
        </div>
    );
}

