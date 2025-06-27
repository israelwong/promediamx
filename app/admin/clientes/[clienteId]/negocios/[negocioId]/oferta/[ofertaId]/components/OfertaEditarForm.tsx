'use client';

import React, { useState, useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

// --- Acciones y Esquemas ---
import {
    obtenerOfertaParaEdicionAction,
    editarOfertaAction,
    eliminarOfertaAction
} from '@/app/admin/_lib/actions/oferta/oferta.actions';
import { obtenerTiposDeCitaParaSelectAction } from '@/app/admin/_lib/actions/agendaTipoCita/agendaTipoCita.actions';
import type { AgendaTipoCitaParaSelect } from '@/app/admin/_lib/actions/agendaTipoCita/agendaTipoCita.schemas';
import {
    EditarOfertaInputSchema
} from '@/app/admin/_lib/actions/oferta/oferta.schemas';

// --- Componentes UI y Enums de Prisma ---
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Switch } from '@/app/components/ui/switch';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Loader2, Save, Trash2, AlertTriangle, Info, Target, DollarSign, CalendarDays, ListVideo, Percent, HandCoins } from 'lucide-react';
import { EstadoOferta, TipoPagoOferta, ObjetivoOferta, TipoAnticipoOferta, IntervaloRecurrenciaOferta, ObjetivoCitaTipoEnum } from '@prisma/client';

interface Props {
    ofertaId: string;
    negocioId: string;
    clienteId: string;
}

type FormValues = z.infer<typeof EditarOfertaInputSchema>;

// Constantes para opciones de los Selects
const OBJETIVO_OPTIONS = [
    { id: ObjetivoOferta.VENTA, label: 'Generar Ventas Directas' },
    { id: ObjetivoOferta.CITA, label: 'Agendar Citas / Reservas' },
];
const TIPO_PAGO_OPTIONS = Object.values(TipoPagoOferta).map(v => ({ value: v, label: v === 'UNICO' ? 'Pago Único' : 'Pago Recurrente' }));
const TIPO_ANTICIPO_OPTIONS = Object.values(TipoAnticipoOferta).map(v => ({ value: v, label: v === 'PORCENTAJE' ? 'Porcentaje (%)' : 'Monto Fijo ($)' }));
const INTERVALO_RECURRENCIA_OPTIONS = Object.values(IntervaloRecurrenciaOferta).map(v => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase().replace('_', ' ') }));
const OBJETIVO_CITA_TIPO_OPTIONS = Object.values(ObjetivoCitaTipoEnum).map(v => ({ value: v, label: v === 'DIA_ESPECIFICO' ? 'Día Específico (Evento)' : 'Por Hora (Según Disponibilidad)' }));
// const STATUS_OFERTA_OPTIONS = Object.values(EstadoOferta).map(v => ({ value: v, label: v.charAt(0) + v.slice(1).toLowerCase().replace('_', ' ') }));

// Helpers de formato de fecha
const dateToInputFormat = (date?: Date | null): string => {
    if (!date) return '';
    try {
        const d = new Date(date);
        const year = d.getUTCFullYear();
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const day = String(d.getUTCDate()).padStart(2, '0');
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

export default function OfertaEditarForm({ ofertaId, negocioId, clienteId }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);
    const [requiereAnticipo, setRequiereAnticipo] = useState(false);
    const [serviciosCita, setServiciosCita] = useState<AgendaTipoCitaParaSelect[]>([]);

    const {
        control,
        register,
        handleSubmit,
        watch,
        setValue,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<FormValues>({
        // Se elimina el 'resolver' para no depender de @hookform/resolvers
        defaultValues: {
            nombre: '',
            descripcion: null,
            objetivos: [],
            serviciosDeCitaIds: [],
            tipoPago: 'UNICO',
            status: 'BORRADOR',
            fechaInicio: new Date(),
            fechaFin: new Date(new Date().setFullYear(new Date().getFullYear() + 1)),
        }
    });

    const objetivosSeleccionados = watch('objetivos', []);
    const tipoPagoSeleccionado = watch('tipoPago');
    const tipoAnticipoSeleccionado = watch('tipoAnticipo');
    const mostrarSeccionVentas = objetivosSeleccionados.includes(ObjetivoOferta.VENTA);
    const mostrarSeccionCitas = objetivosSeleccionados.includes(ObjetivoOferta.CITA);

    const fetchInitialData = useCallback(async () => {
        startTransition(async () => {
            const [ofertaResult, serviciosResult] = await Promise.all([
                obtenerOfertaParaEdicionAction(ofertaId, negocioId),
                obtenerTiposDeCitaParaSelectAction(negocioId)
            ]);

            if (serviciosResult.success && serviciosResult.data) {
                setServiciosCita(serviciosResult.data);
            }

            if (ofertaResult.success && ofertaResult.data) {
                reset(ofertaResult.data);
                setRequiereAnticipo(!!ofertaResult.data.tipoAnticipo);
            } else {
                setError(ofertaResult.error || "No se pudo cargar la oferta.");
            }
        });
    }, [ofertaId, negocioId, reset]);

    useEffect(() => {
        fetchInitialData();
    }, [fetchInitialData]);

    useEffect(() => {
        if (!requiereAnticipo || tipoPagoSeleccionado !== 'UNICO') {
            setValue('tipoAnticipo', null, { shouldValidate: true });
            setValue('porcentajeAnticipo', null, { shouldValidate: true });
            setValue('anticipo', null, { shouldValidate: true });
        }
    }, [requiereAnticipo, tipoPagoSeleccionado, setValue]);

    useEffect(() => {
        if (tipoAnticipoSeleccionado === 'PORCENTAJE') setValue('anticipo', null);
        if (tipoAnticipoSeleccionado === 'MONTO_FIJO') setValue('porcentajeAnticipo', null);
    }, [tipoAnticipoSeleccionado, setValue]);

    const onSubmit: SubmitHandler<FormValues> = (data) => {
        // --- NUEVA LÓGICA DE VALIDACIÓN MANUAL ---
        const validationResult = EditarOfertaInputSchema.safeParse(data);

        if (!validationResult.success) {
            console.error("Errores de validación manual:", validationResult.error.flatten());
            toast.error("Hay errores en el formulario. Por favor, revisa los campos.");
            // Opcional: podrías usar 'setError' de react-hook-form para marcar campos específicos
            return;
        }

        startTransition(async () => {
            // Se envía la data ya validada
            const result = await editarOfertaAction(ofertaId, validationResult.data);
            if (result.success && result.data) {
                toast.success("Oferta actualizada.");
                reset(result.data);
            } else {
                toast.error(result.error || "No se pudo actualizar la oferta.");
            }
        });
    };

    const handleDelete = () => {
        if (!window.confirm("¿Seguro que quieres eliminar esta oferta? Esta acción es permanente.")) return;
        startTransition(async () => {
            const result = await eliminarOfertaAction(ofertaId, clienteId, negocioId);
            if (result.success) {
                toast.success("Oferta eliminada. Redirigiendo...");
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
            } else {
                toast.error(result.error || "No se pudo eliminar.");
            }
        });
    }

    if (isPending && !isDirty) return <div className="p-10 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-blue-500" /></div>;
    if (error) return <div className="p-10 text-center text-red-500"><AlertTriangle className="mx-auto mb-2" />{error}</div>;

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><Info size={20} />Información General</CardTitle></CardHeader>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="nombre">Nombre de la Oferta / Campaña</Label>
                        <Input id="nombre" {...register("nombre")} />
                        {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="descripcion">Descripción</Label>
                        <Textarea id="descripcion" {...register("descripcion")} />
                        {errors.descripcion && <p className="text-xs text-red-400 mt-1">{errors.descripcion.message}</p>}
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Target size={20} />Objetivos Principales</CardTitle>
                    <CardDescription>Selecciona qué hará esta oferta. Las secciones correspondientes aparecerán abajo.</CardDescription>
                </CardHeader>
                <CardContent>
                    <Controller name="objetivos" control={control}
                        render={({ field }) => (
                            <div className="space-y-2">
                                {OBJETIVO_OPTIONS.map(opt => (
                                    <div key={opt.id} className="flex items-center gap-3">
                                        <Checkbox id={`obj-${opt.id}`} checked={Array.isArray(field.value) && field.value.includes(opt.id)} onCheckedChange={checked => field.onChange(checked ? [...(field.value || []), opt.id] : (field.value || []).filter(v => v !== opt.id))} />
                                        <Label htmlFor={`obj-${opt.id}`}>{opt.label}</Label>
                                    </div>
                                ))}
                            </div>
                        )} />
                    {errors.objetivos && <p className="text-xs text-red-400 mt-2">{errors.objetivos.message}</p>}
                </CardContent>
            </Card>

            {mostrarSeccionVentas && (
                <Card className="animate-in fade-in-0 duration-500">
                    <CardHeader><CardTitle className="flex items-center gap-2"><DollarSign />Precio y Pagos</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-2 gap-4">
                            <div>
                                <Label>Tipo de Pago</Label>
                                <Controller name="tipoPago" control={control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>{TIPO_PAGO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                )} />
                            </div>
                            <div>
                                <Label>Precio</Label>
                                <Input type="number" {...register("precio", { setValueAs: v => v ? parseFloat(v) : null })} placeholder="0.00" />
                                {errors.precio && <p className="text-xs text-red-400 mt-1">{errors.precio.message}</p>}
                            </div>
                        </div>
                        {tipoPagoSeleccionado === 'RECURRENTE' && (
                            <div>
                                <Label>Intervalo de Recurrencia</Label>
                                <Controller name="intervaloRecurrencia" control={control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                        <SelectTrigger><SelectValue placeholder="Selecciona intervalo..." /></SelectTrigger>
                                        <SelectContent>{INTERVALO_RECURRENCIA_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                    </Select>
                                )} />
                                {errors.intervaloRecurrencia && <p className="text-xs text-red-400 mt-1">{errors.intervaloRecurrencia.message}</p>}
                            </div>
                        )}
                        {tipoPagoSeleccionado === 'UNICO' && (
                            <div className="space-y-4 pt-4 border-t border-zinc-700">
                                <div className="flex items-center gap-3">
                                    <Switch id="anticipo-switch" checked={requiereAnticipo} onCheckedChange={setRequiereAnticipo} />
                                    <Label htmlFor="anticipo-switch">Requiere Anticipo para reservar/comprar</Label>
                                </div>
                                {requiereAnticipo && (
                                    <div className="grid grid-cols-2 gap-4">
                                        <Controller name="tipoAnticipo" control={control} render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                                <SelectTrigger><SelectValue placeholder="Tipo de anticipo..." /></SelectTrigger>
                                                <SelectContent>{TIPO_ANTICIPO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                            </Select>
                                        )} />
                                        {tipoAnticipoSeleccionado === 'PORCENTAJE' && <div className="relative"><Input type="number" {...register("porcentajeAnticipo", { setValueAs: v => v ? parseFloat(v) : null })} placeholder="% Anticipo" /><Percent className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" /></div>}
                                        {tipoAnticipoSeleccionado === 'MONTO_FIJO' && <div className="relative"><Input type="number" {...register("anticipo", { setValueAs: v => v ? parseFloat(v) : null })} placeholder="Monto Fijo" /><HandCoins className="absolute right-3 top-2.5 h-4 w-4 text-muted-foreground" /></div>}
                                    </div>
                                )}
                            </div>
                        )}
                    </CardContent>
                </Card>
            )}

            {mostrarSeccionCitas && (
                <Card className="animate-in fade-in-0 duration-500">
                    <CardHeader><CardTitle className="flex items-center gap-2"><ListVideo />Configuración para Citas</CardTitle></CardHeader>
                    <CardContent className="space-y-4">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <Controller name="objetivoCitaTipo" control={control} render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value ?? undefined}>
                                    <SelectTrigger><SelectValue placeholder="Tipo de cita..." /></SelectTrigger>
                                    <SelectContent>{OBJETIVO_CITA_TIPO_OPTIONS.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                                </Select>
                            )} />
                            {watch('objetivoCitaTipo') === 'DIA_ESPECIFICO' && (
                                <Controller name="objetivoCitaFecha" control={control}
                                    render={({ field }) => (<Input type="datetime-local" value={dateTimeToInputFormat(field.value)} onChange={(e) => field.onChange(e.target.value ? new Date(e.target.value) : null)} />)} />
                            )}
                        </div>
                        <div>
                            <Label>Servicios Vinculados a la Oferta</Label>
                            <p className="text-xs text-zinc-400 mb-2">Selecciona todos los servicios para los que se pueden agendar citas con esta oferta.</p>
                            <Controller name="serviciosDeCitaIds" control={control}
                                render={({ field }) => (
                                    <div className="space-y-2 p-3 bg-zinc-800 rounded-md max-h-48 overflow-y-auto">
                                        {serviciosCita.length > 0 ? serviciosCita.map(s => (
                                            <div key={s.id} className="flex items-center gap-3">
                                                <Checkbox
                                                    id={`servicio-${s.id}`}
                                                    checked={Array.isArray(field.value) && field.value.includes(s.id)}
                                                    onCheckedChange={checked => {
                                                        const currentIds = Array.isArray(field.value) ? field.value : [];
                                                        const newIds = checked ? [...currentIds, s.id] : currentIds.filter(id => id !== s.id);
                                                        field.onChange(newIds);
                                                    }}
                                                />
                                                <Label htmlFor={`servicio-${s.id}`} className="font-normal cursor-pointer">{s.nombre}</Label>
                                            </div>
                                        )) : <p className="text-sm text-zinc-500 italic">No hay servicios de cita configurados.</p>}
                                    </div>
                                )}
                            />
                        </div>
                    </CardContent>
                </Card>
            )}

            <Card>
                <CardHeader><CardTitle className="flex items-center gap-2"><CalendarDays />Vigencia y Estado</CardTitle></CardHeader>
                <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                        <Label>Fecha Inicio</Label>
                        <Controller name="fechaInicio" control={control} render={({ field }) => <Input type="date" value={dateToInputFormat(field.value)} onChange={e => field.onChange(new Date(e.target.value))} />} />
                        {errors.fechaInicio && <p className="text-xs text-red-400 mt-1">{errors.fechaInicio.message}</p>}
                    </div>
                    <div>
                        <Label>Fecha Fin</Label>
                        <Controller name="fechaFin" control={control} render={({ field }) => <Input type="date" value={dateToInputFormat(field.value)} onChange={e => field.onChange(new Date(e.target.value))} />} />
                        {errors.fechaFin && <p className="text-xs text-red-400 mt-1">{errors.fechaFin.message}</p>}
                    </div>
                    <div>
                        <Label>Estado</Label>
                        <Controller name="status" control={control} render={({ field }) => (
                            <Select onValueChange={field.onChange} value={field.value}>
                                <SelectTrigger><SelectValue /></SelectTrigger>
                                <SelectContent>{Object.values(EstadoOferta).map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                            </Select>
                        )} />
                    </div>
                </CardContent>
            </Card>

            <div className="flex justify-between items-center pt-6 border-t border-zinc-700">
                <Button type="button" variant="destructive" onClick={handleDelete} disabled={isSubmitting || isPending}>
                    <Trash2 className="mr-2 h-4 w-4" /> Eliminar
                </Button>
                <Button type="submit" disabled={isSubmitting || isPending || !isDirty}>
                    {isSubmitting || isPending ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" />}
                    Guardar Cambios
                </Button>
            </div>
        </form>
    );
}
