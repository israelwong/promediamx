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

    const agruparServiciosPorTipo = (servicios: Servicio[]) => {
        return servicios.reduce((grupos, servicio) => {
            const tipo = servicio.tipo;
            if (!grupos[tipo]) {
                grupos[tipo] = [];
            }
            grupos[tipo].push(servicio);
            return grupos;
        }, {} as { [tipo: string]: Servicio[] });
    };

    const serviciosAgrupados = agruparServiciosPorTipo(servicios);

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

            {/* tablas */}
            {loading ? (
                <LoadingPage mensaje="Cargando servicios" />
            ) : (
                Object.entries(serviciosAgrupados).map(([tipo, serviciosDelTipo]) => (
                    <div
                        key={tipo}
                        className="overflow-x-auto border bg-zinc-900 border-zinc-800 rounded-lg p-5 text-zinc-200 mb-10"
                    >

                        <table className="w-full">
                            <thead>
                                <tr>
                                    <th className="text-left">{tipo}</th>
                                    <th className="text-left">Descripción</th>
                                    <th className="text-left">Precio</th>
                                    <th className="text-left">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {serviciosDelTipo.map((servicio) => (
                                    <tr
                                        key={servicio.id}
                                        className="border-b border-zinc-800 cursor-pointer hover:bg-zinc-800 py-5"
                                        onClick={() => router.push(`/admin/configurar/servicios/detalle/${servicio.id}`)}
                                    >
                                        <td>{servicio.nombre}</td>
                                        <td>{servicio.descripcion}</td>
                                        <td>{servicio.precio}</td>
                                        <td>{servicio.status}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                ))
            )}
        </div>
    );
}