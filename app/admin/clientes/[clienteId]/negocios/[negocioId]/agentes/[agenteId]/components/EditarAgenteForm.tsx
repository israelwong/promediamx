"use client";

import React, { useTransition } from 'react';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { z } from 'zod';
import { EditarAgenteSchema } from '@/app/admin/_lib/actions/agente/agente.schemas';
import { editarAgenteAction } from '@/app/admin/_lib/actions/agente/agente.actions';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Button } from '@/app/components/ui/button';
import { Loader2 } from 'lucide-react';
import type { Agente } from '@prisma/client';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select';

// El tipo para el formulario no necesita el ID, lo pasaremos por fuera
type EditarAgenteSchemaSinId = ReturnType<typeof EditarAgenteSchema.omit<{ id: true }>>;
type FormValues = z.infer<EditarAgenteSchemaSinId>;

export default function EditarAgenteForm({ agente }: { agente: Agente }) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const { register, handleSubmit, control, formState: { errors } } = useForm<FormValues>({
        resolver: zodResolver(EditarAgenteSchema.omit({ id: true })),
        defaultValues: {
            nombre: agente.nombre || '',
            email: agente.email,
            status: agente.status,
            password: '', // El campo de contraseña siempre empieza vacío
        },
    });

    const onSubmit = (data: FormValues) => {
        startTransition(async () => {
            const result = await editarAgenteAction({ ...data, id: agente.id });
            if (result.success) {
                toast.success("Agente actualizado exitosamente.");
                router.refresh(); // Refresca la página para ver los cambios
            } else {
                toast.error(result.error || "No se pudo actualizar el agente.");
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Editar Información del Agente</CardTitle>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                    <div>
                        <Label htmlFor="nombre">Nombre Completo</Label>
                        <Input id="nombre" {...register("nombre")} />
                        {errors.nombre && <p className="text-red-500 text-xs mt-1">{errors.nombre.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="email">Correo Electrónico</Label>
                        <Input id="email" type="email" {...register("email")} />
                        {errors.email && <p className="text-red-500 text-xs mt-1">{errors.email.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="password">Nueva Contraseña (opcional)</Label>
                        <Input id="password" type="password" {...register("password")} placeholder="Dejar en blanco para no cambiar" />
                        {errors.password && <p className="text-red-500 text-xs mt-1">{errors.password.message}</p>}
                    </div>
                    <div>
                        <Label htmlFor="status">Estado</Label>
                        <Controller
                            name="status"
                            control={control}
                            render={({ field }) => (
                                <Select onValueChange={field.onChange} value={field.value}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="activo">Activo</SelectItem>
                                        <SelectItem value="inactivo">Inactivo</SelectItem>
                                    </SelectContent>
                                </Select>
                            )}
                        />
                    </div>
                    <div className="flex justify-end pt-4 space-x-4">
                        <Button type="submit" disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar Cambios
                        </Button>
                        <Button variant="outline" onClick={() => router.back()} disabled={isPending}>
                            Cancelar / Cerrar
                        </Button>
                    </div>
                </form>
            </CardContent>
        </Card>
    );
}