'use client';

import React from 'react';
import { X } from 'lucide-react'; // Icono para el botón de cerrar

interface Props {
    onClose: () => void; // Función para cerrar la ventana/modal
}

// Corregido el nombre del componente a PascalCase
export default function InstruccionesTarea({ onClose }: Props) {

    // Clases base para reutilizar
    const sectionSpacing = "mt-4 pt-4 border-t border-zinc-600"; // Espacio y línea divisoria entre secciones
    const fieldTitleClasses = "text-md font-semibold text-zinc-100 mb-1"; // Título de cada campo
    const purposeLabelClasses = "font-semibold text-zinc-300 mr-1"; // Etiqueta "Propósito:"
    const instructionLabelClasses = "font-semibold text-zinc-300 mr-1"; // Etiqueta "Instrucción:"
    const textClasses = "text-sm text-zinc-300 leading-relaxed"; // Texto normal

    return (
        // Contenedor principal con padding, fondo, borde redondeado y sombra
        // Ajusta max-w según el tamaño deseado para la ventana flotante
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 overflow-y-auto">
            <div className="relative p-6 bg-zinc-800 rounded-lg shadow-xl max-w-3xl mx-auto text-zinc-200">

                {/* Botón de Cerrar (esquina superior derecha) */}
                <button
                    onClick={onClose}
                    className="absolute top-3 right-3 text-zinc-400 hover:text-white focus:outline-none focus:ring-2 focus:ring-zinc-500 rounded-full p-1 transition-colors"
                    aria-label="Cerrar ventana"
                    title="Cerrar"
                >
                    <X size={20} />
                </button>

                {/* Título Principal */}
                <h3 className="text-xl font-bold text-white mb-4">
                    Instrucciones para Configurar una Tarea
                </h3>

                {/* Contenido con scroll vertical */}
                <div className="max-h-[80vh] overflow-y-auto">
                    {/* Introducción */}
                    <p className={textClasses}>
                        Aquí se explica el propósito de cada campo para ayudarte a definir cómo se comportará tu asistente virtual al ejecutar esta tarea específica.
                    </p>

                    {/* --- Secciones de Campos --- */}

                    <div className={sectionSpacing}>
                        <h4 className={fieldTitleClasses}>Nombre</h4>
                        <p className={textClasses}><strong className={purposeLabelClasses}>Propósito:</strong> Identificador único y corto para la Tarea.</p>
                        <p className={textClasses}><strong className={instructionLabelClasses}>Instrucción:</strong> Introduce un nombre claro y conciso que represente la acción principal (ej. Agendar Cita, Consultar Saldo, Escalar a Ejecutivo). Se usará internamente y en listas.</p>
                    </div>

                    <div className={sectionSpacing}>
                        <h4 className={fieldTitleClasses}>Descripción</h4>
                        <p className={textClasses}><strong className={purposeLabelClasses}>Propósito:</strong> Resumen de lo que hace la Tarea y su objetivo.</p>
                        <p className={textClasses}><strong className={instructionLabelClasses}>Instrucción:</strong> Describe brevemente la función de esta Tarea. Esta descripción te sirve de referencia y, muy importante, se usará para describir la Función de Automatización asociada a la IA (en el parámetro tools de Gemini), ayudándole a entender cuándo debe usarla. (ej. Recopila datos del cliente y llama a la API de agendamiento para reservar una cita).</p>
                    </div>

                    <div className={sectionSpacing}>
                        <h4 className={fieldTitleClasses}>Trigger (Llamada desde API para iniciar tarea)</h4>
                        <p className={textClasses}><strong className={purposeLabelClasses}>Propósito:</strong> Evento o identificador interno que activa esta Tarea.</p>
                        <p className={textClasses}><strong className={instructionLabelClasses}>Instrucción:</strong> Define la señal interna que dispara la ejecución de esta Tarea. Puede ser una intención detectada, un estado específico de la conversación u otro evento del sistema (ej. intencion_agendar, respuesta_no_encontrada, solicitud_saldo).</p>
                    </div>

                    <div className={sectionSpacing}>
                        <h4 className={fieldTitleClasses}>Automatización (Función API para iniciar automatización)</h4>
                        <p className={textClasses}><strong className={purposeLabelClasses}>Propósito:</strong> Nombre de la función (tool) que la IA llamará.</p>
                        <p className={textClasses}><strong className={instructionLabelClasses}>Instrucción:</strong> Especifica el nombre exacto de la función (tool name) que la IA deberá invocar (usando Function Calling) para ejecutar lógica de backend o interactuar con sistemas externos (ej. llamarApiCalendario, consultarBaseDatosProductos, consultarHITL). Debe coincidir con el nombre declarado en las function_declarations de la API.</p>
                    </div>

                    <div className={sectionSpacing}>
                        <h4 className={fieldTitleClasses}>Rol Asignado</h4>
                        <p className={textClasses}><strong className={purposeLabelClasses}>Propósito:</strong> Define el &quot;papel&quot; que adopta la IA para esta Tarea.</p>
                        <p className={textClasses}><strong className={instructionLabelClasses}>Instrucción:</strong> Describe brevemente el rol del asistente al realizar esta acción (ej. Agente de Reservas Cortés, Experto Técnico, Asistente de Soporte Nivel 1). Guía el tono general.</p>
                    </div>

                    <div className={sectionSpacing}>
                        <h4 className={fieldTitleClasses}>Personalidad</h4>
                        <p className={textClasses}><strong className={purposeLabelClasses}>Propósito:</strong> Define los rasgos de comportamiento de la IA para esta Tarea.</p>
                        <p className={textClasses}><strong className={instructionLabelClasses}>Instrucción:</strong> Lista las características clave de la personalidad, separadas por comas (ej. Amable, Eficiente, Claro, Empático, Paciente, Resolutivo). Complementa al Rol.</p>
                    </div>

                    <div className={sectionSpacing}>
                        <h4 className={fieldTitleClasses}>Instrucción (Prompt Base)</h4>
                        <p className={textClasses}><strong className={purposeLabelClasses}>Propósito:</strong> Las instrucciones detalladas paso a paso para la IA.</p>
                        <p className={textClasses}><strong className={instructionLabelClasses}>Instrucción:</strong> Escribe aquí la guía detallada que la IA debe seguir. Piensa en ello como pseudocódigo o una receta: incluye el contexto necesario, los pasos lógicos, cómo manejar respuestas del usuario (condiciones SI/NO), cuándo llamar a la Función de Automatización, y qué NO debe hacer (restricciones). No necesitas repetir el Rol/Personalidad aquí; el sistema los combinará al formar el prompt final. Usa listas o viñetas para mayor claridad.</p>
                    </div>

                    <div className={sectionSpacing}>
                        <h4 className={fieldTitleClasses}>Parámetros Requeridos</h4>
                        <p className={textClasses}><strong className={purposeLabelClasses}>Propósito (General):</strong> Define los datos que la Tarea y su Función de Automatización necesitan para funcionar. La IA intentará obtenerlos del usuario.</p>
                        <p className={textClasses}><strong className={instructionLabelClasses}>Instrucción (General):</strong> Añade aquí cada pieza de información necesaria. Estos parámetros se usarán para generar el esquema de la Función de Automatización para la API de Gemini (tools).</p>
                        <div className="mt-2 pl-4 border-l border-zinc-600">
                            <p className={textClasses}><strong className="text-zinc-300">Nombre:</strong> Identificador del parámetro (ej. id_producto, fecha_inicio, consulta_original_usuario). Debe coincidir con lo esperado por tu Función de Automatización.</p>
                            <p className={textClasses}><strong className="text-zinc-300">Tipo Dato:</strong> Selecciona el tipo de dato (STRING, NUMBER, BOOLEAN).</p>
                            <p className={textClasses}><strong className="text-zinc-300">Descripción:</strong> Explica qué es este parámetro. Se usará internamente y para describir el parámetro a la IA en el esquema de la función.</p>
                            <p className={textClasses}><strong className="text-zinc-300">¿Es Requerido?:</strong> Marca esta casilla si el parámetro es siempre obligatorio para esta Tarea (será el valor por defecto). Los clientes podrán sobrescribir esto en su configuración específica si es necesario (a través de ParametrosAsistenteConfiguracion).</p>
                        </div>
                    </div>

                </div>
            </div>
            );
        </div>
    );
}

