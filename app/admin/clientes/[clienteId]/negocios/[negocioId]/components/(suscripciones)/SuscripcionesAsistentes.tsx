'use client';

import React, { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
// Ajusta rutas
import { obtenerAsistentesParaLista } from '@/app/admin/_lib/asistenteVirtual.actions';
import { AsistenteEnLista } from '@/app/admin/_lib/types';
import { Loader2, PlusIcon, Bot, MessageSquare, Pencil } from 'lucide-react'; // Iconos

interface Props {
    negocioId: string;
    clienteId: string; // Necesario para construir la URL de creación/edición
}

// Helper para formatear moneda
const formatCurrency = (value: number | null) => {
    if (value === null) return '$ -.--';
    return value.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
};

// --- Componente AsistenteCard (Compacto) ---
const AsistenteCard = ({ asistente, clienteId, negocioId }: { asistente: AsistenteEnLista; clienteId: string; negocioId: string; }) => {
    const totalMensual = (asistente.precioBase ?? 0) + asistente.costoTotalTareasAdicionales;
    const editUrl = `/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/${asistente.id}`;

    const cardClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-md p-3 flex items-center gap-3 hover:bg-zinc-700/50 transition-colors duration-150 group";
    const avatarClasses = "w-10 h-10 rounded-full overflow-hidden border border-zinc-600 bg-zinc-700 flex-shrink-0 flex items-center justify-center";
    const placeholderIconClasses = "w-6 h-6 text-zinc-500";
    const infoClasses = "flex-grow overflow-hidden";
    const nameClasses = "text-sm font-medium text-zinc-100 truncate block"; // block para que Link funcione bien
    const statsClasses = "text-xs text-zinc-400 flex items-center gap-2 mt-0.5";
    const priceClasses = "text-sm font-semibold text-emerald-400 flex-shrink-0 ml-2";
    const editButtonClasses = "p-1 text-zinc-400 hover:text-blue-400 opacity-0 group-hover:opacity-100 transition-opacity duration-150 rounded focus:outline-none focus:ring-1 focus:ring-blue-500";

    return (
        <div className={cardClasses}>
            {/* Avatar */}
            <div className={avatarClasses}>
                {asistente.urlImagen ? (
                    <Image
                        src={asistente.urlImagen}
                        alt={`Avatar de ${asistente.nombre}`}
                        width={40}
                        height={40}
                        className="object-cover w-full h-full"
                        onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }} // Ocultar si falla
                    />
                ) : (
                    <Bot className={placeholderIconClasses} />
                )}
            </div>

            {/* Info */}
            <div className={infoClasses}>
                <Link href={editUrl} className={nameClasses} title={asistente.nombre}>
                    {asistente.nombre}
                </Link>
                <div className={statsClasses}>
                    {/* Status */}
                    <span className={`inline-block w-2 h-2 rounded-full ${asistente.status === 'activo' ? 'bg-green-500' : 'bg-zinc-500'}`} title={`Status: ${asistente.status}`}></span>
                    {/* Conversaciones (Opcional) */}
                    {asistente.totalConversaciones !== undefined && (
                        <span className="flex items-center gap-0.5" title={`${asistente.totalConversaciones} Conversaciones`}>
                            <MessageSquare size={12} /> {asistente.totalConversaciones}
                        </span>
                    )}
                    {/* Tareas Suscritas (Opcional) */}
                    {/* {asistente.totalTareasSuscritas !== undefined && (
                        <span className="flex items-center gap-0.5" title={`${asistente.totalTareasSuscritas} Tareas Suscritas`}>
                            <ListChecks size={12} /> {asistente.totalTareasSuscritas}
                        </span>
                    )} */}
                </div>
            </div>

            {/* Precio y Botón Editar */}
            <div className="flex items-center flex-shrink-0">
                <span className={priceClasses} title="Costo mensual total estimado">
                    {formatCurrency(totalMensual)}
                </span>
                <Link href={editUrl} className={editButtonClasses} title="Editar Asistente">
                    <Pencil size={14} />
                </Link>
            </div>
        </div>
    );
};


// --- Componente Principal ---
export default function AsistentesListaPorNegocio({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [asistentes, setAsistentes] = useState<AsistenteEnLista[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases Tailwind
    const containerClasses = "p-4 bg-zinc-800/50  flex flex-col h-full"; // Fondo más sutil
    const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
    const titleClasses = "text-sm font-semibold text-white whitespace-nowrap flex items-center gap-2"; // Título más pequeño
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
    const gridContainerClasses = "flex-grow overflow-y-auto -mr-2 pr-2 space-y-2"; // Grid simple de 1 columna con espacio

    // Carga de datos
    const fetchData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await obtenerAsistentesParaLista(negocioId);
            setAsistentes(data || []);
        } catch (err) {
            console.error("Error al obtener asistentes:", err);
            setError("No se pudieron cargar los asistentes.");
            setAsistentes([]);
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const handleCrearAsistente = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/asistente/nuevo`);
    };

    return (
        <div className={containerClasses}>
            {/* Cabecera */}
            <div className={headerClasses}>
                <h3 className={titleClasses}>
                    <Bot size={16} /> Asistentes Virtuales
                </h3>
                <button onClick={handleCrearAsistente} className={buttonPrimaryClasses} title="Crear nuevo asistente">
                    <PlusIcon size={14} /> <span>Crear</span>
                </button>
            </div>

            {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}

            {/* Contenido Principal: Lista/Grid de Tarjetas */}
            <div className={gridContainerClasses}>
                {loading ? (
                    <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando...</span></div>
                ) : asistentes.length === 0 && !error ? (
                    <div className="flex flex-col items-center justify-center text-center py-10"><Bot className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay asistentes creados para este negocio.</p></div>
                ) : (
                    // Grid simple, puedes cambiar a grid-cols-X si prefieres varias columnas
                    <div className="space-y-2">
                        {asistentes.map((asistente) => (
                            <AsistenteCard
                                key={asistente.id}
                                asistente={asistente}
                                clienteId={clienteId}
                                negocioId={negocioId}
                            />
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
