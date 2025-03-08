import React from 'react'
import { Metadata } from 'next';
import Linkpage from './components/Linkpage';

export const metadata: Metadata = {
    title: 'LinkPage',
}

async function page({ params }: { params: Promise<{ nombreCliente: string }> }) {
    const { nombreCliente } = await params;
    return <Linkpage nombreCliente={nombreCliente} />
}

export default page
