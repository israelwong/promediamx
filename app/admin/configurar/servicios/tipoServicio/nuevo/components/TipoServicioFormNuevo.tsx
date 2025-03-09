'use client';
import React, { useState } from 'react';
import { TipoServicio } from '@/app/admin/_lib/types';
import { useRouter } from 'next/navigation';

interface Props {
    onGuardar: (
        data: Omit<TipoServicio, 'id'>
    ) => Promise<{ success: boolean; error?: string }>;
}

export default function TipoServicioFormNuevo({ onGuardar }: Props) {
    const router = useRouter();
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [status, setStatus] = useState('active');
    const [nombreError, setNombreError] = useState('');
    const [guardando, setGuardando] = useState(false);
    const [errorGuardar, setErrorGuardar] = useState<string | null>(null);
    const [respuestaSuccess, setRespuestaSuccess] = useState<boolean>(false);

    const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNombre(value);
        setNombreError(value ? '' : 'El nombre es obligatorio.');
    };

    const handleGuardar = async () => {
        if (!nombre) {
            setNombreError('El nombre es obligatorio.');
            return;
        }

        setGuardando(true);
        setErrorGuardar(null);

        const data: Omit<TipoServicio, 'id'> = {
            nombre,
            descripcion: descripcion || null,
            status,
        };

        onGuardar(data)
            .then((result) => {
                if (!result.success) {
                    setErrorGuardar(result.error ?? 'Error al guardar.');
                } else {
                    setRespuestaSuccess(true);
                    setTimeout(() => {
                        setRespuestaSuccess(false);
                        router.back();
                    }, 2000);
                }
            })
            .finally(() => {
                setGuardando(false);
            });
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

                {errorGuardar && <p className="text-red-500">{errorGuardar}</p>}

                {respuestaSuccess && (
                    <div className="text-green-500 py-3 text-center">
                        Tipo de servicio creado con éxito
                    </div>
                )}
            </div>
        </div>
    );
}