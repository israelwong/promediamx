'use client'
import React, { useState } from 'react'
import { Shuffle, Home, Calendar, Users, Wallet, Inbox } from 'lucide-react'
// import { supabase } from '../_lib/supabase'
import Link from 'next/link'
// import { validarPagoStripe } from '../../_lib/pago.actions'

const links = [
    { href: '/admin/dashboard', label: 'Inicio', icon: <Home size={24} />, alt: 'Inicio' },
    { href: '/admin/dashboard/promesas', label: 'Promesas', icon: <Inbox size={24} />, count: 0, alt: 'Promesas' },
    { href: '/admin/dashboard/seguimiento', label: 'Gestión', icon: <Shuffle size={24} />, count: 0, alt: 'Eventos' },
    { href: '/admin/dashboard/agenda', label: 'Agenda', icon: <Calendar size={24} />, alt: 'Agenda' },
    { href: '/admin/dashboard/contactos', label: 'Contactos', icon: <Users size={24} />, alt: 'Contactos' },
    { href: '/admin/dashboard/finanzas', label: 'Finanzas', icon: <Wallet size={24} />, alt: 'Finanzas' },
]

function DashboardSideBar() {

    const [activeLink, setActiveLink] = useState('')
    // const [seguimientoCount, setSeguimientoCount] = useState(0)
    // const [aprobadosCount, setAprobadosCount] = useState(0)
    // const [agendaCount, setAgendaCount] = useState(0)

    //! NOTIFICACIÓN SONIDO
    // const playNotificationSound = () => {
    //     try {
    //         const audio = new Audio('/notificacion.m4a'); // Ruta del sonido en la carpeta public
    //         const playPromise = audio.play();
    //         if (playPromise !== undefined) {
    //             playPromise.catch(error => {
    //                 console.log('Failed to play audio:', error);
    //             });
    //         }
    //     } catch (error) {
    //         console.error('Error playing notification sound:', error);
    //     }
    // };

    //! CONTEO DE EVENTOS
    // const fetchCounts = useCallback(async () => {

    //     const { count: seguimientoCount, error: seguimientoError } = await supabase
    //         .from('Evento')
    //         .select('id', { count: 'exact' })
    //         .in('eventoEtapaId', [
    //             'cm6498oqp0000gu1ax8qnuuu8',//nuevo
    //             'cm6498zw00001gu1a67s88y5h'//seguimiento
    //         ]).eq('status', 'active');;

    //     const { count: aprobadosCount, error: aprobadosError } = await supabase
    //         .from('Evento')
    //         .select('id', { count: 'exact' })
    //         .in('eventoEtapaId', [
    //             'cm6ecqcju0000gukqfzhu772l', // pendiente
    //             'cm6499aqs0002gu1ae4k1a7ls', // aprobado
    //             'cm64bp2ba0000guqkip3liohc', // En planeación
    //             'cm64bpdlt0001guqkujuf5jfr', // En producción
    //             'cm6499n9v0003gu1a9bj1neri', // En edición
    //             'cm649aflf0004gu1agr90z9o3', // En revisión
    //             'cm649d1380005gu1ar0xr7qev'  // Generando entregables
    //         ])
    //         .eq('status', 'active');

    //     const { count: agendaCount, error: agendaError } = await supabase
    //         .from('Agenda')
    //         .select('id', { count: 'exact' })
    //         .eq('status', 'pendiente');

    //     if (seguimientoError) console.error('Error al obtener seguimiento leads:', seguimientoError);
    //     if (aprobadosError) console.error('Error al obtener aprobados leads:', aprobadosError);
    //     if (agendaError) console.error('Error al obtener aprobados leads:', agendaError);

    //     setSeguimientoCount(seguimientoCount || 0);
    //     setAprobadosCount(aprobadosCount || 0);
    //     setAgendaCount(agendaCount || 0);
    // }, []);

    // const suscripionConteos = useCallback(() => {
    //     const subscriptionConteo = supabase
    //         .channel('realtime:Conteo')
    //         .on(
    //             'postgres_changes',
    //             { event: '*', schema: 'public', table: 'Evento' },
    //             async (payload) => {
    //                 //! enviar sonido de notificación al insertar un nuevo evento
    //                 if (payload.eventType === 'INSERT') {
    //                     playNotificationSound();
    //                 }
    //                 fetchCounts();
    //             }
    //         ).on(
    //             'postgres_changes',
    //             { event: '*', schema: 'public', table: 'Agenda' },
    //             async () => {
    //                 fetchCounts();
    //             }
    //         ).subscribe((status, err) => {
    //             if (err) {
    //                 console.error('Error en la suscripción:', err);
    //             } else {
    //                 console.log('Estado de la suscripción en conteo evento etapa:', status);
    //             }
    //         });
    //     //! Obtener los conteos iniciales
    //     fetchCounts();

    //     return () => {
    //         supabase.removeChannel(subscriptionConteo);
    //     };
    // }, [fetchCounts]);

    // const suscripcionPagos = useCallback(() => {
    //     const subscriptionPagos = supabase
    //         .channel('realtime:Pagos')
    //         .on(
    //             'postgres_changes',
    //             { event: '*', schema: 'public', table: 'Pago' },
    //             async (payload) => {
    //                 // console.log('Evento en pagos:', payload);
    //                 if (payload.eventType === 'INSERT') {
    //                     // console.log('Nuevo pago:', payload.new.id);
    //                     validarPagoStripe(payload.new.id);
    //                 }
    //                 if (payload.eventType === 'UPDATE') {
    //                     // console.log('Actualización de pago:', payload.new.id);
    //                     validarPagoStripe(payload.new.id);
    //                 }
    //             }
    //         ).subscribe((status, err) => {
    //             if (err) {
    //                 console.error('Error en la suscripción:', err);
    //             } else {
    //                 console.log('Estado de la suscripción en pagos:', status);
    //             }
    //         });

    //     return () => {
    //         supabase.removeChannel(subscriptionPagos);
    //     };
    // }, []);

    //! Función para obtener los conteos de eventos en seguimiento y aprobados
    // useEffect(() => {
    //     suscripcionPagos();
    //     suscripionConteos();
    //     fetchCounts();
    // }, [fetchCounts, suscripionConteos, suscripcionPagos]);


    return (
        <div className='h-screen flex pt-5'>
            <div className='relative flex'>
                {/* Barra lateral fija con iconos */}
                <div className='flex flex-col items-center text-white h-full p-2 space-y-10'>

                    {links.map((link) => (
                        <Link
                            key={link.href}
                            href={link.href}
                            className={`p-2 rounded ${activeLink === link.href ? 'text-white' : 'text-zinc-500'}`}
                            title={link.label}
                            onClick={() => setActiveLink(link.href)}
                        >
                            <div className='relative'>
                                {React.cloneElement(link.icon, { alt: link.alt })}
                                {/* {(link.href === '/admin/dashboard/eventos' && seguimientoCount > 0) && (
                                    <span className='absolute bottom-3 left-4 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center'>
                                        {seguimientoCount}
                                    </span>
                                )}
                                {(link.href === '/admin/dashboard/seguimiento' && aprobadosCount > 0) && (
                                    <span className='absolute bottom-3 left-4 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center'>
                                        {aprobadosCount}
                                    </span>
                                )}
                                {(link.href === '/admin/dashboard/agenda' && agendaCount > 0) && (
                                    <span className='absolute bottom-3 left-4 bg-red-500 text-white rounded-full text-xs w-5 h-5 flex items-center justify-center'>
                                        {agendaCount}
                                    </span>
                                )} */}
                            </div>
                        </Link>
                    ))}
                </div>
            </div>
        </div>
    )
}

export default DashboardSideBar