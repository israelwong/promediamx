'use client'
import React, { useEffect, useState } from 'react'
import { obtenerCliente } from '@/app/admin/_lib/cliente.actions'
import { Cliente } from '@/app/admin/_lib/types'
import { obtenerAsistentesVirtuales } from '@/app/admin/_lib/asistenteVirtuai.actions'
import { useRouter } from 'next/navigation'
import { AsistenteVirtual } from '@prisma/client'

interface Props {
    clienteId: string
}

export default function ClientePanel({ clienteId }: Props) {

    const [cliente, setCliente] = useState<Cliente | null>(null)
    const [contratoId, setContratoId] = useState<string | null>(null)
    const [contratoStatus, setContratoStatus] = useState<string | null>(null)
    const [contratoFechaInicio, setContratoFechaInicio] = useState<string | null>(null)
    const [contratoFechaFin, setContratoFechaFin] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    const [asistentes, setAsistentes] = useState<AsistenteVirtual[]>([])
    const [asistentesLoading, setAsistentesLoading] = useState(true)
    const [negocioId, setNegocioId] = useState<string | null>(null)
    const [negocioNombre, setNegocioNombre] = useState<string | null>(null)
    const [negocioLogo, setNegocioLogo] = useState<string | null>(null)
    const [negocioStatus, setNegocioStatus] = useState<string | null>(null)

    // const [negocio, setNegocio] = useState(null)

    const router = useRouter()

    useEffect(() => {
        const fetchCliente = async () => {
            try {
                const clienteData = await obtenerCliente(clienteId)
                if (!clienteData) {
                    setError('Cliente no encontrado')
                    return
                }
                if (clienteData.contrato) {
                    setContratoId(clienteData.contrato[0]?.id || null)
                    setContratoStatus(clienteData.contrato[0]?.status || null)
                    setContratoFechaInicio(clienteData.contrato[0]?.fechaInicio?.toISOString() || null)
                    setContratoFechaFin(clienteData.contrato[0]?.fechaFin?.toISOString() || null)

                    const asistentesData = await obtenerAsistentesVirtuales(clienteData.contrato[0]?.id)
                    setAsistentes(asistentesData)
                    setAsistentesLoading(false)

                    setNegocioId(clienteData.Negocio[0]?.id || null)
                    setNegocioNombre(clienteData.Negocio[0]?.nombre || null)
                    setNegocioLogo(clienteData.Negocio[0]?.logo || null)
                    setNegocioStatus(clienteData.Negocio[0]?.status || null)

                } else {
                    setError('No se encontró contrato asociado al cliente')
                }
                setCliente(clienteData)
                console.log(clienteData)
            } catch {
                setError(`Error al obtener el cliente}`)
            } finally {
                setLoading(false)
            }
        }
        fetchCliente()
    }, [clienteId])
    if (loading) {
        return <div>Cargando...</div>
    }

    return (
        <div>
            <div className="grid grid-cols-4 gap-4">

                <div className='space-y-4 col-span-1'>

                    <div className="p-5 bg-zinc-900 rounded-lg border border-zinc-700">
                        <h1 className="text-2xl font-bold">Detalles del Cliente</h1>
                        <p>
                            Cliente Panel | ID: {clienteId}
                        </p>
                        {error && <p style={{ color: 'red' }}>{error}</p>}
                        {cliente && (
                            <div>
                                <h2>{cliente.nombre}</h2>
                                <p>{cliente.email}</p>
                                <p>{cliente.telefono}</p>
                                {/* Agrega más campos según sea necesario */}
                            </div>
                        )}
                        {!cliente && <p>No se encontró el cliente</p>}
                    </div>

                    <div className="p-5 bg-zinc-900 rounded-lg border border-zinc-700">
                        <h1 className="text-2xl font-bold">Detalles del contrato</h1>
                        {contratoId ? (
                            <div>
                                <p>Contrato ID: {contratoId}</p>
                                <p>Estado: {contratoStatus}</p>
                                <p>Fecha de inicio: {contratoFechaInicio}</p>
                                <p>Fecha de fin: {contratoFechaFin}</p>

                            </div>
                        ) : (
                            <p>No se encontró contrato asociado al cliente</p>
                        )}
                    </div>

                    <div className="p-5 bg-zinc-900 rounded-lg border border-zinc-700">
                        Listar asistentes virtuales
                        <h1 className="text-2xl font-bold">Asistentes virtuales</h1>
                        {asistentesLoading ? (
                            <p>Cargando asistentes virtuales...</p>
                        ) : (
                            <div>
                                {asistentes.length > 0 ? (
                                    asistentes.map((asistente) => (
                                        <div key={asistente.id}>
                                            <p>Asistente ID: {asistente.id}</p>
                                            <p>Nombre: {asistente.nombre}</p>
                                            <p>Estatus: {asistente.status}</p>
                                            <button
                                                onClick={() => {
                                                    router.push(`/admin/asistente-virtual/${asistente.id}`)
                                                }
                                                }
                                                className="bg-blue-500 text-white px-4 py-2 rounded"
                                            >
                                                Editar
                                            </button>
                                        </div>
                                    ))
                                ) : (
                                    <p>No se encontraron asistentes virtuales</p>
                                )}
                            </div>
                        )}
                    </div>
                </div>

                <div className='col-span-3'>
                    <h1>Detalles del negocio</h1>
                    <div className="p-5 bg-zinc-900 rounded-lg border border-zinc-700">
                        {negocioId ? (
                            <div>
                                <p>Negocio ID: {negocioId}</p>
                                <p>Nombre: {negocioNombre}</p>
                                <p>Logo: {negocioLogo}</p>
                                <p>Estatus: {negocioStatus}</p>
                            </div>
                        ) : (
                            <p>No se encontró negocio asociado al cliente</p>
                        )}
                        <button
                            onClick={() => {
                                router.push(`/admin/negocios/${negocioId}`)
                            }
                            }
                            className="bg-blue-500 text-white px-4 py-2 rounded"
                        >
                            Editar negocio
                        </button>
                    </div>
                </div>

            </div>

        </div>
    )
}
