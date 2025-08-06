"use client";

import React, { useState, useTransition, useEffect } from 'react';
import { Bitacora, Agente } from '@prisma/client';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { MessageSquare, UserPlus, ArrowRightLeft, Pencil, UserCheck, Loader2, Edit, Trash2, Save, X } from 'lucide-react';
import { agregarNotaLeadAction, editarNotaManualAction, eliminarNotaManualAction } from '@/app/admin/_lib/actions/bitacora/bitacora.actions';
import { toast } from 'react-hot-toast';

export type HistorialItem = Bitacora & { agente: Pick<Agente, 'nombre'> | null };

const actionIcons: { [key: string]: React.ReactNode } = {
    NOTA_MANUAL: <MessageSquare className="h-4 w-4 text-zinc-400" />,
    CREACION_LEAD: <UserPlus className="h-4 w-4 text-green-400" />,
    EDICION_LEAD: <Pencil className="h-4 w-4 text-amber-400" />,
    CAMBIO_ETAPA: <ArrowRightLeft className="h-4 w-4 text-blue-400" />,
    ASIGNACION_AGENTE: <UserCheck className="h-4 w-4 text-purple-400" />,
};

interface HistorialYNotasProps {
    leadId: string;
    agenteId: string | null;
    initialItems: HistorialItem[];
}

export default function HistorialYNotas({ leadId, agenteId, initialItems }: HistorialYNotasProps) {
    const [items, setItems] = useState(initialItems);
    const [nuevaNota, setNuevaNota] = useState("");
    const [isSaving, startSavingTransition] = useTransition();
    const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
    const [editText, setEditText] = useState("");

    useEffect(() => { setItems(initialItems); }, [initialItems]);

    const handleAddNota = () => {
        if (!nuevaNota.trim()) return;
        startSavingTransition(async () => {
            const result = await agregarNotaLeadAction({
                leadId,
                descripcion: nuevaNota,
                agenteId
            });

            if (result.success && result.data) {
                toast.success("Nota añadida.");

                // Construimos manualmente el objeto 'HistorialItem' completo
                // para que coincida con el tipo de nuestro estado 'items'.
                const newItem: HistorialItem = {
                    // Datos que vienen del servidor (los más importantes)
                    id: result.data.id,
                    createdAt: result.data.createdAt,
                    updatedAt: result.data.createdAt, // En creación, son iguales
                    agente: result.data.agente,

                    // Datos que ya tenemos en el cliente
                    descripcion: nuevaNota,
                    leadId: leadId,
                    agenteId: agenteId,
                    tipoAccion: 'NOTA_MANUAL',
                    metadata: {}, // Por defecto un objeto vacío
                };

                setItems([newItem, ...items]);
                setNuevaNota("");
            } else {
                toast.error(result.error || "No se pudo guardar la nota.");
            }
        });
    };

    const handleSaveEdit = (notaId: string) => {
        startSavingTransition(async () => {
            const result = await editarNotaManualAction({ notaId, nuevaDescripcion: editText });
            if (result.success) {
                toast.success("Nota actualizada.");
                setItems(items.map(item => item.id === notaId ? { ...item, descripcion: editText } : item));
                setEditingNoteId(null);
            } else {
                toast.error(result.error || "Ocurrió un error al actualizar la nota.");
            }
        });
    };

    const handleDelete = (notaId: string) => {
        if (!confirm("¿Estás seguro de eliminar esta nota?")) return;
        startSavingTransition(async () => {
            const result = await eliminarNotaManualAction({ notaId });
            if (result.success) {
                toast.success("Nota eliminada.");
                setItems(items.filter(item => item.id !== notaId));
            } else {
                toast.error(result.error || "Ocurrió un error al eliminar la nota.");
            }
        });
    };

    return (
        <Card className="bg-zinc-800/50 border-zinc-700">
            <CardHeader><CardTitle>Historial y Notas</CardTitle></CardHeader>
            <CardContent className="flex flex-col gap-y-4">
                <div className="space-y-2">
                    <Textarea value={nuevaNota} onChange={(e) => setNuevaNota(e.target.value)} placeholder="Añade un comentario o nota..." rows={3} />
                    <Button onClick={handleAddNota} disabled={isSaving || !nuevaNota.trim()} className="w-full">
                        {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Añadir Nota
                    </Button>
                </div>
                <div className="max-h-80 overflow-y-auto space-y-4 custom-scrollbar pr-2 border-t border-zinc-700 pt-4">
                    {items.map(item => (
                        <div key={item.id} className="flex gap-3 group relative">
                            <div className="mt-1">{actionIcons[item.tipoAccion] || <Pencil className="h-4 w-4 text-zinc-500" />}</div>
                            <div className="flex-1">
                                {editingNoteId === item.id ? (
                                    <div className="space-y-2">
                                        <Textarea value={editText} onChange={(e) => setEditText(e.target.value)} rows={3} />
                                        <div className="flex justify-end gap-2">
                                            <Button variant="ghost" size="sm" onClick={() => setEditingNoteId(null)}><X className="h-4 w-4" /> Cancelar</Button>
                                            <Button size="sm" onClick={() => handleSaveEdit(item.id)} disabled={isSaving}><Save className="h-4 w-4 mr-2" /> Guardar</Button>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        <p className="text-sm text-zinc-200 whitespace-pre-wrap">{item.descripcion}</p>
                                        <p className="text-xs text-zinc-500 mt-1">{item.agente?.nombre || 'Sistema'} • {format(new Date(item.createdAt), "d MMM, yyyy HH:mm", { locale: es })}h</p>
                                    </>
                                )}
                            </div>
                            {item.tipoAccion === 'NOTA_MANUAL' && editingNoteId !== item.id && (
                                <div className="absolute top-0 right-0 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => { setEditingNoteId(item.id); setEditText(item.descripcion); }}>
                                        <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400" onClick={() => handleDelete(item.id)}>
                                        <Trash2 className="h-4 w-4" />
                                    </Button>
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </CardContent>
        </Card>
    );
}