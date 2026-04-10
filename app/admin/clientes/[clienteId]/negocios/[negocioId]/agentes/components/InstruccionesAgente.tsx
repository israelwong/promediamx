// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/agentes/components/InstruccionesAgentes.tsx
// O la ruta donde residirá este componente de instrucciones
import React from 'react';
import { Users, Lightbulb, Target, MessageSquareQuote } from 'lucide-react'; // Iconos relevantes

export default function InstruccionesAgentes() {
    // Clases de Tailwind (reutilizadas para consistencia)
    const containerClasses = "p-4 bg-gradient-to-r from-zinc-800/50 to-zinc-700/40 border border-zinc-700 rounded-lg shadow-inner";
    const titleClasses = "flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2";
    const descriptionClasses = "text-sm text-zinc-300 leading-relaxed";
    const listClasses = "mt-3 space-y-2 text-xs text-zinc-400 list-none pl-0"; // Sin viñetas
    const listItemClasses = "flex items-start gap-2"; // Para alinear icono y texto
    const listItemIconClasses = "text-green-400 mt-0.5 flex-shrink-0"; // Color para agentes
    const listItemTextClasses = "";
    const strongClasses = "text-zinc-100 font-medium";
    const emphasisClasses = "text-sky-300"; // Para destacar Asistente Virtual

    return (
        <div className={containerClasses}>
            {/* Título */}
            <h4 className={titleClasses}>
                <Users size={16} className="text-green-400" />
                <span>¿Qué son y para qué sirven los Agentes?</span>
            </h4>

            {/* Descripción Principal */}
            <p className={descriptionClasses}>
                Los Agentes son los <strong className={strongClasses}>usuarios humanos</strong> de tu equipo (ventas, soporte, etc.) que interactuarán con los Leads dentro del CRM. Son fundamentales para complementar el trabajo del <strong className={emphasisClasses}>Asistente Virtual</strong> y gestionar las relaciones con los clientes. Sus funciones clave incluyen:
            </p>

            {/* Lista de Importancia/Beneficios */}
            <ul className={listClasses}>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Intervención Humana (Human-in-the-loop):</strong> Tomar el control de conversaciones cuando el <strong className={emphasisClasses}>Asistente Virtual</strong> detecta una situación compleja o el Lead solicita hablar con una persona.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Gestión de Leads:</strong> Asignar Leads a agentes específicos, actualizar su estado en el pipeline, añadir notas y programar seguimientos.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Lightbulb size={14} className={listItemIconClasses} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Supervisión y Calidad:</strong> Monitorear las interacciones gestionadas por el <strong className={emphasisClasses}>Asistente Virtual</strong> y asegurar la calidad del servicio.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <MessageSquareQuote size={14} className={listItemIconClasses} /> {/* Icono diferente */}
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Comunicación Directa:</strong> Iniciar conversaciones o responder directamente a los Leads desde la plataforma CRM.
                    </span>
                </li>
            </ul>

            {/* Sección Cómo Aprovecharlos */}
            <h4 className={`${titleClasses} mt-4`}>
                <Target size={16} className="text-blue-400" /> {/* Cambiado color icono */}
                <span>¿Cómo configurar y gestionar Agentes?</span>
            </h4>
            <ul className={listClasses}>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-blue-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Añadir Nuevos Agentes:</strong> Usa el botón &quot;Agregar Agente&quot; para crear cuentas para los miembros de tu equipo que usarán el CRM.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-blue-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Completar Datos:</strong> Proporciona la información requerida (nombre, email único, contraseña segura). El email será su usuario de acceso.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-blue-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Asignar Roles/Permisos (si aplica):</strong> Define qué acciones puede realizar cada agente dentro del CRM (ver todos los leads, solo los asignados, editar configuración, etc.). *Funcionalidad futura*.
                    </span>
                </li>
                <li className={listItemClasses}>
                    <Target size={14} className={listItemIconClasses + " !text-blue-400"} />
                    <span className={listItemTextClasses}>
                        <strong className={strongClasses}>Gestionar Estado:</strong> Puedes activar o desactivar agentes según sea necesario (ej. si un empleado deja la empresa).
                    </span>
                </li>
            </ul>

        </div>
    );
}
