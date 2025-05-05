// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/canales/components/InstruccionesCanales.tsx
// O la ruta donde residirá este componente de instrucciones
import React from 'react';
import { RadioTower, Lightbulb, Target, LocateFixed } from 'lucide-react'; // Iconos relevantes

export default function InstruccionesCanales() {
    // Clases de Tailwind (reutilizadas para consistencia)
    const containerClasses = "p-4 bg-gradient-to-r from-zinc-800/50 to-zinc-700/40 border border-zinc-700 rounded-lg shadow-inner";
    const titleClasses = "flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2";
    const descriptionClasses = "text-sm text-zinc-300 leading-relaxed";
    const listClasses = "mt-3 space-y-2 text-xs text-zinc-400 list-none pl-0"; // Sin viñetas
    const listItemClasses = "flex items-start gap-2"; // Para alinear icono y texto
    const listItemIconClasses = "text-cyan-400 mt-0.5 flex-shrink-0"; // Color diferente para canales
    const listItemTextClasses = "";
    const strongClasses = "text-zinc-100 font-medium";
    const exampleClasses = "italic text-zinc-400"; // Clase para ejemplos

    return (
        <div className={containerClasses}>
            {/* Título */}
            <h4 className={titleClasses}>
                <RadioTower size={16} className="text-cyan-400" />
                <span>¿Qué son los Canales de Adquisición?</span>
            </h4>

            {/* Descripción Principal */}
            <p className={descriptionClasses}>
                Los Canales de Adquisición representan <strong className={strongClasses}>el origen o la fuente</strong> por la cual un Lead (prospecto) llegó a tu negocio y entró en el CRM. Rastrear estos canales es vital para:
            </p>

            {/* Lista de Importancia/Beneficios */}
            <ul className={listClasses}>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Medir el Retorno de Inversión (ROI):</strong> Identifica qué canales (ej. Facebook Ads, Google, Referidos) generan los Leads más valiosos y rentables.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Optimizar Estrategias de Marketing:</strong> Enfoca tu presupuesto y esfuerzos en los canales que demuestran ser más efectivos.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Entender a tu Audiencia:</strong> Descubre dónde pasan tiempo tus prospectos ideales y cómo prefieren interactuar con tu marca.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Personalizar la Comunicación:</strong> Adapta tus mensajes iniciales según el canal por el que llegó el Lead.
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
                        <strong className={strongClasses}>Define Canales Relevantes:</strong> Crea canales que reflejen tus fuentes de Leads reales. Sé tan específico como necesites. <br />
                        <span className={exampleClasses}>Ejemplos: &quot;Facebook LeadForm&quot;, &quot;Anuncio Google&quot;, &quot;Landing Page X&quot;, &quot;WhatsApp Directo&quot;, &quot;Referido Cliente Y&quot;, &quot;Evento Z&quot;.</span>
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Asigna Consistentemente:</strong> Asegúrate de que cada nuevo Lead que entra al CRM tenga asignado su canal de origen correcto, ya sea manualmente o mediante automatizaciones.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <LocateFixed size={14} className={listItemIconClasses + " !text-yellow-400"} /> {/* Icono diferente */}
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Integra con Formularios:</strong> Si usas formularios web (Landing Pages, Facebook Lead Ads), intenta pasar automáticamente la información del canal al CRM.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-green-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Analiza los Datos:</strong> Revisa regularmente los informes para ver qué canales generan más Leads, cuáles convierten mejor y cuáles tienen mayor valor de vida del cliente.
                    </span>
                </li>
            </ul>

        </div>
    );
}
