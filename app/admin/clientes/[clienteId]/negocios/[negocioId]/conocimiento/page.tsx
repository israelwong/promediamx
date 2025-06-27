// app/admin/clientes/[clienteId]/negocios/[negocioId]/editar/page.tsx
import { Metadata } from 'next'
export const metadata: Metadata = {
    title: 'Conocimiento del Negocio',
}

import { getConocimientoItemsByNegocio } from '@/app/admin/_lib/actions/conocimiento/conocimiento.actions';
import ConocimientoLista from './components/ConocimientoLista';
import { LibraryBig, AlertTriangle } from 'lucide-react';

interface Props {

    clienteId: string;
    negocioId: string;
}

export default async function ConocimientoPage({ params }: { params: Promise<Props> }) {
    const { negocioId, clienteId } = await params

    // Obtenemos los ítems de conocimiento usando la Server Action
    const result = await getConocimientoItemsByNegocio(negocioId);

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

            {result.success ? (
                <ConocimientoLista
                    initialItems={result.data || []}
                    clienteId={clienteId}
                    negocioId={negocioId}
                />
            ) : (
                <div className="p-10 text-center text-red-400 bg-red-900/20 border border-red-600/40 rounded-lg">
                    <AlertTriangle className="mx-auto h-10 w-10 mb-3 text-red-500" />
                    <p className="font-semibold text-lg">Error al Cargar</p>
                    <p>{result.error}</p>
                </div>
            )}
        </div>
    );
}
