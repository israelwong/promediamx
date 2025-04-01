'use client';
import React, { useState, useEffect, useRef } from 'react';
import { Servicio, TipoServicio } from '@/app/admin/_lib/types';
import { useRouter } from 'next/navigation';

import Quill from 'quill';
import 'quill/dist/quill.bubble.css';

interface Props {
    servicio: Servicio;
    tiposServicios: TipoServicio[];
    onGuardar: (servicio: Servicio) => Promise<{ success: boolean; error?: string }>;
    onEliminar: () => Promise<{ success: boolean; error?: string }>;
}

export default function ServicioEditarForm({ servicio, tiposServicios, onGuardar, onEliminar }: Props) {
    const router = useRouter();
    const [nombre, setNombre] = useState(servicio.nombre);
    const [costo, setCosto] = useState(servicio.costo?.toString() || '');
    const [precio, setPrecio] = useState(servicio.precio);
    // const [tipo, setTipo] = useState(servicio.tipo);
    const [status, setStatus] = useState(servicio.status);
    const [guardando, setGuardando] = useState(false);
    const [eliminando, setEliminando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [respuestaSuccess, setRespuestaSuccess] = useState<boolean>(false);

    useEffect(() => {
        setNombre(servicio.nombre);
        setDescripcion(servicio.descripcion);
        setCosto(servicio.costo?.toString() || '');
        setPrecio(servicio.precio);
        // setTipo(servicio.tipo);
        setStatus(servicio.status);
    }, [servicio]);

    //! Descripción Quill Editor
    const [descripcion, setDescripcion] = useState(servicio.descripcion);
    const editorRef = useRef(null);
    const quillInstance = useRef<Quill | null>(null);
    useEffect(() => {
        if (editorRef.current && !quillInstance.current) {
            quillInstance.current = new Quill(editorRef.current, {
                theme: 'bubble',
                modules: {
                    toolbar: [
                        [{ header: [1, 2, false] }],
                        ['bold', 'italic', 'underline'],
                        ['link'],
                        [{ list: 'bullet' }],
                        [{ indent: '-1' }, { indent: '+1' }],
                    ]
                },
            });

            quillInstance.current.on('text-change', () => {
                if (quillInstance.current) {
                    setDescripcion(quillInstance.current.root.innerHTML);
                }
            });

            quillInstance.current.root.innerHTML = descripcion;
        }
    }, [descripcion]);


    //! Tipos de Servicios
    const [tiposSeleccionados, setTiposSeleccionados] = useState<string[]>([]);
    const handleCheckboxChange = (nombre: string) => {
        setTiposSeleccionados((prevTipos) => {
            if (prevTipos.includes(nombre)) {
                return prevTipos.filter((tipo) => tipo !== nombre);
            } else {
                return [...prevTipos, nombre];
            }
        });
    };

    useEffect(() => {
        if (servicio.tipo) {
            setTiposSeleccionados(servicio.tipo.split(','));
        }
    }, [servicio.tipo]);


    const handleGuardar = async () => {
        setGuardando(true);
        setError(null);

        const tiposString = tiposSeleccionados.join(',');

        const servicioActualizado: Servicio = {
            ...servicio,
            nombre,
            descripcion,
            costo: costo !== '' ? parseFloat(costo) : null,
            precio,
            tipo: tiposString,
            status,
        };

        onGuardar(servicioActualizado)
            .then((result) => {
                if (result.success) {
                    setRespuestaSuccess(true);
                    setTimeout(() => {
                        setRespuestaSuccess(false);
                        router.back();
                    }, 2000);
                } else {
                    setError(result.error || 'Error al guardar el servicio.');
                }
            })
            .finally(() => setGuardando(false));
    };

    const handleEliminar = async () => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este servicio?')) {
            setEliminando(true);
            setError(null);

            onEliminar()
                .then((result) => {
                    if (result.success) {
                        router.back();
                    } else {
                        setError(result.error || 'Error al eliminar el servicio.');
                    }
                })
                .finally(() => setEliminando(false));
        }
    };

    return (
        <div className="max-w-screen-sm mx-auto">
            <div className="border bg-zinc-900 border-zinc-800 rounded-lg p-5 text-zinc-200">


                <div className="mb-5 space-y-3">
                    <label htmlFor="nombre">Nombre*:</label>
                    <input
                        type="text"
                        id="nombre"
                        value={nombre}
                        onChange={(e) => setNombre(e.target.value)}
                        className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                    />
                </div>

                {/* //! DESCRIPCIÓN QUILL COMPONENT */}
                <div className="mb-5 space-y-3">
                    <label htmlFor="descripcion">Descripción (opcional):</label>
                    <div className='bg-zinc-950 rounded-md' ref={editorRef}></div>
                </div>


                <div className="mb-5  grid grid-cols-2 gap-4">
                    <div>
                        <label htmlFor="precio">Precio *:</label>
                        <input
                            type="number"
                            id="precio"
                            value={precio}
                            onChange={(e) => setPrecio(parseFloat(e.target.value))}
                            className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                        />
                    </div>
                    <div>
                        <label htmlFor="costo">Costo (opcional):</label>
                        <input
                            type="number"
                            id="costo"
                            value={costo}
                            onChange={(e) => setCosto(e.target.value)}
                            className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                        />
                    </div>
                </div>

                <div className="mb-5 space-y-3 p-5 bg-zinc-900 border border-zinc-600 rounded-lg">

                    <div className="flex items-center justify-between">
                        <p>Selecionar 1 o más opciones de aplicación del servicio:</p>
                        <button onClick={() => setTiposSeleccionados([])} className="bg-red-800 border-red-600 text-zinc-100 rounded p-1 text-sm">
                            Limpiar
                        </button>
                    </div>
                    <div className="space-y-2">
                        {tiposServicios.map((tipoServicio) => (
                            <label key={tipoServicio.id} className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    value={tipoServicio.nombre}
                                    checked={tiposSeleccionados.includes(tipoServicio.nombre)}
                                    onChange={() => handleCheckboxChange(tipoServicio.nombre)}
                                    className="form-checkbox h-4 w-4 text-indigo-600"
                                />
                                <span className='text-zinc-400'>{tipoServicio.nombre}</span>
                            </label>
                        ))}
                    </div>
                    <div>
                        <p>Tipos seleccionados: {tiposSeleccionados.join(', ') || 'Ninguno'}</p>
                    </div>
                </div>

                <div className="mb-5 space-y-3">
                    <label htmlFor="status">Estado:</label>
                    <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                    >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={handleGuardar}
                        className={`w-full bg-green-800 border-green-600 text-zinc-100 rounded p-3 ${guardando ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        disabled={guardando}
                    >
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="w-full bg-red-800 border-gray-700 text-zinc-100 rounded p-3"
                    >
                        Cancelar
                    </button>
                </div>

                {error && <p className="text-red-500">{error}</p>}

                {respuestaSuccess && (
                    <div className="text-green-500 py-3 text-center">Servicio actualizado con éxito</div>
                )}
            </div>
            <button
                onClick={handleEliminar}
                className={`text-red-800 rounded p-3 w-full mt-2 flex items-center justify-center space-x-2 ${eliminando ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                disabled={eliminando}
            >
                <span>{eliminando ? 'Eliminando servicio...' : 'Eliminar servicio'}</span>
            </button>
        </div>
    );
}