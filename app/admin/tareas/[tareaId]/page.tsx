import React from 'react';
import { Metadata } from 'next';
import TareaEditarForm from './components/TareaEditarForm'; // Asumiendo ruta correcta
import TareaGaleria from '../components/TareaGaleria'; // Asumiendo que este es el componente de galería
import TareaFuncionAsociada from '../components/TareaFuncionAsociada';

export const metadata: Metadata = {
    title: 'Detalles de la Tarea', // Título para la pestaña del navegador
};

export default async function page({ params }: { params: Promise<{ tareaId: string }> }) {
    const { tareaId } = await params; // Extraer tareaId de los parámetros

    const pageContainerClasses = "p-4 md:p-6 bg-zinc-800 border border-zinc-700 rounded-lg shadow-lg";

    return (
        // Contenedor principal con estilos generales
        <div>
            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                <div className="lg:col-span-3">
                    <div className={pageContainerClasses}>
                        <TareaEditarForm tareaId={tareaId} />
                    </div>
                </div>

                <div className="lg:col-span-1 flex flex-col gap-6">
                    <div>
                        <TareaFuncionAsociada tareaId={tareaId} />
                    </div>
                    <div className='flex-1 h-full'>
                        <TareaGaleria tareaId={tareaId} />
                    </div>
                </div>
            </div>
        </div>
    );
}
