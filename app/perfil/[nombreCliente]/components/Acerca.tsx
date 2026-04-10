import React from 'react'

interface Props {
    descripcion: string;
}

export default function Acerca({ descripcion }: Props) {
    return (
        <div className='p-5'>

            <div className="text-zinc-300 font-FunnelSans-Light text-left">
                {descripcion}
            </div>
        </div>
    )
}
