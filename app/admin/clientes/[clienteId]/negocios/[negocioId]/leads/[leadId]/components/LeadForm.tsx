"use client";

import React, { useTransition, useMemo, useEffect } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

import { LeadUnificadoFormSchema, type LeadUnificadoFormData } from '@/app/admin/_lib/actions/lead/lead.schemas';
import { guardarLeadYAsignarCitaAction, eliminarLeadAction } from '@/app/admin/_lib/actions/lead/lead.actions';
import type { Lead, Agenda, PipelineCRM, AgendaTipoCita, EtiquetaCRM } from '@prisma/client';

import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Loader2, Save, Trash, Send, XCircle } from 'lucide-react';
import NotasSection from './NotasSection';

const comissionData = {
    albatros: {
        comisionFija: 1500,
        niveles: { kinder: ['primero', 'segundo', 'tercero'], primaria: ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'] }
    },
    tecno: {
        colegiaturas: { kinder: 2516, primaria: 3005, secundaria: 3278 },
        niveles: { kinder: ['primero', 'segundo', 'tercero'], primaria: ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'], secundaria: ['primero', 'segundo', 'tercero'] }
    }
};
const colegiosOptions = ['Colegio Albatros', 'Colegio Tecno'];

type LeadJsonParams = {
    colegio?: string;
    nivel_educativo?: string;
    grado?: string;
};

interface LeadFormProps {
    clienteId: string;
    negocioId: string;
    crmId: string;
    initialLeadData?: (Lead & { Agenda: Agenda[], Etiquetas: { etiquetaId: string }[] }) | null;
    etapasPipeline: PipelineCRM[];
    etiquetasDisponibles: EtiquetaCRM[];
    tiposDeCita: AgendaTipoCita[];
}

export default function LeadForm({ clienteId, negocioId, crmId, initialLeadData, etapasPipeline, etiquetasDisponibles, tiposDeCita }: LeadFormProps) {
    const router = useRouter();
    const [isSaving, startSaveTransition] = useTransition();
    const [isNotifying, startNotifyTransition] = useTransition();
    const isPending = isSaving || isNotifying;

    const citaInicial = initialLeadData?.Agenda[0];

    const { register, handleSubmit, control, watch, setValue, formState: { errors } } = useForm<LeadUnificadoFormData>({
        resolver: zodResolver(LeadUnificadoFormSchema),
        defaultValues: {
            id: initialLeadData?.id,
            nombre: initialLeadData?.nombre || '',
            email: initialLeadData?.email || '',
            telefono: initialLeadData?.telefono || '',
            status: initialLeadData?.status || 'activo',
            pipelineId: initialLeadData?.pipelineId || etapasPipeline[0]?.id || '',

            // --- CORRECCIÓN 1: El valor por defecto debe ser de tipo number o null ---
            valorEstimado: initialLeadData?.valorEstimado ?? undefined,

            jsonParams: (initialLeadData?.jsonParams as LeadJsonParams) || {},
            etiquetaIds: initialLeadData?.Etiquetas?.map(e => e.etiquetaId) || [],
            fechaCita: citaInicial ? format(new Date(citaInicial.fecha), 'yyyy-MM-dd') : undefined,
            horaCita: citaInicial ? format(new Date(citaInicial.fecha), 'HH:mm') : undefined,
            tipoDeCitaId: citaInicial?.tipoDeCitaId,
            modalidadCita: citaInicial?.modalidad,
            negocioId,
            crmId,
        },
    });

    const watchedJsonParams = watch('jsonParams');
    const fechaCita = watch('fechaCita');
    const horaCita = watch('horaCita');

    const nivelOptions = useMemo(() => {
        if (!watchedJsonParams?.colegio) return [];
        const key = watchedJsonParams.colegio.toLowerCase().includes('albatros') ? 'albatros' : 'tecno';
        return Object.keys(comissionData[key].niveles);
    }, [watchedJsonParams?.colegio]);

    const gradoOptions = useMemo(() => {
        if (!watchedJsonParams?.colegio || !watchedJsonParams?.nivel_educativo) return [];
        const colegioKey = watchedJsonParams.colegio.toLowerCase().includes('albatros') ? 'albatros' : 'tecno';
        const niveles = comissionData[colegioKey].niveles;
        return niveles[watchedJsonParams.nivel_educativo.toLowerCase() as keyof typeof niveles] || [];
    }, [watchedJsonParams?.colegio, watchedJsonParams?.nivel_educativo]);

    useEffect(() => {
        if (initialLeadData?.valorEstimado != null) {
            return;
        }
        const colegio = watchedJsonParams?.colegio?.toLowerCase();
        const nivel = watchedJsonParams?.nivel_educativo?.toLowerCase();
        let calculatedValue: number | null = null;
        if (colegio && nivel) {
            if (colegio.includes('albatros')) {
                calculatedValue = comissionData.albatros.comisionFija;
            } else if (colegio.includes('tecno')) {
                const tuition = comissionData.tecno.colegiaturas[nivel as keyof typeof comissionData.tecno.colegiaturas];
                if (tuition) {
                    calculatedValue = (tuition * 12) * 0.07;
                }
            }
        }
        // --- CORRECCIÓN 2: `setValue` debe usar el tipo correcto (number) ---
        const finalValue = calculatedValue !== null ? parseFloat(calculatedValue.toFixed(2)) : undefined;
        setValue('valorEstimado', finalValue, { shouldValidate: true, shouldDirty: true });
    }, [initialLeadData?.valorEstimado, watchedJsonParams?.colegio, watchedJsonParams?.nivel_educativo, setValue]);

    const onSubmit = (data: LeadUnificadoFormData, enviarNotificacion: boolean) => {
        const transition = enviarNotificacion ? startNotifyTransition : startSaveTransition;
        transition(async () => {
            const result = await guardarLeadYAsignarCitaAction({
                data,
                enviarNotificacion,
                citaInicialId: citaInicial?.id
            });
            if (result.success) {
                const message = initialLeadData
                    ? `Lead actualizado ${enviarNotificacion ? 'y notificado' : ''} correctamente.`
                    : `Lead creado ${enviarNotificacion ? 'y notificado' : ''} exitosamente.`;

                toast.success(message);

                if (!initialLeadData && result.data?.leadId) {
                    router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads/${result.data.leadId}`);
                } else {
                    router.refresh();
                }
            } else {
                toast.error(result.error || "No se pudo guardar el lead.");
            }
        });
    };

    const handleDelete = async () => {
        if (!initialLeadData?.id || !confirm("¿Estás seguro de eliminar este lead? Esta acción no se puede deshacer.")) return;
        startSaveTransition(async () => {
            const result = await eliminarLeadAction({ leadId: initialLeadData.id });
            if (result.success) {
                toast.success("Lead eliminado.");
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads`);
            } else {
                toast.error(result.error || "No se pudo eliminar el lead.");
            }
        });
    };

    const handleCancelarCita = () => {
        setValue('fechaCita', null);
        setValue('horaCita', null);
        setValue('tipoDeCitaId', null);
        setValue('modalidadCita', null);
        toast.success("Cita cancelada. Guarda los cambios para confirmar la eliminación.");
    };

    const selectedDateForPicker = useMemo(() => {
        if (fechaCita && horaCita) {
            return new Date(`${fechaCita}T${horaCita}`);
        }
        return null;
    }, [fechaCita, horaCita]);

    return (
        <form onSubmit={(e) => e.preventDefault()} className="space-y-6">
            <div className="flex items-center justify-between sticky top-0 bg-zinc-900 py-4 z-10">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-100">
                        {initialLeadData ? 'Editar Lead' : 'Crear Nuevo Lead'}
                    </h1>
                </div>
                <div className="flex items-center gap-3">
                    <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
                        Cancelar
                    </Button>
                    {initialLeadData && (
                        <Button type="button" variant="destructiveOutline" onClick={handleDelete} disabled={isPending}>
                            <Trash className="mr-2 h-4 w-4" /> Eliminar
                        </Button>
                    )}
                    <Button type="button" variant="secondary" onClick={handleSubmit(data => onSubmit(data, false))} disabled={isPending}>
                        {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {initialLeadData ? 'Guardar Cambios' : 'Crear Lead'}
                    </Button>
                    <Button type="button" onClick={handleSubmit(data => onSubmit(data, true))} disabled={isPending || !watch('email') || !watch('fechaCita')}>
                        {isNotifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
                        Guardar y Notificar
                    </Button>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
                {/* --- Columna 1: Info Principal y Adicional --- */}
                <div className="space-y-6">
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader><CardTitle>Información Principal</CardTitle></CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="nombre">Nombre Completo</Label>
                                <Input id="nombre" {...register("nombre")} />
                                {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" {...register("email")} />
                                {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="telefono">Teléfono</Label>
                                <Input id="telefono" {...register("telefono")} />
                            </div>
                            <div>
                                <Label htmlFor="pipelineId">Etapa del Pipeline</Label>
                                <Controller name="pipelineId" control={control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                            {etapasPipeline.map(etapa => <SelectItem key={etapa.id} value={etapa.id}>{etapa.nombre}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )} />
                                {errors.pipelineId && <p className="text-red-500 text-xs mt-1">{errors.pipelineId.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="valorEstimado">Comisión Estimada (MXN)</Label>
                                <Input id="valorEstimado" type="text" inputMode="decimal" {...register("valorEstimado")} placeholder="Ej: 1500.50" />
                                {errors.valorEstimado && <p className="text-red-500 text-xs mt-1">{errors.valorEstimado.message}</p>}
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle>Información Adicional</CardTitle>
                            <CardDescription>Datos específicos para el seguimiento.</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Colegio</Label>
                                <Controller name="jsonParams.colegio" control={control} render={({ field }) => (
                                    <Select onValueChange={value => { field.onChange(value); setValue('jsonParams.nivel_educativo', ''); setValue('jsonParams.grado', ''); }} value={field.value || ''}>
                                        <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">{colegiosOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}</SelectContent>
                                    </Select>
                                )} />
                            </div>
                            <div>
                                <Label>Nivel Educativo</Label>
                                <Controller name="jsonParams.nivel_educativo" control={control} render={({ field }) => (
                                    <Select onValueChange={value => { field.onChange(value); setValue('jsonParams.grado', ''); }} value={field.value || ''} disabled={!watchedJsonParams?.colegio}>
                                        <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">{nivelOptions.map(n => <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>)}</SelectContent>
                                    </Select>
                                )} />
                            </div>
                            <div>
                                <Label>Grado</Label>
                                <Controller name="jsonParams.grado" control={control} render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value || ''} disabled={!watchedJsonParams?.nivel_educativo}>
                                        <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                        <SelectContent className="bg-zinc-900 border-zinc-700 text-white">{gradoOptions.map(g => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}</SelectContent>
                                    </Select>
                                )} />
                            </div>
                        </CardContent>
                    </Card>
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader><CardTitle>Etiquetas</CardTitle></CardHeader>
                        <CardContent>
                            <Controller
                                name="etiquetaIds"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-wrap gap-2">
                                        {etiquetasDisponibles.map(etiqueta => {
                                            const isSelected = field.value?.includes(etiqueta.id);
                                            return (
                                                <button
                                                    key={etiqueta.id}
                                                    type="button"
                                                    onClick={() => {
                                                        const current = field.value || [];
                                                        const newEtiquetas = isSelected
                                                            ? current.filter(id => id !== etiqueta.id)
                                                            : [...current, etiqueta.id];
                                                        field.onChange(newEtiquetas);
                                                    }}
                                                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 ${isSelected
                                                        ? 'bg-blue-600 text-white border-transparent'
                                                        : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                                                        }`}
                                                >
                                                    {etiqueta.nombre}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            />
                        </CardContent>
                    </Card>
                </div>

                {/* --- Columna 2: Agendamiento --- */}
                <div className="space-y-6">
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Agendar Cita</CardTitle>
                            {fechaCita && (
                                <Button type="button" variant="ghost" size="sm" onClick={handleCancelarCita} className="text-red-400 hover:text-red-300">
                                    <XCircle className="mr-2 h-4 w-4" />
                                    Cancelar Cita
                                </Button>
                            )}
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label>Fecha y Hora de la Cita</Label>
                                <Controller
                                    name="fechaCita"
                                    control={control}
                                    render={() => (
                                        <DatePicker
                                            selected={selectedDateForPicker}
                                            onChange={(date) => {
                                                if (date) {
                                                    setValue('fechaCita', format(date, 'yyyy-MM-dd'), { shouldValidate: true });
                                                    setValue('horaCita', format(date, 'HH:mm'), { shouldValidate: true });
                                                } else {
                                                    setValue('fechaCita', null);
                                                    setValue('horaCita', null);
                                                }
                                            }}
                                            showTimeSelect
                                            locale={es}
                                            dateFormat="dd 'de' MMMM, yyyy h:mm aa"
                                            className="w-full bg-zinc-900 border border-zinc-700 rounded-md p-2 text-white"
                                            placeholderText="Selecciona fecha y hora..."
                                            timeFormat="h:mm aa"
                                            timeCaption="Hora"
                                        />
                                    )}
                                />
                                {errors.fechaCita && <p className="text-red-500 text-xs mt-1">{errors.fechaCita.message}</p>}
                            </div>

                            {fechaCita && (
                                <>
                                    <div>
                                        <Label>Asunto de la Cita</Label>
                                        <Controller name="tipoDeCitaId" control={control} render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                    {tiposDeCita.map(tipo => <SelectItem key={tipo.id} value={tipo.id}>{tipo.nombre}</SelectItem>)}
                                                </SelectContent>
                                            </Select>
                                        )} />
                                    </div>
                                    <div>
                                        <Label>Modalidad</Label>
                                        <Controller name="modalidadCita" control={control} render={({ field }) => (
                                            <Select onValueChange={field.onChange} value={field.value || ""}>
                                                <SelectTrigger><SelectValue placeholder="Selecciona..." /></SelectTrigger>
                                                <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                    <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                                                    <SelectItem value="VIRTUAL">Virtual</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        )} />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>
                </div>

                {/* --- Columna 3: Notas --- */}
                {initialLeadData && <div className="space-y-6"><NotasSection leadId={initialLeadData.id} /></div>}
            </div>
        </form>
    );
}