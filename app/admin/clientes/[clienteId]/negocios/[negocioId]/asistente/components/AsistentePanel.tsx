import React from 'react'
// Ajusta las rutas de importación según tu estructura de carpetas real
import AsistenteEditarForm from '../components/AsistenteEditarForm';
import AsistenteTareas from '../components/AsistenteTareas';
import AsistenteEstadisticas from './AsistenteEstadisticas';

interface Props {
    asistenteId: string
    negocioId: string
    clienteId: string

}

export default function AsistentePanel({ asistenteId, negocioId, clienteId }: Props) {
    return (

        <div>
            {/* Grid principal para organizar los componentes */}
            <div className="grid grid-cols-3 gap-6">

                {/* Columna 1: Formulario de Edición */}
                <div className="col-span-1">
                    <AsistenteEditarForm
                        asistenteId={asistenteId}
                        negocioId={negocioId}
                        clienteId={clienteId}
                    />
                </div>

                <AsistenteEstadisticas
                    asistenteId={asistenteId}
                />

                {/* Columna 2: Tareas Suscritas */}
                <div>
                    <AsistenteTareas
                        asistenteId={asistenteId}
                    />
                </div>

            </div>
        </div>
    );
}
