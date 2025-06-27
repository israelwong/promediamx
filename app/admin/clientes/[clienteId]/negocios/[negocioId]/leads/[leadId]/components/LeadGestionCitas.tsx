// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/[leadId]/components/LeadGestionCitas.tsx
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { format, formatISO, parseISO, isValid as isValidDate } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { useForm, Controller, SubmitHandler, FieldErrors } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { ActionResult } from '@/app/admin/_lib/types'; // Asegúrate de que esta ruta sea correcta

// Nuevas Actions y Tipos/Schemas Zod
import {
    listarCitasLeadAction,
    obtenerDatosParaFormularioCitaAction,
    crearCitaLeadAction,
    editarCitaLeadAction,
    eliminarCitaLeadAction,
} from '@/app/admin/_lib/actions/agendaCrm/agendaCrm.actions';
import {
    nuevaCitaFormValidationSchema,
    editarCitaFormValidationSchema,
    type AgendaCrmItemData,
    type DatosFormularioCitaData,
    type NuevaCitaFormData, // Este es z.infer<typeof nuevaCitaFormValidationSchema>
    type EditarCitaFormData, // Este es z.infer<typeof editarCitaFormValidationSchema>
    type AgenteSimpleData, // Importado desde lead.schemas o definido en agendaCrm.schemas
} from '@/app/admin/_lib/actions/agendaCrm/agendaCrm.schemas';

// Componentes UI
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Textarea } from "@/app/components/ui/textarea";
import { Loader2, PlusCircle, Trash2, Save, Pencil, Link as LinkIcon, BellRing, AlertTriangle, CalendarDays, UserCircle as UserIcon } from 'lucide-react'; // UserCircle renombrado para evitar conflicto
import { Badge } from "@/app/components/ui/badge";

interface Props {
    leadId: string;
    negocioId: string;
}

// Define el tipo para el formulario, que puede ser de creación o edición
type CitaFormData = NuevaCitaFormData | EditarCitaFormData;

export default function LeadGestionCitas({ leadId, negocioId }: Props) {
    const [citas, setCitas] = useState<AgendaCrmItemData[]>([]);
    const [datosFormSelects, setDatosFormSelects] = useState<DatosFormularioCitaData | null>(null);
    const [crmIdParaCrear, setCrmIdParaCrear] = useState<string | null>(null);

    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [citaIdParaEditar, setCitaIdParaEditar] = useState<string | null>(null);

    const [isSubmittingForm, setIsSubmittingForm] = useState(false);
    const [formSubmitError, setFormSubmitError] = useState<string | null>(null);

    const {
        register,
        handleSubmit,
        control,
        // setValue, 
        reset,
        formState: { errors: rhfErrors }
    } = useForm<CitaFormData>({ // Usar la unión de tipos aquí
        resolver: zodResolver(formMode === 'create' ? nuevaCitaFormValidationSchema : editarCitaFormValidationSchema),
        // defaultValues se establecerán dinámicamente en openForm
    });

    const initializeDefaultCreateValues = useCallback((agentes: AgenteSimpleData[] | undefined): NuevaCitaFormData => {
        return {
            tipo: 'Llamada',
            agenteId: agentes?.[0]?.id || null, // null si no hay agentes o no se selecciona
            asunto: '',
            fecha: new Date(), // Objeto Date
            descripcion: null,
            meetingUrl: null,
            fechaRecordatorio: null, // Objeto Date o null
        };
    }, []);

    const fetchData = useCallback(async (initialSetup: boolean = false) => {
        if (initialSetup) {
            setIsLoading(true);
        }
        setError(null);
        if (initialSetup) { // Solo resetear estos en la carga inicial completa
            setFormSubmitError(null);
            setCitas([]);
            setDatosFormSelects(null);
            setCrmIdParaCrear(null);
        }

        try {
            const [citasResult, datosFormSelectsResult] = await Promise.all([
                listarCitasLeadAction({ leadId }),
                obtenerDatosParaFormularioCitaAction({ negocioId })
            ]);

            if (datosFormSelectsResult.success && datosFormSelectsResult.data) {
                setDatosFormSelects(datosFormSelectsResult.data);
                if (!datosFormSelectsResult.data.crmId) {
                    throw new Error("CRM no configurado para este negocio. No se pueden gestionar citas.");
                }
                setCrmIdParaCrear(datosFormSelectsResult.data.crmId);
                // Si es la carga inicial y el formulario no está abierto, pre-popula el reset
                if (initialSetup && !showForm && formMode === 'create') {
                    reset(initializeDefaultCreateValues(datosFormSelectsResult.data.agentes));
                }
            } else {
                throw new Error(datosFormSelectsResult.error || "Error cargando datos para el formulario de cita.");
            }

            if (citasResult.success && citasResult.data) {
                setCitas(citasResult.data);
            } else {
                console.error("Error cargando citas:", citasResult.error);
                setError("No se pudieron cargar las citas existentes.");
            }
        } catch (err) {
            const errorMessage = err instanceof Error ? err.message : "Error inesperado.";
            setError(errorMessage);
            console.error("Error en fetchData (LeadGestionCitas):", err);
        } finally {
            if (initialSetup) setIsLoading(false);
        }
    }, [leadId, negocioId, reset, initializeDefaultCreateValues, showForm, formMode]); // Añadidas las dependencias

    useEffect(() => {
        fetchData(true); // Carga inicial
    }, [fetchData]); // fetchData ya tiene sus dependencias clave


    const openForm = useCallback((mode: 'create' | 'edit', cita?: AgendaCrmItemData) => {
        if (!crmIdParaCrear && mode === 'create') {
            setError("No se puede agendar cita: Configuración de CRM no disponible.");
            return;
        }
        setFormMode(mode);
        setFormSubmitError(null);
        setIsSubmittingForm(false);

        if (mode === 'edit' && cita) {
            setCitaIdParaEditar(cita.id);
            const valuesToReset: Partial<EditarCitaFormData> = {
                tipo: cita.tipo,
                agenteId: cita.agenteId || null, // null para "sin seleccionar"
                asunto: cita.asunto,
                fecha: isValidDate(new Date(cita.fecha)) ? new Date(cita.fecha) : new Date(),
                descripcion: cita.descripcion || null,
                meetingUrl: cita.meetingUrl || null,
                fechaRecordatorio: cita.fechaRecordatorio && isValidDate(new Date(cita.fechaRecordatorio)) ? new Date(cita.fechaRecordatorio) : null,
                status: cita.status,
            };
            reset(valuesToReset);
        } else { // Modo 'create'
            setCitaIdParaEditar(null);
            reset(initializeDefaultCreateValues(datosFormSelects?.agentes));
        }
        setShowForm(true);
    }, [crmIdParaCrear, reset, initializeDefaultCreateValues, datosFormSelects?.agentes]);

    const closeForm = useCallback(() => {
        setShowForm(false);
        setFormSubmitError(null);
        setCitaIdParaEditar(null);
        reset(initializeDefaultCreateValues(datosFormSelects?.agentes));
    }, [reset, initializeDefaultCreateValues, datosFormSelects?.agentes]);

    const onFormSubmitHandler: SubmitHandler<CitaFormData> = async (formDataFromRHF) => {
        setFormSubmitError(null);
        setIsSubmittingForm(true);

        try {
            let result: ActionResult<AgendaCrmItemData | null>;
            if (formMode === 'create') {
                if (!crmIdParaCrear) throw new Error("CRM ID no disponible para crear cita.");
                result = await crearCitaLeadAction({
                    leadId: leadId,
                    crmId: crmIdParaCrear,
                    datos: formDataFromRHF as NuevaCitaFormData, // Zod se encarga de validar la estructura
                });
            } else if (formMode === 'edit' && citaIdParaEditar) {
                result = await editarCitaLeadAction({
                    citaId: citaIdParaEditar,
                    datos: formDataFromRHF as EditarCitaFormData, // Zod se encarga de validar
                });
            } else {
                throw new Error("Modo de formulario inválido o ID de cita faltante.");
            }

            if (result.success && result.data) {
                await fetchData(false); // Recargar lista de citas sin spinner de página completa
                closeForm();
            } else {
                throw new Error(result.error || `Error al ${formMode === 'create' ? 'crear' : 'actualizar'} la cita.`);
            }
        } catch (err) {
            setFormSubmitError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmittingForm(false);
        }
    };

    const handleEliminarCita = async (citaId: string, asunto: string) => {
        if (confirm(`¿Estás seguro de eliminar la cita "${asunto}"?`)) {
            // Podrías poner un loader específico para el ítem que se borra
            try {
                const result = await eliminarCitaLeadAction({ citaId });
                if (result.success) {
                    await fetchData(false); // Recargar datos sin spinner de página
                } else {
                    throw new Error(result.error || "Error desconocido al eliminar.");
                }
            } catch (err) {
                console.error("Error deleting cita:", err);
                // Mostrar error general o específico
                setFormSubmitError(`Error al eliminar: ${err instanceof Error ? err.message : "Error"}`);
            }
        }
    };

    const labelClasses = "block text-xs font-medium text-zinc-400 mb-1";
    const inputClasses = "block w-full rounded-md border-zinc-600 bg-zinc-700/50 text-zinc-100 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm p-2 disabled:opacity-50 text-xs";
    const selectTriggerClasses = `${inputClasses} flex justify-between items-center`;
    const citaItemClasses = "p-3 border border-zinc-700 rounded-md bg-zinc-800/50 space-y-1.5 relative";
    const editDeleteButtonClasses = "p-1 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700 rounded disabled:opacity-30";

    // Formateador de fecha para mostrar en la lista
    const formatDisplayDate = (date: Date) => format(new Date(date), "PPP 'a las' p", { locale: es });
    const formatRecordatorioDate = (date: Date) => format(new Date(date), "Pp", { locale: es });

    return (
        <div className="space-y-4">
            <Button
                variant="outline" size="sm"
                onClick={() => openForm('create')}
                className="w-full border-dashed border-zinc-600 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100"
                disabled={isLoading || !crmIdParaCrear}
                title={!crmIdParaCrear && !isLoading ? "CRM no configurado o error al cargar datos." : "Agendar Nueva Cita / Tarea"}
            >
                <PlusCircle size={14} className="mr-2" /> Agendar Nueva Cita / Tarea
            </Button>

            {error && !showForm && ( // Mostrar error general si el formulario no está abierto
                <p className="text-sm text-red-400 text-center border border-red-600/40 bg-red-900/20 p-2 rounded-md">
                    <AlertTriangle size={16} className="inline mr-1" /> {error}
                </p>
            )}

            {showForm && (
                <form onSubmit={handleSubmit(onFormSubmitHandler)} className="p-4 border border-zinc-700 rounded-lg bg-zinc-800 space-y-3 animate-in fade-in duration-200">
                    <h4 className="text-sm font-semibold text-zinc-200 mb-2">
                        {formMode === 'create' ? 'Nueva Cita / Tarea' : `Editando: ${citaIdParaEditar ? (citas.find(c => c.id === citaIdParaEditar)?.asunto || 'Cita') : 'Cita'}`}
                    </h4>
                    {formSubmitError && <p className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-700">{formSubmitError}</p>}

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="tipo" className={labelClasses}>Tipo <span className="text-red-500">*</span></label>
                            <Controller
                                name="tipo"
                                control={control}
                                render={({ field }) => (
                                    <Select value={field.value} onValueChange={field.onChange} disabled={isSubmittingForm}>
                                        <SelectTrigger id="tipo" className={selectTriggerClasses}><SelectValue placeholder="Seleccionar tipo..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="Llamada">Llamada</SelectItem>
                                            <SelectItem value="Reunion">Reunión</SelectItem>
                                            <SelectItem value="Email">Enviar Email</SelectItem>
                                            <SelectItem value="Tarea">Tarea Pendiente</SelectItem>
                                            <SelectItem value="Otro">Otro</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {rhfErrors.tipo && <p className="text-xs text-red-400 mt-1">{rhfErrors.tipo.message}</p>}
                        </div>
                        <div>
                            <label htmlFor="agenteId" className={labelClasses}>Agente <span className="text-red-500">*</span></label>
                            <Controller
                                name="agenteId"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={field.value || undefined} // Radix usa undefined para placeholder
                                        onValueChange={(value) => field.onChange(value || null)}
                                        disabled={isSubmittingForm || !datosFormSelects?.agentes.length}
                                    >
                                        <SelectTrigger id="agenteId" className={selectTriggerClasses}><SelectValue placeholder="Asignar a..." /></SelectTrigger>
                                        <SelectContent>
                                            {datosFormSelects?.agentes.map((a) => (
                                                <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>
                                            ))}
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {rhfErrors.agenteId && <p className="text-xs text-red-400 mt-1">{rhfErrors.agenteId.message}</p>}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="asunto" className={labelClasses}>Asunto <span className="text-red-500">*</span></label>
                        <Input id="asunto" {...register("asunto")} className={inputClasses} disabled={isSubmittingForm} maxLength={100} />
                        {rhfErrors.asunto && <p className="text-xs text-red-400 mt-1">{rhfErrors.asunto.message}</p>}
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                        <div>
                            <label htmlFor="fecha" className={labelClasses}>Fecha y Hora <span className="text-red-500">*</span></label>
                            <Controller
                                name="fecha"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="fecha"
                                        type="datetime-local"
                                        className={inputClasses}
                                        disabled={isSubmittingForm}
                                        value={field.value && isValidDate(new Date(field.value)) ? formatISO(new Date(field.value)).slice(0, 16) : ''}
                                        onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                                        min={formatISO(new Date()).slice(0, 16)}
                                    />
                                )}
                            />
                            {rhfErrors.fecha && <p className="text-xs text-red-400 mt-1">{(rhfErrors.fecha as FieldErrors<CitaFormData>['fecha'])?.message || "Fecha inválida"}</p>}
                        </div>
                        <div>
                            <label htmlFor="fechaRecordatorio" className={labelClasses}>Recordatorio (Opcional)</label>
                            <Controller
                                name="fechaRecordatorio"
                                control={control}
                                render={({ field }) => (
                                    <Input
                                        id="fechaRecordatorio"
                                        type="datetime-local"
                                        className={inputClasses}
                                        disabled={isSubmittingForm}
                                        value={field.value && isValidDate(new Date(field.value)) ? formatISO(new Date(field.value)).slice(0, 16) : ''}
                                        onChange={(e) => field.onChange(e.target.value ? parseISO(e.target.value) : null)}
                                    />
                                )}
                            />
                            {rhfErrors.fechaRecordatorio && <p className="text-xs text-red-400 mt-1">{rhfErrors.fechaRecordatorio.message}</p>}
                        </div>
                    </div>
                    <div>
                        <label htmlFor="meetingUrl" className={labelClasses}>URL Reunión (Opcional)</label>
                        <Input id="meetingUrl" type="url" {...register("meetingUrl")} className={inputClasses} disabled={isSubmittingForm} placeholder="https://meet.google.com/..." />
                        {rhfErrors.meetingUrl && <p className="text-xs text-red-400 mt-1">{rhfErrors.meetingUrl.message}</p>}
                    </div>
                    <div>
                        <label htmlFor="descripcion" className={labelClasses}>Descripción / Notas</label>
                        <Textarea id="descripcion" {...register("descripcion")} rows={3} className={inputClasses} disabled={isSubmittingForm} />
                        {rhfErrors.descripcion && <p className="text-xs text-red-400 mt-1">{rhfErrors.descripcion.message}</p>}
                    </div>
                    {formMode === 'edit' && (
                        <div>
                            <label htmlFor="status" className={labelClasses}>Status <span className="text-red-500">*</span></label>
                            <Controller
                                name="status"
                                control={control}
                                render={({ field }) => (
                                    <Select
                                        value={(field.value as EditarCitaFormData['status']) || undefined} // Cast y undefined para placeholder
                                        onValueChange={field.onChange}
                                        disabled={isSubmittingForm}
                                    >
                                        <SelectTrigger id="status" className={selectTriggerClasses}><SelectValue placeholder="Seleccionar status..." /></SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="pendiente">Pendiente</SelectItem>
                                            <SelectItem value="completada">Completada</SelectItem>
                                            <SelectItem value="cancelada">Cancelada</SelectItem>
                                        </SelectContent>
                                    </Select>
                                )}
                            />
                            {(rhfErrors as FieldErrors<EditarCitaFormData>).status &&
                                <p className="text-xs text-red-400 mt-1">{(rhfErrors as FieldErrors<EditarCitaFormData>).status?.message}</p>
                            }
                        </div>
                    )}
                    <div className="flex justify-end gap-2 pt-2">
                        <Button type="button" variant="ghost" size="sm" onClick={closeForm} disabled={isSubmittingForm}>Cancelar</Button>
                        <Button type="submit" size="sm" disabled={isSubmittingForm || (formMode === 'create' && !crmIdParaCrear)} className="bg-blue-600 hover:bg-blue-700">
                            {isSubmittingForm ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            {formMode === 'create' ? 'Guardar Cita' : 'Actualizar Cita'}
                        </Button>
                    </div>
                </form>
            )}

            {/* Lista de Citas Existentes */}
            <div className="space-y-3 pt-2">
                <h4 className="text-sm font-medium text-zinc-400">
                    {error && !isLoading ? <span className='text-red-500 flex items-center gap-1'><AlertTriangle size={14} /> {error}</span> :
                        citas.length > 0 ? 'Historial de Agenda:' : isLoading ? 'Cargando citas...' : 'Aún no hay citas o tareas agendadas.'}
                </h4>
                {isLoading && (<div className="flex justify-center items-center h-20"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>)}

                {!isLoading && citas.map(cita => (
                    <div key={cita.id} className={citaItemClasses}>
                        <div className="absolute top-2 right-2 flex gap-0.5">
                            <button onClick={() => openForm('edit', cita)} className={editDeleteButtonClasses} title="Editar Cita" disabled={isSubmittingForm}> <Pencil size={12} /> </button>
                            <button onClick={() => handleEliminarCita(cita.id, cita.asunto)} className={`${editDeleteButtonClasses} hover:text-red-400`} title="Eliminar Cita" disabled={isSubmittingForm}> <Trash2 size={12} /> </button>
                        </div>
                        <div className="flex justify-between items-start gap-2 pr-16">
                            <div>
                                <p className="text-sm font-semibold text-zinc-100 flex items-center gap-1.5">
                                    <CalendarDays size={12} className="text-zinc-400" /> {/* Icono Genérico */}
                                    <span className="capitalize mr-1">[{cita.tipo}]</span> {cita.asunto}
                                </p>
                                <p className="text-xs text-zinc-400 mt-0.5">
                                    {formatDisplayDate(cita.fecha)}
                                </p>
                                {cita.fechaRecordatorio && isValidDate(new Date(cita.fechaRecordatorio)) && (
                                    <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                                        <BellRing size={10} /> Recordatorio: {formatRecordatorioDate(cita.fechaRecordatorio)}
                                    </p>
                                )}
                            </div>
                            <Badge
                                variant={cita.status === 'completada' ? 'default' : cita.status === 'cancelada' ? 'destructive' : 'secondary'}
                                className={`capitalize text-[10px] whitespace-nowrap ${cita.status === 'completada' ? 'bg-green-500/90 border-green-400/70 text-white' :
                                        cita.status === 'cancelada' ? 'bg-red-600/90 border-red-500/70 text-white' :
                                            'bg-zinc-500/90 border-zinc-400/70 text-zinc-100' // Estado pendiente
                                    }`}>
                                {cita.status.replace('_', ' ')}
                            </Badge>
                        </div>
                        {cita.meetingUrl && (<div className="pt-1.5 border-t border-zinc-700/50 mt-1.5 pr-16"> <a href={cita.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 truncate" title={cita.meetingUrl}> <LinkIcon size={12} /> {cita.meetingUrl} </a> </div>)}
                        {cita.descripcion && <p className="text-xs text-zinc-300 pt-1.5 border-t border-zinc-700/50 mt-1.5 pr-16 whitespace-pre-line">{cita.descripcion}</p>}
                        {cita.agente && <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1.5 pr-16 border-t border-zinc-700/50 pt-1.5"><UserIcon size={11} /> {cita.agente.nombre}</p>}
                    </div>
                ))}
                {!isLoading && !error && citas.length === 0 && crmIdParaCrear && (<p className="text-xs text-zinc-500 text-center italic py-4">No se encontraron citas para este lead.</p>)}
            </div>
        </div>
    );
}