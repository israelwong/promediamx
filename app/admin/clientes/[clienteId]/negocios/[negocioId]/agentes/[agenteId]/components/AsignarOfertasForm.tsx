// app/admin/agentes/[agenteId]/components/AsignarOfertasForm.tsx
"use client";

import React, { useState, useTransition } from 'react';
import { toast } from 'react-hot-toast';
import { Button } from '@/app/components/ui/button';
import { Checkbox } from '@/app/components/ui/checkbox';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Loader2, Save } from 'lucide-react';
import { actualizarOfertasDeAgente } from '@/app/admin/_lib/actions/agente/agente.actions';

interface AsignarOfertasFormProps {
    agenteId: string;
    todasLasOfertas: { id: string; nombre: string; }[];
    ofertasAsignadasIniciales: Set<string>;
}

export default function AsignarOfertasForm({ agenteId, todasLasOfertas, ofertasAsignadasIniciales }: AsignarOfertasFormProps) {
    const [selectedOfertas, setSelectedOfertas] = useState<Set<string>>(ofertasAsignadasIniciales);
    const [isSaving, startSavingTransition] = useTransition();

    const handleCheckboxChange = (ofertaId: string, checked: boolean) => {
        const newSelected = new Set(selectedOfertas);
        if (checked) {
            newSelected.add(ofertaId);
        } else {
            newSelected.delete(ofertaId);
        }
        setSelectedOfertas(newSelected);
    };

    const handleGuardar = () => {
        startSavingTransition(async () => {
            const result = await actualizarOfertasDeAgente({
                agenteId: agenteId,
                nuevasOfertasIds: Array.from(selectedOfertas),
            });

            if (result.success) {
                toast.success("Asignaciones actualizadas correctamente.");
            } else {
                toast.error(result.error || "No se pudo guardar.");
            }
        });
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Asignar Ofertas</CardTitle>
                <CardDescription>Selecciona las ofertas (colegios) que este agente podrá gestionar.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
                <div className="space-y-2">
                    {todasLasOfertas.map(oferta => (
                        <div key={oferta.id} className="flex items-center space-x-2">
                            <Checkbox
                                id={oferta.id}
                                checked={selectedOfertas.has(oferta.id)}
                                onCheckedChange={(checked) => handleCheckboxChange(oferta.id, !!checked)}
                            />
                            <label htmlFor={oferta.id} className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70">
                                {oferta.nombre}
                            </label>
                        </div>
                    ))}
                </div>
                <Button onClick={handleGuardar} disabled={isSaving}>
                    {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Guardar Cambios
                </Button>
            </CardContent>
        </Card>
    );
}