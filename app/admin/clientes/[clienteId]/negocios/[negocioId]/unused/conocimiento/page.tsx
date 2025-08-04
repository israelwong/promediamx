// app/admin/clientes/[clienteId]/negocios/[negocioId]/editar/page.tsx
import { Metadata } from 'next'
export const metadata: Metadata = {
    title: 'Conocimiento del Negocio',
}

import { getConocimientoItemsByNegocio, getPreguntasSinRespuestaGeneral } from '@/app/admin/_lib/actions/conocimiento/conocimiento.actions';
import ConocimientoLista from './components/ConocimientoLista';
import { LibraryBig, AlertTriangle } from 'lucide-react';

interface Props {
    clienteId: string;
    negocioId: string;
}

export default async function ConocimientoPage({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId } = await params

    // --- CARGAMOS AMBOS SETS DE DATOS EN PARALELO ---
    const [conocimientoResult, preguntasResult] = await Promise.all([
        getConocimientoItemsByNegocio(negocioId),
        getPreguntasSinRespuestaGeneral(negocioId)
    ]);

    // Verificamos si la carga principal de conocimiento falló para mostrar un error.
    if (!conocimientoResult.success) {
        return (
            <div className="p-10 text-center text-red-400 bg-red-900/20 border border-red-600/40 rounded-lg">
                <AlertTriangle className="mx-auto h-10 w-10 mb-3 text-red-500" />
                <p className="font-semibold text-lg">Error al Cargar</p>
                <p>{conocimientoResult.error}</p>
            </div>
        );
    }
    return (
        <div className="space-y-6">
            <header className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-100 tracking-tight flex items-center gap-3">
                        <LibraryBig size={24} />
                        Base de Conocimiento
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Gestiona la información que tu asistente utilizará para responder preguntas.
                    </p>
                </div>
            </header>

            {conocimientoResult.success ? (
                <ConocimientoLista
                    initialItems={conocimientoResult.data || []}
                    // Pasamos las preguntas pendientes como una nueva prop
                    preguntasPendientes={preguntasResult.success ? preguntasResult.data ?? [] : []}
                    clienteId={clienteId}
                    negocioId={negocioId}
                />
            ) : (
                <div className="p-10 text-center text-red-400 bg-red-900/20 border border-red-600/40 rounded-lg">
                    <AlertTriangle className="mx-auto h-10 w-10 mb-3 text-red-500" />
                    <p className="font-semibold text-lg">Error al Cargar</p>
                    <p>{conocimientoResult.error}</p>
                </div>
            )}
        </div>
    );
}
