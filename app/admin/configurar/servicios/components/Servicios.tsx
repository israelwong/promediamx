'use client';
import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Servicio } from '@/app/admin/_lib/types';
import LoadingPage from '@/app/admin/_components/LoadingPage';
import { obtenerServicios, actualizarPosicionesSevicios } from '@/app/admin/_lib/x servicios.actions';
import { useDragAndDrop } from '@/app/admin/_lib/dragAndDrop';

export default function Servicios() {
    const router = useRouter();
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [loading, setLoading] = useState(true);
    const [filterText, setFilterText] = useState('');
    const [ordenarActivo, setOrdenarActivo] = useState(false);

    useEffect(() => {
        obtenerServicios().then((data) => {
            setServicios(data);
            setLoading(false);
        });
    }, []);

    //! Drag and drop begin
    const { items, handleDragStart, handleDrop, handleDragOver } = useDragAndDrop(servicios);
    useEffect(() => {
        if (ordenarActivo) {
            setServicios(items);
        }
    }, [items, ordenarActivo]);

    useEffect(() => {
        if (ordenarActivo) {
            const newCategories = servicios.map((servicio, index) => ({
                ...servicio,
                orden: index + 1
            }));
            actualizarPosicionesSevicios(newCategories);
        }
    }, [servicios, ordenarActivo]);
    //! Drag and drop end

    const filteredServicios = servicios.filter(servicio =>
        servicio.nombre.toLowerCase().includes(filterText.toLowerCase())
    );

    const toggleOrdenar = () => {
        setOrdenarActivo(!ordenarActivo);
    };

    return (
        <div>
            {/* encabezado */}
            <div className="flex justify-between items-center text-white mb-5">
                <div className="text-2xl">Servicios</div>
                <div className="space-x-2 flex items-center">
                    <button
                        className="bg-green-800 border border-green-600 rounded px-3 py-1 text-zinc-200 flex items-center space-x-1"
                        onClick={() => router.push('/admin/configurar/servicios/nuevo')}
                    >
                        <Plus size={16} />
                        <span>Crear nuevo servicio</span>
                    </button>
                    <button
                        className="bg-blue-800 border border-blue-800 rounded px-3 py-1 text-zinc-200"
                        onClick={() => router.push('/admin/configurar/servicios/tipoServicio')}
                    >
                        Administrar tipos de servicios
                    </button>
                    <button
                        className="bg-red-700 border border-red-600 rounded px-3 py-1"
                        onClick={() => router.push('/admin/configurar')}
                    >
                        Cerrar ventana
                    </button>
                </div>
            </div>

            {/* Filtro y ordenado */}
            <div className="grid grid-cols-3 mb-4 max-w-screen-sm mx-auto space-x-2">
                <input
                    type="text"
                    placeholder="Filtrar por título"
                    value={filterText}
                    onChange={(e) => setFilterText(e.target.value)}
                    className="bg-zinc-800 border border-zinc-700 rounded px-3 py-1 text-zinc-300 w-full col-span-2"
                />
                <button
                    className={`w-full px-4 py-2 rounded ${ordenarActivo ? 'bg-blue-600' : 'bg-gray-700'} text-white`}
                    onClick={toggleOrdenar}
                >
                    {ordenarActivo ? 'Desactivar ordenado' : 'Activar ordenado'}
                </button>
            </div>

            {/* fichas */}
            {loading ? (
                <LoadingPage mensaje="Cargando servicios" />
            ) : (
                <div className="grid grid-cols-1 gap-4 max-w-screen-sm mx-auto">
                    {filteredServicios.map((servicio, index) => (
                        <div
                            key={servicio.id}
                            className={`border bg-zinc-900 border-zinc-800 rounded-lg p-5 ${ordenarActivo ? 'cursor-move' : ''}`}
                            draggable={ordenarActivo}
                            onDragStart={ordenarActivo ? () => handleDragStart(index) : undefined}
                            onDragOver={ordenarActivo ? handleDragOver : undefined}
                            onDrop={ordenarActivo ? () => handleDrop(index) : undefined}
                        >
                            <div className="text-lg font-semibold flex items-start space-x-2 justify-between">
                                <div id='titulo' className="flex items-center">
                                    <span className={`mr-2 inline-block w-2 h-2 rounded-full ${servicio.status === 'activo' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                                    <p className=''>
                                        {servicio.nombre}
                                    </p>
                                </div>
                                <button className="bg-zinc-900 border border-zinc-700 rounded px-3 py-1 text-zinc-600 text-sm cursor-pointer hover:bg-zinc-800"
                                    onClick={() => router.push(`/admin/configurar/servicios/${servicio.id}`)}>
                                    Editar
                                </button>
                            </div>

                            {ordenarActivo ? null : (
                                <>
                                    <div id="quill" className="text-zinc-400 mb-y">
                                        <div dangerouslySetInnerHTML={{ __html: servicio.descripcion || 'Sin descripción' }} />
                                    </div>

                                    <p className="text-xl mb-5">
                                        <strong>Precio:</strong> {(servicio.precio ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                                    </p>

                                    <p className="text-sm space-x-2">
                                        {servicio.tipo.split(',').map((tipo, index) => (
                                            <span key={index} className="bg-zinc-900 border border-zinc-700 rounded px-2 py-2 mr-1 text-zinc-400">
                                                {tipo.trim()}
                                            </span>
                                        ))}
                                    </p>
                                </>
                            )}
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}