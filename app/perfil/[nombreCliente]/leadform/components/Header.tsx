import React from 'react'
import Image from 'next/image';

interface Props {
    nombre: string;
    slogan: string;
    url_image: string;
    web: string;
}

export default function Header({ nombre, slogan, url_image, web }: Props) {
    return (
        <div className='border-b border-zinc-800 py-6'>

            <div className='flex items-center justify-center mx-auto'>
                <div className='pr-3'>
                    <Image className='mr-3' src={url_image} width={40} height={40} alt='Logo' />
                </div>
                <div className=''>
                    <h1 className='text-zinc-100 text-xl font-FunnelSans-Bold'>
                        {nombre.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ')}
                    </h1>
                    <p className='text-zinc-400 font-FunnelSans-Light text-sm'>{slogan}</p>

                    {web && (
                        <a href={web} target="_blank" rel="noreferrer" className='text-zinc-400 font-FunnelSans-Light text-xs border border-zinc-700 px-2 py-1 rounded-md my-2 inline-block'>Visitar pagina web</a>
                    )}
                </div>
            </div>

        </div>
    )
}
