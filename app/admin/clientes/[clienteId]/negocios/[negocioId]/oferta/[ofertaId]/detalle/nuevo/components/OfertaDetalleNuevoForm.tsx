'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler, DefaultValues } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

import {
    CrearOfertaDetalleBasicoInputSchema, // Usar el schema básico
    // El tipo inferido se puede obtener de z.infer
} from '@/app/admin/_lib/actions/oferta/ofertaDetalle.schemas';
import {
    crearOfertaDetalleBasicoAction, // Usar la nueva action básica
} from '@/app/admin/_lib/actions/oferta/ofertaDetalle.actions';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { Loader2, Save } from 'lucide-react';
// No necesitamos Card aquí, ya que el page.tsx que lo contiene ya usará Card.

interface OfertaDetalleNuevoFormProps {
    ofertaId: string;
    negocioId: string;
    clienteId: string;
    preguntaOriginalUsuario?: string; // Para prellenar si viene de resolver pregunta
    resolverPreguntaId?: string;    // ID de la PreguntaSinRespuestaOferta a actualizar
}

type FormValues = z.infer<typeof CrearOfertaDetalleBasicoInputSchema>;

export default function OfertaDetalleNuevoForm({
    ofertaId,
    negocioId,
    clienteId,
    preguntaOriginalUsuario,
    resolverPreguntaId,
}: OfertaDetalleNuevoFormProps) {
    const router = useRouter();

    const defaultFormValues: DefaultValues<FormValues> = React.useMemo(() => ({
        ofertaId: ofertaId, // Se pasa directamente a la action
        tituloDetalle: preguntaOriginalUsuario || '',
        contenido: '',
        resolverPreguntaId: resolverPreguntaId,
    }), [ofertaId, preguntaOriginalUsuario, resolverPreguntaId]);

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({
        resolver: zodResolver(CrearOfertaDetalleBasicoInputSchema),
        defaultValues: defaultFormValues,
    });

    // Si preguntaOriginalUsuario cambia (ej. al seleccionar otra pregunta para responder),
    // actualizar el valor del título en el formulario.
    React.useEffect(() => {
        if (preguntaOriginalUsuario) {
            reset({ ...defaultFormValues, tituloDetalle: preguntaOriginalUsuario, resolverPreguntaId: resolverPreguntaId });
        } else {
            reset(defaultFormValues);
        }
    }, [preguntaOriginalUsuario, resolverPreguntaId, reset, defaultFormValues]);


    const onSubmit: SubmitHandler<FormValues> = async (data) => {
        const loadingToastId = toast.loading("Creando detalle...");
        try {
            // El payload ya incluye ofertaId y resolverPreguntaId desde los defaultValues
            // o fueron seteados por el useEffect
            const payload: FormValues = {
                ...data,
                ofertaId: ofertaId, // Asegurar que el ofertaId correcto se envía
                resolverPreguntaId: resolverPreguntaId, // Pasar el ID de la pregunta a resolver
            };

            const result = await crearOfertaDetalleBasicoAction(payload, clienteId, negocioId);

            toast.dismiss(loadingToastId);

            if (result.success && result.data?.id) {
                toast.success(`Detalle "${result.data.tituloDetalle}" creado. Redirigiendo para edición completa...`);
                // Redirigir a la PÁGINA DE EDICIÓN del nuevo detalle
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}/detalle/${result.data.id}`);
                router.refresh(); // Para que la lista en la página anterior se actualice si el usuario vuelve
            } else {
                const errorMsg = result.errorDetails
                    ? Object.values(result.errorDetails).flat().join('; ')
                    : result.error || "No se pudo crear el detalle.";
                toast.error(errorMsg);
                console.error("Error details:", result.errorDetails);
            }
        } catch (err) {
            toast.dismiss();
            toast.error(err instanceof Error ? err.message : "Ocurrió un error inesperado.");
            console.error("Submit error:", err);
        }
    };

    const handleCancel = () => {
        // Redirigir a la lista de detalles de la oferta
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}`);
        router.refresh(); // Para que la lista se actualice si el usuario vuelve
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 py-4">
            {preguntaOriginalUsuario && (
                <div className="p-3 text-sm bg-amber-900/30 border border-amber-700/40 text-amber-200 rounded-md">
                    <p className="font-medium">Respondiendo a la pregunta:</p>
                    <p className="italic">&quot;{preguntaOriginalUsuario}&quot;</p>
                    <p className="text-xs mt-1">El título se ha pre-llenado. Puedes ajustarlo.</p>
                </div>
            )}
            <div>
                <Label htmlFor="tituloDetalle" className="text-sm">Título / Pregunta Clave <span className="text-red-500">*</span></Label>
                <Input id="tituloDetalle" {...register("tituloDetalle")} disabled={isSubmitting} autoFocus />
                {errors.tituloDetalle && <p className="text-xs text-red-400 mt-1">{errors.tituloDetalle.message}</p>}
            </div>

            <div>
                <Label htmlFor="contenido" className="text-sm">Contenido / Respuesta <span className="text-red-500">*</span></Label>
                <Textarea id="contenido" {...register("contenido")} rows={5} disabled={isSubmitting} />
                {errors.contenido && <p className="text-xs text-red-400 mt-1">{errors.contenido.message}</p>}
            </div>

            <div className="flex justify-end items-center gap-3 pt-4 border-t border-zinc-700">
                <Button type="button" variant="outline" onClick={() => handleCancel()} disabled={isSubmitting}>
                    Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting} className="min-w-[120px]">
                    {isSubmitting ? <Loader2 className="animate-spin mr-2" /> : <Save className="mr-2" size={18} />}
                    Crear y Continuar
                </Button>
            </div>
        </form>
    );
}