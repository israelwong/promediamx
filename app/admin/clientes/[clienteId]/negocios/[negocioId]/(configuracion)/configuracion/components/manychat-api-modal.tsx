/*
  Ruta: app/admin/.../configuracion/components/manychat-api-modal.tsx
*/
"use client";

import React, { useState, useTransition } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/app/components/ui/dialog';
import { Input } from '@/app/components/ui/input';
import { Button } from '@/app/components/ui/button';
import { Label } from '@/app/components/ui/label';
import { Loader2, Save } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { actualizarManyChatApiKeyAction } from '@/app/admin/_lib/actions/crm/crm.actions';

interface ManyChatApiModalProps {
    isOpen: boolean;
    onClose: () => void;
    negocioId: string;
    clienteId: string;
    onSuccess: () => void; // ✅ Prop para notificar el éxito.
}

export default function ManyChatApiModal({ isOpen, onClose, negocioId, clienteId, onSuccess }: ManyChatApiModalProps) {
    const [apiKey, setApiKey] = useState('');
    const [isPending, startTransition] = useTransition();

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();
        if (!apiKey.trim()) {
            toast.error("Por favor, introduce una API Key.");
            return;
        }

        startTransition(async () => {
            const result = await actualizarManyChatApiKeyAction({ negocioId, clienteId, apiKey });
            if (result.success) {
                toast.success("¡API Key de ManyChat guardada correctamente!");
                onSuccess(); // ✅ Llama a la función de éxito del padre.
            } else {
                toast.error(result.error || "No se pudo guardar la clave.");
            }
        });
    };

    return (
        <Dialog open={isOpen} onOpenChange={onClose}>
            <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100">
                <DialogHeader>
                    <DialogTitle>Configurar API Key de ManyChat</DialogTitle>
                    <DialogDescription>
                        Introduce tu clave de API para conectar tu cuenta de ManyChat.
                    </DialogDescription>
                </DialogHeader>
                <form onSubmit={handleSubmit}>
                    <div className="py-4">
                        <Label htmlFor="manychat-api-key" className="text-zinc-300">API Key</Label>
                        <Input
                            id="manychat-api-key"
                            type="password"
                            value={apiKey}
                            onChange={(e) => setApiKey(e.target.value)}
                            className="mt-1"
                            placeholder="sk_live_..."
                        />
                    </div>
                    <DialogFooter>
                        <Button type="button" variant="ghost" onClick={onClose} disabled={isPending}>Cancelar</Button>
                        <Button type="submit" disabled={isPending}>
                            {isPending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                            Guardar Clave
                        </Button>
                    </DialogFooter>
                </form>
            </DialogContent>
        </Dialog>
    );
}
