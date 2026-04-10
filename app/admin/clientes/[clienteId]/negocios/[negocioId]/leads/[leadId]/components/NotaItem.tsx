// Ruta: app/admin/clientes/.../components/NotaItem.tsx
"use client";

import React from 'react';
import { format } from 'date-fns';
import { es } from 'date-fns/locale';
import { NotaBitacora } from '@/app/admin/_lib/actions/bitacora/bitacora.schemas';
import { Button } from '@/app/components/ui/button';
import { Textarea } from '@/app/components/ui/textarea';
import { Edit, Trash2, Save, X } from 'lucide-react';

interface NotaItemProps {
    nota: NotaBitacora;
    isEditing: boolean;
    editText: string;
    onSetEditText: (text: string) => void;
    onStartEdit: (nota: NotaBitacora) => void;
    onCancelEdit: () => void;
    onSaveEdit: (notaId: string) => void;
    onDelete: (notaId: string) => void;
    isSaving: boolean;
}

export default function NotaItem({ nota, isEditing, editText, onSetEditText, onStartEdit, onCancelEdit, onSaveEdit, onDelete, isSaving }: NotaItemProps) {
    if (isEditing) {
        return (
            <div className="text-sm bg-zinc-700 p-3 rounded-md border border-zinc-600">
                <Textarea
                    value={editText}
                    onChange={(e) => onSetEditText(e.target.value)}
                    rows={3}
                    className="mb-2"
                />
                <div className="flex justify-end gap-2">
                    <Button variant="ghost" size="sm" onClick={onCancelEdit}>
                        <X className="h-4 w-4" /> Cancelar
                    </Button>
                    <Button variant="secondary" size="sm" onClick={() => onSaveEdit(nota.id)} disabled={isSaving}>
                        <Save className="h-4 w-4 mr-2" /> Guardar
                    </Button>
                </div>
            </div>
        );
    }

    return (
        <div className="text-sm bg-zinc-900/50 p-3 rounded-md border border-zinc-700/50 group relative">
            <p className="text-zinc-200 whitespace-pre-wrap">{nota.descripcion}</p>
            <p className="text-xs text-zinc-500 mt-2 text-right">
                {format(new Date(nota.createdAt), "d MMM yy, HH:mm", { locale: es })}h
            </p>
            <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity flex gap-1">
                <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => onStartEdit(nota)}>
                    <Edit className="h-4 w-4" />
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500 hover:text-red-400" onClick={() => onDelete(nota.id)}>
                    <Trash2 className="h-4 w-4" />
                </Button>
            </div>
        </div>
    );
}