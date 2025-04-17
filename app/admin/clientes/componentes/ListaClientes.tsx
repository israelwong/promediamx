'use client'
import React from 'react'
import { useEffect, useState } from 'react'
import { obtenerClientes } from '@/app/admin/_lib/cliente.actions'
import { Cliente } from '@/app/admin/_lib/types'

import Link from 'next/link'

export default function ListaClientes() {
    const [clientes, setClientes] = useState<Cliente[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<Error | null>(null)

    useEffect(() => {
        const fetchClientes = async () => {
            setLoading(true)
            try {
                const response = await obtenerClientes()
                setClientes(response)
            } catch (error) {
                setError(error instanceof Error ? error : new Error(String(error)))
            } finally {
                setLoading(false)
            }
        }
        fetchClientes()
    }, [])

    if (loading) {
        return <div role="status">Cargando...</div>
    }
    if (error) {
        return (
            <div role="alert">
                Error: {error.message}
                <button onClick={() => window.location.reload()}>Reintentar</button>
            </div>
        )
    }
    if (clientes.length === 0) {
        return <div>No hay clientes</div>
    }

    return (
        <div>
            <h1>Listado de clientes</h1>
            <ul>
                {clientes.map((cliente) => (
                    <li key={cliente.id}>
                        <Link href={`/admin/clientes/cliente/${cliente.id}`}>
                            {cliente.nombre}
                        </Link>
                    </li>
                ))}
            </ul>
        </div>
    )
}
