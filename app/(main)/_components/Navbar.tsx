'use client'
import { useState } from 'react'
import { Menu, X } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'

export default function Navbar() {

  const pathname = usePathname()
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  const isActive = (href: string) => {
    if (href === '/') return pathname === '/'
    return pathname === href || pathname.startsWith(`${href}/`)
  }

  const linkClassDesktop = (href: string) =>
    [
      'px-3 py-2 rounded-md transition-colors',
      isActive(href)
        ? 'bg-green-800 text-zinc-100'
        : 'text-zinc-400 hover:text-zinc-500',
    ].join(' ')

  const linkClassMobile = (href: string) =>
    [
      'block px-3 py-2 rounded-md text-base font-medium transition-colors',
      isActive(href)
        ? 'bg-green-800 text-zinc-100'
        : 'text-zinc-400 hover:text-zinc-500',
    ].join(' ')

  const toggleMenu = () => {
    setIsMenuOpen(!isMenuOpen)
  }

  const closeMenu = () => {
    setIsMenuOpen(false)
  }

  const links = [
    { href: '/', label: 'Inicio' },
    { href: '/nosotros', label: 'Nosotros' },
    { href: '/proyectos', label: 'Proyectos' },
    { href: '/clientes', label: 'Clientes' },
    // { href: '/vacantes', label: 'Vacantes' },
  ]

  return (
    <nav className="w-full border-b border-zinc-800 leading-snug font-semibold" aria-label="Main navigation">
      <div className="max-w-7xl mx-auto  sm:px-6 md:px-0 px-5">
        <div className="flex justify-between h-16">
          <div className="flex flex-row items-center">
            <Link href="/" className="flex-shrink-0">
              <Image src="https://fhwfdwrrnwkbnwxabkcq.supabase.co/storage/v1/object/public/ProMedia/logos/promedia/promedia_full_color.svg" alt="ProMedia Logo" width={120} height={30} className="block h-5 md:h-8 w-auto" />
            </Link>
          </div>

          {/* Menú para pantallas grandes */}
          <div className="hidden sm:ml-6 sm:flex sm:items-center text-sm max-w-screen-md">
            <ul className="flex space-x-4">
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={linkClassDesktop(link.href)}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          {/* Botón de menú para móviles */}
          <div className="sm:hidden flex items-center">
            <button
              onClick={toggleMenu}
              className="inline-flex items-center justify-center p-2"
              aria-label="Toggle menu"
            >
              <span className="sr-only">Abrir menú principal</span>
              {isMenuOpen ? (
                <X />
              ) : (
                <Menu />
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Menú móbil */}
      {isMenuOpen && (
        <div className={`sm:hidden transition-transform duration-300 ease-in-out transform ${isMenuOpen ? 'translate-y-0' : '-translate-y-full'}`}>
          <div className="px-2 pt-2 pb-3 mb-5 space-y-1">
            <ul>
              {links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className={linkClassMobile(link.href)}
                    aria-current={isActive(link.href) ? 'page' : undefined}
                    onClick={closeMenu}
                  >
                    <div className="flex items-center space-x-2">
                      {link.label}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}

    </nav>
  )
}