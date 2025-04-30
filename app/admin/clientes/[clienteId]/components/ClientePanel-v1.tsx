'use client'
import React from 'react'

import ClienteEditarForm from './ClienteEditarForm'
import AdministradorDeNegocios from './ClienteNegocios'
import ClienteFacturacion from './ClienteFacturacion'

interface Props {
    clienteId: string
}

export default function ClientePanel({ clienteId }: Props) {

    return (
        <div className='flex flex-col gap-4'>
            <div className="grid grid-cols-4 gap-4">
                <div className="col-span-1 lg:col-span-1">
                    <ClienteEditarForm clienteId={clienteId} />
                </div>
                <div className="col-span-2 lg:col-span-1">
                    <AdministradorDeNegocios clienteId={clienteId} />
                </div>
                <div className="col-span-1 lg:col-span-1">
                    <ClienteFacturacion clienteId={clienteId} />
                </div>
            </div>
        </div>
    )
}
