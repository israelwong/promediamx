'use client';
import React from 'react'
import { Plus } from 'lucide-react';
import { useRouter } from 'next/navigation';

export default function Paquetes() {

    const router = useRouter();

    return (
        <div>

            {/* encabezado */}
            <div className="flex justify-between items-center text-white mb-5">
                <div className="text-2xl">Paquetes disponibles</div>
                <div className="space-x-2 flex items-center">
                    <button
                        className="bg-green-800 border border-green-600 rounded px-3 py-1 text-zinc-200 flex items-center space-x-1"
                        onClick={() => router.push('/admin/configurar/paquetes/nuevo')}
                    >
                        <Plus size={16} />
                        <span>Crear nuevo paquete</span>
                    </button>
                    <button
                        className="bg-red-700 border border-red-600 rounded px-3 py-1"
                        onClick={() => router.push('/admin/configurar')}
                    >
                        Cerrar ventana
                    </button>
                </div>
            </div>

        </div>
    )
}
