'use client';
import React, { useState, useEffect } from 'react';
import { TipoServicio } from '@/app/admin/_lib/types';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface Props {
    tipoServicio: TipoServicio | null;
    onActualizar: (
        data: TipoServicio
    ) => Promise<{ success: boolean; error?: string }>;
    onEliminar: () => Promise<{ success: boolean; error?: string }>;
}

export default function TipoServicioFormEditar({
    tipoServicio,
    onActualizar,
    onEliminar,
}: Props) {
    const router = useRouter();
    const [nombre, setNombre] = useState(tipoServicio?.nombre || '');
    const [descripcion, setDescripcion] = useState(
        tipoServicio?.descripcion || ''
    );
    const [status, setStatus] = useState(tipoServicio?.status || 'active');
    const [nombreError, setNombreError] = useState('');
    const [actualizando, setActualizando] = useState(false);
    const [eliminando, setEliminando] = useState(false);
    const [errorActualizar, setErrorActualizar] = useState<string | null>(null);
    const [errorEliminar, setErrorEliminar] = useState<string | null>(null);
    const [respuestaSuccess, setRespuestaSuccess] = useState<boolean>(false);

    useEffect(() => {
        if (tipoServicio) {
            setNombre(tipoServicio.nombre);
            setDescripcion(tipoServicio.descripcion || '');
            setStatus(tipoServicio.status);
        }
    }, [tipoServicio]);

    const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNombre(value);
        setNombreError(value ? '' : 'El nombre es obligatorio.');
    };

    const handleActualizar = async () => {
        if (!nombre) {
            setNombreError('El nombre es obligatorio.');
            return;
        }

        setActualizando(true);
        setErrorActualizar(null);

        const data: TipoServicio = {
            id: tipoServicio!.id,
            nombre,
            descripcion: descripcion || null,
            status,
        };

        onActualizar(data)
            .then((result) => {
                if (!result.success) {
                    setErrorActualizar(result.error ?? 'Error al actualizar.');
                } else {
                    setRespuestaSuccess(true);
                    setTimeout(() => {
                        setRespuestaSuccess(false);
                    }, 2000);
                }
            })
            .finally(() => {
                setActualizando(false);
            });
    };

    const handleEliminar = async () => {
        if (window.confirm('¿Estás seguro de que quieres eliminar este tipo de servicio?')) {
            setEliminando(true);
            setErrorEliminar(null);

            onEliminar()
                .then((result) => {
                    if (!result.success) {
                        setErrorEliminar(result.error ?? 'Error al eliminar.');
                    } else {
                        router.back();
                    }
                })
                .finally(() => {
                    setEliminando(false);
                });
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
                        onChange={handleNombreChange}
                        className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                    />
                    {nombreError && <p className="text-red-500">{nombreError}</p>}
                </div>
                <div className="mb-5 space-y-3">
                    <label htmlFor="descripcion">Descripción (opcional):</label>
                    <textarea
                        id="descripcion"
                        value={descripcion}
                        onChange={(e) => setDescripcion(e.target.value)}
                        className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                    />
                </div>
                <div className="mb-5 space-y-3">
                    <label htmlFor="status">Estado:</label>
                    <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                    >
                        <option value="active">Activo</option>
                        <option value="inactive">Inactivo</option>
                    </select>
                </div>

                <div className="space-y-2">
                    <button
                        onClick={handleActualizar}
                        className={`w-full bg-green-800 border-green-600 text-zinc-100 rounded p-3 ${actualizando ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        disabled={actualizando}
                    >
                        {actualizando ? 'Actualizando...' : 'Actualizar'}
                    </button>
                    <button
                        onClick={() => router.back()}
                        className="w-full bg-red-800 border-gray-700 text-zinc-100 rounded p-3"
                    >
                        Cancelar
                    </button>
                </div>

                {errorActualizar && <p className="text-red-500">{errorActualizar}</p>}
                {errorEliminar && <p className="text-red-500">{errorEliminar}</p>}

                {respuestaSuccess && (
                    <div className="text-green-500 py-3 text-center">
                        Tipo de servicio actualizado con éxito
                    </div>
                )}
            </div>
            <button
                onClick={handleEliminar}
                className={`text-red-800 rounded p-3 w-full mt-2 flex items-center justify-center space-x-2 ${eliminando ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                disabled={eliminando}
            >
                <Trash2 size={16} />
                <span>{eliminando ? 'Eliminando tipo de servicio...' : 'Eliminar tipo de servicio'}</span>
            </button>
        </div>
    );
}