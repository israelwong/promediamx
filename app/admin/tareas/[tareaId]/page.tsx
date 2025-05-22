// ruta: app/admin/tareas/[tareaId]/page.tsx

import React from 'react';
import { Metadata } from 'next';
import TareaEditLayout from './components/TareaEditLayout';

export const metadata: Metadata = {
    title: 'Detalles de la Tarea', // Título para la pestaña del navegador
};

export default async function page({ params }: { params: Promise<{ tareaId: string }> }) {

    const { tareaId } = await params; // Extraer tareaId de los parámetros

    return (
        <div>
            <div>
                <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
                    <TareaEditLayout tareaId={tareaId} />
                </div>
            </div>
        </div>
    );
}
