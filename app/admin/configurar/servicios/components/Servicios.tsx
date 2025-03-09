'use client';
import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { Servicio } from '@/app/admin/_lib/types';
import { obtenerServicios } from '@/app/admin/_lib/servicios.actions';
import LoadingPage from '@/app/admin/_components/LoadingPage';

export default function Servicios() {
    const router = useRouter();
    const [servicios, setServicios] = useState<Servicio[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        obtenerServicios().then((data) => {
            setServicios(data);
            setLoading(false);
        });
    }, []);

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

            {/* fichas */}
            {loading ? (
                <LoadingPage mensaje="Cargando servicios" />
            ) : (
                <div className="grid grid-cols-1 gap-4 max-w-screen-sm mx-auto">
                    {servicios.map((servicio) => (
                        <div
                            key={servicio.id}
                            className="border bg-zinc-900 border-zinc-800 rounded-lg p-5 cursor-pointer hover:bg-zinc-800"
                            onClick={() => router.push(`/admin/configurar/servicios/${servicio.id}`)}
                        >
                            <div className="text-lg font-semibold mb-2 flex items-start space-x-2 justify-between ">
                                <p className='pr-10'>
                                    {servicio.nombre}
                                </p>
                                <span className={`mt-3 inline-block w-2 h-2 rounded-full ${servicio.status === 'activo' ? 'bg-green-500' : 'bg-amber-500'}`}></span>
                            </div>
                            <p className="text-zinc-400 mb-5">
                                <strong>Descripción:</strong> {servicio.descripcion || 'Sin descripción'}
                            </p>
                            <div className='grid grid-cols-3 gap-2'>

                                <p className="text-sm mb-1">
                                    <strong>Precio:</strong> {(servicio.precio ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                                </p>
                                <p className="text-sm mb-1">
                                    <strong>Costo:</strong> {(servicio.costo ?? 0).toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                                </p>
                                <p className="text-sm mb-1">
                                    <strong>Utilidad:</strong> {servicio.precio - (servicio.costo ?? 0)}
                                </p>

                            </div>
                            <p className="text-sm mb-1">

                            </p>
                            <p className="text-sm">
                                <strong>Tipo:</strong> {servicio.tipo}
                            </p>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}