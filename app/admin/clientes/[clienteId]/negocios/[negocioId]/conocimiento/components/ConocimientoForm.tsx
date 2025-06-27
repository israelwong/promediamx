'use client';

import React, { useEffect, useTransition, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, Controller, SubmitHandler } from 'react-hook-form';
import { toast } from 'react-hot-toast';
import { z } from 'zod';

// --- Acciones y Esquemas ---
import {
    getConocimientoItemById,
    createConocimientoItem,
    updateConocimientoItem,
    deleteConocimientoItem,
} from '@/app/admin/_lib/actions/conocimiento/conocimiento.actions';
import {
    ConocimientoItemSchema, // Usaremos el schema base para el formulario
    CreateConocimientoItemInputSchema,
    UpdateConocimientoItemInputSchema,
} from '@/app/admin/_lib/actions/conocimiento/conocimiento.schemas';
// import type {
//     CreateConocimientoItemInputType,
//     UpdateConocimientoItemInputType,
// } from '@/app/admin/_lib/actions/conocimiento/conocimiento.schemas';

// --- Componentes UI y Enums ---
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Loader2, Save, Trash2, ArrowLeft } from 'lucide-react';

// --- CORRECCIÓN: Definir un tipo único y claro para el formulario ---
type FormValues = z.infer<typeof ConocimientoItemSchema>;

// Opciones para el <Select> de estado.
const ESTADO_OPTIONS = [
    'PENDIENTE_RESPUESTA', 'RESPONDIDA', 'EN_REVISION', 'OBSOLETA', 'ARCHIVADA'
];

interface Props {
    negocioId: string;
    clienteId: string; // Necesario para la navegación
    itemId?: string; // Opcional: si está presente, estamos en modo edición.
}

export default function ConocimientoForm({ negocioId, clienteId, itemId }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const isEditMode = !!itemId; // Determina si es modo "crear" o "editar"

    const {
        control,
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<FormValues>({
        // Se elimina el resolver, la validación se hace en onSubmit
        defaultValues: {
            preguntaFormulada: '',
            respuesta: '',
            categoria: '',
            estado: 'RESPONDIDA',
        },
    });

    // Cargar datos si estamos en modo edición
    const fetchItemData = useCallback(() => {
        if (isEditMode && itemId) {
            startTransition(async () => {
                const result = await getConocimientoItemById(itemId);
                if (result.success && result.data) {
                    reset(result.data);
                } else {
                    toast.error(result.error || "No se pudo cargar el ítem de conocimiento.");
                }
            });
        }
    }, [itemId, isEditMode, reset]);

    useEffect(() => {
        fetchItemData();
    }, [fetchItemData]);

    // Función para manejar el envío del formulario
    const onSubmit: SubmitHandler<FormValues> = (data) => {
        startTransition(async () => {
            let result;
            if (isEditMode) {
                // --- Validar y Ejecutar Acción de Actualización ---
                const validationResult = UpdateConocimientoItemInputSchema.safeParse(data);
                if (!validationResult.success) {
                    toast.error("Hay errores en el formulario. Por favor, revisa los campos.");
                    console.error("Errores de validación (Update):", validationResult.error.flatten());
                    return;
                }
                toast.loading("Actualizando...");
                result = await updateConocimientoItem(itemId, validationResult.data);
            } else {
                // --- Validar y Ejecutar Acción de Creación ---
                const dataToCreate = { ...data, negocioId };
                const validationResult = CreateConocimientoItemInputSchema.safeParse(dataToCreate);
                if (!validationResult.success) {
                    toast.error("Hay errores en el formulario. Por favor, revisa los campos.");
                    console.error("Errores de validación (Create):", validationResult.error.flatten());
                    return;
                }
                toast.loading("Creando...");
                result = await createConocimientoItem(validationResult.data);
            }

            toast.dismiss();

            if (result.success && result.data) {
                toast.success(isEditMode ? "Ítem actualizado." : "Ítem creado.");
                if (!isEditMode) {
                    router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/conocimiento`);
                } else {
                    reset(result.data);
                }
            } else {
                toast.error(result.error || "Ocurrió un error inesperado.");
            }
        });
    };

    // Función para eliminar el ítem
    const handleDelete = async () => {
        if (!itemId) return;
        if (!window.confirm("¿Estás seguro de que quieres eliminar este ítem? Esta acción no se puede deshacer.")) return;

        startTransition(async () => {
            const result = await deleteConocimientoItem(itemId);
            if (result.success) {
                toast.success("Ítem eliminado.");
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/conocimiento`);
            } else {
                toast.error(result.error || "No se pudo eliminar el ítem.");
            }
        });
    }

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            {/* Cabecera con acciones */}
            <div className="flex items-center justify-between mb-6 pb-4 border-b border-zinc-700">
                <Button type="button" variant="outline" onClick={() => router.back()} disabled={isPending || isSubmitting}>
                    <ArrowLeft size={16} className="mr-2" />
                    Volver a la Lista
                </Button>
                <div className="flex items-center gap-3">
                    {isEditMode && (
                        <Button type="button" variant="destructive" onClick={handleDelete} disabled={isPending || isSubmitting}>
                            <Trash2 size={16} className="mr-2" />
                            Eliminar
                        </Button>
                    )}
                    <Button type="submit" disabled={isPending || isSubmitting || !isDirty}>
                        {isPending || isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        {isEditMode ? 'Guardar Cambios' : 'Crear Ítem'}
                    </Button>
                </div>
            </div>

            {/* Contenido del Formulario */}
            <Card className="bg-zinc-800 border-zinc-700 shadow-xl">
                <CardHeader>
                    <CardTitle>{isEditMode ? 'Editar Ítem de Conocimiento' : 'Nuevo Ítem de Conocimiento'}</CardTitle>
                    <CardDescription>
                        Define una pregunta y su respuesta para que el asistente la utilice.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-2">
                        <Label htmlFor="preguntaFormulada">Pregunta / Título del Conocimiento</Label>
                        <Input
                            id="preguntaFormulada"
                            placeholder="Ej: ¿Cuáles son los costos de inscripción?"
                            {...register("preguntaFormulada")}
                        />
                        {errors.preguntaFormulada && <p className="text-xs text-red-400 mt-1">{errors.preguntaFormulada.message}</p>}
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="respuesta">Respuesta</Label>
                        <Textarea
                            id="respuesta"
                            placeholder="Proporciona la respuesta detallada que el asistente debe dar..."
                            {...register("respuesta")}
                            rows={10}
                        />
                        {errors.respuesta && <p className="text-xs text-red-400 mt-1">{errors.respuesta.message}</p>}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                            <Label htmlFor="categoria">Categoría (Opcional)</Label>
                            <Input
                                id="categoria"
                                placeholder="Ej: Costos, Horarios, Políticas"
                                {...register("categoria")}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="estado">Estado</Label>
                            <Controller
                                name="estado"
                                control={control}
                                render={({ field }) => (
                                    <Select onValueChange={field.onChange} value={field.value}>
                                        <SelectTrigger><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {ESTADO_OPTIONS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                )} />
                        </div>
                    </div>
                </CardContent>
            </Card>
        </form>
    );
}
