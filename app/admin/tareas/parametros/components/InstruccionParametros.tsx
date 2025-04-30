import React from 'react'

export default function InstruccionParametros() {
    return (
        <div>

            <h3 className="text-lg font-semibold text-white mb-3">Instrucciones para definir los Parámetros</h3>
            <div className="space-y-3">
                <p>
                    Añade cada pieza de información necesaria. Estos parámetros se usarán para generar el esquema de la Función de Automatización para la API de Gemini (tools).
                </p>
                <ul className="list-disc list-inside space-y-2 pl-2 text-zinc-300">
                    <li>
                        <strong className='text-zinc-100'>Nombre:</strong> Identificador del parámetro (ej. <code>id_producto</code>, <code>fecha_inicio</code>, <code>consulta_original_usuario</code>). Debe coincidir con lo esperado por tu Función de Automatización.
                    </li>
                    <li>
                        <strong className='text-zinc-100'>Tipo Dato:</strong> Selecciona el tipo de dato (<code>STRING</code>, <code>NUMBER</code>, <code>BOOLEAN</code>).
                    </li>
                    <li>
                        <strong className='text-zinc-100'>Descripción:</strong> Explica qué es este parámetro. Se usará internamente y para describir el parámetro a la IA en el esquema de la función.
                    </li>
                    <li>
                        <strong className='text-zinc-100'>¿Es Requerido?:</strong> Marca esta casilla si el parámetro es siempre obligatorio para esta Tarea. Los clientes podrán sobrescribir esto en su configuración específica si es necesario.
                    </li>
                </ul>
            </div>

        </div>
    )
}
