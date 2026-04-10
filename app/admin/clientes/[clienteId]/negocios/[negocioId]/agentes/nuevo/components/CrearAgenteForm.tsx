"use client";

import React, { useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { CrearAgenteSchema } from '@/app/admin/_lib/actions/agente/agente.schemas';
import { crearAgenteAction } from '@/app/admin/_lib/actions/agente/agente.actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Loader2 } from 'lucide-react';

interface CrearAgenteFormProps {
    crmId: string;
    negocioId: string;
    clienteId: string;
}

const formSchema = CrearAgenteSchema.pick({
    nombre: true,
    email: true,
    password: true,
});

type FormValues = z.infer<typeof formSchema>;

export default function CrearAgenteForm({ crmId, negocioId, clienteId }: CrearAgenteFormProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const { register, handleSubmit, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(formSchema),
    });

    const onSubmit = (data: FormValues) => {
        startTransition(async () => {
            // --- INICIO DE LA CORRECCIÓN ---
            // Añadimos explícitamente la propiedad 'status' que faltaba
            const result = await crearAgenteAction({
                ...data,
                crmId,
                status: 'activo'
            });
            // --- FIN DE LA CORRECCIÓN ---

            if (result.success) {
                toast.success("Agente creado exitosamente.");
                router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/agentes`);
            } else {
                toast.error(result.error || "No se pudo crear el agente.");
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Crear Nuevo Agente</CardTitle>
                <CardDescription>Completa los datos para registrar un nuevo agente en este negocio.</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="nombre">Nombre Completo</Label>
                        <Input id="nombre" {...register("nombre")} />
                        {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="email">Correo Electrónico (para login)</Label>
                        <Input id="email" type="email" {...register("email")} />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="password">Contraseña</Label>
                        <Input id="password" type="password" {...register("password")} />
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    </div>

                    <div className="flex justify-end gap-3 pt-4">
                        <Button type="button" variant="ghost" onClick={() => router.back()} disabled={isPending}>
                            Cancelar
                        </Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Crear Agente
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}