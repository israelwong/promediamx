// Ruta: (ej. app/admin/clientes/[clienteId]/negocios/[negocioId]/_components/NegocioPaquetes.tsx)
'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button'; // Ajusta la ruta a tu componente Button
import { Package, Loader2, AlertTriangle, ArrowRight, PlusCircle } from 'lucide-react';

// Ajusta las rutas según la ubicación real de tus archivos
import { obtenerPaquetesPorNegocioAction } from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.actions';
import { NegocioPaqueteListItem } from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.schemas';
import { ActionResult } from '@/app/admin/_lib/types';

interface NegocioPaquetesProps {
    clienteId: string;
    negocioId: string;
}

export default function NegocioPaquetes({ clienteId, negocioId }: NegocioPaquetesProps) {
    const router = useRouter();
    const [paquetes, setPaquetes] = useState<NegocioPaqueteListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchPaquetes = useCallback(async () => {
        if (!negocioId) {
            setIsLoading(false);
            setError("ID de negocio no proporcionado.");
            return;
        }
        setIsLoading(true);
        setError(null);
        const result: ActionResult<NegocioPaqueteListItem[]> = await obtenerPaquetesPorNegocioAction(negocioId);
        if (result.success && result.data) {
            // Tomar solo algunos paquetes para la vista previa, ej. los primeros 3 o 5
            setPaquetes(result.data.slice(0, 3));
        } else {
            setError(result.error || "Error al cargar los paquetes.");
            setPaquetes([]);
        }
        setIsLoading(false);
    }, [negocioId]);

    useEffect(() => {
        fetchPaquetes();
    }, [fetchPaquetes]);

    const handleNavigateToPaquetes = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/paquetes`);
    };

    const handleNavigateToNuevoPaquete = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/paquetes/nuevo`);
    };

    // Clases de estilo
    const cardContainerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg p-4 md:p-6";
    const titleClasses = "text-lg font-semibold text-zinc-100 flex items-center";
    const textMutedClasses = "text-sm text-zinc-400";
    const listItemClasses = "flex justify-between items-center py-2 border-b border-zinc-700/50 last:border-b-0";
    const paqueteNombreClasses = "text-sm text-zinc-200";
    const paquetePrecioClasses = "text-sm font-medium text-blue-400";
    const statusBadgeBase = "text-xs px-2 py-0.5 rounded-full font-medium";
    const statusColors: { [key: string]: string } = {
        activo: "bg-green-500/20 text-green-300",
        inactivo: "bg-zinc-600/20 text-zinc-400",
    };


    return (
        <div className={cardContainerClasses}>
            <div className="flex justify-between items-center mb-3">
                <h3 className={titleClasses}>
                    <Package size={20} className="mr-2 text-blue-500" />
                    Paquetes
                </h3>
                <Button
                    variant="outline"
                    size="sm"
                    onClick={handleNavigateToPaquetes}
                    className="border-zinc-600 hover:bg-zinc-700 text-zinc-300"
                >
                    Gestionar <ArrowRight size={14} className="ml-1.5" />
                </Button>
            </div>

            {isLoading && (
                <div className="flex items-center justify-center py-8">
                    <Loader2 size={24} className="animate-spin text-zinc-400 mr-2" />
                    <span className={textMutedClasses}>Cargando paquetes...</span>
                </div>
            )}

            {!isLoading && error && (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                    <AlertTriangle size={32} className="text-red-500 mb-2" />
                    <p className="text-red-400 text-sm mb-1">Error al cargar paquetes.</p>
                    <p className="text-xs text-zinc-500">{error}</p>
                    <Button onClick={fetchPaquetes} variant="link" size="sm" className="mt-2 text-blue-400">Reintentar</Button>
                </div>
            )}

            {!isLoading && !error && paquetes.length === 0 && (
                <div className="text-center py-8">
                    <p className={`${textMutedClasses} mb-3`}>Aún no has creado ningún paquete.</p>
                    <Button
                        onClick={handleNavigateToNuevoPaquete}
                        className="bg-blue-600 hover:bg-blue-700"
                    >
                        <PlusCircle size={16} className="mr-2" />
                        Crear Primer Paquete
                    </Button>
                </div>
            )}

            {!isLoading && !error && paquetes.length > 0 && (
                <ul className="space-y-1 mb-4">
                    {paquetes.map(paquete => (
                        <li key={paquete.id} className={listItemClasses}>
                            <div className="truncate">
                                <p className={paqueteNombreClasses}>{paquete.nombre}</p>
                                {paquete.negocioPaqueteCategoria?.nombre && (
                                    <span className="text-xs text-teal-400">
                                        ({paquete.negocioPaqueteCategoria.nombre})
                                    </span>
                                )}
                            </div>
                            <div className="flex items-center gap-2 flex-shrink-0">
                                <span className={paquetePrecioClasses}>${paquete.precio.toFixed(2)}</span>
                                <span className={`${statusBadgeBase} ${statusColors[paquete.status.toLowerCase()] || statusColors.inactivo}`}>
                                    {paquete.status}
                                </span>
                            </div>
                        </li>
                    ))}
                    {/* Puedes añadir un mensaje si hay más paquetes no mostrados */}
                </ul>
            )}
        </div>
    );
}
