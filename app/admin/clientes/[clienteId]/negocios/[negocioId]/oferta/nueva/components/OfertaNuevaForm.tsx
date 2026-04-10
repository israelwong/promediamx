// Ruta: app/admin/tareas/nueva/components/OfertaNuevaForm.tsx
// (o la ruta correcta: app/admin/clientes/[clienteId]/negocios/[negocioId]/oferta/nueva/components/OfertaNuevaForm.tsx)
'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';

// Usar la acción crearOfertaAction (que acabamos de refactorizar)
import { crearOfertaAction } from '@/app/admin/_lib/actions/oferta/oferta.actions';
import {
    CrearOfertaSuperSimplificadoInputSchema, // El schema súper simplificado
    // type CrearOfertaSuperSimplificadoDataInputType
} from '@/app/admin/_lib/actions/oferta/oferta.schemas'; // Ajusta la ruta
import type { ActionResult } from '@/app/admin/_lib/types';

import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { toast } from 'react-hot-toast';
import { Loader2, Save, ArrowLeft, TicketPlus } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/app/components/ui/card';

interface Props {
    clienteId: string;
    negocioId: string;
}

// El tipo para los valores del formulario ahora es el súper simplificado
type FormValues = z.infer<typeof CrearOfertaSuperSimplificadoInputSchema>;

export default function OfertaNuevaForm({ clienteId, negocioId }: Props) {
    const router = useRouter();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting },
        reset,
    } = useForm<FormValues>({
        resolver: zodResolver(CrearOfertaSuperSimplificadoInputSchema),
        defaultValues: {
            nombre: '',
            descripcion: null, // Iniciar con null para el campo opcional
        },
    });

    const onSubmitHandler: SubmitHandler<FormValues> = async (data) => {
        const loadingToastId = toast.loading("Creando nueva oferta...");
        try {
            // El 'data' ya es del tipo CrearOfertaSuperSimplificadoDataInputType
            const result: ActionResult<{ id: string; nombre: string }> = await crearOfertaAction(
                negocioId,
                clienteId,
                data
            );

            toast.dismiss(loadingToastId);
            if (result.success && result.data?.id) {
                toast.success(`Oferta "${result.data.nombre}" creada. Redirigiendo para configurar detalles...`);
                reset(); // Limpiar el formulario
                // Redirigir a la página de edición completa de la oferta recién creada
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${result.data.id}`);
                // O, si la ruta es diferente:
                // router.push(`/admin/ofertas/${result.data.id}/editar`); 
            } else {
                const errorMsg = result.errorDetails
                    ? Object.values(result.errorDetails).flat().join('; ')
                    : result.error || "No se pudo crear la oferta.";
                toast.error(errorMsg);
                console.error("Error al crear oferta (simplificada):", result);
            }
        } catch (err) {
            toast.dismiss(loadingToastId);
            toast.error(err instanceof Error ? err.message : "Ocurrió un error inesperado al crear la oferta.");
            console.error("Error en submit de nueva oferta:", err);
        }
    };

    const handleCancel = () => {
        // Redirigir a la lista de ofertas del negocio
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta`);
        // O a una ruta más general si es necesario:
        // router.push('/admin/ofertas');
    };

    return (
        <Card className="w-full max-w-lg mx-auto shadow-xl">
            <CardHeader className="border-b border-zinc-700">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-xl flex items-center gap-2 text-zinc-100">
                        <TicketPlus size={22} className="text-amber-400" />
                        Crear Nueva Oferta
                    </CardTitle>
                    <Button variant="outline" size="sm" onClick={handleCancel} disabled={isSubmitting}>
                        <ArrowLeft size={16} className="mr-1.5" /> Volver a Lista
                    </Button>
                </div>
                <CardDescription className="mt-1">
                    Ingresa un nombre para tu nueva oferta. Podrás configurar todos los detalles después.
                </CardDescription>
            </CardHeader>

            <form onSubmit={handleSubmit(onSubmitHandler)}>
                <CardContent className="p-6 space-y-5">
                    <div>
                        <Label htmlFor="nombre" className="text-sm">Nombre de la Oferta <span className="text-red-500">*</span></Label>
                        <Input
                            id="nombre"
                            {...register("nombre")}
                            autoFocus
                            disabled={isSubmitting}
                            placeholder="Ej: Descuento Especial de Verano"
                            className={errors.nombre ? 'border-red-500 focus:border-red-600' : ''}
                        />
                        {errors.nombre && <p className="text-xs text-red-400 mt-1.5">{errors.nombre.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="descripcion" className="text-sm">Descripción Breve (Opcional)</Label>
                        <Textarea
                            id="descripcion"
                            {...register("descripcion")}
                            rows={4}
                            disabled={isSubmitting}
                            placeholder="Un resumen atractivo de qué trata tu oferta..."
                            className={errors.descripcion ? 'border-red-500 focus:border-red-600' : ''}
                        />
                        {errors.descripcion && <p className="text-xs text-red-400 mt-1.5">{errors.descripcion.message}</p>}
                    </div>
                </CardContent>

                <CardFooter className="border-t border-zinc-700 p-6 flex flex-col sm:flex-row justify-end gap-3">
                    <Button type="button" variant="outline" className="w-full sm:w-auto" onClick={handleCancel} disabled={isSubmitting}>
                        Cancelar
                    </Button>
                    <Button type="submit" className="w-full sm:w-auto" disabled={isSubmitting}>
                        {isSubmitting
                            ? <><Loader2 className='animate-spin mr-2' size={18} /> Creando Oferta...</>
                            : <><Save size={16} className="mr-2" /> Crear y Continuar a Edición</>}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
