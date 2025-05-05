// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/[leadId]/components/LeadGestionCitas.tsx
'use client';

import React, { useState, useEffect, useCallback, FormEvent } from 'react';
import { format, formatISO } from 'date-fns';
import { es } from 'date-fns/locale/es';

// Importar acciones y tipos
import {
    obtenerCitasLead, crearCitaLead, editarCitaLead, eliminarCitaLead,
    obtenerDatosParaFormularioCita
} from '@/app/admin/_lib/crmAgenda.actions'; // Ajusta ruta!
import {
    CitaExistente, NuevaCitaFormData, EditarCitaFormData,
    DatosFormularioCita
} from '@/app/admin/_lib/types'; // Ajusta ruta!

// Importar componentes UI
import { Input } from "@/app/components/ui/input"; // Ajustar ruta si es necesario
import { Button } from "@/app/components/ui/button"; // Ajustar ruta si es necesario
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select"; // Ajustar ruta si es necesario
import { Textarea } from "@/app/components/ui/textarea"; // Ajustar ruta si es necesario
import { Loader2, PlusCircle, Calendar as CalendarIcon, Clock, User, Tag, Trash2, Save, Pencil, Link as LinkIcon, BellRing, AlertTriangle } from 'lucide-react';
import { Badge } from "@/app/components/ui/badge"; // Ajustar ruta si es necesario

interface Props {
    leadId: string;
    negocioId: string;
}

type DatosFormularioConCrmId = DatosFormularioCita & { crmId: string | null };

const initialFormState: NuevaCitaFormData = {
    tipo: 'Llamada', asunto: '', fecha: '', descripcion: '', agenteId: '', meetingUrl: '', fechaRecordatorio: '',
};

export default function LeadGestionCitas({ leadId, negocioId }: Props) {
    const [citas, setCitas] = useState<CitaExistente[]>([]);
    const [datosForm, setDatosForm] = useState<DatosFormularioConCrmId | null>(null);
    const [crmId, setCrmId] = useState<string | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [showForm, setShowForm] = useState(false);
    const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
    const [citaParaEditar, setCitaParaEditar] = useState<CitaExistente | null>(null);
    const [formData, setFormData] = useState<NuevaCitaFormData | EditarCitaFormData>(initialFormState);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formError, setFormError] = useState<string | null>(null);

    // Cargar datos
    const fetchData = useCallback(async () => {
        setLoading(true); setError(null); setFormError(null);
        setCrmId(null); setCitas([]); setDatosForm(null);
        try {
            const [citasResult, datosFormResult] = await Promise.all([
                obtenerCitasLead(leadId), obtenerDatosParaFormularioCita(negocioId)
            ]);
            if (datosFormResult.success && datosFormResult.data) {
                const dataWithCrm = datosFormResult.data as DatosFormularioConCrmId;
                if (!dataWithCrm.crmId) { throw new Error("CRM no configurado para este negocio."); }
                setCrmId(dataWithCrm.crmId);
                setDatosForm(dataWithCrm);
            } else { throw new Error(datosFormResult.error || "Error cargando datos del formulario."); }
            if (citasResult.success) { setCitas(citasResult.data || []); }
            else { console.error("Error cargando citas:", citasResult.error); setError("No se pudieron cargar las citas existentes."); }
        } catch (err) {
            console.error("Error fetching cita data:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error inesperado.";
            setError(errorMessage);
            setCitas([]); setDatosForm(null); setCrmId(null);
        } finally { setLoading(false); }
    }, [leadId, negocioId]);

    useEffect(() => { fetchData(); }, [fetchData]);

    // Manejadores del formulario
    const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => { /* ... */
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormError(null);
    };
    const handleSelectChange = (name: keyof NuevaCitaFormData | keyof EditarCitaFormData, value: string) => { /* ... */
        setFormData(prev => ({ ...prev, [name]: value }));
        setFormError(null);
    };

    // Abrir formulario
    const openForm = (mode: 'create' | 'edit', cita?: CitaExistente) => { /* ... */
        if (!crmId) { setError("No se puede agendar cita: CRM no encontrado."); return; }
        setFormMode(mode); setFormError(null);
        if (mode === 'edit' && cita) {
            setCitaParaEditar(cita);
            const fechaParaInput = cita.fecha ? formatISO(new Date(cita.fecha)).slice(0, 16) : '';
            const recordatorioParaInput = cita.fechaRecordatorio ? formatISO(new Date(cita.fechaRecordatorio)).slice(0, 16) : '';
            setFormData({
                tipo: cita.tipo, asunto: cita.asunto, fecha: fechaParaInput,
                descripcion: cita.descripcion || '', agenteId: cita.agenteId || '',
                status: cita.status, meetingUrl: cita.meetingUrl || '',
                fechaRecordatorio: recordatorioParaInput,
            });
        } else {
            setCitaParaEditar(null);
            const defaultAgentId = datosForm?.agentes && datosForm.agentes.length > 0 ? datosForm.agentes[0].id : '';
            setFormData({ ...initialFormState, agenteId: defaultAgentId });
        }
        setShowForm(true);
    };

    // Cerrar y resetear formulario
    const closeForm = () => { /* ... */
        setShowForm(false); setFormError(null); setCitaParaEditar(null);
        const defaultAgentId = datosForm?.agentes && datosForm.agentes.length > 0 ? datosForm.agentes[0].id : '';
        setFormData({ ...initialFormState, agenteId: defaultAgentId });
    };

    // Submit
    const handleFormSubmit = async (e: FormEvent<HTMLFormElement>) => { /* ... */
        e.preventDefault(); setFormError(null); setIsSubmitting(true);
        if (!crmId) { setFormError("Error interno: No se encontró ID de CRM."); setIsSubmitting(false); return; }
        if (!formData.fecha) { setFormError("La fecha y hora son requeridas."); setIsSubmitting(false); return; }
        if (!formData.agenteId) { setFormError("Debes seleccionar un agente."); setIsSubmitting(false); return; }
        if (formMode === 'edit' && !('status' in formData && formData.status)) { setFormError("El status es requerido al editar."); setIsSubmitting(false); return; }
        if (formData.fechaRecordatorio && formData.fecha && new Date(formData.fechaRecordatorio) >= new Date(formData.fecha)) {
            setFormError("La fecha de recordatorio debe ser anterior a la fecha de la cita."); setIsSubmitting(false); return;
        }
        try {
            let result;
            if (formMode === 'create') { const dataToCreate: NuevaCitaFormData = { tipo: formData.tipo, asunto: formData.asunto, fecha: formData.fecha, descripcion: formData.descripcion, agenteId: formData.agenteId, meetingUrl: formData.meetingUrl, fechaRecordatorio: formData.fechaRecordatorio, }; result = await crearCitaLead(leadId, dataToCreate); }
            else if (formMode === 'edit' && citaParaEditar) { const dataToEdit: EditarCitaFormData = { tipo: formData.tipo, asunto: formData.asunto, fecha: formData.fecha, descripcion: formData.descripcion, agenteId: formData.agenteId, status: (formData as EditarCitaFormData).status, meetingUrl: formData.meetingUrl, fechaRecordatorio: formData.fechaRecordatorio, }; result = await editarCitaLead(citaParaEditar.id, dataToEdit); }
            else { throw new Error("Modo de formulario inválido."); }
            if (result.success && result.data) { await fetchData(); closeForm(); }
            else { throw new Error(result.error || "Error desconocido al guardar la cita."); }
        } catch (err) { console.error(`Error submitting ${formMode} cita:`, err); setFormError(err instanceof Error ? err.message : "Ocurrió un error inesperado."); }
        finally { setIsSubmitting(false); }
    };

    // Eliminar Cita
    const handleEliminarCita = async (citaId: string, asunto: string) => { /* ... */
        if (confirm(`¿Estás seguro de eliminar la cita "${asunto}"?`)) {
            try {
                const result = await eliminarCitaLead(citaId);
                if (result.success) { await fetchData(); } // Recargar datos
                else { throw new Error(result.error || "Error desconocido al eliminar."); }
            } catch (err) { console.error("Error deleting cita:", err); setError(`Error al eliminar: ${err instanceof Error ? err.message : "Error"}`); }
        }
    };

    // Clases comunes
    const labelClasses = "block text-xs font-medium text-zinc-400 mb-1";
    const inputClasses = "block w-full rounded-md border-zinc-600 bg-zinc-700/50 text-zinc-100 shadow-sm focus:border-sky-500 focus:ring-sky-500 sm:text-sm p-2 disabled:opacity-50 text-xs";
    const selectTriggerClasses = `${inputClasses} flex justify-between items-center`;
    const citaItemClasses = "p-3 border border-zinc-700 rounded-md bg-zinc-800/50 space-y-1.5 relative"; // Quitado 'group'
    // --- CORRECCIÓN: Clases para botones siempre visibles ---
    const editDeleteButtonClasses = "p-1 text-zinc-500 hover:text-zinc-100 hover:bg-zinc-700 rounded disabled:opacity-30"; // Quitado absolute, opacity, group-hover, transition


    return (
        <div className="space-y-4">
            {/* Botón Agendar */}
            <Button variant="outline" size="sm" onClick={() => openForm('create')} className="w-full border-dashed border-zinc-600 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100" disabled={loading || !crmId} title={!crmId ? "CRM no configurado o error al cargar" : undefined}>
                <PlusCircle size={14} className="mr-2" /> Agendar Nueva Cita / Tarea
            </Button>

            {/* Formulario */}
            {showForm && (
                <form onSubmit={handleFormSubmit} className="p-4 border border-zinc-700 rounded-lg bg-zinc-800 space-y-3 animate-in fade-in duration-200">
                    {/* ... (contenido del formulario sin cambios) ... */}
                    <h4 className="text-sm font-semibold text-zinc-200 mb-2">{formMode === 'create' ? 'Nueva Cita / Tarea' : `Editando: ${citaParaEditar?.asunto}`}</h4> {formError && <p className="text-xs text-red-400 bg-red-900/20 p-2 rounded border border-red-700">{formError}</p>} <div className="grid grid-cols-2 gap-3"> <div> <label htmlFor="tipo" className={labelClasses}>Tipo <span className="text-red-500">*</span></label> <Select value={formData.tipo} onValueChange={(v) => handleSelectChange('tipo', v)} disabled={isSubmitting}> <SelectTrigger id="tipo" className={selectTriggerClasses}><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="Llamada">Llamada</SelectItem> <SelectItem value="Reunion">Reunión</SelectItem> <SelectItem value="Email">Enviar Email</SelectItem> <SelectItem value="Tarea">Tarea Pendiente</SelectItem> <SelectItem value="Otro">Otro</SelectItem> </SelectContent> </Select> </div> <div> <label htmlFor="agenteId" className={labelClasses}>Agente <span className="text-red-500">*</span></label> <Select value={formData.agenteId || ''} onValueChange={(v) => handleSelectChange('agenteId', v)} disabled={isSubmitting || !datosForm}> <SelectTrigger id="agenteId" className={selectTriggerClasses}><SelectValue placeholder="Asignar a..." /></SelectTrigger> <SelectContent> {datosForm?.agentes.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)} </SelectContent> </Select> </div> </div> <div> <label htmlFor="asunto" className={labelClasses}>Asunto <span className="text-red-500">*</span></label> <Input id="asunto" name="asunto" required value={formData.asunto} onChange={handleInputChange} className={inputClasses} disabled={isSubmitting} maxLength={100} /> </div> <div className="grid grid-cols-1 md:grid-cols-2 gap-3"> <div> <label htmlFor="fecha" className={labelClasses}>Fecha y Hora <span className="text-red-500">*</span></label> <Input id="fecha" name="fecha" type="datetime-local" required value={formData.fecha} onChange={handleInputChange} className={inputClasses} disabled={isSubmitting} min={new Date().toISOString().slice(0, 16)} /> </div> <div> <label htmlFor="fechaRecordatorio" className={labelClasses}>Recordatorio (Opcional)</label> <Input id="fechaRecordatorio" name="fechaRecordatorio" type="datetime-local" value={formData.fechaRecordatorio || ''} onChange={handleInputChange} className={inputClasses} disabled={isSubmitting} /> </div> </div> <div> <label htmlFor="meetingUrl" className={labelClasses}>URL Reunión (Opcional)</label> <Input id="meetingUrl" name="meetingUrl" type="url" value={formData.meetingUrl || ''} onChange={handleInputChange} className={inputClasses} disabled={isSubmitting} placeholder="https://meet.google.com/..." /> </div> <div> <label htmlFor="descripcion" className={labelClasses}>Descripción / Notas</label> <Textarea id="descripcion" name="descripcion" rows={3} value={formData.descripcion || ''} onChange={handleInputChange} className={inputClasses} disabled={isSubmitting} /> </div> {formMode === 'edit' && (<div> <label htmlFor="status" className={labelClasses}>Status <span className="text-red-500">*</span></label> <Select value={(formData as EditarCitaFormData).status || 'pendiente'} onValueChange={(v) => handleSelectChange('status', v)} disabled={isSubmitting}> <SelectTrigger id="status" className={selectTriggerClasses}><SelectValue /></SelectTrigger> <SelectContent> <SelectItem value="pendiente">Pendiente</SelectItem> <SelectItem value="completada">Completada</SelectItem> <SelectItem value="cancelada">Cancelada</SelectItem> </SelectContent> </Select> </div>)} <div className="flex justify-end gap-2 pt-2"> <Button type="button" variant="ghost" size="sm" onClick={closeForm} disabled={isSubmitting}>Cancelar</Button> <Button type="submit" size="sm" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700"> {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />} {formMode === 'create' ? 'Guardar Cita' : 'Actualizar Cita'} </Button> </div>
                </form>
            )}

            {/* Lista de Citas Existentes */}
            <div className="space-y-3 pt-2">
                <h4 className="text-sm font-medium text-zinc-400">
                    {error && !loading ? <span className='text-red-500 flex items-center gap-1'><AlertTriangle size={14} /> {error}</span> :
                        citas.length > 0 ? 'Historial de Agenda:' : loading ? '' : 'No hay citas agendadas.'}
                </h4>
                {loading && (<div className="flex justify-center items-center h-20"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>)}
                {!loading && citas.map(cita => (
                    <div key={cita.id} className={citaItemClasses}>

                        {/* --- Contenedor de Botones Ajustado --- */}
                        <div className="absolute top-5 right-2 flex gap-1"> {/* Ajustado top/right y gap */}
                            <button onClick={() => openForm('edit', cita)} className={editDeleteButtonClasses} title="Editar Cita" disabled={isSubmitting}> <Pencil size={12} /> </button>
                            <button onClick={() => handleEliminarCita(cita.id, cita.asunto)} className={`${editDeleteButtonClasses} hover:text-red-400`} title="Eliminar Cita" disabled={isSubmitting}> <Trash2 size={12} /> </button>
                        </div>

                        {/* Contenido Cita (con padding derecho para no solapar botones) */}
                        <div className="flex justify-between items-start gap-2 pr-20"> {/* Aumentado pr */}
                            <div>
                                <p className="text-xs font-semibold text-zinc-100 flex items-center gap-1.5">
                                    {cita.tipo === 'Llamada' ? <Clock size={12} /> : cita.tipo === 'Reunion' ? <CalendarIcon size={12} /> : <Tag size={12} />} {cita.asunto} </p><p className="text-xs text-zinc-400 mt-0.5"> {format(new Date(cita.fecha), 'PPP p', { locale: es })} </p>{cita.fechaRecordatorio && (<p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1"> <BellRing size={10} /> Recordatorio: {format(new Date(cita.fechaRecordatorio), 'Pp', { locale: es })} </p>)}</div>
                            <Badge
                                variant={cita.status === 'completada' ? 'default' : cita.status === 'cancelada' ? 'destructive' : 'secondary'}
                                className={`capitalize text-[10px] ${cita.status === 'completada' ? 'bg-green-600/70 border-green-500/50' : ''}`}>
                                {cita.status}
                            </Badge>
                        </div>
                        {cita.meetingUrl && (<div className="pt-1 border-t border-zinc-700/50 mt-1.5 pr-10"> <a href={cita.meetingUrl} target="_blank" rel="noopener noreferrer" className="text-xs text-sky-400 hover:text-sky-300 flex items-center gap-1 truncate" title={cita.meetingUrl}> <LinkIcon size={12} /> {cita.meetingUrl} </a> </div>)}
                        {cita.descripcion && <p className="text-xs text-zinc-300 pt-1 border-t border-zinc-700/50 mt-1.5 pr-10">{cita.descripcion}</p>}
                        {cita.agente && <p className="text-[10px] text-zinc-500 flex items-center gap-1 mt-1 pr-10"><User size={10} /> {cita.agente.nombre}</p>}
                    </div>
                ))}
                {!loading && !error && citas.length === 0 && (<p className="text-xs text-zinc-500 text-center italic py-4">No se encontraron citas para este lead.</p>)}
            </div>
        </div>
    );
}
