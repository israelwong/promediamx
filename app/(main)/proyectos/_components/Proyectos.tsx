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
        url_logo: 'https://eeyewyhlfquhdgplcmcn.supabase.co/storage/v1/object/public/ProMedia/logos/clientes/Elipse-Hospital.svg',
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
        nombre: 'El 