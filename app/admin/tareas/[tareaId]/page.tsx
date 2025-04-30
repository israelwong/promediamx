import React from 'react';
import { Metadata } from 'next';
import TareaEditarForm from '../components/TareaEditarForm'; // Asumiendo ruta correcta
import TareaGaleria from '../components/TareaGaleria'; // Asumiendo que este es el componente de galería

export const metadata: Metadata = {
    title: 'Detalles de la Tarea', // Título para la pestaña del navegador
};

// Tipado para los parámetros de la página dinámica
interface PageProps {
    params: {
        tareaId: string;
    };
}

export default function TareaDetallePage({ params }: PageProps) {
    const { tareaId } = params; // Extraer tareaId de los parámetros

    // Clases para el contenedor principal de la página
    // Aplicamos aquí el fondo, padding, borde, sombra y redondeo general
    const pageContainerClasses = "p-4 md:p-6 bg-zinc-900/50 border border-zinc-700 rounded-lg shadow-lg";

    return (
        // Contenedor principal con estilos generales
        <div className={pageContainerClasses}>
            {/* Grid Layout */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

                {/* Columna principal para el formulario de edición */}
                <div className="lg:col-span-3">
                    {/*
                      IMPORTANTE: Asegúrate de que el componente TareaEditarForm
                      *NO* tenga su propio contenedor principal con fondo, borde, padding o sombra.
                      Debería empezar directamente con su contenido (ej: la cabecera o el <form>).
                      Los estilos de contenedor ahora los aplica el div padre en esta página.
                    */}
                    <TareaEditarForm tareaId={tareaId} />
                </div>


                {/* Columna secundaria para la galería u otros elementos */}
                <div className="lg:col-span-1 flex flex-col gap-6">
                    {/*
                      IMPORTANTE: Asegúrate de que el componente TareaGaleria
                      *NO* tenga su propio contenedor principal con fondo, borde, padding o sombra.
                      Debería empezar directamente con su contenido.
                    */}
                    {/* Asumiendo que TareaGaleria necesita el ID para saber qué galería mostrar */}
                    <TareaGaleria tareaId={tareaId} />
                    {/* Podrías añadir otros componentes aquí si es necesario */}
                </div>
            </div>
        </div>
    );
}
