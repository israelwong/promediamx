'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';

interface RolFormNuevoProps {
    onGuardar: (nombre: string, descripcion: string, status: string) => void;
}

export default function RolFormNuevo({ onGuardar }: RolFormNuevoProps) {
    const router = useRouter();
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [nombreError, setNombreError] = useState('');
    const [status, setStatus] = useState('active');
    const [guardando, setGuardando] = useState(false);

    const handleNombreChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const value = e.target.value;
        setNombre(value);
        setNombreError(value ? '' : 'El nombre es obligatorio.');
    };

    const handleGuardar = () => {
        if (!nombre) {
            setNombreError('El nombre es obligatorio.');
            return;
        }
        setGuardando(true);
        onGuardar(nombre, descripcion, status);
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
                    <label htmlFor="status">Status:</label>
                    <select
                        id="status"
                        value={status}
                        onChange={(e) => setStatus(e.target.value)}
                        className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                    >
                        <option value="activo">Active</option>
                        <option value="inactivo">Inactive</option>
                    </select>
                </div>

                <div className="">
                    <button
                        onClick={handleGuardar}
                        className="bg-green-800 border-green-600 text-zinc-100 rounded p-3 w-full mb-2"
                        disabled={guardando}
                    >
                        {guardando ? 'Guardando...' : 'Guardar'}
                    </button>
                    <button
                        className="bg-red-800 border-red-600 text-zinc-100 rounded p-3 w-full"
                        onClick={() => router.back()}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
        </div>
    );
}