import React from 'react'
import { Metadata } from 'next';
import FichaCliente from './components/FichaCliente';

export const metadata: Metadata = {
    title: 'LinkPage',
}

async function page({ params }: { params: Promise<{ nombreCliente: string }> }) {
    const { nombreCliente } = await params;
    return <FichaCliente nombreCliente={nombreCliente} />
}

export default page
