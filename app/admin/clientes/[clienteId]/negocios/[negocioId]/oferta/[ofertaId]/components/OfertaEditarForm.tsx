// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/[ofertaId]/components/OfertaEditarForm.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Acciones del backend
import {
    obtenerOfertaParaEdicionAction,
    editarOfertaAction,
    eliminarOferta,
} from '@/app/admin/_lib/actions/oferta/oferta.actions';

// Schemas Zod y tipos principales
import {
    EditarOfertaInputSchema,
    // type EditarOfertaDataInputType,
    // type OfertaParaEditarFormType,
} from '@/app/admin/_lib/actions/oferta/oferta.schemas';

// Acción y tipo para cargar servicios/tipos de cita
import { obtenerTiposDeCitaParaSelectAction } from '@/app/admin/_lib/actions/agendaTipoCita/agendaTipoCita.actions';
import type { AgendaTipoCitaParaSelect } from '@/app/admin/_lib/actions/agendaTipoCita/agendaTipoCita.schemas';

// Enums de Prisma
import {
    TipoPagoOferta as PrismaTipoPagoOfertaEnum,
    IntervaloRecurrenciaOferta as PrismaIntervaloRecurrenciaOfertaEnum,
    EstadoOferta as PrismaEstadoOfertaEnum,
    ObjetivoOferta as PrismaObjetivoOfertaEnum,
    TipoAnticipoOferta as PrismaTipoAnticipoOfertaEnum,
    ObjetivoCitaTipoEnum as PrismaObjetivoCitaTipoEnum,
} from '@prisma/client';

// Componentes de UI
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'react-hot-toast';
import { Loader2, Save, Info, DollarSign, CalendarDays, Target, Percent, HandCoins, AlertTriangle, Trash2, ListVideo } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';

interface Props {
    ofertaId: string;
    negocioId: string;
    clienteId: string;
    onOfertaUpdated?: () => void;
}

type FormValues = z.infer<typeof EditarOfertaInputSchema>;

const TIPO_PAGO_OPTIONS = [
    { value: PrismaTipoPagoOfertaEnum.UNICO, label: 'Pago Único' },
    { value: PrismaTipoPagoOfertaEnum.RECURRENTE, label: 'Pago Recurrente' },
];
const INTERVALO_RECURRENCIA_OPTIONS = Object.values(PrismaIntervaloRecurrenciaOfertaEnum).map(value => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase().replace('_', ' ') }));
const STATUS_OFERTA_OPTIONS = Object.values(PrismaEstadoOfertaEnum).map(value => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase().replace('_', ' ') }));
const OBJETIVO_OPTIONS: { id: PrismaObjetivoOfertaEnum; label: string }[] = [
    { id: PrismaObjetivoOfertaEnum.CITA, label: 'Agendar Citas / Reservas' },
    { id: PrismaObjetivoOfertaEnum.VENTA, label: 'Generar Ventas Directas' },
];
const TIPO_ANTICIPO_OPTIONS = Object.values(PrismaTipoAnticipoOfertaEnum).map(value => ({ value, label: value === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto Fijo ($)' }));
const OBJETIVO_CITA_TIPO_OPTIONS = Object.values(PrismaObjetivoCitaTipoEnum).map(value => ({ value, label: value === 'DIA_ESPECIFICO' ? 'Día Específico (Evento)' : 'Por Hora (Según Disponibilidad)' }));

const dateToInputFormat = (date?: Date | string | null): string => {
    if (!date) return '';
    try {
        if (typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date)) return date;
        const d = new Date(date);
        const year = d.getUTCFullYear();
        const month = (d.getUTCMonth() + 1).toString().padStart(2, '0');
        const day = d.getUTCDate().toString().padStart(2, '0');
        return `${year}-${month}-${day}`;
    } catch { return ''; }
};

const dateTimeToInputFormat = (date?: Date | string | null): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        if (isNaN(d.getTime())) return '';
        const localDate = new Date(d.getTime() - (d.getTimezoneOffset() * 60000));
        return localDate.toISOString().slice(0, 16);
    } catch { return ''; }
};

export default function OfertaEditarForm({ ofertaId, negocioId, clienteId, onOfertaUpdated }: Props) {
    const router = useRouter();
    const [initialDataLoaded, setInitialDataLoaded] = useState(false);
    const [loadingData, setLoadingData] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [requiereAnticipo, setRequiereAnticipo] = useState(false);
    const [serviciosCita, setServiciosCita] = useState<AgendaTipoCitaParaSelect[]>([]);

    const defaultFormValues: DefaultValues<FormValues> = {
        nombre: '',
        descripcion: null,
        precio: undefined,
        tipoPago: PrismaTipoPagoOfertaEnum.UNICO,
        intervaloRecurrencia: null,
        objetivos: [PrismaObjetivoOfertaEnum.VENTA],
        tipoAnticipo: null,
        porcentajeAnticipo: undefined,
        anticipo: undefined,
        objetivoCitaTipo: null,
        objetivoCitaFecha: undefined,
        objetivoCitaServicioId: null,
        objetivoCitaUbicacion: null,
        objetivoCitaDuracionMinutos: undefined,
        objetivoCitaLimiteConcurrencia: undefined,
        fechaInicio: new Date(),
        fechaFin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        status: PrismaEstadoOfertaEnum.BORRADOR,
    };

    const {
        control,
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<FormValues>({
        resolver: zodResolver(EditarOfertaInputSchema),
        defaultValues: defaultFormValues,
    });

    const tipoPagoSeleccionado = watch('tipoPago');
    const tipoAnticipoSeleccionado = watch('tipoAnticipo');
    const objetivosSeleccionados = watch('objetivos', []);
    const esObjetivoCita = Array.isArray(objetivosSeleccionados) && objetivosSeleccionados.includes(PrismaObjetivoOfertaEnum.CITA);
    const tipoObjetivoCitaSeleccionado = watch('objetivoCitaTipo');

    const fetchInitialData = useCallback(async () => {
        setLoadingData(true);
        setLoadError(null);
        try {
            const [ofertaResult, serviciosResult] = await Promise.all([
                obtenerOfertaParaEdicionAction(ofertaId, negocioId),
                obtenerTiposDeCitaParaSelectAction(negocioId)
            ]);

            if (serviciosResult.success && serviciosResult.data) {
                setServiciosCita(serviciosResult.data);
            } else {
                console.warn("No se pudieron cargar los servicios para citas:", serviciosResult.error);
                toast.error(serviciosResult.error || "Error cargando lista de servicios para citas.");
            }

            if (ofertaResult.success && ofertaResult.data) {
                const dataFromDb = ofertaResult.data;
                reset({
                    nombre: dataFromDb.nombre,
                    descripcion: dataFromDb.descripcion,
                    precio: dataFromDb.precio === null ? undefined : dataFromDb.precio,
                    tipoPago: dataFromDb.tipoPago,
                    intervaloRecurrencia: dataFromDb.intervaloRecurrencia,
                    objetivos: dataFromDb.objetivos as PrismaObjetivoOfertaEnum[],
                    tipoAnticipo: dataFromDb.tipoAnticipo,
                    porcentajeAnticipo: dataFromDb.porcentajeAnticipo === null ? undefined : dataFromDb.porcentajeAnticipo,
                    anticipo: dataFromDb.anticipo === null ? undefined : dataFromDb.anticipo,
                    objetivoCitaTipo: dataFromDb.objetivoCitaTipo,
                    objetivoCitaFecha: dataFromDb.objetivoCitaFecha ? new Date(dataFromDb.objetivoCitaFecha) : undefined,
                    objetivoCitaServicioId: dataFromDb.objetivoCitaServicioId,
                    objetivoCitaUbicacion: dataFromDb.objetivoCitaUbicacion,
                    objetivoCitaDuracionMinutos: dataFromDb.objetivoCitaDuracionMinutos === null ? undefined : dataFromDb.objetivoCitaDuracionMinutos,
                    objetivoCitaLimiteConcurrencia: dataFromDb.objetivoCitaLimiteConcurrencia === null ? undefined : dataFromDb.objetivoCitaLimiteConcurrencia,
                    fechaInicio: dataFromDb.fechaInicio ? new Date(dataFromDb.fechaInicio) : new Date(),
                    fechaFin: dataFromDb.fechaFin ? new Date(dataFromDb.fechaFin) : new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
                    status: dataFromDb.status,
                });
                setRequiereAnticipo(!!dataFromDb.tipoAnticipo);
                setInitialDataLoaded(true);
            } else {
                setLoadError(ofertaResult.error || "No se pudieron cargar los datos de la oferta.");
                toast.error(ofertaResult.error || "Error cargando la oferta.");
            }
        } catch (err) {
            console.error("Error al cargar datos iniciales para edición de oferta:", err);
            setLoadError("Ocurrió un error inesperado al cargar la oferta.");
            toast.error("Error crítico al cargar la oferta.");
        } finally {
            setLoadingData(false);
        }
    }, [ofertaId, negocioId, reset]);

    useEffect(() => {
        if (!initialDataLoaded) {
            fetchInitialData();
        }
    }, [fetchInitialData, initialDataLoaded]);

    useEffect(() => {
        const currentTipoAnticipo = watch('tipoAnticipo');
        if (!requiereAnticipo || tipoPagoSeleccionado !== PrismaTipoPagoOfertaEnum.UNICO) {
            if (isDirty || currentTipoAnticipo !== null) setValue('tipoAnticipo', null, { shouldValidate: isDirty, shouldDirty: isDirty });
            if (isDirty || watch('porcentajeAnticipo') !== undefined) setValue('porcentajeAnticipo', undefined, { shouldValidate: isDirty, shouldDirty: isDirty });
            if (isDirty || watch('anticipo') !== undefined) setValue('anticipo', undefined, { shouldValidate: isDirty, shouldDirty: isDirty });
        } else {
            if (!currentTipoAnticipo && tipoPagoSeleccionado === PrismaTipoPagoOfertaEnum.UNICO) {
                setValue('tipoAnticipo', PrismaTipoAnticipoOfertaEnum.PORCENTAJE, { shouldDirty: true });
            }
        }
    }, [requiereAnticipo, tipoPagoSeleccionado, setValue, watch, isDirty]);

    useEffect(() => {
        if (tipoPagoSeleccionado === PrismaTipoPagoOfertaEnum.UNICO) {
            if (isDirty && watch('intervaloRecurrencia') !== null) {
                setValue('intervaloRecurrencia', null, { shouldValidate: true, shouldDirty: true });
            }
        } else if (tipoPagoSeleccionado === PrismaTipoPagoOfertaEnum.RECURRENTE) {
            if (requiereAnticipo) setRequiereAnticipo(false);
        }
    }, [tipoPagoSeleccionado, setValue, isDirty, requiereAnticipo, watch]);

    useEffect(() => {
        if (isDirty) {
            if (tipoAnticipoSeleccionado === PrismaTipoAnticipoOfertaEnum.PORCENTAJE) {
                if (watch('anticipo') !== undefined) setValue('anticipo', undefined, { shouldDirty: true });
            } else if (tipoAnticipoSeleccionado === PrismaTipoAnticipoOfertaEnum.MONTO_FIJO) {
                if (watch('porcentajeAnticipo') !== undefined) setValue('porcentajeAnticipo', undefined, { shouldDirty: true });
            } else if (!tipoAnticipoSeleccionado) {
                if (watch('porcentajeAnticipo') !== undefined) setValue('porcentajeAnticipo', undefined, { shouldValidate: true, shouldDirty: true });
                if (watch('anticipo') !== undefined) setValue('anticipo', undefined, { shouldValidate: true, shouldDirty: true });
            }
        }
    }, [tipoAnticipoSeleccionado, setValue, watch, isDirty]);

    useEffect(() => {
        if (!esObjetivoCita && isDirty) {
            setValue('objetivoCitaTipo', null, { shouldValidate: true, shouldDirty: true });
            setValue('objetivoCitaFecha', undefined, { shouldValidate: true, shouldDirty: true });
            setValue('objetivoCitaServicioId', null, { shouldValidate: true, shouldDirty: true });
            setValue('objetivoCitaUbicacion', null, { shouldValidate: true, shouldDirty: true });
            setValue('objetivoCitaDuracionMinutos', undefined, { shouldValidate: true, shouldDirty: true });
            setValue('objetivoCitaLimiteConcurrencia', undefined, { shouldValidate: true, shouldDirty: true });
        }
    }, [esObjetivoCita, setValue, isDirty]);

    useEffect(() => {
        if (esObjetivoCita && tipoObjetivoCitaSeleccionado !== PrismaObjetivoCitaTipoEnum.DIA_ESPECIFICO && isDirty) {
            setValue('objetivoCitaFecha', undefined, { shouldValidate: true, shouldDirty: true });
        }
    }, [esObjetivoCita, tipoObjetivoCitaSeleccionado, setValue, isDirty]);

    const onSubmitHandler: SubmitHandler<FormValues> = async (formDataFromHook) => {
        const loadingToastId = toast.loading("Actualizando oferta...");
        try {
            const result = await editarOfertaAction(ofertaId, clienteId, negocioId, formDataFromHook);
            toast.dismiss(loadingToastId);
            if (result.success && result.data) {
                toast.success(`Oferta "${result.data.nombre}" actualizada exitosamente.`);
                reset(result.data);
                if (onOfertaUpdated) {
                    onOfertaUpdated();
                }
            } else {
                const errorMsg = result.errorDetails
                    ? Object.values(result.errorDetails).flat().join('; ')
                    : result.error || "No se pudo actualizar la oferta.";
                toast.error(errorMsg);
                console.error("Error al actualizar la oferta:", result);
            }
        } catch (err) {
            toast.dismiss(loadingToastId);
            const errorMsg = err instanceof Error ? err.message : "Ocurrió un error inesperado al actualizar.";
            toast.error(errorMsg);
        }
    };

    const handleDeleteOferta = async () => {
        const nombreOfertaActual = watch('nombre') || "esta oferta";
        if (!window.confirm(`¿Estás seguro de que deseas eliminar la oferta "${nombreOfertaActual}"? Esta acción no se puede deshacer.`)) return;

        const loadingToastId = toast.loading("Eliminando oferta...");
        try {
            const result = await eliminarOferta(ofertaId, clienteId, negocioId); // Asumiendo que eliminarOferta solo necesita ofertaId
            toast.dismiss(loadingToastId);
            if (result.success) {
                toast.success("Oferta eliminada correctamente. Redirigiendo...");
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
            } else {
                toast.error(result.error || "No se pudo eliminar la oferta.");
            }
        } catch (err) {
            toast.dismiss(loadingToastId);
            const errorMsg = err instanceof Error ? err.message : "Ocurrió un error inesperado al eliminar.";
            toast.error(errorMsg);
        }
    };

    if (loadingData) return <div className="flex items-center justify-center p-10 min-h-[400px]"><Loader2 className='animate-spin h-10 w-10 text-blue-400' /><p className="ml-3 text-zinc-300 text-lg">Cargando datos de la oferta...</p></div>;
    if (loadError) return <div className="p-10 text-center text-red-400 bg-red-900/10 border border-red-600/40 rounded-lg"><AlertTriangle className="mx-auto h-10 w-10 mb-3 text-red-500" /><p className="font-semibold text-lg">Error al Cargar</p>{loadError}<Button variant="outline" onClick={fetchInitialData} className="mt-4">Reintentar</Button></div>;

    return (
        <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
            {/* --- SECCIONES DEL FORMULARIO --- */}
            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Info size={20} />Información General</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="nombre" className="text-sm">Nombre de la Oferta <span className="text-red-500">*</span></Label>
                        <Input id="nombre" {...register("nombre")} disabled={isSubmitting} className={errors.nombre ? 'border-red-500' : ''} />
                        {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="descripcion" className="text-sm">Descripción (Opcional)</Label>
                        <Textarea id="descripcion" {...register("descripcion")} rows={4} disabled={isSubmitting} />
                        {errors.descripcion && <p className="text-xs text-red-400 mt-1">{errors.descripcion.message}</p>}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><Target size={20} />Objetivos <span className="text-red-500">*</span></CardTitle>
                </CardHeader>
                <CardContent>
                    <Controller name="objetivos" control={control}
                        render={({ field }) => (
                            <div className="space-y-2">
                                {OBJETIVO_OPTIONS.map((option) => (
                                    <div key={option.id} className="flex items-center space-x-3">
                                        <Checkbox
                                            id={`edit-objetivo-${option.id}`}
                                            checked={Array.isArray(field.value) && field.value.includes(option.id)}
                                            onCheckedChange={(checked) => {
                                                const currentValues = Array.isArray(field.value) ? field.value : [];
                                                const newValues = checked === true
                                                    ? [...currentValues, option.id]
                                                    : currentValues.filter(v => v !== option.id);
                                                field.onChange(newValues);
                                            }}
                                            disabled={isSubmitting} />
                                        <Label htmlFor={`edit-objetivo-${option.id}`} className="font-normal text-sm text-zinc-200 cursor-pointer select-none">{option.label}</Label>
                                    </div>
                                ))}
                            </div>
                        )} />
                    {errors.objetivos && (
                        <p className="text-xs text-red-400 mt-1">
                            {errors.objetivos.message ||
                                (typeof errors.objetivos === 'object' &&
                                    errors.objetivos !== null &&
                                    'root' in errors.objetivos &&
                                    typeof (errors.objetivos as { root?: { message?: string } }).root?.message === 'string'
                                    ? (errors.objetivos as { root?: { message?: string } }).root?.message
                                    : null)}
                        </p>
                    )}
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><DollarSign size={20} />Precio y Tipo de Pago</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="tipoPago" className="text-sm">Tipo de Pago <span className="text-red-500">*</span></Label>
                            <Controller name="tipoPago" control={control} render={({ field }) => (
                                <Select onValueChange={(value) => { field.onChange(value as PrismaTipoPagoOfertaEnum); if (value === PrismaTipoPagoOfertaEnum.RECURRENTE) setRequiereAnticipo(false); }} value={field.value || undefined} disabled={isSubmitting}>
                                    <SelectTrigger className={errors.tipoPago ? 'border-red-500' : ''}><SelectValue placeholder="Selecciona tipo de pago..." /></SelectTrigger>
                                    <SelectContent>{TIPO_PAGO_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                </Select>
                            )} />
                            {errors.tipoPago && <p className="text-xs text-red-400 mt-1">{errors.tipoPago.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="precio" className="text-sm">{tipoPagoSeleccionado === PrismaTipoPagoOfertaEnum.RECURRENTE ? 'Precio por Intervalo' : 'Precio Total'} (Opcional)</Label>
                            <Input type="number" id="precio" {...register("precio", { setValueAs: v => (v === "" || v === null || v === undefined || isNaN(parseFloat(v))) ? undefined : parseFloat(v) })} placeholder="0.00" step="0.01" min="0" disabled={isSubmitting} className={errors.precio ? 'border-red-500' : ''} />
                            {errors.precio && <p className="text-xs text-red-400 mt-1">{errors.precio.message}</p>}
                        </div>
                    </div>
                    {tipoPagoSeleccionado === PrismaTipoPagoOfertaEnum.RECURRENTE && (
                        <div className="mt-4">
                            <Label htmlFor="intervaloRecurrencia" className="text-sm">Intervalo de Recurrencia <span className="text-red-500">*</span></Label>
                            <Controller name="intervaloRecurrencia" control={control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isSubmitting}>
                                    <SelectTrigger className={errors.intervaloRecurrencia ? 'border-red-500' : ''}><SelectValue placeholder="Selecciona intervalo..." /></SelectTrigger>
                                    <SelectContent>{INTERVALO_RECURRENCIA_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                </Select>
                            )} />
                            {errors.intervaloRecurrencia && <p className="text-xs text-red-400 mt-1">{errors.intervaloRecurrencia.message}</p>}
                        </div>
                    )}
                    {tipoPagoSeleccionado === PrismaTipoPagoOfertaEnum.UNICO && (
                        <div className="space-y-4 mt-4 pt-4 border-t border-zinc-700/50">
                            <div className="flex items-center space-x-3">
                                <Switch id="requiereAnticipoSwitch" checked={requiereAnticipo} onCheckedChange={setRequiereAnticipo} disabled={isSubmitting} />
                                <Label htmlFor="requiereAnticipoSwitch" className="text-sm text-zinc-200 cursor-pointer select-none">¿Requiere Anticipo?</Label>
                            </div>
                            {requiereAnticipo && (
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-3 border-l-2 border-blue-500/30 ml-1 pt-2">
                                    <div>
                                        <Label htmlFor="tipoAnticipo" className="text-sm">Tipo de Anticipo <span className="text-red-500">*</span></Label>
                                        <Controller name="tipoAnticipo" control={control} render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isSubmitting}>
                                                <SelectTrigger className={errors.tipoAnticipo ? 'border-red-500' : ''}><SelectValue placeholder="Selecciona tipo..." /></SelectTrigger>
                                                <SelectContent>{TIPO_ANTICIPO_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        )} />
                                        {errors.tipoAnticipo && <p className="text-xs text-red-400 mt-1">{errors.tipoAnticipo.message}</p>}
                                    </div>
                                    {tipoAnticipoSeleccionado === PrismaTipoAnticipoOfertaEnum.PORCENTAJE && (
                                        <div>
                                            <Label htmlFor="porcentajeAnticipo" className="text-sm">Porcentaje (%) <span className="text-red-500">*</span></Label>
                                            <div className="relative">
                                                <Percent size={14} className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                <Input type="number" id="porcentajeAnticipo" {...register("porcentajeAnticipo", { setValueAs: v => (v === "" || v === null || v === undefined || isNaN(parseFloat(v))) ? undefined : parseFloat(v) })} placeholder="Ej: 20" step="1" min="1" max="99" disabled={isSubmitting} className={`pl-8 ${errors.porcentajeAnticipo ? 'border-red-500' : ''}`} />
                                            </div>
                                            {errors.porcentajeAnticipo && <p className="text-xs text-red-400 mt-1">{errors.porcentajeAnticipo.message}</p>}
                                        </div>
                                    )}
                                    {tipoAnticipoSeleccionado === PrismaTipoAnticipoOfertaEnum.MONTO_FIJO && (
                                        <div>
                                            <Label htmlFor="anticipo" className="text-sm">Monto Fijo ($) <span className="text-red-500">*</span></Label>
                                            <div className="relative">
                                                <HandCoins size={14} className="text-zinc-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                                                <Input type="number" id="anticipo" {...register("anticipo", { setValueAs: v => (v === "" || v === null || v === undefined || isNaN(parseFloat(v))) ? undefined : parseFloat(v) })} placeholder="Ej: 50.00" step="0.01" min="0" disabled={isSubmitting} className={`pl-8 ${errors.anticipo ? 'border-red-500' : ''}`} />
                                            </div>
                                            {errors.anticipo && <p className="text-xs text-red-400 mt-1">{errors.anticipo.message}</p>}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}
                </CardContent>
            </Card>

            {esObjetivoCita && (
                <Card>
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2"><ListVideo size={20} />Configuración para Citas</CardTitle>
                        <CardDescription>Define los detalles si esta oferta es para agendar citas.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="objetivoCitaTipo" className="text-sm">Tipo de Cita de Oferta <span className="text-red-500">*</span></Label>
                                <Controller name="objetivoCitaTipo" control={control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isSubmitting}>
                                        <SelectTrigger className={errors.objetivoCitaTipo ? 'border-red-500' : ''}><SelectValue placeholder="Selecciona tipo..." /></SelectTrigger>
                                        <SelectContent>{OBJETIVO_CITA_TIPO_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                )} />
                                {errors.objetivoCitaTipo && <p className="text-xs text-red-400 mt-1">{errors.objetivoCitaTipo.message}</p>}
                            </div>
                            {tipoObjetivoCitaSeleccionado === PrismaObjetivoCitaTipoEnum.DIA_ESPECIFICO && (
                                <div>
                                    <Label htmlFor="objetivoCitaFecha" className="text-sm">Fecha y Hora del Evento <span className="text-red-500">*</span></Label>
                                    <Controller name="objetivoCitaFecha" control={control}
                                        render={({ field }) => (<Input type="datetime-local" id="objetivoCitaFecha"
                                            value={dateTimeToInputFormat(field.value)}
                                            onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)}
                                            disabled={isSubmitting}
                                            className={errors.objetivoCitaFecha ? 'border-red-500' : ''} />)} />
                                    {errors.objetivoCitaFecha && <p className="text-xs text-red-400 mt-1">{errors.objetivoCitaFecha.message}</p>}
                                </div>
                            )}
                        </div>
                        <div>
                            <Label htmlFor="objetivoCitaServicioId" className="text-sm">Servicio Específico Vinculado (Opcional)</Label>
                            <Controller name="objetivoCitaServicioId" control={control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value ?? ""} disabled={isSubmitting || serviciosCita.length === 0}>
                                    <SelectTrigger className={errors.objetivoCitaServicioId ? 'border-red-500' : ''}><SelectValue placeholder={serviciosCita.length === 0 ? "No hay servicios de cita configurados" : "Vincular a un servicio..."} /></SelectTrigger>
                                    <SelectContent>
                                        {/* <SelectItem value="">(Ninguno)</SelectItem> */} {/* QUITAR ESTO PARA EVITAR EL ERROR */}
                                        {serviciosCita.map(s => <SelectItem key={s.id} value={s.id}>{s.nombre} {s.duracionMinutos ? `(${s.duracionMinutos} min)` : ''}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )} />
                            <p className="text-xs text-zinc-400 mt-1">Si se selecciona, se usarán la duración y concurrencia del servicio.</p>
                            {errors.objetivoCitaServicioId && <p className="text-xs text-red-400 mt-1">{errors.objetivoCitaServicioId.message}</p>}
                        </div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
                            <div>
                                <Label htmlFor="objetivoCitaUbicacion" className="text-sm">Ubicación/Enlace Cita (Opcional)</Label>
                                <Input id="objetivoCitaUbicacion" {...register("objetivoCitaUbicacion")} placeholder="Ej: Salón Magnolia / Enlace Zoom" disabled={isSubmitting} />
                                {errors.objetivoCitaUbicacion && <p className="text-xs text-red-400 mt-1">{errors.objetivoCitaUbicacion.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="objetivoCitaDuracionMinutos" className="text-sm">Duración en Minutos (Opcional)</Label>
                                <Input type="number" id="objetivoCitaDuracionMinutos" {...register("objetivoCitaDuracionMinutos", { setValueAs: v => (v === "" || v === null || v === undefined || isNaN(parseInt(v))) ? undefined : parseInt(v) })} placeholder="Ej: 90 (sobrescribe servicio)" step="1" min="1" disabled={isSubmitting} />
                                {errors.objetivoCitaDuracionMinutos && <p className="text-xs text-red-400 mt-1">{errors.objetivoCitaDuracionMinutos.message}</p>}
                            </div>
                        </div>
                        <div>
                            <Label htmlFor="objetivoCitaLimiteConcurrencia" className="text-sm">Límite de Asistentes (Opcional)</Label>
                            <Input type="number" id="objetivoCitaLimiteConcurrencia" {...register("objetivoCitaLimiteConcurrencia", { setValueAs: v => (v === "" || v === null || v === undefined || isNaN(parseInt(v))) ? undefined : parseInt(v) })} placeholder="Ej: 50 (sobrescribe servicio)" step="1" min="1" disabled={isSubmitting} />
                            {errors.objetivoCitaLimiteConcurrencia && <p className="text-xs text-red-400 mt-1">{errors.objetivoCitaLimiteConcurrencia.message}</p>}
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2"><CalendarDays size={20} />Vigencia y Estado</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div>
                            <Label htmlFor="fechaInicio" className="text-sm">Fecha Inicio <span className="text-red-500">*</span></Label>
                            <Controller name="fechaInicio" control={control}
                                render={({ field }) => (<Input type="date" id="fechaInicio"
                                    value={dateToInputFormat(field.value)}
                                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + "T00:00:00.000Z") : null)}
                                    required disabled={isSubmitting}
                                    className={errors.fechaInicio ? 'border-red-500' : ''} />)} />
                            {errors.fechaInicio && <p className="text-xs text-red-400 mt-1">{errors.fechaInicio.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="fechaFin" className="text-sm">Fecha Fin <span className="text-red-500">*</span></Label>
                            <Controller name="fechaFin" control={control}
                                render={({ field }) => (<Input type="date" id="fechaFin"
                                    value={dateToInputFormat(field.value)}
                                    onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + "T00:00:00.000Z") : null)}
                                    required disabled={isSubmitting}
                                    min={dateToInputFormat(watch('fechaInicio'))}
                                    className={errors.fechaFin ? 'border-red-500' : ''} />)} />
                            {errors.fechaFin && <p className="text-xs text-red-400 mt-1">{errors.fechaFin.message}</p>}
                        </div>
                    </div>
                    <div>
                        <Label htmlFor="status" className="text-sm">Estado de la Oferta <span className="text-red-500">*</span></Label>
                        <Controller name="status" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                                <SelectTrigger className={errors.status ? 'border-red-500' : ''}><SelectValue placeholder="Selecciona estado..." /></SelectTrigger>
                                <SelectContent>{STATUS_OFERTA_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                            </Select>
                        )} />
                        {errors.status && <p className="text-xs text-red-400 mt-1">{errors.status.message}</p>}
                    </div>
                </CardContent>
            </Card>

            <div className="mt-8 pt-6 border-t border-zinc-700 flex flex-col-reverse sm:flex-row sm:items-center sm:justify-end gap-3">
                <Button
                    type="button"
                    variant="destructiveOutline" // Ajusta a tu variante de shadcn/ui si es diferente
                    className="w-full sm:w-auto sm:mr-auto"
                    onClick={handleDeleteOferta}
                    disabled={isSubmitting}
                    size="sm"
                >
                    <Trash2 size={16} className="mr-1.5" /> Eliminar Oferta
                </Button>
                <div className="flex flex-col-reverse sm:flex-row items-center gap-3 w-full sm:w-auto">
                    <Button type="button" variant="outline" size="sm" className="w-full sm:w-auto" onClick={() => router.back()} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" size="sm" className="w-full sm:w-auto min-w-[160px]" disabled={isSubmitting || !isDirty}>
                        {isSubmitting ? <Loader2 className="animate-spin mr-2 h-4 w-4" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </div>
            </div>
        </form>
    );
}

