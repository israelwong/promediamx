import React from 'react'

export default function SocialLinks() {

    const links = [
        { name: 'Facebook', url: 'https://www.facebook.com', title: 'Facebook' },
        { name: 'Instagram', url: 'https://www.instagram.com', title: 'Instagram' },
        { name: 'LinkedIn', url: 'https://www.linkedin.com', title: 'LinkedIn' },
        { name: 'YouTube', url: 'https://www.youtube.com', title: 'YouTube' },
    ];

    return (

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

    )
}
