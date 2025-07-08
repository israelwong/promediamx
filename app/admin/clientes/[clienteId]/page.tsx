
import React from 'react'
import { Metadata } from 'next'
import ClienteEditarForm from './components/ClienteEditarForm'
import ClienteNegocios from './components/ClienteNegocios'
// import ClienteFacturacion from './components/ClienteFacturacion'

export const metadata: Metadata = {
    title: 'Editar cliente',
    description: 'Editar cliente',
}

export default async function page({ params }: { params: Promise<{ clienteId: string }> }) {
    const { clienteId } = await params

    console.log('Cliente ID:', clienteId)
    return (
        <div className='flex flex-col gap-4'>
            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 lg:col-span-1">
                    <ClienteEditarForm clienteId={clienteId} />
                </div>
                <div className="col-span-2 lg:col-span-2">
                    <ClienteNegocios clienteId={clienteId} />
                </div>
                {/* <div className="col-span-1 lg:col-span-1">
                    <ClienteFacturacion clienteId={clienteId} />
                </div> */}
            </div>
        </div>
    )
}
