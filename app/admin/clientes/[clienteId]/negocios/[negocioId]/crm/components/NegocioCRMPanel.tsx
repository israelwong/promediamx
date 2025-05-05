import React from 'react'

interface Props {
    clienteId: string;
    negocioId: string;
}

export default function NegocioCRMPanel({ clienteId, negocioId }: Props) {
    return (
        <div>
            <div className="flex items-center justify-between p-4 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md">
                <div>
                    <h2 className="text-lg font-semibold text-zinc-200">Panel de CRM del negocio</h2>
                </div>
                <button>
                    Cerrar ventana
                </button>
            </div>
            <div className="flex flex-col md:flex-row gap-4 mt-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md">
                <div className="flex-1">
                    <ul>
                        <li className="text-zinc-400">Conversaciones</li>
                        <li className="text-zinc-400">Dashboard
                            <ul>
                                <li className="text-zinc-400 ml-5">Estadísticas</li>
                                <li className="text-zinc-400 ml-5">Agentes</li>
                            </ul>
                        </li>
                        <li className="text-zinc-400">Asistente IA</li>
                        <li className="text-zinc-400">Agenda</li>
                        <li className="text-zinc-400">Configuración
                            <ul>
                                <li className="text-zinc-400 ml-5">Agentes</li>
                                <li className="text-zinc-400 ml-5">Campos Personalizados</li>
                                <li className="text-zinc-400 ml-5">Canales</li>
                                <li className="text-zinc-400 ml-5">Etiquetas</li>
                                <li className="text-zinc-400 ml-5">Pilepine</li>
                            </ul>
                        </li>
                    </ul>
                </div>
                <div className="flex-1">
                    <h3 className="text-zinc-200 font-medium">Columna 2</h3>
                    <p className="text-zinc-400">Contenido de la segunda columna.</p>
                </div>

            </div>

        </div>
    )
}
