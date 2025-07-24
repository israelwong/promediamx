// Tu archivo... /components/MensajeBienvenida.tsx

'use client';

import React, { useEffect, useTransition } from 'react';
import { useForm, SubmitHandler } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';

// Acciones de Servidor
import { getMensajeBienvenida, updateMensajeBienvenida } from '@/app/admin/_lib/actions/negocio/negocio.actions';

// Componentes UI
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/app/components/ui/card';
import { Loader2 } from 'lucide-react';

// Esquema de validación para el formulario
const MensajeSchema = z.object({
    mensajeBienvenida: z.string().min(20, { message: "El mensaje debe tener al menos 20 caracteres." }).max(1000, { message: "El mensaje no puede exceder los 1000 caracteres." }),
});

type FormValues = z.infer<typeof MensajeSchema>;

interface Props {
    negocioId: string;
}

export default function MensajeBienvenida({ negocioId }: Props) {
    const [isPending, startTransition] = useTransition();

    const {
        register,
        handleSubmit,
        reset,
        formState: { errors, isSubmitting, isDirty },
    } = useForm<FormValues>({
        resolver: zodResolver(MensajeSchema),
        defaultValues: {
            mensajeBienvenida: '',
        },
    });

    // Cargar el mensaje existente cuando el componente se monta
    useEffect(() => {
        startTransition(async () => {
            const result = await getMensajeBienvenida(negocioId);
            if (result.success) {
                reset({ mensajeBienvenida: result.data });
            } else {
                toast.error(result.error || "No se pudo cargar el mensaje existente.");
            }
        });
    }, [negocioId, reset]);

    // Función para manejar el guardado del formulario
    const onSubmit: SubmitHandler<FormValues> = (data) => {
        startTransition(async () => {
            toast.loading("Guardando mensaje...");
            const result = await updateMensajeBienvenida(negocioId, data.mensajeBienvenida);
            toast.dismiss();

            if (result.success) {
                toast.success(result.message || "Mensaje guardado correctamente.");
                reset({ mensajeBienvenida: data.mensajeBienvenida }); // Actualiza el estado 'dirty'
            } else {
                toast.error(result.error || "Ocurrió un error inesperado.");
            }
        });
    };

    return (
        <form onSubmit={handleSubmit(onSubmit)}>
            <Card className="bg-zinc-800 border-zinc-700 shadow-xl">
                <CardHeader>
                    <CardTitle>Mensaje de Bienvenida</CardTitle>
                    <CardDescription>
                        Este es el primer mensaje que recibirá un usuario al iniciar una conversación con una pregunta genérica. Úsalo para presentar tus opciones principales.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid w-full gap-2">
                        <Label htmlFor="mensajeBienvenida" className="sr-only">Mensaje de Bienvenida</Label>
                        <Textarea
                            id="mensajeBienvenida"
                            placeholder="Ej: ¡Hola! En Grupo Cultural Albatros tenemos dos excelentes opciones para ti: Colegio Tecno y Colegio Albatros. ¿Sobre cuál te gustaría recibir más información?"
                            rows={8}
                            {...register("mensajeBienvenida")}
                            className="bg-zinc-900"
                        />
                        {errors.mensajeBienvenida && <p className="text-xs text-red-400 mt-1">{errors.mensajeBienvenida.message}</p>}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end">
                    <Button type="submit" disabled={isPending || isSubmitting || !isDirty}>
                        {isPending || isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
                        Guardar Mensaje
                    </Button>
                </CardFooter>
            </Card>
        </form>
    );
}