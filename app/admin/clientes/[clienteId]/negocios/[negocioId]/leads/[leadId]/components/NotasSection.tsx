/*
  Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/leads/components/NotasSection.tsx
  (Componente independiente para las notas)
*/
"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { agregarNotaLeadAction, obtenerNotasLeadAction } from '@/app/admin/_lib/actions/bitacora/bitacora.actions';
import type { NotaBitacora } from '@/app/admin/_lib/actions/bitacora/bitacora.schemas';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Loader2 } from 'lucide-react';

interface NotasSectionProps {
    leadId: string;
}

export default function NotasSection({ leadId }: NotasSectionProps) {
    const [notas, setNotas] = useState<NotaBitacora[]>([]);
    const [nuevaNota, setNuevaNota] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSavingTransition] = useTransition();

    useEffect(() => {
        const fetchNotas = async () => {
            const result = await obtenerNotasLeadAction({ leadId });
            if (result.success && result.data) {
                setNotas(result.data);
            }
            setIsLoading(false);
        };
        fetchNotas();
    }, [leadId]);

    const handleAddNota = async () => {
        if (!nuevaNota.trim()) return;
        startSavingTransition(async () => {
            const result = await agregarNotaLeadAction({ leadId, descripcion: nuevaNota, agenteId: null });
            if (result.success && result.data) {
                toast.success("Nota añadida.");
                setNotas([result.data, ...notas]);
                setNuevaNota("");
            } else {
                toast.error(result.error || "No se pudo guardar la nota.");
            }
        });
    };

    return (
        <Card className="bg-zinc-800/50 border-zinc-700 h-full">
            <CardHeader><CardTitle>Notas del Lead</CardTitle></CardHeader>
            <CardContent className="flex flex-col h-[calc(100%-4rem)]">
                <div className="space-y-2 mb-4">
                    <Textarea
                        value={nuevaNota}
                        onChange={(e) => setNuevaNota(e.target.value)}
                        placeholder="Añade un comentario..."
                        rows={4}
                    />
                    <Button onClick={handleAddNota} disabled={isSaving || !nuevaNota.trim()} className="w-full">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Añadir Nota
                    </Button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                    {isLoading ? <div className="flex justify-center pt-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
                        notas.length > 0 ? notas.map(nota => (
                            <div key={nota.id} className="text-sm bg-zinc-900/50 p-3 rounded-md border border-zinc-700/50">
                                <p className="text-zinc-200 whitespace-pre-wrap">{nota.descripcion}</p>
                                <p className="text-xs text-zinc-500 mt-2 text-right">
                                    {format(new Date(nota.createdAt), "d MMM yy, HH:mm", { locale: es })}h
                                </p>
                            </div>
                        )) : <p className="text-center text-sm text-zinc-500 pt-8">No hay notas para este lead.</p>
                    }
                </div>
            </CardContent>
        </Card>
    );
}