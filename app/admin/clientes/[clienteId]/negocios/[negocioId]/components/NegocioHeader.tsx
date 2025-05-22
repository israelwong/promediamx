'use client';

import React, { useEffect, useState, useCallback, useMemo, ChangeEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta la ruta a tus acciones y tipos
import { obtenerDatosHeaderNegocio, NegocioHeaderData } from '@/app/admin/_lib/negocio.actions'; // Usar la acción existente
import { actualizarNegocio } from '@/app/admin/_lib/negocio.actions'; // Importar acción para actualizar
import { Loader2, AlertTriangle, BadgeCheck, BadgeX, CalendarClock, CreditCard, X, Edit2, Save } from 'lucide-react'; // Iconos

interface Props {
    clienteId: string;
    negocioId: string;
}

export default function NegocioHeader({ clienteId, negocioId }: Props) {
    const router = useRouter();
    const [headerData, setHeaderData] = useState<NegocioHeaderData | null>(null);
    const [loading, setLoading] = useState(true); // Loading general para carga inicial
    const [error, setError] = useState<string | null>(null);

    // --- Estados para Edición de Nombre ---
    const [isEditingName, setIsEditingName] = useState(false);
    const [currentName, setCurrentName] = useState('');
    const [isSavingName, setIsSavingName] = useState(false); // Loading específico para guardar nombre
    const [editNameError, setEditNameError] = useState<string | null>(null);
    // --- Fin Estados Edición ---


    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md border border-zinc-700 flex flex-wrap items-center justify-between gap-4";
    const infoBlockClasses = "flex items-center gap-2 text-sm";
    const statusBadgeClasses = "px-2.5 py-1 rounded-full text-xs font-semibold flex items-center gap-1.5";
    const amountClasses = "text-lg font-bold text-emerald-400";
    const buttonBaseClasses = "px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-60";
    const payButtonClasses = `${buttonBaseClasses} bg-orange-500 hover:bg-orange-600 text-white focus:ring-orange-400`;
    const closeButtonClasses = `${buttonBaseClasses} bg-zinc-600 hover:bg-zinc-500 text-zinc-100 focus:ring-zinc-400`;
    const editButtonClasses = "p-1 text-zinc-400 hover:text-blue-400 rounded-md hover:bg-zinc-700";
    const nameInputClasses = "bg-zinc-700 border border-zinc-600 text-lg font-semibold text-white rounded-md px-2 py-0.5 focus:ring-blue-500 focus:border-blue-500 focus:outline-none";


    // --- Carga de datos ---
    const fetchData = useCallback(async (isInitialLoad = false) => { // Añadir parámetro opcional
        if (!negocioId) return;
        // Mostrar loader solo en la carga inicial
        if (isInitialLoad) setLoading(true);
        setError(null);
        setEditNameError(null);
        try {
            const data = await obtenerDatosHeaderNegocio(negocioId);
            setHeaderData(data);
            if (data?.nombre) {
                setCurrentName(data.nombre);
            }
            // Mostrar error solo si no es carga inicial y no hay datos
            if (!data && !isInitialLoad) {
                setError("No se encontró información para este negocio.");
            }
        } catch (err) {
            console.error("Error fetching header data:", err);
            setError("Error al cargar datos de cabecera.");
            setHeaderData(null);
        } finally {
            // **CORRECCIÓN:** Siempre poner loading a false al final
            setLoading(false);
        }
        // **CORRECCIÓN:** Quitar 'loading' de las dependencias de useCallback
    }, [negocioId]);

    // Efecto para la carga inicial
    useEffect(() => {
        fetchData(true); // Llamar con 'true' para indicar carga inicial
    }, [fetchData]); // La dependencia de fetchData es correcta aquí


    // --- Cálculo del Monto Total (sin cambios) ---
    const montoTotalSuscripcion = useMemo(() => {
        if (!headerData?.AsistenteVirtual) return 0;
        let total = 0;
        headerData.AsistenteVirtual.forEach(asistente => {
            if (typeof asistente.precioBase === 'number') { total += asistente.precioBase; }
            asistente.AsistenteTareaSuscripcion?.forEach(suscripcion => {
                if (suscripcion.status === 'activo' && typeof suscripcion.montoSuscripcion === 'number') { total += suscripcion.montoSuscripcion; }
            });
        });
        return total;
    }, [headerData]);

    // --- Helpers (sin cambios) ---
    const formatCurrency = (amount: number) => amount.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' });
    const formatDate = (date: Date | string | null | undefined): string => {
        if (!date) return 'N/A';
        try { return new Date(date).toLocaleDateString('es-MX', { year: 'numeric', month: 'long', day: 'numeric' }); }
        catch { return 'Fecha inválida'; }
    };
    const getStatusInfo = (status: NegocioHeaderData['suscripcionStatus']): { text: string; color: string; icon: React.ElementType } => {
        switch (status) {
            case 'activa': return { text: 'Activa', color: 'bg-green-500/20 text-green-400 border border-green-500/30', icon: BadgeCheck };
            case 'prueba': return { text: 'Prueba', color: 'bg-blue-500/20 text-blue-400 border border-blue-500/30', icon: BadgeCheck };
            case 'inactiva': return { text: 'Inactiva', color: 'bg-zinc-600/30 text-zinc-400 border border-zinc-600/50', icon: BadgeX };
            case 'cancelada': return { text: 'Cancelada', color: 'bg-red-500/20 text-red-400 border border-red-500/30', icon: BadgeX };
            default: return { text: 'Desconocido', color: 'bg-gray-500/20 text-gray-400 border border-gray-500/30', icon: AlertTriangle };
        }
    };

    // --- Manejadores Edición Nombre ---
    const handleEditNameClick = () => {
        if (headerData?.nombre) { setCurrentName(headerData.nombre); }
        setEditNameError(null);
        setIsEditingName(true);
    };

    const handleNameChange = (e: ChangeEvent<HTMLInputElement>) => {
        setCurrentName(e.target.value);
        setEditNameError(null);
    };

    const handleSaveName = async () => {
        if (!currentName.trim()) { setEditNameError("El nombre no puede estar vacío."); return; }
        if (currentName === headerData?.nombre) { setIsEditingName(false); return; }

        setIsSavingName(true);
        setEditNameError(null);
        try {
            await actualizarNegocio(negocioId, { id: negocioId, nombre: currentName.trim() });
            setIsEditingName(false);
            // **Llamar a fetchData SIN indicar carga inicial para refrescar**
            await fetchData(false);
        } catch (err) {
            console.error("Error updating negocio name:", err);
            setEditNameError("Error al guardar el nombre.");
        } finally {
            setIsSavingName(false);
        }
    };

    const handleCancelEditName = () => {
        setIsEditingName(false);
        setEditNameError(null);
        if (headerData?.nombre) { setCurrentName(headerData.nombre); }
    };

    // --- Renderizado ---
    // Mostrar loader solo en la carga inicial
    if (loading) {
        return (
            <div className={`${containerClasses} justify-center`}>
                <Loader2 className="h-5 w-5 animate-spin text-zinc-400" />
                <span className="text-sm text-zinc-400 ml-2">Cargando cabecera...</span>
            </div>
        );
    }

    // Mostrar error si existe (puede ser de carga inicial o de guardado de nombre)
    if (error) {
        return (
            <div className={`${containerClasses} bg-red-900/30 border-red-700 justify-center`}>
                <AlertTriangle className="h-5 w-5 text-red-400" />
                <span className="text-sm text-red-400 ml-2">{error}</span>
            </div>
        );
    }

    // Mostrar mensaje si no hay datos después de cargar
    if (!headerData) {
        return (
            <div className={`${containerClasses} justify-center`}>
                <span className="text-sm text-zinc-500">No se encontró información para este negocio.</span>
            </div>
        );
    }

    const handleCerrarNegocio = () => {
        // Aquí puedes implementar la lógica para cerrar el negocio
        // Por ejemplo, redirigir a otra página o mostrar un mensaje
        router.push(`/admin/clientes/${clienteId}`); // Redirigir a la lista de negocios
    }

    // Si hay datos
    const statusInfo = getStatusInfo(headerData.suscripcionStatus);
    const isPagoVencido = headerData.estadoPago === 'vencido';

    return (
        <div className={containerClasses}>
            {/* Bloque Izquierdo: Título (Editable) y Status */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 flex-grow min-w-0">
                {/* Nombre Editable */}
                <div className="flex items-center gap-2 min-w-0">
                    {isEditingName ? (
                        <div className="flex items-center gap-1">
                            <input type="text" value={currentName} onChange={handleNameChange} className={nameInputClasses} disabled={isSavingName} onKeyDown={(e) => { if (e.key === 'Enter') handleSaveName(); if (e.key === 'Escape') handleCancelEditName(); }} autoFocus maxLength={100} />
                            <button onClick={handleSaveName} className={`${editButtonClasses} text-green-500 hover:text-green-400`} disabled={isSavingName} title="Guardar nombre">{isSavingName ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}</button>
                            <button onClick={handleCancelEditName} className={`${editButtonClasses} text-red-500 hover:text-red-400`} disabled={isSavingName} title="Cancelar edición"><X size={16} /></button>
                        </div>
                    ) : (
                        <>
                            <h2 className="text-lg font-semibold text-white leading-tight truncate" title={headerData.nombre || `Negocio ID: ${negocioId}`}>{headerData.nombre || `Negocio ID: ${negocioId}`}</h2>
                            <button onClick={handleEditNameClick} className={editButtonClasses} title="Editar nombre"><Edit2 size={16} /></button>
                        </>
                    )}
                </div>
                {editNameError && <p className="text-xs text-red-400 ml-2">{editNameError}</p>}
                {/* Status */}
                <span className={`${statusBadgeClasses} ${statusInfo.color} mt-1 sm:mt-0 flex-shrink-0`}>
                    <statusInfo.icon size={14} />{statusInfo.text}
                </span>
            </div>

            {/* Bloque Central: Monto y Próximo Pago */}
            <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6 text-zinc-300">
                <div className={infoBlockClasses} title="Monto total recurrente actual"><span className={amountClasses}>{formatCurrency(montoTotalSuscripcion)}</span><span className="text-xs text-zinc-400">/ mes</span></div>
                <div className={`${infoBlockClasses} border-l border-zinc-600 pl-4 sm:pl-6`} title="Próxima fecha de facturación"><CalendarClock size={16} className="text-cyan-400" /><span>Próx. Pago: {formatDate(headerData.fechaProximoPago)}</span></div>
            </div>

            {/* Bloque Derecho: Botones */}
            <div className="flex items-center gap-2 flex-shrink-0">
                {isPagoVencido && (<button onClick={() => alert('Redirigir a página de pago...')} className={payButtonClasses}><CreditCard size={14} /> Pagar Ahora</button>)}
                <button
                    onClick={() => handleCerrarNegocio()} className={closeButtonClasses} title="Cerrar y volver atrás"><X size={14} /> Cerrar</button>
            </div>
        </div>
    );
}
