import React from 'react'

export default function PlataformasSociales() {
    return (
        <div className='w-full text-center items-center justify-center flex gap-4'>

            <div className='flex'>
                <ul className='flex gap-4 text-center items-center justify-center'>
                    <li>
                        <i className="fab fa-whatsapp text-green-600 text-2xl" aria-label="WhatsApp"></i>
                    </li>
                    <li>
                        <i className="fab fa-tiktok text-2xl" aria-label="TikTok"></i>
                    </li>
                    <li>
                        <i className="fab fa-youtube text-red-700 text-3xl" aria-label="YouTube"></i>
                    </li>
                    <li>
                        <i className="fab fa-facebook-f text-blue-700 text-2xl" aria-label="Facebook"></i>
                    </li>
                    <li>
                        <i className="fab fa-instagram text-pink-800 text-3xl" aria-label="Instagram"></i>
                    </li>
                    <li>
                        <i className="fab fa-linkedin-in text-blue-400 text-2xl" aria-label="LinkedIn"></i>
                    </li>
                    <li>
                        <i className="fab fa-spotify text-green-500 text-2xl" aria-label="Spotify"></i>
                    </li>
                    <li>
                        <i className="fab fa-stripe-s text-blue-600 text-2xl" aria-label="Stripe"></i>
                    </li>
                    <li>
                        <i className="fab fa-google text-red-600 text-2xl" aria-label="Google"></i>
                    </li>
                </ul>
            </div>
            <p className='text-sm/5 text-zinc-500 max-w-md mb-2 font-FunnelSans-Light text-left'>
                Utilizamos estratégicamente todas las plataformas sociales para llegar a tu audiencia de manera efectiva:
            </p>
        </div>
    )
}
