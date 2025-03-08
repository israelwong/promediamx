import React from 'react'

interface Props {
    mensaje: string;
}

export default function LoadingPage({ mensaje }: Props) {
    return (
        <div>
            <p className='py-20 text-center text-zinc-600 italic text-xl'>
                {mensaje}
            </p>
        </div>
    )
}
