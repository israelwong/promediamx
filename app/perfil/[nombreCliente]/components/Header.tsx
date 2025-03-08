import React, { useState } from 'react';
import Image from 'next/image';
import { Copy } from 'lucide-react';

interface Props {
    nombre: string;
    slogan: string;
    url_image: string;
}

export default function Header({ nombre, slogan, url_image }: Props) {
    const currentUrl = typeof window !== 'undefined' ? window.location.href : '';
    const [buttonText, setButtonText] = useState('Copiar enlace');
    const [buttonColor, setButtonColor] = useState('border-zinc-700 text-zinc-400'); // Initial color

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(currentUrl);
            setButtonText('Enlace copiado');
            setButtonColor('border-amber-500 text-amber-500'); // Amber color

            setTimeout(() => {
                setButtonText('Copiar enlace');
                setButtonColor('border-zinc-700 text-zinc-400'); // Reset to original color
            }, 2000);
        } catch (err) {
            console.error('Error al copiar al portapapeles:', err);
            alert('No se pudo copiar el enlace');
        }
    };

    return (
        <div>
            <div>
                <div className='grid grid-cols-4 items-center justify-center mx-auto py-3 px-5'>
                    <div className='col-span-1 flex justify-center'>
                        <div className='m'>
                            <Image src={url_image} width={40} height={40} alt='Logo' />
                        </div>
                    </div>
                    <div className='col-span-3'>
                        <h1 className='text-zinc-100 text-xl font-FunnelSans-Bold'>
                            {nombre
                                .split(' ')
                                .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
                                .join(' ')}
                        </h1>
                        <p className='text-zinc-400 font-FunnelSans-Light text-sm pr-3'>{slogan}</p>

                        <button
                            onClick={handleCopy}
                            className={`text-xs border px-2 py-1 rounded-md my-2 flex items-center ${buttonColor} font-FunnelSans-Light`}
                        >
                            <Copy className='mr-2' size={12} />
                            <span>{buttonText}</span>
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}