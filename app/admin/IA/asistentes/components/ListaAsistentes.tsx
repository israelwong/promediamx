'use client';

import React, { useState, useEffect } from 'react';
// Ajusta la ruta si es necesario
import { obtenerAsistentesVirtuales } from '@/app/admin/_lib/asistenteVirtual.actions';
import { AsistenteVirtual } from '@/app/admin/_lib/types';
import { useRouter } from 'next/navigation';
import { ChevronRightIcon, ListChecks, ListX, Loader2, PlusIcon } from 'lucide-react'; // Iconos

// Tipo para los datos que mostraremos en la lista
type AsistenteEnLista = Pick<AsistenteVirtual, 'id' | 'nombre' | 'status'>;

export default function ListaAsistentePanel() {
    const router = useRouter();
    const [asistentes, setAsistentes] = useState<AsistenteEnLista[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null); // Cambiado tipo de error a string

    // Clases de Tailwind reutilizables
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md h-full flex flex-col";
    const listItemClasses = "border border-zinc-700 rounded-lg p-3 cursor-pointer hover:bg-zinc-700 transition-colors duration-150 flex items-center justify-between gap-3";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out";
    const statusCircleBaseClasses = "h-2.5 w-2.5 rounded-full flex-shrink-0";

    useEffect(() => {
        setLoading(true);
        setError(null);
        const fetchAsistentes = async () => {
            try {
                const data = await obtenerAsistentesVirtuales();
                // Mapear a los campos necesarios para la lista
                const formattedData = data.map(asistente => ({
                    id: asistente.id,
                    nombre: asistente.nombre || 'Asistente sin nombre', // Fallback
                    status: asistente.status ?? 'inactivo', // Default status
                }));
                setAsistentes(formattedData);
            } catch (err) {
                console.error("Error al obtener los asistentes:", err);
                const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
                setError(`Error al cargar asistentes: ${errorMessage}`);
            } finally {
                setLoading(false);
            }
        };
        fetchAsistentes();

        // Cleanup
        return () => {
            setAsistentes([]); setLoading(true); setError(null);
        };
    }, []);

    // Navegación
    const handleCrearNuevo = () => {
        router.push('/admin/IA/asistentes/nuevo');
    };

    const handleVerDetalle = (asistenteId: string) => {
        router.push(`/admin/IA/asistentes/${asistenteId}`);
    };

    // --- Renderizado Condicional del Contenido ---
    const renderContent = () => {
        // Estados de carga, error, vacío... (igual que en ListaTareas/ListaCategorias)
        if (loading) {
            return (
                <div className="flex flex-col items-center justify-center flex-grow text-center py-10">
                    <Loader2 className="h-6 w-6 text-zinc-400 animate-spin mb-2" />
                    <p className="text-zinc-400 text-sm">Cargando asistentes...</p>
                </div>
            );
        }
        if (error) {
            return (
                <div className="flex flex-col items-center justify-center flex-grow text-center py-10 border border-red-500/50 rounded-md m-4">
                    <ListX className="h-8 w-8 text-red-400 mb-2" />
                    <p className="text-red-400 text-sm">{error}</p>
                </div>
            );
        }
        if (asistentes.length === 0) {
            return (
                <div className="flex flex-col items-center justify-center flex-grow text-center py-10">
                    <ListChecks className="h-8 w-8 text-zinc-500 mb-2" />
                    <p className='text-zinc-400 italic text-sm'>No hay asistentes virtuales creados.</p>
                </div>
            );
        }

        // --- Renderizado de la Lista ---
        return (
            <div className="flex-grow overflow-y-auto pr-1">
                <ul className='space-y-2'>
                    {asistentes.map((asistente) => (
                        <li key={asistente.id} className={listItemClasses}
                            onClick={() => handleVerDetalle(asistente.id)}
                            title={`Ver detalles de ${asistente.nombre}`}
                        >
                            {/* Contenido Izquierdo: Status y Nombre */}
                            <div className="flex items-center gap-3 flex-grow overflow-hidden mr-2">
                                <span
                                    className={`${statusCircleBaseClasses} ${asistente.status === 'activo' ? 'bg-green-500' : 'bg-zinc-500'}`}
                                    title={`Status: ${asistente.status === 'activo' ? 'Activo' : 'Inactivo'}`}
                                ></span>
                                <p className="text-sm font-medium text-zinc-200 truncate">
                                    {asistente.nombre}
                                </p>
                            </div>

                            {/* Icono indicador Derecho */}
                            <div className="flex-shrink-0">
                                <ChevronRightIcon className="h-5 w-5 text-zinc-500" />
                            </div>
                        </li>
                    ))}
                </ul>
            </div>
        );
    };

    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className="flex items-center justify-between mb-4 border-b border-zinc-700 pb-2">
                <h3 className="text-lg font-semibold text-white">
                    Listado de Asistentes
                </h3>
                <button
                    onClick={handleCrearNuevo}
                    className={buttonPrimaryClasses}
                    title="Crear un nuevo asistente virtual"
                >
                    <PlusIcon size={16} />
                    <span>Crear Asistente</span>
                </button>
            </div>
            {/* Contenido */}
            {renderContent()}
        </div>
    );
}
