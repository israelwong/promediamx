// Ruta: app/admin/clientes/.../components/NotasSection.tsx
"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { agregarNotaLeadAction, obtenerNotasLeadAction, editarNotaLeadAction, eliminarNotaLeadAction } from '@/app/admin/_lib/actions/bitacora/bitacora.actions';
import type { NotaBitacora } from '@/app/admin/_lib/actions/bitacora/bitacora.schemas';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Loader2 } from 'lucide-react';
import NotaItem from './NotaItem'; // Importamos el nuevo sub-componente

interface NotasSectionProps {
    leadId: string;
}

export default function NotasSection({ leadId }: NotasSectionProps) {
    const [notas, setNotas] = useState<NotaBitacora[]>([]);
    const [nuevaNota, setNuevaNota] = useState("");
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, startSavingTransition] = useTransition();

    // --- Nuevos estados para manejar la edición ---
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");

    useEffect(() => {
        const fetchNotas = async () => {
            const result = await obtenerNotasLeadAction({ leadId });
            if (result.success && result.data) setNotas(result.data);
            setIsLoading(false);
        };
        fetchNotas();
    }, [leadId]);

    const handleAddNota = () => {
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

    // --- Nuevas funciones para editar y eliminar ---

    const handleStartEdit = (nota: NotaBitacora) => {
        setEditingNoteId(nota.id);
        setEditText(nota.descripcion);
    };

    const handleCancelEdit = () => {
        setEditingNoteId(null);
        setEditText("");
    };

    const handleSaveEdit = (notaId: string) => {
        if (!editText.trim()) return;
        startSavingTransition(async () => {
            const result = await editarNotaLeadAction({ notaId, descripcion: editText });
            if (result.success && result.data) {
                toast.success("Nota actualizada.");
                setNotas(notas.map(n => n.id === notaId ? result.data! : n));
                handleCancelEdit();
            } else {
                toast.error(result.error || "No se pudo actualizar la nota.");
            }
        });
    };

    const handleDeleteNota = (notaId: string) => {
        if (!confirm("¿Estás seguro de que quieres eliminar esta nota?")) return;
        startSavingTransition(async () => {
            const result = await eliminarNotaLeadAction({ notaId });
            if (result.success) {
                toast.success("Nota eliminada.");
                setNotas(notas.filter(n => n.id !== notaId));
            } else {
                toast.error(result.error || "No se pudo eliminar la nota.");
            }
        });
    };

    return (
        <Card className="bg-zinc-800/50 border-zinc-700 h-full">
            <CardHeader><CardTitle>Notas del Lead</CardTitle></CardHeader>
            <CardContent className="flex flex-col h-[calc(100%-4rem)]">
                <div className="space-y-2 mb-4">
                    <Textarea value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} placeholder="Añade un comentario..." rows={3} />
                    <Button onClick={handleAddNota} disabled={isSaving || !nuevaNota.trim()} className="w-full">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Añadir Nota
                    </Button>
                </div>
                <div className="flex-grow overflow-y-auto space-y-3 pr-2">
                    {isLoading ? <div className="flex justify-center pt-8"><Loader2 className="h-6 w-6 animate-spin" /></div> :
                        notas.length > 0 ? notas.map(nota => (
                            <NotaItem
                                key={nota.id}
                                nota={nota}
                                isEditing={editingNoteId === nota.id}
                                editText={editText}
                                onSetEditText={setEditText}
                                onStartEdit={handleStartEdit}
                                onCancelEdit={handleCancelEdit}
                                onSaveEdit={handleSaveEdit}
                                onDelete={handleDeleteNota}
                                isSaving={isSaving}
                            />
                        )) : <p className="text-center text-sm text-zinc-500 pt-8">No hay notas para este lead.</p>
                    }
                </div>
            </CardContent>
        </Card>
    );
}