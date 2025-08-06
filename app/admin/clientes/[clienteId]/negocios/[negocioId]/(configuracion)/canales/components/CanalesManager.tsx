"use client";

import React, { useState, useTransition } from 'react';
import { CanalAdquisicion } from '@prisma/client'; // Usamos el tipo correcto
import { Button } from '@/app/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Label } from '@/app/components/ui/label';
import { toast } from 'react-hot-toast';
import { upsertCanalAction, eliminarCanalAction } from '@/app/admin/_lib/actions/canales/canales.actions';
import { PlusCircle, Edit, Trash2, Loader2 } from 'lucide-react';

interface CanalesManagerProps {
    initialCanales: CanalAdquisicion[];
    crmId: string; // Se cambia negocioId por crmId
}

export default function CanalesManager({ initialCanales, crmId }: CanalesManagerProps) {
    const [canales, setCanales] = useState(initialCanales);
    const [isPending, startTransition] = useTransition();
    const [isDialogOpen, setIsDialogOpen] = useState(false);
    const [currentCanal, setCurrentCanal] = useState<{ id?: string, nombre: string } | null>(null);

    const handleSave = () => {
        if (!currentCanal || !currentCanal.nombre.trim()) {
            toast.error("El nombre no puede estar vacío.");
            return;
        }
        startTransition(async () => {
            const result = await upsertCanalAction({ ...currentCanal, crmId });
            if (result.success && result.data) {
                const canalGuardado = result.data;
                // --- MEJORA: Actualización de la UI en tiempo real ---
                if (currentCanal.id) {
                    // Si estamos editando, actualizamos el item en la lista
                    setCanales(canales.map(c => c.id === canalGuardado.id ? canalGuardado : c));
                } else {
                    // Si estamos creando, lo añadimos a la lista y la reordenamos
                    setCanales([...canales, canalGuardado].sort((a, b) => a.nombre.localeCompare(b.nombre)));
                }
                toast.success(`Canal ${currentCanal.id ? 'actualizado' : 'creado'}.`);
                setIsDialogOpen(false);
            } else {
                toast.error(result.error || "Ocurrió un error.");
            }
        });
    };

    const handleDelete = (id: string) => {
        if (!confirm("¿Estás seguro de eliminar este canal?")) return;
        startTransition(async () => {
            // Pasamos el crmId a la acción de eliminar para la revalidación
            const result = await eliminarCanalAction(id);
            if (result.success) {
                toast.success("Canal eliminado.");
                setCanales(canales.filter(c => c.id !== id));
            } else {
                toast.error(result.error || "Ocurrió un error.");
            }
        });
    };

    return (
        <div>
            <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
                <DialogTrigger asChild>
                    <Button onClick={() => setCurrentCanal({ nombre: '' })}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Nuevo Canal
                    </Button>
                </DialogTrigger>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>{currentCanal?.id ? 'Editar' : 'Crear'} Canal</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4 py-4">
                        <div>
                            <Label htmlFor="nombreCanal">Nombre del Canal</Label>
                            <Input
                                id="nombreCanal"
                                value={currentCanal?.nombre || ''}
                                onChange={(e) => setCurrentCanal(prev => ({ ...prev!, nombre: e.target.value }))}
                            />
                        </div>
                        <Button onClick={handleSave} disabled={isPending}>
                            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                            Guardar
                        </Button>
                    </div>
                </DialogContent>
            </Dialog>

            <div className="mt-6 border rounded-lg">
                {canales.map(canal => (
                    <div key={canal.id} className="flex items-center justify-between p-4 border-b">
                        <span className="font-medium">{canal.nombre}</span>
                        <div className="flex gap-2">
                            <Button variant="ghost" size="icon" onClick={() => { setCurrentCanal(canal); setIsDialogOpen(true); }}>
                                <Edit className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="icon" className="text-red-500 hover:text-red-400" onClick={() => handleDelete(canal.id)}>
                                <Trash2 className="h-4 w-4" />
                            </Button>
                        </div>
                    </div>
                ))}
                {canales.length === 0 && <p className="text-center p-8 text-muted-foreground">No hay canales creados.</p>}
            </div>
        </div>
    );
}