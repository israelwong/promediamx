import React from 'react';
import { LayoutGrid } from 'lucide-react';

export default function NegocioCategoriaTip() {
    return (
        <div>
            {/* Bloque Explicativo Mejorado para Categorías */}
            <div className="mt-4 p-4 bg-gradient-to-r from-zinc-800/50 to-zinc-700/40 border border-zinc-700 rounded-lg shadow-inner">
                {/* Título opcional con icono */}
                <h4 className="flex items-center gap-2 text-sm font-semibold text-zinc-200 mb-2">
                    <LayoutGrid size={15} className="text-blue-400" />
                    <span>¿Para qué sirven las Categorías?</span>
                </h4>

                {/* Descripción Principal */}
                <p className="text-sm text-zinc-300 leading-relaxed">
                    Las categorías sirven para <strong className="text-zinc-100">agrupar estructuralmente</strong> los ítems de tu catálogo. Piensa en ellas como las secciones principales de un menú o las carpetas de tus productos/servicios.
                </p>

                {/* Lista de Ejemplos/Beneficios */}
                <ul className="mt-3 space-y-1.5 text-xs text-zinc-400 list-disc pl-5">
                    <li>
                        <strong className="text-zinc-300">Ejemplo:</strong> En una barbería, podrían ser{' '}
                        <code className="text-cyan-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Cortes</code>,{' '}
                        <code className="text-cyan-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Barba</code>,{' '}
                        <code className="text-cyan-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Tratamientos</code>,{' '}
                        <code className="text-cyan-400 bg-zinc-700 px-1 py-0.5 rounded text-[0.7rem]">Productos</code>. Un ítem pertenece típicamente a{' '}
                        <em className="text-zinc-300 not-italic">una</em> categoría.
                    </li>
                    <li>
                        <strong className="text-zinc-300">Beneficio:</strong> Ayudan a entender la{' '}
                        <strong className="text-zinc-200">estructura general</strong> de tu oferta, facilitan la navegación y permiten mostrar secciones específicas del catálogo (útil para la IA y los usuarios).
                    </li>
                </ul>
            </div>
        </div>
    );
}
