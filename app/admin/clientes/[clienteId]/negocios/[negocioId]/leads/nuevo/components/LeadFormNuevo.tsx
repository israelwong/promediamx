'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { useForm, SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { toast } from 'react-hot-toast';

// --- Lógica del Servidor ---
import { crearLeadBasicoAction } from '@/app/admin/_lib/actions/lead/lead.actions';
import { nuevoLeadBasicoFormSchema, type NuevoLeadBasicoFormData } from '@/app/admin/_lib/actions/lead/lead.schemas';

// --- Componentes UI ---
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from "@/app/components/ui/input";
import { Button } from "@/app/components/ui/button";
import { Label } from '@/app/components/ui/label';
import { Loader2, Save } from 'lucide-react';

interface Props {
    negocioId: string;
    clienteId: string;
}

export default function LeadFormNuevo({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const {
        register,
        handleSubmit,
        formState: { errors, isSubmitting, isDirty }
    } = useForm<NuevoLeadBasicoFormData>({
        resolver: zodResolver(nuevoLeadBasicoFormSchema),
        defaultValues: {
            nombre: '',
            email: '',
            telefono: '',
        },
    });

    const onSubmit: SubmitHandler<NuevoLeadBasicoFormData> = (formData) => {
        startTransition(async () => {
            // ✅ La acción ahora solo necesita el negocioId, que ya tenemos.
            const result = await crearLeadBasicoAction({ negocioId, datos: formData });

            if (result.success && result.data) {
                toast.success("Lead creado exitosamente. Redirigiendo...");
                // Redirige a la página de edición del nuevo lead para completar los detalles.
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/leads/${result.data.id}`);
            } else {
                toast.error(result.error || "No se pudo crear el lead.");
            }
        });
    };

    return (
        <Card className="max-w-2xl">
            <CardHeader>
                <CardTitle>Datos Básicos del Lead</CardTitle>
                <CardDescription>Ingresa el nombre y al menos un método de contacto.</CardDescription>
            </CardHeader>
            <form onSubmit={handleSubmit(onSubmit)}>
                <CardContent className="space-y-4">
                    <div>
                        <Label htmlFor="nombre">Nombre Completo</Label>
                        <Input id="nombre" {...register("nombre")} disabled={isSubmitting || isPending} />
                        {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input id="email" type="email" {...register("email")} disabled={isSubmitting || isPending} />
                        {errors.email && <p className="text-xs text-red-400 mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="telefono">Teléfono</Label>
                        <Input id="telefono" type="tel" {...register("telefono")} disabled={isSubmitting || isPending} />
                        {errors.telefono && <p className="text-xs text-red-400 mt-1">{errors.telefono.message}</p>}
                    </div>
                </CardContent>
                <CardFooter className="flex justify-end gap-3">
                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => router.back()}
                        disabled={isSubmitting || isPending}
                    >
                        Cancelar
                    </Button>
                    <Button type="submit" disabled={isSubmitting || isPending || !isDirty}>
                        {isSubmitting || isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                        Guardar y Continuar
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
