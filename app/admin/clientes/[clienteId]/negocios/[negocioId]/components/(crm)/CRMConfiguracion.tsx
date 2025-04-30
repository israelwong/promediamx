'use client';

import React from 'react';
// Importar los componentes hijos reales de configuración
import CRMPipeline from './(configuracion)/CRMPipeline';
import CRMCanal from './(configuracion)/CRMCanal';
import CRMEtiquetas from './(configuracion)/CRMEtiquetas';
// Importar iconos si quieres añadir alguno al título general
import { Settings } from 'lucide-react';

interface Props {
    crmId: string; // ID del CRM específico a configurar
}

export default function CRMConfiguracion({ crmId }: Props) {
    // Clases de Tailwind
    // Container principal para esta pestaña (ya tiene padding del CRMDashboard)
    const containerClasses = "space-y-6"; // Espacio vertical entre los módulos de configuración
    const sectionTitleClasses = "text-lg font-semibold text-white mb-4 flex items-center gap-2"; // Título opcional para la sección

    return (
        <div className={containerClasses}>
            {/* Título Opcional para la Pestaña */}
            {/* Puedes quitar este título si el nombre de la pestaña es suficiente */}
            <h2 className={sectionTitleClasses}>
                <Settings size={20} /> Configuración General del CRM
            </h2>

            {/* Módulo de Configuración del Pipeline */}
            {/* Cada componente hijo debería tener su propio estilo de panel/tarjeta */}
            <div>
                {/* El título específico de cada sección puede ir dentro del componente hijo */}
                <CRMPipeline crmId={crmId} />
            </div>

            {/* Módulo de Configuración de Canales */}
            <div>
                <CRMCanal crmId={crmId} />
            </div>

            {/* Módulo de Configuración de Etiquetas */}
            <div>
                <CRMEtiquetas crmId={crmId} />
            </div>

        </div>
    );
}