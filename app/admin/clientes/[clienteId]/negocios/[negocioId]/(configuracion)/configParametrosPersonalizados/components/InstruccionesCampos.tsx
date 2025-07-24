// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/campos/components/InstruccionesCamposPersonalizados.tsx
// O la ruta donde residirá este componente de instrucciones
import React from 'react';
import { ListPlus, Lightbulb, Target, Database, Workflow } from 'lucide-react'; // Iconos relevantes

export default function InstruccionesCamposPersonalizados() {
    // Clases de Tailwind (reutilizadas para consistencia)
    const containerClasses = "p-4 bg-gradient-to-r from-zinc-800/50 to-zinc-700/40 border border-zinc-700 rounded-lg shadow-inner";
    const titleClasses = "flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2";
    const descriptionClasses = "text-sm text-zinc-300 leading-relaxed";
    const listClasses = "mt-3 space-y-2 text-xs text-zinc-400 list-none pl-0"; // Sin viñetas
    const listItemClasses = "flex items-start gap-2"; // Para alinear icono y texto
    const listItemIconClasses = "text-orange-400 mt-0.5 flex-shrink-0"; // Color diferente
    const listItemTextClasses = "";
    const strongClasses = "text-zinc-100 font-medium";
    const infoClasses = "text-xs text-zinc-400 mt-3 pt-3 border-t border-zinc-600/50"; // Para nota adicional

    return (
        <div className={containerClasses}>
            {/* Título */}
            <h4 className={titleClasses}>
                <ListPlus size={16} className="text-orange-400" />
                <span>¿Qué son los Campos Personalizados?</span>
            </h4>

            {/* Descripción Principal */}
            <p className={descriptionClasses}>
                Los Campos Personalizados te permiten <strong className={strongClasses}>añadir información específica de tu negocio</strong> a la ficha de cada Lead en el CRM, más allá de los campos estándar (nombre, email, teléfono). Son esenciales para:
            </p>

            {/* Lista de Importancia/Beneficios */}
            <ul className={listClasses}>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Adaptar el CRM a tu Negocio:</strong> Guarda datos únicos y relevantes para tu proceso de ventas o atención al cliente (Ej: &quot;Número de Póliza&quot;, &quot;Tipo de Interés&quot;, &quot;Presupuesto Estimado&quot;, &quot;Fecha Última Compra&quot;).
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Segmentación Avanzada:</strong> Crea segmentos de Leads basados en criterios muy específicos definidos por ti.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Mejorar la Calificación de Leads:</strong> Recopila información clave que te ayude a determinar la calidad y potencial de un prospecto.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Database size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Centralizar Información:</strong> Mantén todos los datos relevantes de tus Leads en un solo lugar, accesibles para todo tu equipo.
                    </span>
                </li>
            </ul>

            {/* Sección Cómo Aprovecharlos */}
            <h4 className={`${titleClasses} mt-4`}>
                <Target size={16} className="text-green-400" />
                <span>¿Cómo sacarles el mejor provecho?</span>
            </h4>
            <ul className={listClasses}>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Define Campos Útiles:</strong> Piensa qué información adicional realmente necesitas para gestionar mejor a tus Leads. Evita crear campos innecesarios.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Elige el Tipo Correcto:</strong> Selecciona el tipo de dato adecuado (texto, número, fecha, selección, etc.) para asegurar la consistencia de la información.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Usa Nombres Claros:</strong> Dale a cada campo un nombre descriptivo que sea fácil de entender para todo tu equipo.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Marca como Requerido (si aplica):</strong> Si un campo personalizado es esencial, márcalo como requerido para asegurar que se complete.
                    </span>
                </li>
            </ul>

            {/* Nota sobre la relación con Tareas */}
            <p className={infoClasses}>
                <Workflow size={14} className="inline-block mr-1 text-blue-400" />
                <strong className="text-zinc-300">Nota:</strong> Algunas Tareas automatizadas del Asistente Virtual pueden requerir información específica. Si una Tarea necesita un dato que coincide con uno de tus campos personalizados, podrá utilizarlo para funcionar correctamente. La definición de qué campos necesita cada Tarea se gestiona a nivel de la configuración de la Tarea misma.
            </p>

        </div>
    );
}
