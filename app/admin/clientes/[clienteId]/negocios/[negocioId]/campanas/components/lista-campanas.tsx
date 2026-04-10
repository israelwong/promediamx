// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/campanas/components/lista-campanas.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';

import { type CampanaConEstadisticas, crearCampanaParamsSchema } from '@/app/admin/_lib/actions/campana/campana.schemas';
import { crearCampanaAction } from '@/app/admin/_lib/actions/campana/campana.actions';

import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { PlusCircle, Loader2, Save } from 'lucide-react';
import { type z } from 'zod';

type FormData = z.infer<typeof crearCampanaParamsSchema>;

interface ListaCampanasProps {
    initialCampanas: CampanaConEstadisticas[];
    negocioId: string;
}

export default function ListaCampanas({ initialCampanas, negocioId }: ListaCampanasProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();
    const router = useRouter();

    const { register, handleSubmit, formState: { errors }, reset } = useForm<FormData>({
        resolver: zodResolver(crearCampanaParamsSchema),
        defaultValues: { negocioId }
    });

    const onSubmit = (data: FormData) => {
        startTransition(async () => {
            const result = await crearCampanaAction(data);
            if (result.success) {
                toast.success("Campaña creada exitosamente.");
                reset({ id: '', nombre: '', negocioId });
                setIsModalOpen(false);
                router.refresh();
            } else {
                toast.error(result.error || "No se pudo crear la campaña.");
            }
        });
    };

    return (
        <>
            <div className="flex justify-end mb-4">
                <Button onClick={() => setIsModalOpen(true)}>
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Crear Campaña
                </Button>
            </div>

            <div className="border border-zinc-700 rounded-lg bg-zinc-800/50">
                <Table>
                    <TableHeader>
                        <TableRow className="hover:bg-zinc-800 border-zinc-700">
                            <TableHead className="text-white">Nombre de la Campaña</TableHead>
                            <TableHead className="text-white">ID del Anuncio (Meta)</TableHead>
                            <TableHead className="text-white">Leads Generados</TableHead>
                            <TableHead className="text-white">Fecha de Creación</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {initialCampanas.length > 0 ? initialCampanas.map((campana) => (
                            <TableRow key={campana.id} className="border-zinc-700/50">
                                <TableCell className="font-medium">{campana.nombre}</TableCell>
                                <TableCell className="text-zinc-400 font-mono text-xs">{campana.id}</TableCell>
                                <TableCell className="font-semibold text-lg">{campana._count.leads}</TableCell>
                                <TableCell className="text-zinc-400">{format(new Date(campana.createdAt), "d 'de' MMMM, yyyy", { locale: es })}</TableCell>
                            </TableRow>
                        )) : (
                            <TableRow>
                                <TableCell colSpan={4} className="text-center text-zinc-500 py-10">
                                    No has creado ninguna campaña manualmente.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>

            {/* Modal para Crear Campaña */}
            <Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                    <DialogHeader>
                        <DialogTitle>Crear Nueva Campaña</DialogTitle>
                        <DialogDescription>
                            Registra una campaña de Meta para empezar a rastrear sus leads.
                        </DialogDescription>
                    </DialogHeader>
                    <form onSubmit={handleSubmit(onSubmit)}>
                        <div className="grid gap-4 py-4">
                            <div>
                                <Label htmlFor="nombre">Nombre de la Campaña</Label>
                                <Input id="nombre" {...register("nombre")} className="mt-1" placeholder="Ej: Campaña de Verano - Primaria" />
                                {errors.nombre && <p className="text-xs text-red-400 mt-1">{errors.nombre.message}</p>}
                            </div>
                            <div>
                                <Label htmlFor="id">ID del Anuncio de Meta</Label>
                                <Input id="id" {...register("id")} className="mt-1" placeholder="Ej: 120234314660890492" />
                                {errors.id && <p className="text-xs text-red-400 mt-1">{errors.id.message}</p>}
                            </div>
                        </div>
                        <DialogFooter>
                            <Button type="button" variant="ghost" onClick={() => setIsModalOpen(false)} disabled={isPending}>Cancelar</Button>
                            <Button type="submit" disabled={isPending}>
                                {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                                Guardar Campaña
                            </Button>
                        </DialogFooter>
                    </form>
                </DialogContent>
            </Dialog>
        </>
    );
}
