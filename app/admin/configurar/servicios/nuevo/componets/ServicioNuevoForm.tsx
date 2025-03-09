'use client';
import React, { useState } from 'react';
import { Servicio, TipoServicio } from '@/app/admin/_lib/types';
import { useRouter } from 'next/navigation';

interface Props {
    tiposServicios: TipoServicio[];
    onGuardar: (servicio: Omit<Servicio, 'id'>) => Promise<{ success: boolean; error?: string }>;
}

export default function ServicioNuevoForm({ tiposServicios, onGuardar }: Props) {
    const router = useRouter();
    const [nombre, setNombre] = useState('');
    const [descripcion, setDescripcion] = useState('');
    const [costo, setCosto] = useState('');
    const [precio, setPrecio] = useState('');
    const [tipo, setTipo] = useState(tiposServicios[0]?.nombre || '');
    // const [status, setStatus] = useState('activo');
    const [guardando, setGuardando] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [respuestaSuccess, setRespuestaSuccess] = useState<boolean>(false);

    // Estados para los errores de validación
    const [nombreError, setNombreError] = useState('');
    const [precioError, setPrecioError] = useState('');
    const [tipoError, setTipoError] = useState('');

    const handleGuardar = async () => {
        // Validar antes de enviar
        let isValid = true;

        if (!nombre.trim()) {
            setNombreError('El nombre es obligatorio.');
            isValid = false;
        } else {
            setNombreError('');
        }

        if (!precio.trim()) {
            setPrecioError('El precio es obligatorio.');
            isValid = false;
        } else if (isNaN(Number(precio))) {
            setPrecioError('El precio debe ser un número.');
            isValid = false;
        } else {
            setPrecioError('');
        }

        if (!tipo.trim()) {
            setTipoError('El tipo de servicio es obligatorio.');
            isValid = false;
        } else {
            setTipoError('');
        }

        if (!isValid) {
            return; // Detener si hay errores
        }

        setGuardando(true);
        setError(null);

        const nuevoServicio: Omit<Servicio, 'id'> = {
            nombre,
            descripcion,
            costo: costo !== '' ? parseFloat(costo) : null,
            precio: parseFloat(precio),
            tipo,
            status,
        };

        onGuardar(nuevoServicio)
            .then((result) => {
                if (result.success) {
                    setRespuestaSuccess(true);
                    router.back();
                } else {
                    setError(result.error || 'Error al guardar el servicio.');
                }
            })
            .finally(() => setGuardando(false));
    };

    const hasErrors = !!nombreError || !!precioError || !!tipoError;

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
                    <label htmlFor="costo">Costo (opcional):</label>
                    <input
                        type="number"
                        id="costo"
                        value={costo}
                        onChange={(e) => setCosto(e.target.value)}
                        className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                    />
                </div>
                <div className="mb-5 space-y-3">
                    <label htmlFor="precio">Precio*:</label>
                    <input
                        type="number"
                        id="precio"
                        value={precio}
                        onChange={(e) => setPrecio(e.target.value)}
                        className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                    />
                    {precioError && <p className="text-red-500">{precioError}</p>}
                </div>
                <div className="mb-5 space-y-3">
                    <label htmlFor="tipo">Tipo de servicio:</label>
                    <select
                        id="tipo"
                        value={tipo}
                        onChange={(e) => setTipo(e.target.value)}
                        className="bg-zinc-950/20 border border-zinc-700 rounded w-full p-2"
                    >
                        <option value="">Selecciona un tipo de servicio</option>
                        {tiposServicios.map((tipoServicio) => (
                            <option key={tipoServicio.id} value={tipoServicio.nombre}>
                                {tipoServicio.nombre}
                            </option>
                        ))}
                    </select>
                    {tipoError && <p className="text-red-500">{tipoError}</p>}
                </div>
                {/* <div className="mb-5 space-y-3">
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
                </div> */}

                <div className="space-y-2">
                    <button
                        onClick={handleGuardar}
                        className={`w-full bg-green-800 border-green-600 text-zinc-100 rounded p-3 ${guardando || hasErrors ? 'opacity-50 cursor-not-allowed' : ''
                            }`}
                        disabled={guardando || hasErrors}
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
                    <div className="text-green-500 py-3 text-center">Servicio creado con éxito</div>
                )}
            </div>
        </div>
    );
}