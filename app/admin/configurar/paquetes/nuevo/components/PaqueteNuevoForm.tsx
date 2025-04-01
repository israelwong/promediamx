'use client';
import React, { useState } from 'react';
import { Paquete, Servicio } from '@/app/admin/_lib/types';
import { Trash } from 'lucide-react';

interface Props {
    onGuardar: (paquete: Paquete, listaServiciosId: string[]) => void;
    servicios: Servicio[];
}

export default function PaqueteNuevoForm({ onGuardar, servicios }: Props) {
    const [serviciosSeleccionados, setServiciosSeleccionados] = useState<
        { servicio: Servicio; cantidad: number }[]
    >([]);
    const [detallesVisibles, setDetallesVisibles] = useState<{ [key: number]: boolean }>({});

    const handleServicioSeleccionado = (servicio: Servicio) => {
        const isSeleccionado = serviciosSeleccionados.some((s) => s.servicio.id === servicio.id);
        if (isSeleccionado) {
            setServiciosSeleccionados(
                serviciosSeleccionados.filter((s) => s.servicio.id !== servicio.id)
            );
        } else {
            setServiciosSeleccionados([...serviciosSeleccionados, { servicio, cantidad: 1 }]);
        }
    };

    const toggleDetalles = (id: number) => {
        setDetallesVisibles({ ...detallesVisibles, [id]: !detallesVisibles[id] });
    };

    const calcularPrecioTotal = () => {
        return serviciosSeleccionados.reduce(
            (total, item) => total + item.servicio.precio * item.cantidad,
            0
        );
    };

    const truncateDescription = (description: string, lines: number) => {
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = description;
        const text = tempDiv.textContent || tempDiv.innerText || '';
        const words = text.split(' ');
        let truncated = '';
        let lineCount = 0;
        for (const word of words) {
            if (truncated.length + word.length > lineCount * 50) {
                lineCount++;
                if (lineCount > lines) {
                    return truncated.trim() + '...';
                }
            }
            truncated += word + ' ';
        }
        return truncated.trim();
    };

    const handleCantidadChange = (servicioId: number, cantidad: number) => {
        setServiciosSeleccionados((prev) =>
            prev.map((item) =>
                Number(item.servicio.id) === servicioId ? { ...item, cantidad } : item
            )
        );
    };

    const ordenarServiciosSeleccionados = (servicios: { servicio: Servicio; cantidad: number }[]) => {
        return servicios.slice().sort((a, b) => (a.servicio.orden ?? 0) - (b.servicio.orden ?? 0));
    };

    return (
        <div>
            <div className="grid grid-cols-3">
                <div className="col-span-1">
                    Formulario datos paquete
                    <p>Precio sistema: {new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(calcularPrecioTotal())}</p>
                    <button onClick={() => {
                        const serviciosIds = serviciosSeleccionados
                            .map((servicio) => servicio.servicio?.id?.toString() || '');
                        onGuardar({} as Paquete, serviciosIds);
                    }}>Guardar</button>
                </div>
                <div className="col-span-1 p-5">
                    <p className="text-2xl mb-5">Servicios Seleccionados</p>
                    <ul className="space-y-3 sticky top-0">
                        {ordenarServiciosSeleccionados(serviciosSeleccionados).map((item) => (
                            <li key={item.servicio.id}>
                                <div className="flex justify-between bg-zinc-900/50 p-5 rounded-lg border border-zinc-700">
                                    <div>
                                        <p className="text-2xl mb-3">{item.servicio.nombre}</p>
                                        <div className="grid grid-cols-3 gap-2 items-center">
                                            <p className="text-zinc-400 text-xl">
                                                Precio{' '}
                                                {new Intl.NumberFormat('es-MX', {
                                                    style: 'currency',
                                                    currency: 'MXN',
                                                }).format(item.servicio.precio)}
                                            </p>
                                            <input
                                                type="number"
                                                placeholder="Cantidad"
                                                value={item.cantidad}
                                                onChange={(e) =>
                                                    handleCantidadChange(
                                                        Number(item.servicio.id),
                                                        parseInt(e.target.value)
                                                    )
                                                }
                                                className="bg-zinc-900/50 p-2 rounded-lg text-zinc-400 text-xl"
                                            />
                                            <p>
                                                Total{' '}
                                                {new Intl.NumberFormat('es-MX', {
                                                    style: 'currency',
                                                    currency: 'MXN',
                                                }).format(item.servicio.precio * item.cantidad)}
                                            </p>
                                        </div>
                                        {item.cantidad === 0 && (
                                            <span className="bg-yellow-500 text-black p-1 rounded-md">
                                                Promoción
                                            </span>
                                        )}
                                    </div>
                                    <button onClick={() => handleServicioSeleccionado(item.servicio)}>
                                        <Trash size={16} />
                                    </button>
                                </div>
                            </li>
                        ))}
                    </ul>
                </div>
                <div className="">
                    <p className="text-2xl mb-5">Servicios disponibles</p>
                    <div className="col-span-1 space-y-2 p-5">
                        {servicios.map((servicio) => (
                            <div key={servicio.id} className="p-4 rounded-lg bg-zinc-900">
                                <div className="">
                                    <div className="">
                                        <div className="mb-5">
                                            <div className="flex space-x-2 items-center mb-3">
                                                <label className="relative inline-flex items-center cursor-pointer">
                                                    <input
                                                        type="checkbox"
                                                        value=""
                                                        className="sr-only peer"
                                                        checked={serviciosSeleccionados.some(
                                                            (s) => s.servicio.id === servicio.id
                                                        )}
                                                        onChange={() => handleServicioSeleccionado(servicio)}
                                                    />
                                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full rtl:peer-checked:after:-translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:start-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-green-600 flex items-center justify-center"></div>
                                                </label>
                                                <p className="text-2xl">{servicio.nombre}</p>
                                            </div>
                                            <div className="relative">
                                                <span className="text-zinc-500">
                                                    {servicio.id !== undefined && detallesVisibles[Number(servicio.id)] ? (
                                                        <div
                                                            dangerouslySetInnerHTML={{
                                                                __html: servicio.descripcion,
                                                            }}
                                                        />
                                                    ) : (
                                                        <div
                                                            dangerouslySetInnerHTML={{
                                                                __html: truncateDescription(
                                                                    servicio.descripcion,
                                                                    3
                                                                ),
                                                            }}
                                                        />
                                                    )}
                                                </span>
                                                {servicio.id !== undefined && !detallesVisibles[Number(servicio.id)] && (
                                                    <div className="absolute bottom-0 left-0 w-full h-8 bg-gradient-to-b from-transparent to-zinc-900"></div>
                                                )}
                                            </div>
                                            <button onClick={() => toggleDetalles(Number(servicio.id))}>
                                                {servicio.id !== undefined && detallesVisibles[Number(servicio.id)]
                                                    ? 'Mostrar menos'
                                                    : 'Mostrar más'}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                                <div className="text-zinc-400 text-2xl">
                                    Precio{' '}
                                    {new Intl.NumberFormat('es-MX', {
                                        style: 'currency',
                                        currency: 'MXN',
                                    }).format(servicio.precio)}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
}
