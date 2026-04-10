// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/etiquetas/components/InstruccionesEtiquetas.tsx
// O la ruta donde residirá este componente de instrucciones
import React from 'react';
import { Tags, Lightbulb, Target, Palette } from 'lucide-react'; // Iconos relevantes

export default function InstruccionesEtiquetas() {
    // Clases de Tailwind (reutilizadas de InstruccionesPipeline para consistencia)
    const containerClasses = "p-4 bg-gradient-to-r from-zinc-800/50 to-zinc-700/40 border border-zinc-700 rounded-lg shadow-inner";
    const titleClasses = "flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2";
    const descriptionClasses = "text-sm text-zinc-300 leading-relaxed";
    const listClasses = "mt-3 space-y-2 text-xs text-zinc-400 list-none pl-0"; // Sin viñetas, usamos iconos
    const listItemClasses = "flex items-start gap-2"; // Para alinear icono y texto
    const listItemIconClasses = "text-purple-400 mt-0.5 flex-shrink-0"; // Color diferente para etiquetas
    const listItemTextClasses = "";
    const strongClasses = "text-zinc-100 font-medium";

    return (
        <div className={containerClasses}>
            {/* Título */}
            <h4 className={titleClasses}>
                <Tags size={16} className="text-purple-400" />
                <span>¿Qué son y para qué sirven las Etiquetas?</span>
            </h4>

            {/* Descripción Principal */}
            <p className={descriptionClasses}>
                Las Etiquetas (o Tags) son <strong className={strongClasses}>marcadores personalizados</strong> que puedes asignar a tus Leads para clasificarlos, segmentarlos y organizar tu base de datos de manera eficiente. Son cruciales para:
            </p>

            {/* Lista de Importancia/Beneficios */}
            <ul className={listClasses}>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Segmentación Precisa:</strong> Agrupa Leads con características comunes (Ej: &quot;Interesado en Producto A&quot;, &quot;Cliente VIP&quot;, &quot;Origen Facebook&quot;, &quot;Seguimiento Urgente&quot;).
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Filtrado Rápido:</strong> Encuentra rápidamente grupos específicos de Leads aplicando filtros por etiqueta.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Automatización Inteligente:</strong> Utiliza etiquetas para disparar acciones automáticas (Ej: enviar un email específico a Leads con la etiqueta &quot;Nuevo Prospecto&quot;).
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Análisis Detallado:</strong> Analiza el comportamiento o el rendimiento de diferentes segmentos de Leads basados en sus etiquetas.
                    </span>
                </li>
            </ul>

            {/* Sección Cómo Aprovecharlas */}
            <h4 className={`${titleClasses} mt-4`}>
                <Target size={16} className="text-green-400" />
                <span>¿Cómo sacarles el mejor provecho?</span>
            </h4>
            <ul className={listClasses}>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Sé Específico y Claro:</strong> Usa nombres de etiqueta que sean fáciles de entender y representen claramente el segmento (Ej: &quot;Solicitó Demo&quot; en lugar de &quot;SD&quot;).
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Mantén la Consistencia:</strong> Define un sistema de etiquetado y asegúrate de que todo el equipo lo siga para evitar duplicados o confusión.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>No Exageres:</strong> Demasiadas etiquetas pueden volverse difíciles de gestionar. Enfócate en las que realmente aportan valor a tu proceso.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Palette size={14} className={listItemIconClasses + " !text-yellow-400"} /> {/* Icono diferente */}
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Usa Colores (Opcional):</strong> Asignar colores a las etiquetas puede mejorar la identificación visual rápida en listas y vistas Kanban.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Revisa y Limpia:</strong> Periódicamente, revisa tus etiquetas, elimina las que ya no uses y fusiona las que sean redundantes.
                    </span>
                </li>
            </ul>

        </div>
    );
}
