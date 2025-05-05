'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, CheckCircle2, XCircle, Settings, PencilLine, AlertCircle, Info } from 'lucide-react'; // Icons

// Importar la acción y los tipos
import { obtenerEstadoConfiguracionNegocio } from '@/app/admin/_lib/negocio.actions'; // Ajusta la ruta
import { EstadoConfiguracionNegocio } from '@/app/admin/_lib/types'; // Ajusta la ruta

interface Props {
    negocioId: string;
    clienteId?: string; // Para construir la URL de edición
}

// Mapeo de claves de sección a nombres visibles y iconos
const SECCION_INFO = {
    logo: { nombre: 'Logo', Icono: Info }, // Puedes cambiar Info por un icono más específico si lo tienes
    descripcion: { nombre: 'Descripción General', Icono: Info },
    contacto: { nombre: 'Información de Contacto', Icono: Info },
    politicas: { nombre: 'Políticas y Legales', Icono: Info },
    marketing: { nombre: 'Marketing (Cliente Ideal, etc.)', Icono: Info },
    faqObjeciones: { nombre: 'Preguntas Frecuentes / Objeciones', Icono: Info },
};
type SeccionKey = keyof typeof SECCION_INFO;

export default function NegocioConfiguracionResumen({ negocioId, clienteId }: Props) {
    const router = useRouter();
    const [estadoConfig, setEstadoConfig] = useState<EstadoConfiguracionNegocio | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
    const progressBarContainerClasses = "w-full bg-zinc-700 rounded-full h-2.5 mb-3 overflow-hidden my-5";
    const progressBarClasses = "bg-gradient-to-r from-blue-500 to-cyan-400 h-2.5 rounded-full transition-all duration-500 ease-out";
    const sectionListClasses = "space-y-2 flex-grow overflow-y-auto pr-1";
    const sectionItemClasses = "flex items-center justify-between text-sm py-1.5 px-2 rounded-md bg-zinc-900/30 border border-transparent"; // Fondo sutil
    const sectionTextClasses = "text-zinc-300";
    const statusIconCompleteClasses = "text-green-400";
    const statusIconIncompleteClasses = "text-amber-400"; // O usar text-red-400 si prefieres
    const editButtonClasses = "w-full mt-4 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 transition duration-150 ease-in-out";

    // --- Carga de datos ---
    const fetchEstado = useCallback(async () => {
        if (!negocioId) return;
        setLoading(true);
        setError(null);
        try {
            const data = await obtenerEstadoConfiguracionNegocio(negocioId);
            if (!data) {
                // Considerar si esto es un error o simplemente no hay datos aún
                console.warn(`No se pudo obtener el estado de configuración para ${negocioId}`);
                // Podrías setear un estado por defecto o mostrar un mensaje específico
                setEstadoConfig({ // Estado por defecto si no se encuentra
                    progresoGeneral: 0,
                    secciones: {
                        logo: { completo: false },
                        descripcion: { completo: false },
                        contacto: { completo: false },
                        politicas: { completo: false },
                        marketing: { completo: false },
                        faqObjeciones: { completo: false },
                    }
                });
                // O setError("No se encontró la configuración del negocio.");
            } else {
                setEstadoConfig(data);
            }
        } catch (err) {
            console.error("Error al obtener estado de configuración:", err);
            setError("No se pudo cargar el estado de configuración.");
            setEstadoConfig(null);
        } finally {
            setLoading(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchEstado();
    }, [fetchEstado]);

    // --- Navegación ---
    const handleNavigateToEdit = () => {
        const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}`
        router.push(`${basePath}/editar`); // Navegar a la nueva ruta de edición
    };

    // --- Renderizado ---
    return (
        <div className={containerClasses}>
            <h3 className="text-base font-semibold text-white mb-1 flex items-center gap-2">
                <Settings size={16} /> Información del Negocio
            </h3>
            {loading ? (
                <div className="flex items-center justify-center py-10 text-zinc-400">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando progreso...</span>
                </div>
            ) : error ? (
                <div className="flex flex-col items-center justify-center text-center py-6 border border-red-500/50 rounded-md p-4">
                    <AlertCircle className="h-8 w-8 text-red-400 mb-2" />
                    <p className="text-red-400 text-sm">{error}</p>
                    {/* Podrías añadir un botón para reintentar */}
                </div>
            ) : estadoConfig ? (
                <>
                    {/* Barra de Progreso */}
                    <div className="flex items-center gap-2 mb-3">
                        <div className={progressBarContainerClasses}>
                            <div className={progressBarClasses} style={{ width: `${estadoConfig.progresoGeneral}%` }}></div>
                        </div>
                        <span className="text-xs font-medium text-zinc-300">{estadoConfig.progresoGeneral}%</span>
                    </div>


                    {/* Lista de Secciones */}
                    <div className={sectionListClasses}>
                        {Object.entries(estadoConfig.secciones).map(([key, estado]) => {
                            // Asegurarse que la clave exista en SECCION_INFO
                            if (!(key in SECCION_INFO)) return null;
                            const seccionKey = key as SeccionKey; // Casteo seguro
                            const { nombre } = SECCION_INFO[seccionKey];
                            const IconoEstado = estado.completo ? CheckCircle2 : XCircle; // O AlertCircle para pendiente?
                            const iconoColor = estado.completo ? statusIconCompleteClasses : statusIconIncompleteClasses;

                            return (
                                <div key={key} className={sectionItemClasses}>
                                    <span className={sectionTextClasses}>{nombre}</span>
                                    <IconoEstado size={16} className={iconoColor} />
                                </div>
                            );
                        })}
                    </div>

                    {/* Botón Editar */}
                    <div className="mt-auto pt-4"> {/* mt-auto empuja al fondo */}
                        <button onClick={handleNavigateToEdit} className={editButtonClasses}>
                            <PencilLine size={16} />
                            <span>Editar Información del Negocio</span>
                        </button>
                    </div>
                </>
            ) : (
                <div className="text-center py-10 text-zinc-500">No se pudo cargar el estado.</div>
            )}
        </div>
    );
}
