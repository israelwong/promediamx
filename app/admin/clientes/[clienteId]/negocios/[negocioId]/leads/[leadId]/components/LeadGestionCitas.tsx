// 'use client';

// import React, { useState, useEffect, useCallback, useTransition } from 'react';
// import { useForm, Controller, FieldErrors } from 'react-hook-form';
// import { zodResolver } from '@hookform/resolvers/zod';
// import { format } from 'date-fns';
// import { es } from 'date-fns/locale/es';
// import { toast } from 'react-hot-toast';

// // --- Lógica del Servidor ---
// import {
//     listarCitasLeadAction,
//     crearCitaSimpleLeadAction,
//     eliminarCitaLeadAction,
// } from '@/app/admin/_lib/actions/agendaCrm/agendaCrm.actions';
// import { nuevaCitaSimpleFormSchema, type NuevaCitaSimpleFormData } from '@/app/admin/_lib/actions/agendaCrm/agendaCrm.schemas';
// import type { Agenda } from '@prisma/client';

// // --- Componentes UI ---
// import { Input } from "@/app/components/ui/input";
// import { Button } from "@/app/components/ui/button";
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
// import { Loader2, PlusCircle, Trash2, Save, Calendar, Video, MapPin, Send } from 'lucide-react';
// import { Label } from '@/app/components/ui/label';

// interface Props {
//     leadId: string;
//     negocioId: string;
// }

// export default function LeadGestionCitas({ leadId, negocioId }: Props) {
//     const [cita, setCita] = useState<Agenda | null>(null);
//     const [isLoading, setIsLoading] = useState(true);
//     const [showForm, setShowForm] = useState(false);

//     // ✅ Estados de carga separados para cada botón
//     const [isSaving, startSaveTransition] = useTransition();
//     const [isNotifying, startNotifyTransition] = useTransition();
//     const isPending = isSaving || isNotifying;

//     const { register, handleSubmit, control, watch, formState: { errors }, reset } = useForm<NuevaCitaSimpleFormData>({
//         resolver: zodResolver(nuevaCitaSimpleFormSchema),
//         defaultValues: { modalidad: 'PRESENCIAL', fecha: new Date(), linkReunionVirtual: '' },
//     });

//     const modalidadSeleccionada = watch('modalidad');

//     const fetchData = useCallback(async () => {
//         setIsLoading(true);
//         const citasResult = await listarCitasLeadAction({ leadId });
//         if (citasResult.success && citasResult.data) {
//             setCita(citasResult.data[0] || null);
//         } else {
//             toast.error("No se pudieron cargar las citas.");
//         }
//         setIsLoading(false);
//     }, [leadId]);

//     useEffect(() => {
//         fetchData();
//     }, [fetchData]);

//     // ✅ La función de envío ahora acepta un booleano para la notificación
//     const onCitaSubmit = (data: NuevaCitaSimpleFormData, enviarNotificacion: boolean) => {
//         const action = async () => {
//             const result = await crearCitaSimpleLeadAction({
//                 leadId,
//                 negocioId,
//                 datos: data,
//                 enviarNotificacion // ✅ Se pasa el indicador a la acción
//             });

//             if (result.success) {
//                 toast.success(enviarNotificacion ? "Cita agendada y notificada." : "Cita agendada.");
//                 setShowForm(false);
//                 reset({ modalidad: 'PRESENCIAL', fecha: new Date(), linkReunionVirtual: '' });
//                 fetchData();
//             } else {
//                 toast.error(result.error || "No se pudo procesar la solicitud.");
//             }
//         };

//         if (enviarNotificacion) {
//             startNotifyTransition(action);
//         } else {
//             startSaveTransition(action);
//         }
//     };

//     const onInvalid = (errors: FieldErrors<NuevaCitaSimpleFormData>) => {
//         console.error("[LeadGestionCitas] Errores de validación:", errors);
//         const firstError = Object.values(errors)[0]?.message;
//         toast.error(firstError || "Por favor, corrige los errores en el formulario.");
//     };

//     const handleEliminarCita = async () => {
//         if (!cita || !confirm("¿Estás seguro de eliminar esta cita?")) return;
//         startSaveTransition(async () => {
//             const result = await eliminarCitaLeadAction({ citaId: cita.id });
//             if (result.success) {
//                 toast.success("Cita eliminada.");
//                 fetchData();
//             } else {
//                 toast.error(result.error || "No se pudo eliminar la cita.");
//             }
//         });
//     };

//     if (isLoading) {
//         return <div className="flex justify-center items-center h-40"><Loader2 className="h-6 w-6 animate-spin text-zinc-400" /></div>;
//     }

//     return (
//         <div className="space-y-3">
//             <h3 className="text-base font-semibold text-zinc-200 flex items-center gap-2"><Calendar size={16} /> Cita Agendada</h3>
//             {cita ? (
//                 <div className="p-5 border border-zinc-700 rounded-md bg-zinc-800/50 space-y-2 text-sm">
//                     <p className="text-zinc-300"><strong>Fecha:</strong></p>
//                     <p className="text-zinc-300 text-lg font-semibold">
//                         {format(new Date(cita.fecha), "EEEE, d 'de' MMMM, yyyy 'a las' h:mm a", { locale: es })}
//                     </p>
//                     <p className="text-zinc-300 flex items-center gap-2">
//                         <strong>Modalidad:</strong>
//                         {cita.modalidad === 'VIRTUAL' ? <Video size={14} /> : <MapPin size={14} />} {cita.modalidad}
//                     </p>
//                     {cita.modalidad === 'VIRTUAL' && cita.linkReunionVirtual && (
//                         <a href={cita.linkReunionVirtual} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline truncate block">Link de la reunión</a>
//                     )}
//                     <Button variant="destructive" size="sm" onClick={handleEliminarCita} disabled={isPending} className="mt-2">
//                         <Trash2 size={14} className="mr-1.5" /> Eliminar Cita
//                     </Button>
//                 </div>
//             ) : (
//                 <>
//                     {!showForm && <Button variant="outline" size="sm" onClick={() => setShowForm(true)} className="w-full"><PlusCircle size={14} className="mr-2" /> Agendar Nueva Cita</Button>}
//                     {showForm && (
//                         <form onSubmit={(e) => e.preventDefault()} className="p-4 border border-zinc-700 rounded-lg bg-zinc-800 space-y-3 animate-in fade-in">
//                             <div>
//                                 <Label htmlFor="modalidad" className="text-xs">Modalidad</Label>
//                                 <Controller name="modalidad" control={control} render={({ field }) => (
//                                     <Select onValueChange={field.onChange} value={field.value}><SelectTrigger><SelectValue /></SelectTrigger>
//                                         <SelectContent><SelectItem value="PRESENCIAL">Presencial</SelectItem><SelectItem value="VIRTUAL">Virtual</SelectItem></SelectContent>
//                                     </Select>
//                                 )} />
//                             </div>
//                             <div>
//                                 <Label htmlFor="fecha" className="text-xs">Fecha y Hora</Label>
//                                 <Controller name="fecha" control={control} render={({ field }) => <Input type="datetime-local" value={field.value ? format(field.value, "yyyy-MM-dd'T'HH:mm") : ''} onChange={e => field.onChange(new Date(e.target.value))} />} />
//                                 {errors.fecha && <p className="text-xs text-red-400 mt-1">{errors.fecha.message}</p>}
//                             </div>
//                             {modalidadSeleccionada === 'VIRTUAL' && (
//                                 <div>
//                                     <Label htmlFor="linkReunionVirtual" className="text-xs">Link de la Reunión</Label>
//                                     <Input id="linkReunionVirtual" {...register("linkReunionVirtual")} />
//                                     {errors.linkReunionVirtual && <p className="text-xs text-red-400 mt-1">{errors.linkReunionVirtual.message}</p>}
//                                 </div>
//                             )}
//                             <div className="flex justify-end gap-2 pt-2">
//                                 <Button type="button" variant="ghost" size="sm" onClick={() => setShowForm(false)} disabled={isPending}>Cancelar</Button>

//                                 {/* ✅ Botón para guardar sin notificar */}
//                                 <Button type="button" variant="secondary" size="sm" onClick={handleSubmit(data => onCitaSubmit(data, false), onInvalid)} disabled={isPending}>
//                                     {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
//                                     Guardar
//                                 </Button>

//                                 {/* ✅ Botón para guardar Y notificar */}
//                                 <Button type="button" size="sm" onClick={handleSubmit(data => onCitaSubmit(data, true), onInvalid)} disabled={isPending}>
//                                     {isNotifying ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
//                                     Guardar y Notificar
//                                 </Button>
//                             </div>
//                         </form>
//                     )}
//                 </>
//             )}
//         </div>
//     );
// }
