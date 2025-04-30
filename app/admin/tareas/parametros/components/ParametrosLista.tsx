'use client';

import React, { useEffect, useState } from 'react';
// Ajusta la ruta si es necesario
import { obtenerParametros } from '@/app/admin/_lib/parametros.actions';
import { useRouter } from 'next/navigation';
import { ParametroRequerido } from '@/app/admin/_lib/types';
import { PlusCircle, Loader2 } from 'lucide-react'; // Iconos

interface Props {
    tareaId: string;
}

export default function ParametrosLista({ tareaId }: Props) {
    const [parametros, setParametros] = useState<ParametroRequerido[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const router = useRouter();

    // Clases reutilizables
    const containerClasses = "p-4 bg-zinc-800/50 rounded-lg shadow-md border border-zinc-700"; // Fondo semi-transparente o sólido si prefieres
    const buttonSecondaryClasses = "border border-zinc-500 hover:bg-zinc-700 text-zinc-300 px-3 py-1.5 rounded-md flex items-center gap-2 text-xs";
    const thClasses = "px-4 py-2 border border-zinc-700 text-left text-xs font-medium text-zinc-400 uppercase tracking-wider"; // Clases para cabeceras de tabla
    const tdClasses = "px-4 py-2 border border-zinc-700 text-sm"; // Clases para celdas de tabla

    useEffect(() => {
        if (!tareaId) {
            setError("ID de Tarea no proporcionado.");
            setLoading(false);
            return;
        }
        setLoading(true);
        setError(null);

        const fetchDatos = async () => {
            try {
                const data = await obtenerParametros(tareaId); // Usa la función correcta
                setParametros(data);
            } catch (err) {
                console.error("Error al obtener los parámetros:", err);
                setError("No se pudieron cargar los parámetros.");
            } finally {
                setLoading(false);
            }
        };

        fetchDatos();

        // Cleanup
        return () => {
            setParametros([]);
            setLoading(true);
            setError(null);
        };
    }, [tareaId]);

    // --- Renderizado ---

    const renderContent = () => {
        if (loading) {
            return <p className='text-sm text-zinc-400 italic text-center mt-4 flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={16} /> Cargando parámetros...</p>;
        }
        if (error) {
            return <p className='text-sm text-red-400 italic text-center mt-4'>{error}</p>;
        }
        if (parametros.length === 0) {
            return <p className='text-sm text-zinc-400 italic text-center my-12'>No hay parámetros definidos.</p>;
        }

        // --- Renderizado de la Tabla ---
        return (
            <div>

                <div className="overflow-x-auto mt-4"> {/* Permitir scroll horizontal si es necesario */}
                    <table className="table-fixed w-full text-left text-zinc-300 border-collapse border border-zinc-700 rounded-md">
                        <thead className="bg-zinc-900/50">
                            <tr>
                                {/* Definir anchos fijos aquí */}
                                <th className={`${thClasses} w-[25%]`}>Nombre</th>
                                <th className={`${thClasses} w-[15%]`}>Requerido</th>
                                <th className={`${thClasses} w-[15%]`}>Tipo</th>
                                <th className={`${thClasses} w-[45%]`}>Descripción</th>
                            </tr>
                        </thead>
                        <tbody className="bg-zinc-800/80">
                            {parametros.map((param) => (
                                <tr key={param.id} className="hover:bg-zinc-700/50 transition-colors">
                                    <td className={`${tdClasses} font-medium`}>
                                        {/* Enlace para editar el parámetro */}
                                        <button
                                            onClick={() => router.push(`/admin/IA/tareas/parametros/${param.id}`)} // Ruta para editar parámetro
                                            className="text-blue-400 hover:underline text-left w-full"
                                        >
                                            {param.nombre}
                                        </button>
                                    </td>
                                    <td className={tdClasses}>
                                        {/* Badge para indicar si es requerido */}
                                        <span className={`text-xs px-1.5 py-0.5 rounded ${param.esRequerido ? 'bg-red-500/20 text-red-400' : 'bg-gray-600/30 text-gray-400'}`}>
                                            {param.esRequerido ? 'Sí' : 'No'}
                                        </span>
                                    </td>
                                    <td className={`${tdClasses} font-mono text-xs`}>{param.tipoDato}</td>
                                    <td className={tdClasses}>{param.descripcion || <span className="italic text-zinc-500">N/A</span>}</td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div>
                    <ul className="text-sm text-zinc-400 mt-4 list-disc ps-4 italic">
                        <li>Si la función de automatización requiere parámetros, asegúrate de definirlos.</li>
                        <li>Los parámetros se pueden agregar o eliminar según sea necesario.</li>
                        <li>Los parámetros se usan para generar el esquema de la función de automatización para la API de Gemini (tools).</li>
                    </ul>
                </div>
            </div>
        );
    };

    return (
        // Contenedor general del componente de lista
        <div className={containerClasses}>
            {/* Cabecera con título y botón */}
            <div className='flex flex-row items-center justify-between mb-4 border-b border-zinc-600 pb-2'>
                <h3 className="font-semibold text-white text-sm">Parámetros Requeridos</h3>
                <button
                    className={buttonSecondaryClasses}
                    // Asegúrate que tareaId esté disponible aquí si vienes de TareaEditarForm
                    onClick={() => router.push(`/admin/IA/tareas/parametros/nuevo?tareaId=${tareaId}`)}
                    title="Agregar nuevo parámetro requerido"
                >
                    <PlusCircle size={14} />
                    <span>Agregar</span>
                </button>
            </div>

            {/* Renderiza el contenido (loading, error, lista vacía o tabla) */}
            {renderContent()}
        </div>
    );
}
