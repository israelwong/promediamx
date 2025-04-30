'use client'
import React from 'react'
import { FlaskConical } from 'lucide-react';

export default function BotonTesting() {

    // URL para la ventana emergente de testing
    const testingUrl = '/admin/IA/asistentes/conversacion'; // URL base
    const testingUrlPopup = `${testingUrl}?popup=true`; // Añadir parámetro

    // Clases para el botón de testing
    const linkBaseClasses = "flex items-center gap-3 px-3 py-2 rounded-md text-sm font-medium transition-colors duration-150 ease-in-out";
    // const linkActiveClass = "bg-zinc-700 text-white";
    const linkInactiveClass = "text-zinc-400 hover:bg-zinc-700/50 hover:text-zinc-100";
    const testingButtonClasses = `${linkBaseClasses} ${linkInactiveClass} mt-4 border-t border-zinc-700 pt-3`;

    // Función para abrir la ventana de testing
    const openTestingWindow = () => {
        const windowFeatures = 'width=800,height=700,resizable=yes,scrollbars=yes,status=yes';
        // Abrir la URL con el parámetro
        window.open(testingUrlPopup, 'testingWindow', windowFeatures);
    };

    return (
        <div>
            {/* Botón de Testing (ahora usa window.open) */}
            <button
                onClick={openTestingWindow} // Llama a la función para abrir la ventana
                className={testingButtonClasses + " w-full"}
                title="Abrir ventana de testing"
            >
                <FlaskConical className="h-5 w-5 flex-shrink-0" aria-hidden="true" />
                <span>Testing</span>
            </button>
        </div>
    )
}
