'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function ConfigurarSidebar() {
    const pathname = usePathname();

    const navItemsAdmin = [
        { href: '/dashboard/administrar/usuarios', label: 'Usuarios' },
        { href: '/dashboard/administrar/servicios', label: 'Servicios' }
    ];

    return (
        <div>
            <ul className='text-md space-y-3'>
                {navItemsAdmin.map((item) => (
                    <li key={item.href}>
                        <Link href={item.href}>
                            <span className={`text-gray-500 ${pathname === item.href ? 'font-bold text-white' : ''}`}>
                                {item.label}
                            </span>
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    );
}

export default ConfigurarSidebar;