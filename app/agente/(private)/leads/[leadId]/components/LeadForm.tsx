"use client";

import React, { useTransition, useMemo, useEffect, useState } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import DatePicker from 'react-datepicker';
import "react-datepicker/dist/react-datepicker.css";

import type { CanalAdquisicion } from '@prisma/client';
import HistorialYNotas from './HistorialYNotas';

import { setHours, setMinutes, startOfDay } from 'date-fns';
import { HorarioAtencion, ExcepcionHorario } from '@prisma/client';


// --- Acciones y Schemas ---
import { LeadUnificadoFormSchema, type LeadUnificadoFormData } from '@/app/admin/_lib/actions/lead/lead.schemas';
import { guardarLeadYAsignarCitaAction, eliminarLeadAction, asignarAgenteALeadAction } from '@/app/admin/_lib/actions/lead/lead.actions';

// --- Tipos de Datos ---
import type { Lead, Agenda, PipelineCRM, AgendaTipoCita, EtiquetaCRM } from '@prisma/client';
import type { DiaSemana } from '@prisma/client';

// --- Componentes de UI ---
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Loader2, Save, Trash, Send, XCircle, ShieldAlert } from 'lucide-react';

// --- Componentes Personalizados ---

import { ContactCard } from './ContactCard';
import { HistorialItem } from '@/app/admin/_lib/actions/bitacora/bitacora.schemas';


const DIAS_MAP: { [key: number]: string } = { 1: 'LUNES', 2: 'MARTES', 3: 'MIERCOLES', 4: 'JUEVES', 5: 'VIERNES', 6: 'SABADO', 0: 'DOMINGO' };

const comissionData = {
    albatros: {
        comisionFija: 1500,
        niveles: {
            kinder: ['primero', 'segundo', 'tercero'],
            primaria: ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto']
        }
    },
    tecno: {
        colegiaturas: {
            kinder: 2516,
            primaria: 3005,
            secundaria: 3278
        },
        niveles: {
            kinder: ['primero', 'segundo', 'tercero'],
            primaria: ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'],
            secundaria: ['primero', 'segundo', 'tercero']
        }
    }
};

// const colegiosOptions = ['Colegio Albatros', 'Colegio Tecno'];

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
    agenteId?: string;
    canalesDeAdquisicion?: CanalAdquisicion[]; // <-- Añadir la nueva prop
    historialItems?: HistorialItem[]; // <-- Añadir la nueva prop
    canalAdquisicionId?: string;
    configuracionAgenda?: {
        horarios: HorarioAtencion[];
        excepciones: ExcepcionHorario[];
    };
    ofertasDisponiblesParaAgente?: string[];

}

export default function LeadForm({
    clienteId,
    negocioId,
    crmId,
    initialLeadData,
    etapasPipeline,
    etiquetasDisponibles,
    tiposDeCita,
    agenteId,
    canalesDeAdquisicion = [],
    historialItems = [],
    configuracionAgenda,
    ofertasDisponiblesParaAgente = []

}: LeadFormProps) {

    console.log("LeadForm Props:", { historialItems });//!

    const router = useRouter();
    const [isSaving, startSaveTransition] = useTransition();
    const [isNotifying, startNotifyTransition] = useTransition();
    const isPending = isSaving || isNotifying;

    const citaInicial = initialLeadData?.Agenda[0];

    const {
        register,
        handleSubmit,
        control,
        watch,
        setValue,
        reset, // <-- AÑADIR ESTO
        formState: { errors, isDirty } // <-- Añade 'isDirty' aquí

    } = useForm<LeadUnificadoFormData>({
        resolver: zodResolver(LeadUnificadoFormSchema),
        defaultValues: {
            id: initialLeadData?.id,
            nombre: initialLeadData?.nombre || '',
            email: initialLeadData?.email || '',
            telefono: initialLeadData?.telefono || '',
            status: initialLeadData?.status || 'activo',
            pipelineId: initialLeadData?.pipelineId || etapasPipeline[0]?.id || '',
            jsonParams: (initialLeadData?.jsonParams as LeadJsonParams) || {},
            etiquetaIds: initialLeadData?.Etiquetas?.map(e => e.etiquetaId) || [],
            fechaCita: citaInicial ? format(new Date(citaInicial.fecha), 'yyyy-MM-dd') : undefined,
            horaCita: citaInicial ? format(new Date(citaInicial.fecha), 'HH:mm') : undefined,
            tipoDeCitaId: citaInicial?.tipoDeCitaId,
            modalidadCita: citaInicial?.modalidad,
            negocioId,
            crmId,
            agenteId: initialLeadData?.agenteId || agenteId || null,
            canalAdquisicionId: initialLeadData?.canalAdquisicionId || '',
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

    const [isReadOnly, setIsReadOnly] = useState(false);
    const [isTakingLead, startTakingLeadTransition] = useTransition();

    // --- LÓGICA PARA DETERMINAR EL ESTADO INICIAL ---
    useEffect(() => {
        const shouldBeReadOnly = !!initialLeadData && !initialLeadData.agenteId && !!agenteId;
        setIsReadOnly(shouldBeReadOnly);
    }, [initialLeadData, agenteId]);

    const handleTomarLead = () => {
        if (!initialLeadData || !agenteId) return;

        startTakingLeadTransition(async () => {
            const result = await asignarAgenteALeadAction({
                leadId: initialLeadData.id,
                agenteId: agenteId
            });

            if (result.success) {
                toast.success("Prospecto asignado a ti. Ahora puedes editarlo.");
                setIsReadOnly(false); // Desbloquea el formulario
                router.refresh(); // Recarga los datos del servidor para que todo esté sincronizado
            } else {
                toast.error(result.error || "No se pudo asignar el prospecto.");
            }
        });
    };

    // --- 2. Lógica para preseleccionar el colegio si solo hay uno ---
    useEffect(() => {
        // Esta lógica solo se aplica al CREAR un nuevo lead
        if (!initialLeadData && ofertasDisponiblesParaAgente.length === 1) {
            // Si el agente solo tiene una oferta, la seleccionamos por defecto.
            setValue('jsonParams.colegio', ofertasDisponiblesParaAgente[0], { shouldDirty: true });
        }
    }, [initialLeadData, ofertasDisponiblesParaAgente, setValue]);

    const onSubmit = (data: LeadUnificadoFormData, enviarNotificacion: boolean) => {
        const transition = enviarNotificacion ? startNotifyTransition : startSaveTransition;
        transition(async () => {
            const result = await guardarLeadYAsignarCitaAction({
                data,
                enviarNotificacion,
                citaInicialId: initialLeadData?.Agenda[0]?.id,
                agenteIdQueEdita: agenteId // Si es undefined (desde admin), la acción lo manejará
            });
            if (result.success) {
                toast.success("Almacenado correctamente.");
                reset(data);

                if (!initialLeadData && result.data?.leadId) {
                    router.push(`/agente/leads/${result.data.leadId}`);
                } else {
                    router.refresh();
                }
            } else {
                toast.error(`Error: ${result.error || "No se pudo guardar."}`);
            }
        });
    };

    const handleDelete = async () => {
        if (!initialLeadData?.id || !confirm("¿Estás seguro?")) return;
        startSaveTransition(async () => {
            const result = await eliminarLeadAction({ leadId: initialLeadData.id });
            if (result.success) {
                toast.success("Lead eliminado.");
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads`);
            } else {
                toast.error(result.error || "No se pudo eliminar.");
            }
        });
    };

    const handleCancelarCita = () => {
        if (confirm("¿Seguro que deseas cancelar la cita?")) {
            setValue('fechaCita', null);
            setValue('horaCita', null);
            setValue('tipoDeCitaId', null);
            setValue('modalidadCita', null);
            toast.success("Cita cancelada. Guarda para confirmar.");
        }
    };

    const selectedDateForPicker = useMemo(() => {
        if (fechaCita && horaCita) {
            return new Date(`${fechaCita}T${horaCita}`);
        }
        return null;
    }, [fechaCita, horaCita]);

    // --- LÓGICA PARA FILTRAR EL CALENDARIO ---
    const watchedFechaCita = watch('fechaCita');


    // Convertimos las excepciones a un formato rápido de búsqueda
    // --- LÓGICA PARA FILTRAR EL CALENDARIO ---
    const diasNoLaborables = useMemo(() => new Set(configuracionAgenda?.excepciones.filter(ex => ex.esDiaNoLaborable).map(ex => format(new Date(ex.fecha), 'yyyy-MM-dd'))), [configuracionAgenda]);
    const diasLaborales = useMemo(() => new Set(configuracionAgenda?.horarios.map(h => h.dia)), [configuracionAgenda]);

    const filterDate = (date: Date) => {
        const diaSemana = DIAS_MAP[date.getUTCDay()];
        const fechaString = format(date, 'yyyy-MM-dd');

        if (diasNoLaborables.has(fechaString)) return false;
        return diasLaborales.has(diaSemana as DiaSemana);
    };

    const [minTime, setMinTime] = useState<Date | null>(null);
    const [maxTime, setMaxTime] = useState<Date | null>(null);

    useEffect(() => {
        if (watchedFechaCita && configuracionAgenda) {
            const fechaSeleccionada = new Date(watchedFechaCita.replace(/-/g, '/'));
            const diaSemanaString = DIAS_MAP[fechaSeleccionada.getDay()];
            const horarioDelDia = configuracionAgenda.horarios.find(h => h.dia === (diaSemanaString as DiaSemana));

            if (horarioDelDia) {
                const [startHour, startMinute] = horarioDelDia.horaInicio.split(':').map(Number);
                const [endHour, endMinute] = horarioDelDia.horaFin.split(':').map(Number);
                const baseDate = startOfDay(new Date());
                setMinTime(setHours(setMinutes(baseDate, startMinute), startHour));
                setMaxTime(setHours(setMinutes(baseDate, endMinute), endHour));
            } else {
                setMinTime(null);
                setMaxTime(null);
            }
        } else {
            setMinTime(null);
            setMaxTime(null);
        }
    }, [watchedFechaCita, configuracionAgenda]);


    const handleClose = () => {
        if (isDirty && !confirm("Tienes cambios sin guardar. ¿Seguro que deseas cerrar?")) {
            return;
        }
        router.push('/agente/');
    };


    return (
        <form
            onSubmit={handleSubmit(data => onSubmit(data, false))}
            className="space-y-6"
        >
            <div className="flex items-center justify-between sticky top-0 bg-zinc-900 p-4 z-10">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-100">
                        {initialLeadData ? 'Editar Lead' : 'Crear Nuevo Lead'}
                    </h1>
                </div>

                {isReadOnly && (
                    <div className="p-4 bg-amber-900/40 border border-amber-500/50 rounded-lg text-amber-200 flex items-center gap-3">
                        <ShieldAlert className="h-5 w-5" />
                        <p className="text-sm">Este prospecto no está asignado. Para editarlo, primero debes tomarlo.</p>
                    </div>
                )}

                <div className="flex items-center gap-3">
                    {/* --- LÓGICA DE VISIBILIDAD DE BOTONES --- */}
                    {isReadOnly ? (
                        <Button type="button" onClick={handleTomarLead} disabled={isTakingLead} className="bg-green-600 hover:bg-green-700">
                            {isTakingLead && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Tomar y Dar Seguimiento
                        </Button>
                    ) : (
                        <>
                            <Button
                                type="submit"
                                variant={isDirty ? "warning" : "green"}
                                disabled={isPending}
                                className={isDirty ? "animate-pulse" : ""}
                            >
                                {isSaving ? (
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                ) : (
                                    <Save className="mr-2 h-4 w-4" />
                                )}
                                {initialLeadData ? 'Guardar Cambios' : 'Crear Lead'}
                            </Button>

                            {/* Puedes decidir si el botón de notificar se muestra en modo lectura */}
                            <Button
                                type="button"
                                onClick={handleSubmit(data => onSubmit(data, true))}
                                disabled={
                                    isPending ||
                                    !watch('email') ||
                                    !watch('fechaCita')
                                }
                            >
                                <Send className="mr-2 h-4 w-4" />
                                Guardar y Notificar
                            </Button>


                            <Button
                                type="button"
                                variant="outline"
                                onClick={handleClose}
                                disabled={isPending}
                            >
                                Cerrar ventana
                            </Button>


                            {initialLeadData && (
                                <Button type="button" variant="destructiveOutline" onClick={handleDelete} disabled={isPending}>
                                    <Trash className="mr-2 h-4 w-4" /> Eliminar
                                </Button>
                            )}
                        </>
                    )}
                </div>

            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-start">
                {/* Columna 1 */}
                <div className="space-y-6">
                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle>Información Principal</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="nombre">Nombre Completo</Label>
                                <Input id="nombre" {...register("nombre")} disabled={isReadOnly} />
                                {errors.nombre && (
                                    <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" {...register("email")} disabled={isReadOnly} />
                                {errors.email && (
                                    <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="telefono">Teléfono</Label>
                                <Input id="telefono" {...register("telefono")} disabled={isReadOnly} />
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
                                <Controller
                                    name="jsonParams.colegio"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            disabled={isReadOnly}
                                            onValueChange={value => {
                                                field.onChange(value);
                                                setValue('jsonParams.nivel_educativo', '');
                                                setValue('jsonParams.grado', '');
                                            }}
                                            value={field.value || ''}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                {ofertasDisponiblesParaAgente.map(colegio => (
                                                    <SelectItem key={colegio} value={colegio}>{colegio}</SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div>
                                <Label>Nivel Educativo</Label>
                                <Controller
                                    name="jsonParams.nivel_educativo"
                                    control={control}
                                    render={({ field }) => (
                                        <Select

                                            onValueChange={value => {
                                                field.onChange(value);
                                                setValue('jsonParams.grado', '');
                                            }}
                                            value={field.value || ''}
                                            disabled={isReadOnly || !watchedJsonParams?.colegio}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                {nivelOptions.map(n => (
                                                    <SelectItem key={n} value={n} className="capitalize">
                                                        {n}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div>
                                <Label>Grado</Label>
                                <Controller
                                    name="jsonParams.grado"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ''}
                                            disabled={isReadOnly || !watchedJsonParams?.nivel_educativo}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                {gradoOptions.map(g => (
                                                    <SelectItem key={g} value={g} className="capitalize">
                                                        {g}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>
                </div>

                {/* Columna 2 */}
                <div className="space-y-6">

                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader className="flex flex-row items-center justify-between">
                            <CardTitle>Agendar Cita</CardTitle>
                            {fechaCita && (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    onClick={handleCancelarCita}
                                    className="text-red-400 hover:text-red-300"
                                >
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
                                            wrapperClassName="w-full"
                                            popperClassName="z-30"
                                            popperProps={{ strategy: 'fixed' }}
                                            disabled={isReadOnly}

                                            // --- PROPS PARA CONFIGURAR LA DISPONIBILIDAD ---
                                            filterDate={filterDate}
                                            minTime={minTime ?? undefined}
                                            maxTime={maxTime ?? undefined}
                                        />
                                    )}
                                />
                                {errors.fechaCita && (
                                    <p className="text-red-500 text-xs mt-1">{errors.fechaCita.message}</p>
                                )}
                            </div>
                            {fechaCita && (
                                <>
                                    <div>
                                        <Label>Asunto de la Cita</Label>
                                        <Controller
                                            name="tipoDeCitaId"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value || ""}
                                                    disabled={isReadOnly}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                        {tiposDeCita.map(tipo => (
                                                            <SelectItem key={tipo.id} value={tipo.id}>
                                                                {tipo.nombre}
                                                            </SelectItem>
                                                        ))}
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                    <div>
                                        <Label>Modalidad</Label>
                                        <Controller
                                            name="modalidadCita"
                                            control={control}
                                            render={({ field }) => (
                                                <Select
                                                    onValueChange={field.onChange}
                                                    value={field.value || ""}
                                                    disabled={isReadOnly}
                                                >
                                                    <SelectTrigger>
                                                        <SelectValue placeholder="Selecciona..." />
                                                    </SelectTrigger>
                                                    <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                        <SelectItem value="PRESENCIAL">Presencial</SelectItem>
                                                        <SelectItem value="VIRTUAL">Virtual</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            )}
                                        />
                                    </div>
                                </>
                            )}
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-800/50 border-yellow-700">
                        <CardHeader>
                            <CardTitle>Seguimiento</CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div>
                                <Label htmlFor="pipelineId">Etapa del Pipeline</Label>
                                <Controller
                                    name="pipelineId"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value} disabled={isReadOnly} >
                                            <SelectTrigger>
                                                <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                {etapasPipeline.map(etapa => (
                                                    <SelectItem key={etapa.id} value={etapa.id}>
                                                        {etapa.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                                {errors.pipelineId && (
                                    <p className="text-red-500 text-xs mt-1">{errors.pipelineId.message}</p>
                                )}
                            </div>

                            <div>
                                <Label>Canal de Adquisición</Label>
                                <Controller
                                    name="canalAdquisicionId"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value || ""}
                                            disabled={isReadOnly}
                                        >
                                            <SelectTrigger>
                                                <SelectValue placeholder="Selecciona un canal..." />
                                            </SelectTrigger>
                                            <SelectContent className="bg-zinc-900 border-zinc-700 text-white">
                                                {canalesDeAdquisicion.map(canal => (
                                                    <SelectItem key={canal.id} value={canal.id}>
                                                        {canal.nombre}
                                                    </SelectItem>
                                                ))}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </CardContent>
                    </Card>

                    <Card className="bg-zinc-800/50 border-zinc-700">
                        <CardHeader>
                            <CardTitle>Etiquetas</CardTitle>
                        </CardHeader>
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
                                                    disabled={isReadOnly}
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
                                            );
                                        })}
                                    </div>
                                )}
                            />
                        </CardContent>
                    </Card>


                </div>

                {/* Columna 3 */}
                <div className="space-y-6">
                    {initialLeadData && !isReadOnly && (
                        <div className="space-y-6">
                            <ContactCard lead={initialLeadData} />
                        </div>
                    )}
                    {initialLeadData && isReadOnly && (
                        <div className="p-4 bg-amber-900/40 border border-amber-500/50 rounded-lg text-amber-200 flex flex-col items-center gap-3">
                            <ShieldAlert className="h-5 w-5" />
                            <p className="text-sm text-center">
                                Para interactuar con WhatsApp o agregar notas, primero debes tomar el lead y desbloquearlo.
                            </p>
                        </div>
                    )}
                </div>


                {/* --- COLUMNA 4: HISTORIAL UNIFICADO --- */}
                <div className="space-y-6">
                    {initialLeadData && (
                        <HistorialYNotas
                            leadId={initialLeadData.id}
                            agenteId={agenteId || null}
                            initialItems={historialItems.map(item => ({
                                ...item,
                                updatedAt: item.createdAt, // o una fecha adecuada
                                agenteId: item.agenteId, // o el id si lo tienes
                                leadId: initialLeadData.id,
                                metadata: {
                                    ...item.metadata,
                                    agenteNombre: item.agente?.nombre || 'Sistema',
                                    descripcion: item.descripcion || '',
                                },
                                tipoAccion: item.tipoAccion || 'NOTA_MANUAL', // Asegúrate de que tipoAccion tenga un valor por defecto
                            }))}
                        />
                    )}
                </div>
            </div>
        </form>
    );
}