'use client';
import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';

interface RolFormEditarProps {
    initialNombre?: string;
    initialDescripcion?: string;
    initialStatus?: string;
    onGuardar: (nombre: string, descripcion: string, status: string) => void;
    onEliminar: () => void;
}

export default function RolFormEditar({
    initialNombre = '',
    initialDescripcion = '',
    initialStatus = 'activo',
    onGuardar,
    onEliminar,
}: RolFormEditarProps) {

    const router = useRouter();
    const [nombre, setNombre] = useState(initialNombre);
    const [descripcion, setDescripcion] = useState(initialDescripcion);
    const [nombreError, setNombreError] = useState('');
    const [actualizando, setActualizando] = useState(false);
    const [status, setStatus] = useState(initialStatus);
    const [eliminando, setEliminando] = useState(false);

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
        setActualizando(true);
        onGuardar(nombre, descripcion, status);
    };

    const handleEliminar = () => {
        if (nombre.toLowerCase() === 'admin') {
            alert('No se puede eliminar el rol de administrador.');
            return;
        }
        const confirmar = confirm('¿Estás seguro de eliminar este rol?');
        if (!confirmar) return;
        setEliminando(true);
        onEliminar();
    };

    return (
        <div className='max-w-screen-sm mx-auto'>
            <div className="border bg-zinc-900 border-zinc-800 rounded-lg p-5 text-zinc-200" >
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
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                </div>

                <div className="">
                    <button
                        onClick={handleGuardar}
                        className="bg-green-800 border-green-600 text-zinc-100 rounded p-3 w-full mb-2 flex items-center justify-center"
                        disabled={actualizando}
                    >
                        {actualizando ? (
                            'Guardando...'
                        ) : (
                            'Guardar'
                        )}
                    </button>
                    <button
                        className="bg-red-800 border-red-600 text-zinc-100 rounded p-3 w-full"
                        onClick={() => router.back()}
                    >
                        Cerrar
                    </button>
                </div>
            </div>
            <button className="text-red-800 rounded p-3 w-full mt-2 flex items-center justify-center space-x-2"
                onClick={() => handleEliminar()}
                disabled={eliminando}>
                <Trash2 size={16} />
                <span>
                    {eliminando ? 'Eliminando rol...' : 'Eliminar Rol'}
                </span>
            </button>
        </div>
    );
}