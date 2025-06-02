'use client';

import React, { useState } from 'react'; // Quitado useEffect si no se usa para reset
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import { crearOfertaAction } from '@/app/admin/_lib/actions/oferta/oferta.actions'; // Cambiar nombre si renombraste la action
import {
    CrearOfertaSimplificadoInputSchema,
    type CrearOfertaSimplificadoDataInputType,
    TipoPagoOfertaEnumSchema,
    IntervaloRecurrenciaOfertaEnumSchema,
    ObjetivoOfertaZodEnum,
    TipoAnticipoOfertaZodEnum, // Importar enum de tipo de anticipo
    type ObjetivoOfertaZodEnumType,
} from '@/app/admin/_lib/actions/oferta/oferta.schemas';
import { ActionResult } from '@/app/admin/_lib/types';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Switch } from '@/app/components/ui/switch'; // Para el toggle de "Requiere Anticipo"
import { toast } from 'react-hot-toast';
import { Loader2, Save, ArrowLeft, TicketPlus, Info, DollarSign, Percent, HandCoins, Target } from 'lucide-react'; // Iconos nuevos
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/app/components/ui/card';

interface Props {
    clienteId: string;
    negocioId: string;
}

type FormValues = z.infer<typeof CrearOfertaSimplificadoInputSchema>;

const TIPO_PAGO_OPTIONS = Object.values(TipoPagoOfertaEnumSchema.Values).map(value => ({ value, label: value === 'UNICO' ? 'Pago Único' : 'Pago Recurrente' }));
const INTERVALO_RECURRENCIA_OPTIONS = Object.values(IntervaloRecurrenciaOfertaEnumSchema.Values).map(value => ({ value, label: value.charAt(0) + value.slice(1).toLowerCase() }));
const OBJETIVO_OPTIONS: { id: ObjetivoOfertaZodEnumType; label: string }[] = [
    { id: ObjetivoOfertaZodEnum.Values.CITA, label: 'Agendar Citas / Reservas' },
    { id: ObjetivoOfertaZodEnum.Values.VENTA, label: 'Generar Ventas Directas' },
];
const TIPO_ANTICIPO_OPTIONS = [
    { value: TipoAnticipoOfertaZodEnum.Values.PORCENTAJE, label: 'Porcentaje (%)' },
    { value: TipoAnticipoOfertaZodEnum.Values.MONTO_FIJO, label: 'Monto Fijo ($)' },
];

export default function OfertaNuevaForm({ clienteId, negocioId }: Props) {
    const router = useRouter();

    // Estado local para manejar la visibilidad de los campos de anticipo
    const [requiereAnticipo, setRequiereAnticipo] = useState(false);

    const defaultFormValues: DefaultValues<FormValues> = {
        nombre: '',
        descripcion: null,
        objetivos: [ObjetivoOfertaZodEnum.Values.VENTA], // Default
        tipoPago: TipoPagoOfertaEnumSchema.Values.UNICO, // Default
        precio: null,
        intervaloRecurrencia: null,
        tipoAnticipo: null,
        valorAnticipo: null,
    };

    const {
        control,
        register,
        handleSubmit,
        watch,
        setValue, // Para setear valores dinámicamente
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({
        resolver: zodResolver(CrearOfertaSimplificadoInputSchema),
        defaultValues: defaultFormValues,
    });

    const tipoPagoSeleccionado = watch('tipoPago');
    const tipoAnticipoSeleccionado = watch('tipoAnticipo');

    // Efecto para limpiar campos de anticipo si "Requiere Anticipo" se desactiva
    // o si el tipo de pago cambia a RECURRENTE
    React.useEffect(() => {
        if (!requiereAnticipo || tipoPagoSeleccionado === TipoPagoOfertaEnumSchema.Values.RECURRENTE) {
            setValue('tipoAnticipo', null);
            setValue('valorAnticipo', null);
        }
    }, [requiereAnticipo, tipoPagoSeleccionado, setValue]);

    // Limpiar intervalo si no es recurrente, y anticipo si es recurrente
    React.useEffect(() => {
        if (tipoPagoSeleccionado === TipoPagoOfertaEnumSchema.Values.UNICO) {
            setValue('intervaloRecurrencia', null);
        } else if (tipoPagoSeleccionado === TipoPagoOfertaEnumSchema.Values.RECURRENTE) {
            setRequiereAnticipo(false); // Los recurrentes no tendrán este tipo de anticipo en este form
            setValue('tipoAnticipo', null);
            setValue('valorAnticipo', null);
        }
    }, [tipoPagoSeleccionado, setValue]);


    const onSubmitHandler: SubmitHandler<FormValues> = async (data) => {
        const loadingToast = toast.loading("Creando oferta...");
        try {
            // Si no se requiere anticipo, asegurarse que los campos de anticipo sean null
            const dataToSend: CrearOfertaSimplificadoDataInputType = {
                ...data,
                tipoAnticipo: requiereAnticipo && data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO ? data.tipoAnticipo : null,
                valorAnticipo: requiereAnticipo && data.tipoPago === TipoPagoOfertaEnumSchema.Values.UNICO ? data.valorAnticipo : null,
                intervaloRecurrencia: data.tipoPago === TipoPagoOfertaEnumSchema.Values.RECURRENTE ? data.intervaloRecurrencia : null,
            };

            const result: ActionResult<{ id: string; nombre: string }> = await crearOfertaAction(negocioId, clienteId, dataToSend);

            toast.dismiss(loadingToast);
            if (result.success && result.data?.id) {
                toast.success(`Oferta "${result.data.nombre}" creada. Redirigiendo para configurar detalles...`);
                reset(defaultFormValues);
                setRequiereAnticipo(false);
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${result.data.id}`);
            } else {
                const errorMsg = result.errorDetails
                    ? Object.values(result.errorDetails).flat().join('; ')
                    : result.error || "No se pudo crear la oferta.";
                toast.error(errorMsg);
                console.error("Error creating offer:", result);
            }
        } catch (err) {
            toast.dismiss(loadingToast);
            toast.error(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
            console.error("Submit error:", err);
        }
    };

    const handleCancel = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
    };

    return (
        <Card className="w-full max-w-xl mx-auto shadow-xl"> {/* Simplificado a 1 columna */}
            <CardHeader className="border-b border-zinc-700">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2 text-zinc-100">
                        <TicketPlus size={22} className="text-amber-400" />
                        Crear Nueva Oferta (Paso 1 de 2)
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSubmitting}>
                        <ArrowLeft size={16} className="mr-1.5" /> Volver
                    </Button>
                </div>
                <CardDescription className="mt-1">
                    Define la información básica. Detalles como vigencia, estado y multimedia se configurarán en el siguiente paso.
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmitHandler)}>
                <CardContent className="p-6 space-y-6"> {/* Todo en una columna */}
                    {/* Información General */}
                    <section className="space-y-4">
                        <h3 className="text-md font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-700 pb-2 mb-4">
                            <Info size={18} className="text-blue-400" /> Información Esencial
                        </h3>
                        <div>
                            <Label htmlFor="nombre" className="text-sm">Nombre de la Oferta <span className="text-red-500">*</span></Label>
                            <Input id="nombre" {...register("nombre")} autoFocus disabled={isSubmitting} placeholder="Ej: Masaje Relajante 60 min" />
                            {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
                        </div>
                        <div>
                            <Label htmlFor="descripcion" className="text-sm">Descripción Breve (Opcional)</Label>
                            <Textarea id="descripcion" {...register("descripcion")} rows={3} disabled={isSubmitting} placeholder="Pequeño resumen de la oferta..." />
                            {errors.descripcion && <p className="text-xs text-red-400 mt-1">{errors.descripcion.message}</p>}
                        </div>
                    </section>

                    {/* Objetivos */}
                    <section className="space-y-3">
                        <h3 className="text-md font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-700 pb-2 mb-4">
                            <Target size={18} className="text-pink-400" /> Objetivos de la Oferta <span className="text-red-500">*</span>
                        </h3>
                        <Controller
                            name="objetivos"
                            control={control}
                            render={({ field }) => (
                                <div className="space-y-2">
                                    {OBJETIVO_OPTIONS.map((option) => (
                                        <div key={option.id} className="flex items-center space-x-2">
                                            <Checkbox
                                                id={`objetivo-${option.id}`}
                                                checked={Array.isArray(field.value) && field.value.includes(option.id)}
                                                onCheckedChange={(checked) => { /* ... (lógica de checkbox como antes) ... */
                                                    const currentValues = Array.isArray(field.value) ? field.value : [];
                                                    const newValues = checked ? [...currentValues, option.id] : currentValues.filter(v => v !== option.id);
                                                    field.onChange(newValues);
                                                }}
                                                disabled={isSubmitting}
                                            />
                                            <Label htmlFor={`objetivo-${option.id}`} className="font-normal text-sm text-zinc-200 cursor-pointer">{option.label}</Label>
                                        </div>
                                    ))}
                                </div>
                            )}
                        />
                        {errors.objetivos && <p className="text-xs text-red-400 mt-1">{typeof errors.objetivos.message === 'string' ? errors.objetivos.message : 'Error en objetivos'}</p>}
                    </section>

                    {/* Precio y Pago */}
                    <section className="space-y-4">
                        <h3 className="text-md font-semibold text-zinc-200 flex items-center gap-2 border-b border-zinc-700 pb-2 mb-4">
                            <DollarSign size={18} className="text-green-400" /> Configuración de Pago
                        </h3>
                        <div>
                            <Label htmlFor="tipoPago" className="text-sm">Tipo de Pago <span className="text-red-500">*</span></Label>
                            <Controller name="tipoPago" control={control} render={({ field }) => (
                                <Select onValueChange={(value) => { field.onChange(value); if (value === 'RECURRENTE') setRequiereAnticipo(false); }} value={field.value} disabled={isSubmitting}>
                                    <SelectTrigger><SelectValue placeholder="Selecciona tipo..." /></SelectTrigger>
                                    <SelectContent>
                                        {TIPO_PAGO_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                    </SelectContent>
                                </Select>
                            )} />
                            {errors.tipoPago && <p className="text-xs text-red-400 mt-1">{errors.tipoPago.message}</p>}
                        </div>

                        <div>
                            <Label htmlFor="precio" className="text-sm">
                                {tipoPagoSeleccionado === 'RECURRENTE' ? 'Precio por Intervalo' : 'Precio Total'} (Opcional)
                            </Label>
                            <Input type="number" id="precio" {...register("precio", { setValueAs: v => v === "" || v === null || v === undefined ? null : parseFloat(v) })} placeholder="0.00" step="0.01" min="0" disabled={isSubmitting} />
                            {errors.precio && <p className="text-xs text-red-400 mt-1">{errors.precio.message}</p>}
                        </div>

                        {tipoPagoSeleccionado === 'RECURRENTE' && (
                            <div>
                                <Label htmlFor="intervaloRecurrencia" className="text-sm">Intervalo de Recurrencia <span className="text-red-500">*</span></Label>
                                <Controller name="intervaloRecurrencia" control={control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={isSubmitting}>
                                        <SelectTrigger><SelectValue placeholder="Selecciona intervalo..." /></SelectTrigger>
                                        <SelectContent>
                                            {INTERVALO_RECURRENCIA_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )} />
                                {errors.intervaloRecurrencia && <p className="text-xs text-red-400 mt-1">{errors.intervaloRecurrencia.message}</p>}
                            </div>
                        )}

                        {tipoPagoSeleccionado === 'UNICO' && (
                            <div className="space-y-4 mt-4 pt-4 border-t border-zinc-700">
                                <div className="flex items-center space-x-2">
                                    <Switch id="requiereAnticipo" checked={requiereAnticipo} onCheckedChange={setRequiereAnticipo} disabled={isSubmitting} />
                                    <Label htmlFor="requiereAnticipo" className="text-sm text-zinc-200">¿Requiere Anticipo para esta oferta de pago único?</Label>
                                </div>
                                {requiereAnticipo && (
                                    <>
                                        <div>
                                            <Label htmlFor="tipoAnticipo" className="text-sm">Tipo de Anticipo <span className="text-red-500">*</span></Label>
                                            <Controller name="tipoAnticipo" control={control} render={({ field }) => (
                                                <Select onValueChange={field.onChange} value={field.value ?? undefined} disabled={isSubmitting}>
                                                    <SelectTrigger><SelectValue placeholder="Selecciona tipo de anticipo..." /></SelectTrigger>
                                                    <SelectContent>
                                                        {TIPO_ANTICIPO_OPTIONS.map(opt => <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>)}
                                                    </SelectContent>
                                                </Select>
                                            )} />
                                            {errors.tipoAnticipo && <p className="text-xs text-red-400 mt-1">{errors.tipoAnticipo.message}</p>}
                                        </div>
                                        <div>
                                            <Label htmlFor="valorAnticipo" className="text-sm">
                                                {tipoAnticipoSeleccionado === 'PORCENTAJE' ? 'Porcentaje de Anticipo (%)' : 'Monto Fijo de Anticipo ($)'} <span className="text-red-500">*</span>
                                            </Label>
                                            <div className="relative">
                                                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                                                    {tipoAnticipoSeleccionado === 'PORCENTAJE' ? <Percent size={14} className="text-zinc-400" /> : <HandCoins size={14} className="text-zinc-400" />}
                                                </div>
                                                <Input type="number" id="valorAnticipo" {...register("valorAnticipo", { setValueAs: v => v === "" || v === null || v === undefined ? null : parseFloat(v) })}
                                                    placeholder={tipoAnticipoSeleccionado === 'PORCENTAJE' ? "Ej: 20 (para 20%)" : "Ej: 50.00"}
                                                    step="0.01" min="0" disabled={isSubmitting} className="pl-9" />
                                            </div>
                                            {errors.valorAnticipo && <p className="text-xs text-red-400 mt-1">{errors.valorAnticipo.message}</p>}
                                        </div>
                                    </>
                                )}
                            </div>
                        )}
                    </section>
                </CardContent>

                <CardFooter className="border-t border-zinc-700 p-6 flex flex-col sm:flex-row justify-end gap-3">
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCancel} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                        {isSubmitting
                            ? <><Loader2 className='animate-spin mr-2' size={18} /> Creando Oferta...</>
                            : <><Save size={16} className="mr-2" /> Crear y Configurar Detalles</>}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}