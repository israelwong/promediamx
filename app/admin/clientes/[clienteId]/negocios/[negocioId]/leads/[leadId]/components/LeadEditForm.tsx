'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

// --- Lógica del Servidor ---
import {
    actualizarLeadAction,
    eliminarLeadAction
} from '@/app/admin/_lib/actions/lead/lead.actions';
import {
    type LeadDetalleData,
    type DatosFormularioLeadData
} from '@/app/admin/_lib/actions/lead/lead.schemas';

// --- Componentes UI ---
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from '@/app/components/ui/label';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Loader2, Save, ArrowLeft, Trash } from 'lucide-react';

// ✅ El schema de Zod se mantiene como la fuente de verdad para la validación manual.
const leadEditFormSchema = z.object({
    nombre: z.string().min(1, "El nombre es requerido."),
    email: z.string().email("Debe ser un email válido.").nullable().optional().or(z.literal('')),
    telefono: z.string().nullable().optional(),
    valorEstimado: z.preprocess(
        (val) => (val === '' || val === null || (typeof val === 'number' && isNaN(val)) ? null : Number(val)),
        z.number().positive("El valor estimado debe ser un número positivo.").nullable().optional()
    ),
    status: z.string().min(1, "El estado es requerido."),
    pipelineId: z.string().cuid().nullable().optional(),
    canalId: z.string().cuid().nullable().optional(),
    etiquetaIds: z.array(z.string().cuid()).optional(),
    jsonParams: z.record(z.string()).optional(),
});

type ActualizarLeadFormData = z.infer<typeof leadEditFormSchema>;

interface Props {
    leadInicial: LeadDetalleData;
    datosFormulario: DatosFormularioLeadData | null;
    negocioId: string;
    clienteId: string;
}

// Datos "Quemados" para la lógica de negocio de los colegios
const comissionData = {
    albatros: {
        comisionFija: 1500,
        niveles: {
            kinder: ['primero', 'segundo', 'tercero'],
            primaria: ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'],
        }
    },
    tecno: {
        colegiaturas: {
            kinder: 2516,
            primaria: 3005,
            secundaria: 3278,
        },
        niveles: {
            kinder: ['primero', 'segundo', 'tercero'],
            primaria: ['primero', 'segundo', 'tercero', 'cuarto', 'quinto', 'sexto'],
            secundaria: ['primero', 'segundo', 'tercero'],
        }
    }
};
const colegiosOptions = ['Colegio Albatros', 'Colegio Tecno'];


export default function LeadFormEditar({ leadInicial, datosFormulario, negocioId, clienteId }: Props) {
    const router = useRouter();
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState<string | null>(null);

    const { register, handleSubmit, control, formState: { isDirty }, reset, watch, setValue } = useForm<ActualizarLeadFormData>({
        defaultValues: {
            ...leadInicial,
            status: leadInicial.status ?? 'activo',
            telefono: leadInicial.telefono ?? '',
            email: leadInicial.email ?? '',
            valorEstimado: leadInicial.valorEstimado ?? undefined,
            pipelineId: leadInicial.pipelineId ?? undefined,
            canalId: leadInicial.canalId ?? undefined,
            jsonParams: (leadInicial.jsonParams as Record<string, string>) || {},
        },
    });

    const watchedJsonParams = watch('jsonParams');
    const watchedColegio = watchedJsonParams?.colegio;
    const watchedNivel = watchedJsonParams?.nivel_educativo;

    const nivelOptions = watchedColegio?.toLowerCase().includes('albatros')
        ? Object.keys(comissionData.albatros.niveles)
        : (watchedColegio?.toLowerCase().includes('tecno') ? Object.keys(comissionData.tecno.niveles) : []);

    const gradoOptions = useMemo(() => {
        if (!watchedColegio || !watchedNivel) return [];
        const colegioKey = watchedColegio.toLowerCase().includes('albatros') ? 'albatros' : 'tecno';
        const niveles = comissionData[colegioKey].niveles;
        return niveles[watchedNivel.toLowerCase() as keyof typeof niveles] || [];
    }, [watchedColegio, watchedNivel]);


    useEffect(() => {
        // Si ya hay un valor estimado, no recalcular
        const currentValorEstimado = watch('valorEstimado');
        if (currentValorEstimado !== undefined && currentValorEstimado !== null) {
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
                    calculatedValue = tuition * 12;
                }
            }
        }
        setValue('valorEstimado', calculatedValue, { shouldValidate: true, shouldDirty: true });
    }, [watchedJsonParams, setValue, watch]);


    useEffect(() => {
        const defaultJsonParams = (leadInicial.jsonParams as Record<string, string>) || {};
        reset({
            ...leadInicial,
            status: leadInicial.status ?? 'activo',
            telefono: leadInicial.telefono ?? '',
            email: leadInicial.email ?? '',
            valorEstimado: leadInicial.valorEstimado ?? undefined,
            pipelineId: leadInicial.pipelineId ?? undefined,
            canalId: leadInicial.canalId ?? undefined,
            jsonParams: {
                colegio: defaultJsonParams.colegio || '',
                nivel_educativo: defaultJsonParams.nivel_educativo || '',
                grado: defaultJsonParams.grado || '',
            },
        });
    }, [leadInicial, reset]);

    const onSubmit: SubmitHandler<ActualizarLeadFormData> = async (formData) => {
        setSubmitError(null);
        setIsSubmitting(true);

        // ✅ Se realiza la validación manualmente aquí.
        const validationResult = leadEditFormSchema.safeParse(formData);
        if (!validationResult.success) {
            const firstError = Object.values(validationResult.error.flatten().fieldErrors)[0]?.[0];
            toast.error(firstError || "Hay errores en el formulario. Por favor, revisa los campos.");
            setIsSubmitting(false);
            return;
        }

        try {
            // Se envían los datos ya validados a la acción del servidor.
            const result = await actualizarLeadAction({ leadId: leadInicial.id, datos: validationResult.data });

            if (result.success) {
                toast.success("Lead actualizado exitosamente.");
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads`);
                router.refresh();
            } else {
                throw new Error(result.error || "Error desconocido al actualizar el lead.");
            }
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (leadId: string) => {
        const confirmed = window.confirm("¿Estás seguro de que deseas eliminar este lead?");
        if (!confirmed) return;

        setIsSubmitting(true);
        try {
            const result = await eliminarLeadAction({ leadId });
            if (result.success) {
                toast.success("Lead eliminado exitosamente.");
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads`);
                router.refresh();
            } else {
                throw new Error(result.error || "Error desconocido al eliminar el lead.");
            }
        } catch (err) {
            setSubmitError(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <CardHeader className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                <div>
                    <CardTitle>Editar Lead</CardTitle>
                    <CardDescription>Actualiza la información y asignaciones de este lead.</CardDescription>
                </div>
                <Button
                    type="button"
                    variant="destructiveOutline"
                    size="sm"
                    onClick={() => handleDelete(leadInicial.id)}
                    disabled={isSubmitting}
                    className="text-red-500 border-red-500 hover:bg-red-500 hover:text-white"
                >
                    <Trash className="mr-2 h-4 w-4" />
                    Eliminar Lead
                </Button>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-6">
                    {submitError && (
                        <div className="bg-red-900/30 border border-red-600 text-red-400 p-3 rounded-md text-sm">
                            {submitError}
                        </div>
                    )}

                    <div className="space-y-4">
                        <h4 className="text-sm font-medium text-zinc-300">Información de Contacto</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="nombre">Nombre Lead</Label>
                                <Input id="nombre" {...register("nombre")} disabled={isSubmitting} />
                            </div>
                            <div>
                                <Label htmlFor="email">Email</Label>
                                <Input id="email" type="email" {...register("email")} disabled={isSubmitting} />
                            </div>
                            <div>
                                <Label htmlFor="telefono">Teléfono</Label>
                                <Input id="telefono" {...register("telefono")} disabled={isSubmitting} />
                            </div>
                            <div>
                                <Label htmlFor="valorEstimado">Valor Estimado (MXN)</Label>
                                <Input id="valorEstimado" type="number" {...register("valorEstimado")} disabled={isSubmitting} />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-zinc-700">
                        <h4 className="text-sm font-medium text-zinc-300">Información Adicional</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label>Colegio</Label>
                                <Controller
                                    name="jsonParams.colegio"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                setValue('jsonParams.nivel_educativo', '');
                                                setValue('jsonParams.grado', '');
                                            }}
                                            value={field.value}
                                            disabled={isSubmitting}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecciona un colegio..." /></SelectTrigger>
                                            <SelectContent>
                                                {colegiosOptions.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
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
                                            onValueChange={(value) => {
                                                field.onChange(value);
                                                setValue('jsonParams.grado', '');
                                            }}
                                            value={field.value}
                                            disabled={isSubmitting || !watchedColegio}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecciona un nivel..." /></SelectTrigger>
                                            <SelectContent>
                                                {nivelOptions.map(n => <SelectItem key={n} value={n} className="capitalize">{n}</SelectItem>)}
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
                                            value={field.value}
                                            disabled={isSubmitting || !watchedNivel}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Selecciona un grado..." /></SelectTrigger>
                                            <SelectContent>
                                                {gradoOptions.map(g => <SelectItem key={g} value={g} className="capitalize">{g}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="space-y-4 pt-6 border-t border-zinc-700">
                        <h4 className="text-sm font-medium text-zinc-300">Asignaciones del CRM</h4>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="pipelineId">Etapa del Pipeline</Label>
                                <Controller
                                    name="pipelineId"
                                    control={control}
                                    render={({ field }) => (
                                        <Select onValueChange={field.onChange} value={field.value ?? ''} disabled={isSubmitting || !datosFormulario}>
                                            <SelectTrigger><SelectValue placeholder="Seleccionar etapa..." /></SelectTrigger>
                                            <SelectContent>
                                                {datosFormulario?.pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                            <div>
                                <Label htmlFor="status">Status del Lead</Label>
                                <Controller
                                    name="status"
                                    control={control}
                                    render={({ field }) => (
                                        <Select
                                            onValueChange={field.onChange}
                                            value={field.value ?? 'activo'}
                                            disabled={isSubmitting}
                                        >
                                            <SelectTrigger><SelectValue placeholder="Seleccionar status..." /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="activo">Activo</SelectItem>
                                                <SelectItem value="archivado">Archivado</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    )}
                                />
                            </div>
                        </div>
                        <div className="space-y-2">
                            <Label>Etiquetas</Label>
                            <Controller
                                name="etiquetaIds"
                                control={control}
                                render={({ field }) => (
                                    <div className="flex flex-wrap gap-2">
                                        {datosFormulario?.etiquetas.map(etiqueta => {
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
                                                    className={`inline-flex items-center rounded-full border px-3 py-1 text-xs font-semibold transition-colors ${isSelected ? 'bg-blue-600 text-white border-blue-500' : 'bg-zinc-800 border-zinc-700 text-zinc-300 hover:bg-zinc-700'
                                                        }`}
                                                >
                                                    {etiqueta.nombre}
                                                </button>
                                            )
                                        })}
                                    </div>
                                )}
                            />
                        </div>
                    </div>

                </CardContent>
                <CardFooter className="flex justify-end gap-3">
                    <Button type="button" variant="outline" onClick={() => router.back()} disabled={isSubmitting}>
                        <ArrowLeft className="mr-2 h-4 w-4" /> Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting || !isDirty}>
                        {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar Cambios
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
