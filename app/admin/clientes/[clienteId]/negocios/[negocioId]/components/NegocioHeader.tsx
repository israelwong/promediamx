'use client';

import React, { useState, useEffect, useCallback, useTransition, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// --- Acciones y Esquemas ---
import {
    obtenerDatosHeaderNegocio,
    actualizarNombreNegocio,
    // archiveNegocio,
    // deleteNegocioDefinitivamente
} from '@/app/admin/_lib/actions/negocio/negocio.actions';
import {
    updateNegocioNombreSchema
} from '@/app/admin/_lib/actions/negocio/negocio.schemas';
import type { NegocioHeaderData } from '@/app/admin/_lib/actions/negocio/negocio.schemas';

// --- Componentes UI y Iconos ---
import { Button } from '@/app/components/ui/button';
import { Input } from '@/app/components/ui/input';
import { Loader2, AlertTriangle, BadgeCheck, BadgeX, X, Edit2, Save } from 'lucide-react';

interface Props {
    clienteId: string;
    negocioId: string;
}

export default function NegocioHeader({ clienteId, negocioId }: Props) {
    const router = useRouter();
    const [headerData, setHeaderData] = useState<NegocioHeaderData | null>(null);
    const [isPending, startTransition] = useTransition();
    const [error, setError] = useState<string | null>(null);

    // --- Estados para Edición de Nombre ---
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState('');
    const [editNameError, setEditNameError] = useState<string | null>(null);

    // --- Carga de datos ---
    const fetchData = useCallback(() => {
        startTransition(async () => {
            setError(null);
            const result = await obtenerDatosHeaderNegocio(negocioId);
            if (result.success && result.data) {
                setHeaderData(result.data);
                setCurrentName(result.data.nombre);
            } else {
                setError(result.error || "No se pudo cargar la información del negocio.");
            }
        });
    }, [negocioId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // --- Manejadores de Eventos ---

    const handleSaveName = (e: FormEvent) => {
        e.preventDefault();
        setEditNameError(null);

        // Validación manual con Zod, sin resolver
        const validation = updateNegocioNombreSchema.safeParse({ nombre: currentName });
        if (!validation.success) {
            setEditNameError(validation.error.flatten().fieldErrors.nombre?.[0] || 'Nombre inválido.');
            return;
        }

        startTransition(async () => {
            const result = await actualizarNombreNegocio(negocioId, validation.data);
            if (result.success) {
                toast.success('Nombre actualizado.');
                setIsEditingName(false);
                fetchData(); // Recargar datos para reflejar el cambio
            } else {
                toast.error(result.error || "No se pudo actualizar el nombre.");
            }
        });
    };

    // --- Renderizado ---

    if (isPending && !headerData) {
        return <div className="p-4 bg-zinc-800 rounded-lg flex justify-center items-center"><Loader2 className="animate-spin" /></div>;
    }
    if (error) {
        return <div className="p-4 bg-red-900/20 text-red-400 rounded-lg flex justify-center items-center"><AlertTriangle size={16} className="mr-2" />{error}</div>;
    }
    if (!headerData) {
        return <div className="p-4 bg-zinc-800 rounded-lg text-center text-zinc-500">Negocio no encontrado.</div>;
    }

    const statusInfo = headerData.suscripcionStatus === 'activa'
        ? { text: 'Activa', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck }
        : { text: 'Inactiva', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };

    return (
        <div className="p-4 bg-zinc-800 rounded-lg shadow-md border border-zinc-700 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 flex-grow">
                {isEditingName ? (
                    <form onSubmit={handleSaveName} className="flex items-center gap-2">
                        <Input
                            type="text"
                            value={currentName}
                            onChange={(e) => setCurrentName(e.target.value)}
                            className="bg-zinc-700 h-8"
                            autoFocus
                        />
                        <Button type="submit" size="icon" className="h-8 w-8 bg-green-600 hover:bg-green-700" disabled={isPending}>
                            {isPending ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
                        </Button>
                        <Button type="button" size="icon" variant="ghost" className="h-8 w-8" onClick={() => setIsEditingName(false)} disabled={isPending}>
                            <X size={16} />
                        </Button>
                    </form>
                ) : (
                    <div className="flex items-center gap-2">
                        <h2 className="text-lg font-semibold text-white">{headerData.nombre}</h2>
                        <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-zinc-400" onClick={() => setIsEditingName(true)} title="Editar nombre">
                            <Edit2 size={16} />
                        </Button>
                    </div>
                )}
                {editNameError && <p className="text-xs text-red-500 w-full sm:w-auto">{editNameError}</p>}

                <div className="flex items-center gap-2">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5 ${statusInfo.color}`}>
                        <statusInfo.icon size={14} />{statusInfo.text}
                    </span>
                    {/* <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-amber-500 hover:bg-amber-500/10" onClick={handleArchive} title="Archivar Negocio" disabled={isPending}>
                        <Archive size={16} />
                    </Button>
                    <Button type="button" size="icon" variant="ghost" className="h-7 w-7 text-red-500 hover:bg-red-500/10" onClick={handleDelete} title="Eliminar Negocio Definitivamente" disabled={isPending}>
                        <Trash2 size={16} />
                    </Button> */}
                </div>
            </div>

            <div className="flex items-center gap-2">
                <Button onClick={() => router.push(`/admin/clientes/${clienteId}`)} variant="outline" className="h-8" disabled={isPending}>
                    <X size={14} className="mr-2" /> Cerrar
                </Button>
            </div>
        </div>
    );
}
