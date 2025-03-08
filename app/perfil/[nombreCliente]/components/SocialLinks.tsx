import React from 'react'
import { Link } from 'lucide-react';

export default function SocialLinks() {

    const links = [
        { name: 'Pagina web', url: 'https://www.prosocial.mx', title: 'Prosocial' },
        { name: 'Facebook', url: 'https://www.facebook.com', title: 'Facebook' },
        { name: 'Instagram', url: 'https://www.instagram.com', title: 'Instagram' },
        { name: 'LinkedIn', url: 'https://www.linkedin.com', title: 'LinkedIn' },
        { name: 'YouTube', url: 'https://www.youtube.com', title: 'YouTube' },
    ];

    return (

        <div className='bg-zinc-900/50 py-5 mb-5'>

            <div className='p-5 mb-5'>
                <h3 className="font-FunnelSans-Light text-center flex items-center justify-center space-x-2 mb-5">
                    <Link size={16} />
                    <span>Link de interés</span>
                </h3>

                <div className='md:max-w-screen-sm md:px-20 mx-auto text-zinc-300 text-center'>
                    <ul className='space-y-4'>
                        {links.map((link, index) => (
                            <li key={index} className='w-full p-3 border border-zinc-500 rounded-full text-sm'>
                                <a href={link.url} title={link.title} className='flex items-center justify-center space-x-2 hover:text-yellow-300'>
                                    {link.name}
                                </a>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>

    )
}
