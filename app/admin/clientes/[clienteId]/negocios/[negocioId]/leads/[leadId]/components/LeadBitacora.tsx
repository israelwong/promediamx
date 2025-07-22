'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale/es';
import { toast } from 'react-hot-toast';

// --- Lógica del Servidor ---
import {
    agregarNotaLeadAction,
    listarNotasLeadAction,
    editarNotaLeadAction,
    eliminarNotaLeadAction,
} from '@/app/admin/_lib/actions/agendaCrm/agendaCrm.actions';
import type { LeadBitacora } from '@prisma/client';

// --- Componentes UI ---
import { Textarea } from "@/app/components/ui/textarea";
import { Button } from "@/app/components/ui/button";
import { Loader2, Notebook, Send, Trash2, Pencil, X, Check } from 'lucide-react';

interface Props {
    leadId: string;
}

export default function LeadBitacora({ leadId }: Props) {
    const [notas, setNotas] = useState<LeadBitacora[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [nuevaNota, setNuevaNota] = useState('');
    const [editingNote, setEditingNote] = useState<{ id: string; text: string } | null>(null);
    const [isPending, startTransition] = useTransition();

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        const result = await listarNotasLeadAction({ leadId });
        if (result.success && result.data) {
            setNotas(result.data);
        } else {
            toast.error(result.error || "No se pudieron cargar las notas.");
        }
        setIsLoading(false);
    }, [leadId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleAgregarNota = () => {
        if (nuevaNota.trim().length < 3) return;
        startTransition(async () => {
            const result = await agregarNotaLeadAction({ leadId, nota: nuevaNota });
            if (result.success) {
                toast.success("Nota agregada.");
                setNuevaNota('');
                fetchData();
            } else {
                toast.error(result.error || "No se pudo agregar la nota.");
            }
        });
    };

    const handleEditarNota = () => {
        if (!editingNote || editingNote.text.trim().length < 3) return;
        startTransition(async () => {
            const result = await editarNotaLeadAction({ notaId: editingNote.id, nota: editingNote.text });
            if (result.success) {
                toast.success("Nota actualizada.");
                setEditingNote(null);
                fetchData();
            } else {
                toast.error(result.error || "No se pudo actualizar la nota.");
            }
        });
    };

    const handleEliminarNota = (notaId: string) => {
        if (!confirm("¿Estás seguro de eliminar esta nota?")) return;
        startTransition(async () => {
            const result = await eliminarNotaLeadAction({ notaId });
            if (result.success) {
                toast.success("Nota eliminada.");
                fetchData();
            } else {
                toast.error(result.error || "No se pudo eliminar la nota.");
            }
        });
    };

    return (
        <div className="space-y-4">
            <h3 className="text-base font-semibold text-zinc-200 flex items-center gap-2"><Notebook size={16} /> Bitácora de Notas</h3>

            {/* Formulario para agregar nueva nota */}
            <div className="space-y-2">
                <Textarea
                    value={nuevaNota}
                    onChange={(e) => setNuevaNota(e.target.value)}
                    placeholder="Escribe una nueva nota o seguimiento..."
                    rows={3}
                    disabled={isPending}
                />
                <Button size="sm" onClick={handleAgregarNota} disabled={isPending || nuevaNota.trim().length < 3} className="w-full">
                    {isPending ? <Loader2 size={14} className="mr-2 animate-spin" /> : <Send size={14} className="mr-2" />}
                    Guardar Nota
                </Button>
            </div>

            {/* Lista de notas existentes */}
            <div className="space-y-3 max-h-80 overflow-y-auto pr-2">
                {isLoading ? (
                    <div className="flex justify-center p-4"><Loader2 className="h-5 w-5 animate-spin text-zinc-400" /></div>
                ) : notas.length > 0 ? (
                    notas.map(nota => (
                        <div key={nota.id} className="text-xs bg-zinc-800/70 p-3 rounded-lg border border-zinc-700/50 relative group">
                            {editingNote?.id === nota.id ? (
                                <div className="space-y-2">
                                    <Textarea
                                        value={editingNote.text}
                                        onChange={(e) => setEditingNote({ ...editingNote, text: e.target.value })}
                                        rows={3}
                                        className="text-xs"
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button variant="ghost" size="icon" onClick={() => setEditingNote(null)}><X size={14} /></Button>
                                        <Button size="icon" onClick={handleEditarNota}><Check size={14} /></Button>
                                    </div>
                                </div>
                            ) : (
                                <>
                                    <p className="text-zinc-300 whitespace-pre-wrap">{nota.nota}</p>
                                    <div className="flex justify-between items-center mt-2">
                                        <p className="text-zinc-500">{format(new Date(nota.createdAt), "dd MMM yyyy, h:mm a", { locale: es })}</p>
                                        <div className="absolute top-2 right-2 flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <Button variant="ghost" size="icon" onClick={() => setEditingNote({ id: nota.id, text: nota.nota })}><Pencil size={12} /></Button>
                                            <Button variant="ghost" size="icon" className="hover:bg-red-500/10 hover:text-red-400" onClick={() => handleEliminarNota(nota.id)}><Trash2 size={12} /></Button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    ))
                ) : (
                    <p className="text-xs text-zinc-500 text-center italic py-4">No hay notas en la bitácora.</p>
                )}
            </div>
        </div>
    );
}
