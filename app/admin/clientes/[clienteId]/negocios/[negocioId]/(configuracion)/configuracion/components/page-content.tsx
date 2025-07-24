/*
  Ruta: app/admin/.../configuracion/components/page-content.tsx
*/
"use client";

import React, { useState } from 'react';
import ManyChatConfigCard from './manychat-config-card';
import ManyChatApiModal from './manychat-api-modal';
import { useRouter } from 'next/navigation';

interface PageContentProps {
    clienteId: string;
    negocioId: string;
    isManyChatConfigured: boolean;
}

export default function PageContent({ clienteId, negocioId, isManyChatConfigured }: PageContentProps) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    // ✅ Estado local para una actualización de UI instantánea.
    const [isConfigured, setIsConfigured] = useState(isManyChatConfigured);
    const router = useRouter();

    // ✅ Función que se ejecuta cuando el modal guarda con éxito.
    const handleSuccess = () => {
        setIsConfigured(true); // 1. Actualiza la UI inmediatamente.
        setIsModalOpen(false); // 2. Cierra el modal.
        router.refresh();      // 3. Refresca los datos del servidor en segundo plano.
    };

    return (
        <>
            <div className="space-y-6">
                <h2 className="text-lg font-medium text-zinc-300 border-b border-zinc-700 pb-2">
                    Integraciones
                </h2>
                <div className="max-w-2xl">
                    <ManyChatConfigCard
                        isConfigured={isConfigured} // Usa el estado local.
                        onManageClick={() => setIsModalOpen(true)}
                    />
                </div>
            </div>

            <ManyChatApiModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                negocioId={negocioId}
                clienteId={clienteId}
                onSuccess={handleSuccess} // Pasa la función de éxito al modal.
            />
        </>
    );
}
