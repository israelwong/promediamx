import React from 'react'
import { Tags } from 'lucide-react';
export default function NegocioEtiquetaTip() {
    return (


        <div>
            {/* Bloque Explicativo Mejorado para Etiquetas */}
            <div className="mt-4 p-4 bg-gradient-to-r from-zinc-800/50 to-zinc-700/40 border border-zinc-700 rounded-lg shadow-inner">
                {/* Título opcional con icono (Descomentar si se usa Lucide en React/Vue, etc.) */}

                <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2">
                    <Tags size={15} className="text-purple-400" />
                    <span>¿Para qué sirven las Etiquetas?</span>
                </h4>


                {/* Descripción Principal */}
                <p className="text-sm text-zinc-300 leading-relaxed">
                    Las etiquetas sirven para <strong className="text-zinc-100">describir o clasificar</strong> ítems con atributos o palabras clave específicas, incluso entre diferentes categorías. Piensa en ellas como <em className="text-zinc-200 not-italic">tags</em> que añaden detalles.
                </p>

                {/* Lista de Ejemplos/Beneficios */}
                <ul className="mt-3 space-y-1.5 text-xs text-zinc-400 list-disc pl-5">
                    <li>
                        <strong className="text-zinc-300">Ejemplo:</strong> Para productos o servicios, podrías usar <code className="text-purple-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Popular</code>, <code className="text-purple-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Nuevo</code>, <code className="text-purple-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Vegano</code>, <code className="text-purple-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Requiere Cita</code>. Un mismo ítem <strong className="text-zinc-200">puede tener varias</strong> etiquetas.
                    </li>
                    <li>
                        <strong className="text-zinc-300">Beneficio:</strong> Permiten una <strong className="text-zinc-200">clasificación detallada y flexible</strong>. Son muy útiles para filtrar búsquedas y para que la IA pueda destacar características específicas o responder preguntas más concretas.
                    </li>
                </ul>
            </div>


        </div>
    )
}
