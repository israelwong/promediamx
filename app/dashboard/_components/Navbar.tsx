import React from 'react';
import { useRouter } from 'next/navigation';
import Cookies from 'js-cookie';
import { cerrarSesion } from '../../_lib/Auth';
import { usePathname } from 'next/navigation';
import Link from 'next/link';


interface User {
  id: string
  email: string
  username: string
  rol: string
  token: string
}

function Navbar({ user }: { user: User }) {

  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: '/dashboard', label: 'Dashboard' },
    { href: '/dashboard/clientes', label: 'Clientes' },
    { href: '/dashboard/servicios', label: 'Servicios' },
    { href: '/dashboard/analitica', label: 'Analitica' },
    { href: '/dashboard/crm', label: 'CRM' },
    { href: '/dashboard/facturacion', label: 'Facturación' },
    { href: '/dashboard/administrar', label: 'Administrar' },
  ];

  async function handleCerrarSesion() {
    if (confirm('¿Estás seguro de cerrar sesión?')) {
      const response = await cerrarSesion(user.token);
      if (response && response.status) {
        Cookies.remove('token');
        router.push('/login');
      }
    }
  }

  return (
    <div className='flex flex-grow justify-between items-center px-5 py-3 text-sm border-b border-b-zinc-700'>
      <div className='text-xl'>
        <Link href={`/dashboard/administrar/usuarios/${user.id}`}  >
          {user.username}
        </Link>
      </div>
      <div className='flex gap-6 justify-center items-center'>
        {user.rol === 'admin' && (
          <>
            {links.map((link) => (
              <Link key={link.href} href={link.href}>
                <span className={`text-gray-500 ${pathname === link.href ? 'font-bold text-white' : ''}`}>

                  {link.label}
                </span>
              </Link>
            ))}
          </>
        )}
        <button
          className='border border-white rounded-md px-3 py-2'
          onClick={handleCerrarSesion}
        >
          Cerrar sesión
        </button>
      </div>
    </div>
  );
}

export default Navbar;