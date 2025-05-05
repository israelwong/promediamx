'use client'; // Mantenemos como Client Component por useState/useEffect

import React, { useEffect, useState } from 'react';
import { obtenerLogoYNombreNegocio, NegocioLogoNombre } from '@/app/admin/_lib/negocio.actions'; // Ajusta la ruta!
import Image from 'next/image';
import { SkeletonLogo } from '../components/ui/SkeletonLogo';

interface Props {
    negocioId: string;
}

export default function CRMNegocioLogo({ negocioId }: Props) {
    // Estados para datos, carga y error
    const [negocio, setNegocio] = useState<NegocioLogoNombre>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const fetchNegocio = async () => {
            if (!negocioId) {
                setError("ID de negocio no proporcionado.");
                setLoading(false);
                return;
            }
            setLoading(true);
            setError(null); // Resetea error al iniciar fetch
            try {
                // Llama a la server action
                const result = await obtenerLogoYNombreNegocio(negocioId);

                // Verifica el resultado de la acción
                if (result) {
                    setNegocio({ ...result }); // Ensure 'id' is always present
                } else {
                    // Establece error si la acción falló o no devolvió datos
                    setError("No se pudo obtener la información del negocio.");
                    setNegocio(null); // Asegura que no haya datos viejos
                }
            } catch (err) {
                console.error("Error al obtener el negocio:", err);
                setError("Error de conexión al cargar datos del negocio.");
                setNegocio(null);
            } finally {
                setLoading(false); // Finaliza la carga
            }
        };

        fetchNegocio();
    }, [negocioId]); // Dependencia: se ejecuta si negocioId cambia


    // 1. Estado de Carga
    if (loading) {
        return (
            <div className="flex items-center gap-2 animate-pulse">
                <SkeletonLogo className="w-10 h-10 rounded-full" />
                <SkeletonLogo className="h-5 w-32 rounded" />
            </div>
        );
    }

    // 2. Estado de Error
    if (error) {
        return (
            <div className="flex items-center gap-2 text-red-500 text-sm">
                {/* Icono de error simple */}
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>{error}</span>
            </div>
        );
    }

    // 3. Estado Exitoso (con o sin negocio encontrado)
    if (negocio) {
        return (
            <div className="flex items-center gap-3"> {/* Aumenté un poco el gap */}
                {negocio.logo ? (
                    // Mostrar logo si existe
                    <Image
                        src={negocio.logo}
                        alt={`Logo de ${negocio.nombre}`}
                        className="w-10 h-10 rounded-full object-cover border border-zinc-700" // Añadido object-cover y borde sutil
                        width={40}
                        height={40}
                        // Añadir manejo de error de imagen si es necesario
                        onError={(e) => {
                            // Opcional: manejar si la URL del logo falla
                            console.warn(`Error cargando logo: ${negocio.logo}`);
                            // Podrías intentar mostrar el placeholder aquí también
                            e.currentTarget.style.display = 'none'; // Ocultar imagen rota
                            // Podrías tener un estado para forzar el placeholder
                        }}
                    />
                ) : (
                    // Placeholder: Círculo gris con borde e icono
                    <div className="w-10 h-10 bg-zinc-700 rounded-full flex items-center justify-center border border-zinc-600 flex-shrink-0">
                        {/* Icono de Placeholder (ej. edificio/tienda) */}
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                        </svg>
                    </div>
                )}
                {/* Nombre del negocio */}
                <h1 className="text-lg font-semibold text-zinc-100 truncate" title={negocio.nombre}> {/* Añadido truncate y title */}
                    {negocio.nombre}
                </h1>
            </div>
        );
    }

    // 4. Estado por defecto o si no se encontró negocio (aunque el error debería cubrir esto)
    return (
        <div className="flex items-center gap-2 text-zinc-500 text-sm">
            <span>Información no disponible</span>
        </div>
    );
}
