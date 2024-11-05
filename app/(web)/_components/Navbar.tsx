'use client'

import { useState } from 'react'
import { Menu, X, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'

export default function Navbar() {

  const [isMenuOpen, setIsMenuOpen] = useState(false)
  const [activeItem, setActiveItem] = useState('/')

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const handleLinkClick = (path: string) => {
    setActiveItem(path)
    setIsMenuOpen(false)
  }

  const links = [
    { href: '/', label: 'Inicio' },
    { href: '/nosotros', label: 'Nosotros' },
    { href: '/clientes', label: 'Clientes' },
    { href: '/servicios', label: 'Servicios' },
    // { href: '/contacto', label: 'Contacto' },
  ]

  return (
    <nav className="bg-black shadow-md w-full">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex flex-row items-center">
            <Link href="/" className="text-2xl font-bold text-gray-800 flex items-center" onClick={() => handleLinkClick('/')}>
              <Image src="https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia/logo_fullcolor.svg" alt="ProMedia" width={120} height={30} className="block h-5 md:h-8 w-auto" />
            </Link>
          </div>

          {/* Menú para pantallas grandes */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center">
            <div className="flex space-x-4">
              {links.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className={`px-3 py-2 rounded-md ${activeItem === link.href ? 'text-cyan-700 bg-slate-900' : 'text-gray-600 hover:text-gray-600'}`}
                  onClick={() => handleLinkClick(link.href)}
                >
                  {link.label}
                </Link>
              ))}
              {/* <Link href="/dashboard" className='pt-2 text-cyan-900'>
                <CircleUser className="h-6 w-6" />
              </Link> */}
            </div>
          </div>

          {/* Botón de menú para móviles */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2"
            >
              <span className="sr-only">Abrir menú principal</span>
              {isMenuOpen ? (
                <p><X /></p>
              ) : (
                <p><Menu /></p>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móvil */}
      {isMenuOpen && (
        <div className="sm:hidden">
          <div className="px-2 pt-2 pb-3 space-y-1">
            {links.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`block px-3 py-2 rounded-md text-base font-medium ${activeItem === link.href ? 'text-cyan-600' : 'text-gray-600 hover:text-gray-600'}`}
                onClick={() => handleLinkClick(link.href)}
              >
                <div className="flex items-center space-x-2">
                  <ChevronRight /> {link.label}
                </div>
              </Link>
            ))}
            {/* <Link href="/dashboard" className='pt-2'
              onClick={(e) => handleLinkClick(e.currentTarget.pathname)}
            >
              <div className='flex text-center items-center mx-auto p-3 bg-cyan-800 rounded-md my-2 justify-center'>
                Iniciar sesión
              </div>
            </Link> */}
          </div>
        </div>
      )}
    </nav>
  )
}