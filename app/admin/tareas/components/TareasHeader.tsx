import React from 'react'

interface Props {
    nombreSeccion: string;
}

export default function TareasHeader({ nombreSeccion }: Props) {
    return (
        <div>
            Nombre de la sección: {nombreSeccion}

        </div>
    )
}
