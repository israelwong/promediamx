// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/pipeline/components/InstruccionesPipeline.tsx
// O la ruta donde residirá este componente de instrucciones
import React from 'react';
import { Workflow, Lightbulb, Target } from 'lucide-react'; // Iconos relevantes

export default function InstruccionesPipeline() {
    // Clases de Tailwind existentes
    const containerClasses = "p-4 bg-gradient-to-r from-zinc-800/50 to-zinc-700/40 border border-zinc-700 rounded-lg shadow-inner";
    const titleClasses = "flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2";
    const descriptionClasses = "text-sm text-zinc-300 leading-relaxed";
    const listClasses = "mt-3 space-y-2 text-xs text-zinc-400 list-none pl-0"; // Quitar list-disc y pl-5 si usamos iconos
    const listItemClasses = "flex items-start gap-2"; // Para alinear icono y texto
    const listItemIconClasses = "text-blue-400 mt-0.5 flex-shrink-0"; // Color y alineación del icono
    const listItemTextClasses = ""; // Clases adicionales para el texto si son necesarias
    const strongClasses = "text-zinc-100 font-medium"; // Para resaltar texto

    return (
        <div className={containerClasses}>
            {/* Título */}
            <h4 className={titleClasses}>
                <Workflow size={16} className="text-blue-400" />
                <span>¿Qué es y por qué es importante el Pipeline?</span>
            </h4>

            {/* Descripción Principal */}
            <p className={descriptionClasses}>
                El Pipeline de Ventas (o Embudo) es una <strong className={strongClasses}>representación visual</strong> de las diferentes etapas por las que pasa un prospecto (Lead) desde el primer contacto hasta convertirse en cliente. Es fundamental para:
            </p>

            {/* Lista de Importancia/Beneficios */}
            <ul className={listClasses}>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Organizar y dar Visibilidad:</strong> Te permite ver dónde se encuentra cada Lead en tu proceso de ventas de un vistazo.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Priorizar Esfuerzos:</strong> Ayuda a identificar qué Leads necesitan más atención o están más cerca del cierre.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Previsión de Ventas:</strong> Facilita la estimación de ingresos futuros basándose en la cantidad y valor de los Leads en cada etapa.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Identificar Cuellos de Botella:</strong> Permite detectar en qué etapas se estancan los Leads y optimizar el proceso.
                    </span>
                </li>
            </ul>

            {/* Sección Cómo Aprovecharlo */}
            <h4 className={`${titleClasses} mt-4`}>
                <Target size={16} className="text-green-400" />
                <span>¿Cómo sacarle el mejor provecho?</span>
            </h4>
            <ul className={listClasses}>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Define Etapas Claras:</strong> Crea etapas que representen pasos lógicos y significativos en *tu* proceso de ventas (Ej: Nuevo, Contactado, Calificado, Propuesta, Cierre). Usa nombres descriptivos.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Mantenlo Actualizado:</strong> Mueve los Leads entre etapas tan pronto como progresen. Un pipeline desactualizado pierde su valor.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Sé Consistente:</strong> Asegúrate de que todo el equipo entienda qué significa cada etapa y cuándo mover un Lead.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Analiza y Optimiza:</strong> Revisa periódicamente cuánto tiempo pasan los Leads en cada etapa y las tasas de conversión entre ellas para identificar áreas de mejora.
                    </span>
                </li>
            </ul>

        </div>
    );
}
