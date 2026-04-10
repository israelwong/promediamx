import React from 'react'
import { useRouter } from 'next/navigation'

interface Props {
    titulo: string;
}

export default function HeaderPage({ titulo }: Props) {
    const router = useRouter();
    return (
        <div>
            <div className='flex justify-between items-center text-white mb-5'>
                <div className='text-2xl flex items-center space-x-2'>
                    <span>
                        {titulo}
                    </span>
                </div>
                <div className='space-x-2 flex items-center'>
                    <button className='bg-red-700 border border-red-600 rounded px-3 py-1'
                        onClick={() => router.back()}>
                        Cerrar ventana
                    </button>
                </div>
            </div>

        </div>
    )
}
