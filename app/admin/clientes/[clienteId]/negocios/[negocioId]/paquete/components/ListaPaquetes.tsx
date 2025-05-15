// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/paquetes/components/ListaPaquetes.tsx
'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { Button } from '@/app/components/ui/button' // Asumiendo componente Button
import { PlusCircle, Edit3, Trash2, HelpCircle, Loader2, AlertTriangle } from 'lucide-react';

// Ajusta las rutas según la ubicación real de tus archivos
import { obtenerPaquetesPorNegocioAction } from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.actions';
import { NegocioPaqueteListItem } from '@/app/admin/_lib/actions/negocioPaquete/negocioPaquete.schemas';

interface ListaPaquetesProps {
    negocioId: string;
    clienteId: string; // Útil para construir URLs de navegación
}

export default function ListaPaquetes({ negocioId, clienteId }: ListaPaquetesProps) {
    const [paquetes, setPaquetes] = useState<NegocioPaqueteListItem[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        if (negocioId) {
            const cargarPaquetes = async () => {
                setIsLoading(true);
                setError(null);
                const result = await obtenerPaquetesPorNegocioAction(negocioId);
                if (result.success && result.data) {
                    setPaquetes(result.data);
                } else {
                    setError(result.error || "Error desconocido al cargar los paquetes.");
                }
                setIsLoading(false);
            };
            cargarPaquetes();
        }
    }, [negocioId]); // Se ejecuta cuando negocioId cambia

    // Clases de Tailwind para aplicar el estilo Dark Theme (basado en tus directrices)
    const cardClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md";
    const textPrimaryClasses = "text-zinc-100";
    const textSecondaryClasses = "text-zinc-400 text-sm";
    const textPriceClasses = "text-lg font-semibold text-blue-400";
    const badgeClasses = "text-xs font-medium px-2.5 py-0.5 rounded-full";
    const statusColors: { [key: string]: string } = {
        activo: "bg-green-500/20 text-green-300",
        inactivo: "bg-zinc-600/20 text-zinc-400",
        borrador: "bg-amber-500/20 text-amber-300", // Ejemplo de otro estado
    };

    const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}/paquete`;

    if (isLoading) {
        return (
            <div className="flex flex-col items-center justify-center h-60 p-6 text-zinc-400">
                <Loader2 size={48} className="animate-spin mb-4" />
                <p>Cargando paquetes...</p>
            </div>
        );
    }

    if (error) {
        return (
            <div className={`${cardClasses} p-6 text-center`}>
                <AlertTriangle size={48} className="mx-auto mb-4 text-red-500" />
                <p className="mb-2 text-lg font-semibold text-red-400">Error al cargar los paquetes</p>
                <p className="text-red-500 mb-4">{error}</p>
                <Link href={`${basePath}/nuevo`}>
                    <Button>
                        <PlusCircle size={18} className="mr-2" />
                        Intentar Crear Nuevo Paquete
                    </Button>
                </Link>
                <Link href={`${basePath}/categoria`}>
                    <Button>
                        <PlusCircle size={18} className="mr-2" />
                        Crear Nueva Categoría
                    </Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between pb-2 mb-4 border-b border-zinc-700">
                <h2 className={`text-xl font-semibold ${textPrimaryClasses}`}>
                    Paquetes del Negocio
                </h2>

                <Link href={`${basePath}/categoria`}>
                    <Button>
                        <PlusCircle size={18} className="mr-2" />
                        Crear Nueva Categoría
                    </Button>
                </Link>

                <Link href={`${basePath}/nuevo`}>
                    <Button> {/* Aplicar buttonPrimaryClasses si las tienes definidas globalmente */}
                        <PlusCircle size={18} className="mr-2" />
                        Nuevo Paquete
                    </Button>
                </Link>

            </div>

            {paquetes.length === 0 ? (
                <div className={`${cardClasses} p-6 py-12 text-center ${textSecondaryClasses}`}>
                    <HelpCircle size={48} className="mx-auto mb-4 text-zinc-500" />
                    <p className="mb-2 text-lg font-semibold text-zinc-300">Aún no hay paquetes creados.</p>
                    <p className="mb-6">Comienza creando tu primer paquete de servicios o productos para este negocio.</p>
                    <Link href={`${basePath}/nuevo`}>
                        <Button>
                            <PlusCircle size={18} className="mr-2" />
                            Crear Mi Primer Paquete
                        </Button>
                    </Link>
                    <Link href={`${basePath}/categoria`}>
                        <Button variant="secondary" className="mt-2">
                            <PlusCircle size={18} className="mr-2" />
                            Crear Nueva Categoría
                        </Button>
                    </Link>
                </div>
            ) : (
                <ul className="space-y-4">
                    {paquetes.map((paquete) => (
                        <li key={paquete.id} className={`${cardClasses} p-4 group transition-all hover:border-zinc-600 hover:shadow-xl`}>
                            <div className="flex flex-col md:flex-row justify-between md:items-start gap-4">
                                <div className="flex-grow">
                                    <div className="flex items-center gap-3 mb-1">
                                        <Link href={`${basePath}/${paquete.id}/editar`} className="block">
                                            <h3 className={`text-base font-semibold ${textPrimaryClasses} group-hover:text-blue-400 transition-colors`}>
                                                {paquete.nombre}
                                            </h3>
                                        </Link>
                                        <span className={`${badgeClasses} ${statusColors[paquete.status.toLowerCase()] || statusColors.inactivo}`}>
                                            {paquete.status}
                                        </span>
                                    </div>
                                    {paquete.negocioPaqueteCategoria?.nombre && (
                                        <p className={`text-xs font-medium text-teal-400 mb-1`}>
                                            Categoría: {paquete.negocioPaqueteCategoria.nombre}
                                        </p>
                                    )}
                                    <p className={`${textSecondaryClasses} line-clamp-2`}>
                                        {paquete.descripcion || "Sin descripción."}
                                    </p>
                                    <p className={`mt-2 text-xs ${textSecondaryClasses}`}>
                                        Creado: {new Date(paquete.createdAt).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' })}
                                    </p>
                                </div>
                                <div className="flex flex-col items-start md:items-end gap-2 flex-shrink-0 pt-2 md:pt-0">
                                    <p className={textPriceClasses}>
                                        ${paquete.precio.toFixed(2)} MXN
                                    </p>
                                    <div className="flex items-center gap-2 mt-1">
                                        <Link href={`${basePath}/${paquete.id}`}>
                                            <Button variant="outline" size="sm" className="text-zinc-300 border-zinc-600 hover:bg-zinc-700 hover:text-zinc-100">
                                                <Edit3 size={14} className="mr-1.5" /> Editar
                                            </Button>
                                        </Link>
                                        <Button
                                            variant="outline" // Cambiado de "destructive" para un look más sutil
                                            size="sm"
                                            className="text-red-400 border-red-700/40 hover:bg-red-700/20 hover:text-red-300 hover:border-red-700/60"
                                        // onClick={() => handleDelete(paquete.id)} // Implementar lógica de eliminación
                                        >
                                            <Trash2 size={14} className="mr-1.5" /> Eliminar
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
}
