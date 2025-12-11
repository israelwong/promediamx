import React from 'react'
import Image from 'next/image'
import Link from 'next/link'

export default function Footer() {
  return (
    <footer className="text-zinc-700 p-4 pt-12 pb-16 mx-auto w-full flex-col items-center text-center">
      <div className="flex justify-center">
        <Image
          src='https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/promedia/promedia_full_gray.svg'
          width={150}
          height={150}
          alt='Logo de Promedia México'
          className='mb-3'
        />
      </div>

      <p>&copy; Todos los derechos reservados 2025</p>

      <p className='max-w-screen-sm mx-auto md:px-24 px-12 mb-5 text-zinc-500 text-sm'>
        Ayudamos a los negocios a crear su oferta comercial aprovechando la tecnología e innovación.
      </p>

      <div className='mb-10 flex justify-center'>
        <ul className='flex gap-4 text-center items-center'>
          <li>
            <Link href='https://www.youtube.com/channel/UC9J6Z6J1Z6Z9Q6J9Z6J9Z6J9' title='YouTube'>
              <i className="fab fa-youtube text-2xl" aria-label="YouTube"></i>
            </Link>
          </li>
          <li>
            <Link href='https://www.facebook.com/ProMediaMx' title='Facebook'>
              <i className="fab fa-facebook-f text-xl" aria-label="Facebook"></i>
            </Link>
          </li>
          <li>
            <Link href='https://www.instagram.com/promedia.mx/' title='Instagram'>
              <i className="fab fa-instagram text-2xl" aria-label="Instagram"></i>
            </Link>
          </li>
          <li>
            <Link href='https://www.linkedin.com/company/promediamexico' title='LinkedIn'>
              <i className="fab fa-linkedin text-2xl" aria-label="LinkedIn"></i>
            </Link>
          </li>
        </ul>
      </div>
    </footer>
  )
}
