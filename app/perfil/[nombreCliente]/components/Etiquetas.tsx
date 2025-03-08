import React from 'react'
import { Tag } from 'lucide-react';

interface Props {
    etiquetas: string[];
}

export default function Etiquetas({ etiquetas }: Props) {
    return (
        <div className='p-5 mb-5'>
            <h3 className="text-xl font-FunnelSans-Light mb-4 flex items-center space-x-2">
                <Tag size={16} />
                <span>Palabras clave</span>
            </h3>
            <div className="flex flex-wrap gap-2">
                {etiquetas.map((keyword) => (
                    <span key={keyword} className="bg-zinc-900 text-zinc-500 px-3 py-1 rounded-full text-sm border border-zinc-800">
                        {keyword}
                    </span>
                ))}
            </div>

        </div>
    )
}
