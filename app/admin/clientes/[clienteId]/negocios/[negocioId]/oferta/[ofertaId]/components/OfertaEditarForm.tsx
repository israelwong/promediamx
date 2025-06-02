'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
    obtenerOfertaParaEdicionAction, // Usar esta nueva action
    editarOfertaAction, // Usar esta nueva action (o el nombre que le diste)
    eliminarOferta
} from '@/app/admin/_lib/actions/oferta/oferta.actions';
import {
    EditarOfertaInputSchema,
    type EditarOfertaDataInputType,
    type OfertaParaEditarFormType, // Para el tipo de initialData
    TipoPagoOfertaEnumSchema,
    IntervaloRecurrenciaOfertaEnumSchema,
    OfertaStatusEnumSchema,
    ObjetivoOfertaZodEnum,
    TipoAnticipoOfertaZodEnum,
    type ObjetivoOfertaZodEnumType,
} from '@/app/admin/_lib/actions/oferta/oferta.schemas';
// import { ActionResult } from '@/app/admin/_lib/types';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Switch } from '@/app/components/ui/switch';
import { toast } from 'react-hot-toast';
import { Loader2, Save, Info, DollarSign, CalendarDays, Target, Percent, HandCoins, AlertTriangle, Trash2 } from 'lucide-react';
// No necesitamos Card aquí, ya que este form irá dentro de una pestaña del OfertaEditarManager que ya es un Card.

interface Props {
    ofertaId: string;
    negocioId: string;
    clienteId: string;
    // initialData se cargará aquí mismo
}

type FormValues = z.infer<typeof EditarOfertaInputSchema>;

// Opciones para Selects (como en OfertaNuevaForm)
const TIPO_PAGO_OPTIONS = Object.values(TipoPagoOfertaEnumSchema.Values).map(value => ({ value, label: value === 'UNICO' ? 'Pago Único' : 'Pago Recurrente' }));
const INTERVALO_RECURRENCIA_OPTIONS = Object.values(IntervaloRecurrenciaOfertaEnumSchema.Values).map(value => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase() }));
const STATUS_OFERTA_OPTIONS = Object.values(OfertaStatusEnumSchema.Values).map(value => ({ value, label: value.charAt(0).toUpperCase() + value.slice(1).toLowerCase() }));
const OBJETIVO_OPTIONS: { id: ObjetivoOfertaZodEnumType; label: string }[] = [
    { id: ObjetivoOfertaZodEnum.Values.CITA, label: 'Agendar Citas / Reservas' },
    { id: ObjetivoOfertaZodEnum.Values.VENTA, label: 'Generar Ventas Directas' },
];
const TIPO_ANTICIPO_OPTIONS = [
    { value: TipoAnticipoOfertaZodEnum.Values.PORCENTAJE, label: 'Porcentaje (%)' },
    { value: TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO, label: 'Monto Fijo ($)' },
];

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


export default function OfertaEditarForm({ ofertaId, negocioId, clienteId }: Props) {
    const router = useRouter();
    const [initialData, setInitialData] = useState<OfertaParaEditarFormType | null>(null);
    const [loadingData, setLoadingData] = useState(true);
    const [loadError, setLoadError] = useState<string | null>(null);
    const [requiereAnticipo, setRequiereAnticipo] = useState(false);


    const {
        control,
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting, isDirty }, // isDirty para saber si hay cambios
    } = useForm<FormValues>({
        resolver: zodResolver(EditarOfertaInputSchema),
        defaultValues: { // Se poblarán desde initialData en useEffect
            nombre: '',
            descripcion: null,
            // codigo: null, // Si se añade 'codigo' al schema
            precio: null,
            tipoPago: TipoPagoOfertaEnumSchema.Values.UNICO,
            intervaloRecurrencia: null,
            objetivos: [ObjetivoOfertaZodEnum.Values.VENTA],
            tipoAnticipo: null,
            porcentajeAnticipo: null, // Input para %
            anticipo: null,           // Input para monto fijo
            fechaInicio: new Date(),
            fechaFin: new Date(),
            status: OfertaStatusEnumSchema.Values.borrador,
        },
    });

    const tipoPagoSeleccionado = watch('tipoPago');
    const tipoAnticipoSeleccionado = watch('tipoAnticipo');
    const fechaInicioSeleccionada = watch('fechaInicio');

    const fetchOfertaData = useCallback(async () => {
        setLoadingData(true); setLoadError(null);
        const result = await obtenerOfertaParaEdicionAction(ofertaId, negocioId);
        if (result.success && result.data) {
            const dataFromDb = result.data;
            setInitialData(dataFromDb);
            // Mapear los datos de la DB al estado del formulario
            // El 'anticipo' de la DB (monto calculado o fijo) debe mapearse a 'valorAnticipo' del form si es MONTO_FIJO
            // o a 'porcentajeAnticipo' si es PORCENTAJE.

            reset({
                nombre: dataFromDb.nombre,
                descripcion: dataFromDb.descripcion,
                // codigo: dataFromDb.codigo,
                precio: dataFromDb.precio,
                tipoPago: dataFromDb.tipoPago,
                intervaloRecurrencia: dataFromDb.intervaloRecurrencia,
                objetivos: dataFromDb.objetivos,
                tipoAnticipo: dataFromDb.tipoAnticipo,
                porcentajeAnticipo: dataFromDb.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.PORCENTAJE ? (dataFromDb.porcentajeAnticipo ?? null) : null,
                anticipo: dataFromDb.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO ? (dataFromDb.anticipo ?? null) : null,
                fechaInicio: new Date(dataFromDb.fechaInicio), // Asegurar que sean Date objects
                fechaFin: new Date(dataFromDb.fechaFin),
                status: dataFromDb.status,
            });
            setRequiereAnticipo(!!dataFromDb.tipoAnticipo); // Activar switch si hay tipoAnticipo
        } else {
            setLoadError(result.error || "No se pudieron cargar los datos de la oferta.");
            toast.error(result.error || "Error cargando oferta.");
        }
        setLoadingData(false);
    }, [ofertaId, negocioId, reset]);

    useEffect(() => {
        fetchOfertaData();
    }, [fetchOfertaData]);

    // Efectos para limpiar campos condicionales (similar a OfertaNuevaForm)
    useEffect(() => {
        if (!requiereAnticipo || tipoPagoSeleccionado === TipoPagoOfertaEnumSchema.Values.RECURRENTE) {
            setValue('tipoAnticipo', null, { shouldValidate: true, shouldDirty: true });
            setValue('porcentajeAnticipo', null, { shouldValidate: true, shouldDirty: true });
            setValue('anticipo', null, { shouldValidate: true, shouldDirty: true });
        } else {
            // Si se activa requiereAnticipo y no hay tipo, poner uno por defecto
            if (!watch('tipoAnticipo')) {
                setValue('tipoAnticipo', TipoAnticipoOfertaZodEnum.Values.PORCENTAJE, { shouldDirty: true });
            }
        }
    }, [requiereAnticipo, tipoPagoSeleccionado, setValue, watch]);

    useEffect(() => {
        if (tipoPagoSeleccionado === TipoPagoOfertaEnumSchema.Values.UNICO) {
            setValue('intervaloRecurrencia', null, { shouldValidate: true, shouldDirty: true });
        } else if (tipoPagoSeleccionado === TipoPagoOfertaEnumSchema.Values.RECURRENTE) {
            setRequiereAnticipo(false); // Los recurrentes no tendrán este tipo de anticipo en este form
        }
    }, [tipoPagoSeleccionado, setValue]);

    useEffect(() => {
        // Si se cambia el tipo de anticipo, limpiar el valor del otro tipo
        if (tipoAnticipoSeleccionado === TipoAnticipoOfertaZodEnum.Values.PORCENTAJE) {
            setValue('anticipo', null, { shouldDirty: true });
        } else if (tipoAnticipoSeleccionado === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO) {
            setValue('porcentajeAnticipo', null, { shouldDirty: true });
        }
    }, [tipoAnticipoSeleccionado, setValue]);


    const onSubmitHandler: SubmitHandler<FormValues> = async (data) => {
        const loadingToast = toast.loading("Actualizando oferta...");
        try {
            // Preparar el payload para la action de edición
            // La 'data' ya está validada por Zod.
            // La action 'editarOfertaAction' se encargará de calcular el 'anticipo' final para la DB.
            const dataToSend: EditarOfertaDataInputType = {
                ...data,
                // Los campos de anticipo se envían tal cual, la action los procesa
                // Asegurar que 'intervaloRecurrencia' sea null si no es RECURRENTE
                intervaloRecurrencia: data.tipoPago === TipoPagoOfertaEnumSchema.Values.RECURRENTE ? data.intervaloRecurrencia : null,
                // Asegurar que los campos de anticipo se limpien si no aplica
                tipoAnticipo: (requiereAnticipo && data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO) ? data.tipoAnticipo : null,
                porcentajeAnticipo: (requiereAnticipo && data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO && data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.PORCENTAJE) ? data.porcentajeAnticipo : null,
                anticipo: (requiereAnticipo && data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO && data.tipoAnticipo === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO) ? data.anticipo : null,
            };

            const result = await editarOfertaAction(ofertaId, clienteId, negocioId, dataToSend);

            toast.dismiss(loadingToast);
            if (result.success && result.data) {
                toast.success(`Oferta "${result.data.nombre}" actualizada.`);
                setInitialData(result.data); // Actualizar los datos base del formulario
                reset(result.data as DefaultValues<FormValues>); // Resetea el form con los nuevos datos, marcándolo como no 'dirty'
                router.refresh(); // Revalida la data del servidor para la página
            } else {
                const errorMsg = result.errorDetails
                    ? Object.values(result.errorDetails).flat().join('; ')
                    : result.error || "No se pudo actualizar la oferta.";
                toast.error(errorMsg);
                console.error("Error updating offer:", result);
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
            console.error("Submit error:", err);
        }
    };

    if (loadingData) return <div className="flex items-center justify-center p-10 min-h-[300px]"><Loader2 className='animate-spin h-8 w-8 text-blue-400' /><p className="ml-3 text-zinc-300">Cargando datos...</p></div>;
    if (loadError) return <div className="p-10 text-center text-red-400"><AlertTriangle className="mx-auto h-8 w-8 mb-2" />Error al cargar: {loadError}</div>;
    if (!initialData) return <div className="p-10 text-center text-zinc-400">No se encontró la oferta.</div>;

    const handleDeleteOferta = async () => {
        if (!window.confirm("¿Estás seguro de que deseas eliminar esta oferta? Esta acción no se puede deshacer.")) return;
        const loadingToast = toast.loading("Eliminando oferta...");
        try {
            const result = await eliminarOferta(ofertaId, clienteId, negocioId);
            toast.dismiss(loadingToast);
            if (result.success) {
                toast.success("Oferta eliminada correctamente.");
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
            } else {
                toast.error(result.error || "No se pudo eliminar la oferta.");
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        }
    };


    return (
        // El Card exterior lo pondrá el OfertaEditarManager en su pestaña
        <form onSubmit={handleSubmit(onSubmitHandler)} className="space-y-6">
            {/* Secciones del formulario (Información General, Objetivos, Precio y Pago, Vigencia y Estado) */}
            {/* Similar al OfertaNuevaForm, pero usando register y Controller con los datos cargados */}

            {/* Sección Información General */}
            <section className="space-y-4 p-4 bg-zinc-800/30 rounded-md border border-zinc-700/50">
                <h3 className="text-md font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-700 pb-2 mb-4">
                    <Info size={18} className="text-blue-400" /> Información General
                </h3>
                <div>
                    <Label htmlFor="nombre" className="text-sm">Nombre de la Oferta <span className="text-red-500">*</span></Label>
                    <Input id="nombre" {...register("nombre")} disabled={isSubmitting} />
                    {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
                </div>
                <div>
                    <Label htmlFor="descripcion" className="text-sm">Descripción Breve (Opcional)</Label>
                    <Textarea id="descripcion" {...register("descripcion")} rows={3} disabled={isSubmitting} />
                    {errors.descripcion && <p className="text-xs text-red-400 mt-1">{errors.descripcion.message}</p>}
                </div>
                {/* Si decides añadir 'codigo' para edición:
                <div>
                    <Label htmlFor="codigo" className="text-sm">Código Promocional (Opcional)</Label>
                    <Input id="codigo" {...register("codigo")} disabled={isSubmitting} className="font-mono uppercase"/>
                    {errors.codigo && <p className="text-xs text-red-400 mt-1">{errors.codigo.message}</p>}
                </div>
                */}
            </section>

            {/* Sección Objetivos */}
            <section className="space-y-3 p-4 bg-zinc-800/30 rounded-md border border-zinc-700/50">
                <h3 className="text-md font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-700 pb-2 mb-4">
                    <Target size={18} className="text-pink-400" /> Objetivos de la Oferta <span className="text-red-500">*</span>
                </h3>
                <Controller
                    name="objetivos" control={control}
                    render={({ field }) => (
                        <div className="space-y-2">
                            {OBJETIVO_OPTIONS.map((option) => (
                                <div key={option.id} className="flex items-center space-x-2">
                                    <Checkbox id={`objetivo-${option.id}`} checked={Array.isArray(field.value) && field.value.includes(option.id)}
                                        onCheckedChange={(checked) => {
                                            const currentValues = Array.isArray(field.value) ? field.value : [];
                                            const newValues = checked ? [...currentValues, option.id] : currentValues.filter(v => v !== option.id);
                                            field.onChange(newValues);
                                        }}
                                        disabled={isSubmitting} />
                                    <Label htmlFor={`objetivo-${option.id}`} className="font-normal text-sm text-zinc-200 cursor-pointer">{option.label}</Label>
                                </div>
                            ))}
                        </div>
                    )} />
                {errors.objetivos && <p className="text-xs text-red-400 mt-1">{typeof errors.objetivos.message === 'string' ? errors.objetivos.message : 'Error en objetivos'}</p>}
            </section>

            {/* Sección Precio y Pago */}
            <section className="space-y-4 p-4 bg-zinc-800/30 rounded-md border border-zinc-700/50">
                <h3 className="text-md font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-700 pb-2 mb-4">
                    <DollarSign size={18} className="text-green-400" /> Precio y Pago
                </h3>
                <div>
                    <Label htmlFor="tipoPago" className="text-sm">Tipo de Pago <span className="text-red-500">*</span></Label>
                    <Controller name="tipoPago" control={control} render={({ field }) => (
                        <Select onValueChange={(value) => { field.onChange(value); if (value === 'RECURRENTE') setRequiereAnticipo(false); }} value={field.value} disabled={isSubmitting}>
                            <SelectTrigger><SelectValue placeholder="Selecciona tipo..." /></SelectTrigger>
                            <SelectContent>{TIPO_PAGO_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                    )} />
                    {errors.tipoPago && <p className="text-xs text-red-400 mt-1">{errors.tipoPago.message}</p>}
                </div>
                <div>
                    <Label htmlFor="precio" className="text-sm">{tipoPagoSeleccionado === 'RECURRENTE' ? 'Precio por Intervalo' : 'Precio Total'} (Opcional)</Label>
                    <Input type="number" id="precio" {...register("precio", { setValueAs: v => v === "" || v === null || v === undefined ? null : parseFloat(v) })} placeholder="0.00" step="0.01" min="0" disabled={isSubmitting} />
                    {errors.precio && <p className="text-xs text-red-400 mt-1">{errors.precio.message}</p>}
                </div>
                {tipoPagoSeleccionado === 'RECURRENTE' && (
                    <div>
                        <Label htmlFor="intervaloRecurrencia" className="text-sm">Intervalo de Recurrencia <span className="text-red-500">*</span></Label>
                        <Controller name="intervaloRecurrencia" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={isSubmitting}>
                                <SelectTrigger><SelectValue placeholder="Selecciona intervalo..." /></SelectTrigger>
                                <SelectContent>{INTERVALO_RECURRENCIA_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                            </Select>
                        )} />
                        {errors.intervaloRecurrencia && <p className="text-xs text-red-400 mt-1">{errors.intervaloRecurrencia.message}</p>}
                    </div>
                )}
                {tipoPagoSeleccionado === 'UNICO' && (
                    <div className="space-y-4 mt-4 pt-4 border-t border-zinc-700/50">
                        <div className="flex items-center space-x-2">
                            <Switch id="requiereAnticipoSwitchEditar" checked={requiereAnticipo} onCheckedChange={setRequiereAnticipo} disabled={isSubmitting} />
                            <Label htmlFor="requiereAnticipoSwitchEditar" className="text-sm text-zinc-200">¿Requiere Anticipo?</Label>
                        </div>
                        {requiereAnticipo && (
                            <>
                                <div>
                                    <Label htmlFor="tipoAnticipo" className="text-sm">Tipo de Anticipo <span className="text-red-500">*</span></Label>
                                    <Controller name="tipoAnticipo" control={control} render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={isSubmitting}>
                                            <SelectTrigger><SelectValue placeholder="Selecciona tipo..." /></SelectTrigger>
                                            <SelectContent>{TIPO_ANTICIPO_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                                        </Select>
                                    )} />
                                    {errors.tipoAnticipo && <p className="text-xs text-red-400 mt-1">{errors.tipoAnticipo.message}</p>}
                                </div>
                                {/* El campo 'anticipo' en Zod/DB guardará el monto. 'porcentajeAnticipo' en Zod/DB guardará el %.
                                    El form usa 'anticipo' para el input de monto fijo, y 'porcentajeAnticipo' para el input de porcentaje.
                                */}
                                {tipoAnticipoSeleccionado === TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO && (
                                    <div>
                                        <Label htmlFor="anticipoMontoFijo" className="text-sm">Monto Fijo de Anticipo ($) <span className="text-red-500">*</span></Label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><HandCoins size={14} className="text-zinc-400" /></div>
                                            <Input type="number" id="anticipoMontoFijo" {...register("anticipo", { setValueAs: v => v === "" || v === null || v === undefined ? null : parseFloat(v) })} placeholder="Ej: 50.00" step="0.01" min="0" disabled={isSubmitting} className="pl-9" />
                                        </div>
                                        {errors.anticipo && <p className="text-xs text-red-400 mt-1">{errors.anticipo.message}</p>}
                                    </div>
                                )}
                                {tipoAnticipoSeleccionado === TipoAnticipoOfertaZodEnum.Values.PORCENTAJE && (
                                    <div>
                                        <Label htmlFor="porcentajeAnticipo" className="text-sm">Porcentaje de Anticipo (%) <span className="text-red-500">*</span></Label>
                                        <div className="relative">
                                            <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3"><Percent size={14} className="text-zinc-400" /></div>
                                            <Input type="number" id="porcentajeAnticipo" {...register("porcentajeAnticipo", { setValueAs: v => v === "" || v === null || v === undefined ? null : parseFloat(v) })} placeholder="Ej: 20 (para 20%)" step="1" min="1" max="99" disabled={isSubmitting} className="pl-9" />
                                        </div>
                                        {errors.porcentajeAnticipo && <p className="text-xs text-red-400 mt-1">{errors.porcentajeAnticipo.message}</p>}
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </section>

            {/* Vigencia y Estado */}
            <section className="space-y-4 p-4 bg-zinc-800/30 rounded-md border border-zinc-700/50">
                <h3 className="text-md font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-700 pb-2 mb-4">
                    <CalendarDays size={18} className="text-purple-400" /> Vigencia y Estado
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                        <Label htmlFor="fechaInicio" className="text-sm">Fecha Inicio <span className="text-red-500">*</span></Label>
                        <Controller name="fechaInicio" control={control}
                            render={({ field }) => (<Input type="date" id="fechaInicio" value={dateToInputFormat(field.value)}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + "T00:00:00Z") : null)}
                                required disabled={isSubmitting} />)} />
                        {errors.fechaInicio && <p className="text-xs text-red-400 mt-1">{errors.fechaInicio.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="fechaFin" className="text-sm">Fecha Fin <span className="text-red-500">*</span></Label>
                        <Controller name="fechaFin" control={control}
                            render={({ field }) => (<Input type="date" id="fechaFin" value={dateToInputFormat(field.value)}
                                onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value + "T00:00:00Z") : null)}
                                required disabled={isSubmitting} min={dateToInputFormat(fechaInicioSeleccionada)} />)} />
                        {errors.fechaFin && <p className="text-xs text-red-400 mt-1">{errors.fechaFin.message}</p>}
                    </div>
                </div>
                <div>
                    <Label htmlFor="status" className="text-sm">Estado de la Oferta <span className="text-red-500">*</span></Label>
                    <Controller name="status" control={control} render={({ field }) => (
                        <Select onValueChange={field.onChange} value={field.value} disabled={isSubmitting}>
                            <SelectTrigger><SelectValue placeholder="Selecciona estado..." /></SelectTrigger>
                            <SelectContent>{STATUS_OFERTA_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}</SelectContent>
                        </Select>
                    )} />
                    {errors.status && <p className="text-xs text-red-400 mt-1">{errors.status.message}</p>}
                </div>
            </section>

            <div className="flex justify-end items-center gap-3 pt-6 mt-6 border-t border-zinc-700">
                {/* El botón de eliminar podría estar en la CardFooter del OfertaEditarManager si prefieres */}
                <Button type="button" variant="destructive" onClick={handleDeleteOferta} disabled={isSubmitting}>
                    <Trash2 size={16} className="mr-1.5" /> Eliminar Oferta
                </Button>
                <Button type="button" variant="secondary" onClick={() => router.back()} disabled={isSubmitting}>
                    Cerrar Ventana
                </Button>
                <Button type="submit" disabled={isSubmitting || !isDirty} className="min-w-[150px]">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                    Guardar Cambios
                </Button>
            </div>
        </form>
    );
}