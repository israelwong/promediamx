'use client'
import React, { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Cookies from 'js-cookie';
import Link from 'next/link';
import Image from 'next/image';
import { Usuario } from '@/app/admin/_lib/types';
import { verifyToken, cerrarSesion } from '@/app/lib/auth';
import { Bell } from 'lucide-react'
// import { supabase } from '@/app/lib/supabase';


function Navbar() {

    const [user, setUser] = useState<Usuario | null>(null);
    const [menuOpen, setMenuOpen] = useState(false);
    const pathname = usePathname();
    const router = useRouter();
    const token = Cookies.get('token');


    // const [notificaciones, setNotificaciones] = useState<Notificacion[]>([]);

    //! NOTIFICACIONES
    // const suscripcionNotificaciones = useCallback(async () => {
    //     const subscriptionNotificaciones = supabase
    //         .channel('realtime:notificaciones')
    //         .on(
    //             'postgres_changes',
    //             { event: '*', schema: 'public', table: 'Notificacion' },
    //             async (payload) => {
    //                 console.log('Evento en notificaciones:', payload);
    //                 // obtenerNotificaciones().then(notificaciones => {
    //                 //     console.log('notificaciones:', notificaciones);
    //                 //     setNotificaciones(notificaciones)
    //                 // })
    //             }
    //         ).subscribe((status, err) => {
    //             if (err) {
    //                 console.error('Error en la suscripción:', err);
    //             } else {
    //                 console.log('Estado de la suscripción en notificaciones:', status);
    //             }
    //         }
    //         );
    //     return () => {
    //         supabase.removeChannel(subscriptionNotificaciones);
    //     }
    // }, []);

    useEffect(() => {
        // suscripcionNotificaciones();
        async function validarToken(token: string | undefined) {
            if (token) {
                try {
                    const response = await verifyToken(token);
                    if (response.payload) {
                        const userData: Usuario = response.payload as unknown as Usuario;
                        userData.token = token;
                        setUser(userData);
                        // console.log('Usuario:', userData);
                        Cookies.set('user', JSON.stringify(userData));
                    } else {
                        router.push('/admin');
                    }
                } catch (error) {
                    console.error('Error verifying token:', error);
                    router.push('/admin');
                }
            } else {
                router.push('/admin');
            }
        }
        validarToken(token);
    }, [token, router]);

    async function handleCerrarSesion() {
        if (confirm('¿Estás seguro de cerrar sesión?')) {
            if (user && user.token) {
                console.log('cerrando sesión');
                const response = await cerrarSesion(user.token);
                console.log('response:', response);
                if (response && response.status) {
                    Cookies.remove('token');
                    router.push('/admin');
                }
            }
        }
    }

    const links = [
        { href: '/admin/dashboard', label: 'Dashboard' },
    ];

    if (user && user.rol == 'admin') {
        links.push(
            { href: '/admin/IA', label: 'IA' },
            { href: '/admin/clientes', label: 'Clientes' },
            { href: '/admin/configurar', label: 'Configurar' },
        );
    }

    return (
        <div className='flex flex-col md:flex-row justify-between items-center px-5 py-2 border-b border-zinc-800'>
            <div className='flex justify-between w-full md:w-auto'>
                <div className='flex text-lg text-zinc-300 font-FunnelSans-Regular'>
                    <Image className='mr-2' src='https://sfsjdyuwttrcgchbsxim.supabase.co/storage/v1/object/public/ProMedia//favicon_fullcolor.svg' width={15} height={15} alt='Logo' />
                    ProMedia {user && <span className='text-zinc-600 ml-2'>{user.username}</span>}
                </div>
                <button className='md:hidden' onClick={() => setMenuOpen(!menuOpen)}>
                    <svg className='w-6 h-6 text-zinc-300' fill='none' stroke='currentColor' viewBox='0 0 24 24' xmlns='http://www.w3.org/2000/svg'>
                        <path strokeLinecap='round' strokeLinejoin='round' strokeWidth='2' d='M4 6h16M4 12h16m-7 6h7'></path>
                    </svg>
                </button>
            </div>
            {/* notificaciones */}
            <div className={`flex-col md:flex-row md:flex ${menuOpen ? 'flex' : 'hidden'} gap-5 justify-center items-center w-full md:w-auto md:py-0 py-5 md:items-center`}>
                <div className='flex items-center gap-2'>
                    <Bell size={16} />
                </div>

                {user && (
                    links.map((link) => (
                        <Link key={link.href} href={link.href}>
                            <span className={`text-gray-500 ${pathname && pathname.includes(link.href) ? 'font-bold text-white' : ''}`}>
                                {link.label}
                            </span>
                        </Link>
                    ))
                )}
                <button
                    className='border border-zinc-600 rounded-md text-sm leading-3 px-3 py-2'
                    onClick={handleCerrarSesion}
                >
                    Cerrar sesión
                </button>
            </div>
        </div>
    );
}

export default Navbar;