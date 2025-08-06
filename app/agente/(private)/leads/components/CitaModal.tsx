/**
 * Ruta actual: /app/agente/(private)/leads/components/CitaModal.tsx
 */
"use client";

import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/app/components/ui/dialog';
import { useCitaModalStore } from '@/app/admin/_lib/hooks/useCitaModalStore';
import { obtenerDetallesLeadAction } from '@/app/admin/_lib/actions/lead/lead.actions';
import { obtenerNotasLeadAction } from '@/app/admin/_lib/actions/bitacora/bitacora.actions';
import type { LeadDetails } from '@/app/admin/_lib/actions/lead/lead.schemas';
import type { NotaBitacora } from '@/app/admin/_lib/actions/bitacora/bitacora.schemas';
import CitaModalContent from './CitaModalContent'; // Importamos el nuevo contenido
import { Loader2 } from 'lucide-react';

interface CitaModalProps {
    negocioId: string;
    clienteId: string;
}

export default function CitaModal({ negocioId, clienteId }: CitaModalProps) {
    const { isOpen, onClose, leadId } = useCitaModalStore();
    const [leadData, setLeadData] = useState<LeadDetails | null>(null);
    const [notas, setNotas] = useState<NotaBitacora[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (isOpen && leadId) {
            setIsLoading(true);
            setError(null);

            Promise.all([
                obtenerDetallesLeadAction({ leadId }),
                obtenerNotasLeadAction({ leadId }),
            ]).then(([leadResult, notasResult]) => {
                if (leadResult.success && leadResult.data) {
                    setLeadData(leadResult.data);
                } else {
                    setError(leadResult.error || 'Error al cargar los datos del lead.');
                    setLeadData(null);
                }
                if (notasResult.success && notasResult.data) {
                    setNotas(notasResult.data);
                } else {
                    console.error("Error al cargar notas:", notasResult.error);
                    setNotas([]);
                }
            }).catch((err) => {
                setError(`Ocurrió un error inesperado: ${err.message}`);
            }).finally(() => {
                setIsLoading(false);
            });
        }
    }, [isOpen, leadId]);

    const handleClose = () => {
        setLeadData(null);
        setNotas([]);
        setError(null);
        onClose();
    };

    return (
        <Dialog open={isOpen} onOpenChange={handleClose}>
            <DialogContent className="bg-zinc-900 border-zinc-700 text-zinc-100 max-w-lg">
                <DialogHeader>
                    <DialogTitle className="text-xl">
                        {isLoading ? "Cargando..." : (leadData?.nombre || "Lead")}
                    </DialogTitle>
                    <DialogDescription>
                        Resumen de la información principal del prospecto.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4 max-h-[70vh] overflow-y-auto custom-scrollbar">
                    {isLoading && <div className="flex justify-center items-center h-48"><Loader2 className="h-8 w-8 animate-spin text-blue-500" /></div>}
                    {error && <p className="text-center text-red-500 p-4">{error}</p>}
                    {!isLoading && !error && leadData && (
                        <CitaModalContent
                            lead={leadData}
                            initialNotes={notas}
                            negocioId={negocioId}
                            clienteId={clienteId}
                        />
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}
