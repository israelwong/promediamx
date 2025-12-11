'use client';
import React from 'react';
import Image from 'next/image';
import ModelosContratacion from '@/app/(main)/_components/ModelosContratacion';

const proyectos = [
    {
        nombre: 'Barsa Acuática And Sport Center',
        descripcion: 'Centro multidisciplinario de natación y deportes',
        bg_color: 'bg-zinc-100',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Barsa.svg',
        etiquetas: ['Video institucional', 'Diseño gráfico', 'Fotografía', 'Presentación ejecutiva', 'Creación de contenido'],
    },
    {
        nombre: 'Aluvitec',
        descripcion: 'Distribuidora de Aluminio y Vidrio',
        bg_color: 'bg-zinc-100',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Aluvitec.svg',
        etiquetas: ['Pagina web', 'Diseño gráfico', 'Fotografía', 'Consultoría en marketing digital'],
    },
    {
        nombre: 'Colegio Ateneo Mexicano',
        descripcion: 'Colegio privado',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/ateneo/logo_sin_sombra.svg',
        bg_color: 'bg-zinc-100',
        etiquetas: ['Fotografía', 'Diseño gráfico', 'Web App'],
    },
    {
        nombre: 'Dancerías',
        descripcion: 'Academia de danza',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Dancerias.svg',
        bg_color: 'bg-zinc-100',
        etiquetas: ['Fotografía', 'Video'],
    },
    {
        nombre: 'Instituto Politécnico Nacional',
        descripcion: 'Universidad pública',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/IPN.svg',
        etiquetas: ['Video institucional', 'Fotografía', 'Diseño gráfico', 'Creación de contenido'],
    },
    {
        nombre: 'Grupo Aselac',
        descripcion: 'Distribuidora e importadora de productos de químicos',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Grupo-Aselac.svg',
        etiquetas: ['Diseño gráfico', 'Fotografía'],
    },
    {
        nombre: 'Jemiza',
        descripcion: 'Distribuidor SIEMENS',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Jemiza.svg',
        etiquetas: ['Video institucional', 'Fotografía corporativa'],
    },
    {
        nombre: 'Bricks N Fire',
        descripcion: 'Distribuidor de tenis',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/B&F.svg',
        etiquetas: ['Diseño gráfico', 'Fotografía', 'Motion graphics', 'Video'],
    },
    {
        nombre: 'Universidad Insurgentes',
        descripcion: 'Universidad privada',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/UIN.svg',
        etiquetas: ['Landing Page', 'Diseño gráfico', 'Generación de leads', 'Automatización de mensajes', 'CRM', 'Campañas publicitarias'],
    },
    {
        nombre: 'Telefónica Movistar',
        descripcion: 'Telecomunicaciones',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Movistar.svg',
        etiquetas: ['Landing Page', 'Diseño gráfico', 'Generación de leads', 'Automatización de mensajes', 'CRM', 'Campañas publicitarias'],
    },
    {
        nombre: 'Grupo Concentra',
        descripcion: 'Callcenter',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Grupo-Concentra.svg',
        etiquetas: ['Comercialización digital', 'CRM', 'Automatización de mensajes', 'Generación de leads', 'Campañas publicitarias'],
    },
    {
        nombre: 'ProSocial',
        descripcion: 'Fotografía y video',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/ProSocial.svg',
        etiquetas: ['ERP', 'Diseño gráfico', 'Fotografía', 'Video', 'Pasarela de pago'],
    },
    {
        nombre: 'Inviente Bien',
        descripcion: 'Bienes raíces',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Invierte-Bien.svg',
        etiquetas: ['ERP', 'Diseño gráfico', 'Fotografía', 'Video', 'Campañas publicitarias', 'Generación de leads'],
    },
    {
        nombre: 'Angkor Gym',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Angkor.svg',
        etiquetas: ['Landing page', 'Diseño gráfico', 'Fotografía', 'Video'],
    },
    {
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/AquaMarvic.svg',
        bg_color: 'bg-zinc-100',
        nombre: 'Aqua Marvic',
        etiquetas: ['Diseño gráfico', 'Fotografía', 'Video'],
    },
    {
        nombre: 'Finca Doña Eulália',
        descripcion: 'Restaurante y eventos',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Finca-Dona-Eulalia.svg',
        etiquetas: ['Diseño gráfico', 'Fotografía', 'Video'],
    },
    {
        nombre: 'DaVivir Inmobiliaria',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/DaVivir.svg',
        etiquetas: ['Diseño gráfico', 'Video'],
    },
    {
        nombre: 'Quantum',
        descripcion: 'Venta y servitio de elevadores',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Qantum.svg',
        etiquetas: ['Video corporativo']
    },
    {
        nombre: 'Ranccho El Carmen',
        descripcion: 'Venta de Lacteos',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Rancho-El-Carmen.svg',
        etiquetas: ['Video corporativo', 'Fotografía', 'Diseño gráfico', 'Pagina web'],
    },
    {
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/BTL.svg',
        nombre: 'BTL Group México',
        descripcion: 'Equpo médico',
        etiquetas: ['Video corporativo'],
    },
    {
        nombre: 'Gobierno del Estado de México',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/EdoMex.svg',
        descripcion: 'Secretaría de Desarrollo Agropecuario',
        etiquetas: ['Cobertura de eventos', 'Fotografía', 'Video'],
    },
    {
        nombre: 'Elipse Hospital',
        descripcion: 'Hospital de especialidades',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Elopse-Hospotal.svg',
        etiquetas: ['Diseño gráfico', 'Landig page', 'Generación de leads', 'Campañas publicitarias', 'Automatización de mensajes'],
    },
    {
        nombre: 'Jemiza',
        descripcion: 'Distribuidor autorizado SIEMENS',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Jemiza.svg',
        etiquetas: ['Video corporativo'],
    },
    {
        nombre: 'Municipio de Tecámac',
        descripcion: 'Gobierno municipal',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Tecamac.svg',
        etiquetas: ['Cobertura de eventos', 'Video'],
    },
    {
        nombre: 'Odapas Tecámac',
        descripcion: 'Organismo de Agua Potable y Alcantarillado',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Odapas.svg',
        etiquetas: ['Video institucional', 'Pagina web'],
    },
    {
        nombre: 'DIF Tecámac',
        descripcion: 'Desarrollo Integral de la Familia',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/DIF-EdoMex.svg',
        etiquetas: ['Video', 'Fotografía'],
    },
    {
        nombre: 'El Universal',
        descripcion: 'Periódico',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/el-universal.svg',
        etiquetas: ['Landing page', 'Video promocional'],
    },
    {
        nombre: 'La Antigua',
        descripcion: 'Restaurante',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/LaAntigua.svg',
        etiquetas: ['Fotografía', 'Video', 'Diseño gráfico'],
    },
    {
        nombre: 'MKT Solutions',
        descripcion: 'Agencia de marketing',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/MKT-Solutions.svg',
        etiquetas: ['Fotografía', 'Video'],
    },

    {
        nombre: 'Andalucia Jardín',
        bg_color: 'bg-zinc-100',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Andalucia.svg',
        etiquetas: ['Landing page', 'Fotografía', 'Video'],
    },
    {
        nombre: 'TGH',
        descripcion: 'Renta de transporte',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/TGH.svg',
        etiquetas: ['Video corporativo'],
    },
    {
        nombre: 'Lilibeth',
        descripcion: 'Academia de danza',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Lilibeth-escuela.svg',
        etiquetas: ['Fotografía', 'Video'],
    },
    {
        nombre: 'Polenta',
        descripcion: 'Restaurante',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Polenta.svg',
        etiquetas: ['Fotografía', 'Video'],
    },
    {
        nombre: 'Orpoprint',
        descripcion: 'Impresiones y publicidad',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Orpoprint.svg',
        etiquetas: ['Pagina web', 'Fotografía', 'Video'],
    },
    {
        nombre: 'Ostore',
        descripcion: 'Restaurante',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Ostore.svg',
        etiquetas: ['Fotografía', 'Video'],
    },
    {
        nombre: 'Marsalla',
        descripcion: 'Jardín de eventos',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Marsala.svg',
        etiquetas: ['Fotografía', 'Video'],
    },
    {
        nombre: 'Cesars Gym Strength System',
        descripcion: 'venta de equipo de gimnasio',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Cesars-Gym-Strength.svg',
        etiquetas: ['Pagina web', 'Diseño gráfico', 'Fotografía'],
    },
    {
        nombre: 'Cayro Industrial',
        descripcion: 'Servicio de lipieza y mantenimiento',
        bg_color: '',
        url_logo: '',
        etiquetas: ['Pagina web'],
    },
    {
        nombre: 'Verticca',
        descripcion: 'Hotel boutique',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Verticca.svg',
        etiquetas: ['Fotografía', 'Video'],
    },
    {
        nombre: 'Ferretip',
        descripcion: 'Ferretería y Tlapalería',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Ferretip.svg',
        etiquetas: ['Fotografía', 'Video'],
    },
    {
        nombre: 'RH Consultoría',
        descripcion: 'Agencia de reclutamiento y selección de personal',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/RH-Consultoria.svg',
        etiquetas: ['Pagina web', 'Video promocional'],
    },
    {
        nombre: 'Chic',
        descripcion: 'Alasiado para cabello',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/CHIC.svg',
        etiquetas: ['Landing page', 'Diseño gráfico']
    },
    {
        nombre: 'Ely Studio',
        descripcion: 'Estudio de diseño de uñas',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Dely-Estudio.svg',
        etiquetas: ['Diseño gráfico'],
    },
    {
        nombre: 'Tania Sandoval',
        descripcion: 'Cursos de uñas',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Tania-Sandoval.svg',
        etiquetas: ['Landing page', 'Diseño gráfico', 'Fotografía', 'Video', 'Campañas publicitarias', 'Generación de leads'],
    },
    {
        nombre: 'CAVM',
        descripcion: 'Concretos y Asfaltos de Valle de México',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/CAVM.svg',
        etiquetas: ['Video corporativo'],
    },
    {
        nombre: 'CTC Sindicato',
        descripcion: 'Sección 148',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/CCT-Plantilla-3.svg',
        etiquetas: ['Landing page', 'Diseño gráfico', 'Fotografía', 'Video', 'Envio de mensajes masivos'],
    },
    {
        nombre: 'Universidad ITEC',
        descripcion: 'Instituto Tecnológico de Estudios de Computación',
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/ITEC.svg',
        etiquetas: ['Pagina web', 'Diseño gráfico', 'Fotografía', 'Video', 'Campañas publicitarias', 'Generación de leads', 'Email marketing', 'SMS masivos', 'CRM'],
    },
    {
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Dar-Comunicaciones.svg',
        bg_color: '',
        nombre: 'Dar Comunicaciones',
        descripcion: 'Comercializadora movil',
        etiquetas: ['Fotografía', 'Diseño gráfico'],
    },
    {
        nombre: 'Fogo Do Sol Restaurante',
        descripcion: 'Restaurante de carnes',
        etiquetas: ['Fotografía', 'Diseno gráfico', 'Impresión gran formato'],
    },
    {
        nombre: 'Cantina Don Pancho',
        descripcion: 'Restaurante y bar',
        etiquetas: ['Fotografía', 'Video'],
    },
    {
        nombre: 'Finca Don Luis Queretaro',
        descripcion: 'Jardín de eventos',
        etiquetas: ['Fotografía', 'Video'],
        url_logo: '',
    },
    {
        nombre: 'Home Total',
        descripcion: 'Venta de muebles y decoración',
        etiquetas: ['Pagina web', 'Fotografía'],
    },
    {
        nombre: 'Urbemuebles',
        descripcion: 'Venta de muebles y decoración',
        etiquetas: ['Pagina web', 'Fotografía'],
    },

];


export default function ListaProyectos() {
    const [currentPage, setCurrentPage] = React.useState(0);
    const [showAll, setShowAll] = React.useState(false);
    const itemsPerPage = 4;

    const displayedProjects = showAll ? proyectos : proyectos.slice(currentPage * itemsPerPage, (currentPage + 1) * itemsPerPage);

    return (
        <div className='max-w-screen-xl mx-auto p-5'>
            <div className=''>
                <div>
                    <header className='mb-5'>
                        <h1 className='font-FunnelSans-Bold text-3xl text-zinc-200 mb-2'>
                            Proyectos realizados
                        </h1>
                        <p className='font-FunnelSans-Regular text-zinc-400'>
                            Te presentamos algunos de los proyectos que hemos realizado y los servcios que hemos prestado.
                        </p>
                    </header>
                </div>

                <div className='grid grid-cols-1 md:grid-cols-3 lg:grid-cols-3 gap-5'>

                    <div className='md:col-span-2 col-span-1 mb-10'>
                        {displayedProjects.map((proyecto, index) => (
                            <div key={index} className='font-FunnelSans-Regular mb-3 px-5 py-3 border border-zinc-800 bg-zinc-900/50 rounded-md'>
                                <div className='flex items-center pr-4 mb-3'>
                                    {proyecto.url_logo && (
                                        <div className={`w-12 h-12 rounded-full overflow-hidden mr-4 flex-shrink-0 flex items-center justify-center border border-zinc-800 p-1 ${proyecto.bg_color || 'bg-zinc-900'}`}>
                                            <Image src={proyecto.url_logo} alt={proyecto.nombre} width={64} height={64} />
                                        </div>
                                    )}
                                    <div>
                                        <h2 className='font-FunnelSans-Bold text-lg flex-grow'>{proyecto.nombre}</h2>
                                        <p className='text-sm text-zinc-400 font-FunnelSans-Light'>{proyecto.descripcion}</p>
                                    </div>
                                </div>
                                <ul>
                                    {proyecto.etiquetas.map((tarea, idx) => (
                                        <li key={idx} className='inline-block bg-zinc-900 border border-zinc-800 rounded-full px-2 py-1 text-xs text-zinc-400 mr-2 mb-2'>
                                            {tarea}
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                        {!showAll && (
                            <div className='flex justify-between mt-5 space-x-3 mb-2 text-sm'>
                                {currentPage > 0 && (
                                    <button
                                        className='flex-1 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-md'
                                        onClick={() => setCurrentPage(currentPage - 1)}
                                    >
                                        Anterior
                                    </button>
                                )}
                                {(currentPage + 1) * itemsPerPage < proyectos.length && (
                                    <button
                                        className='flex-1 px-4 py-2 bg-zinc-800 text-zinc-400 rounded-md'
                                        onClick={() => setCurrentPage(currentPage + 1)}
                                    >
                                        Siguiente
                                    </button>
                                )}

                                <button
                                    className='px-4 py-2 bg-zinc-900 border border-zinc-800 text-zinc-400 rounded-md '
                                    onClick={() => setShowAll(!showAll)}
                                >
                                    {showAll ? 'Mostrar menos' : 'Mostrar todos'}
                                </button>

                            </div>
                        )}
                        <div className='mt-1 text-zinc-400 text-xs text-center font-FunnelSans-Light'>
                            Mostrando del {currentPage * itemsPerPage + 1} al {Math.min((currentPage + 1) * itemsPerPage, proyectos.length)} de {proyectos.length} proyectos en total
                        </div>
                        <div className='flex justify-center mt-5'>

                        </div>
                    </div>

                    <div className='md:col-span-1 col-span-1'>
                        <ModelosContratacion />
                    </div>
                </div>
            </div>
        </div>
    );
}