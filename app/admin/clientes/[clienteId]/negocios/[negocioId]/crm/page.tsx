// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/page.tsx
import React from 'react';
import { MessageSquareText } from 'lucide-react';
import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Panel de Conversaciones',
    description: 'Panel de Conversaciones',
}

export default function ConversationsBasePage() {
    return (
        <div className="flex flex-col items-center justify-center h-full text-center p-4 border border-zinc-700 rounded-lg border-dashed">
            <MessageSquareText size={64} className="text-zinc-500 mb-6" />
            <h2 className="text-2xl font-semibold text-zinc-100 mb-2">
                Panel de Conversaciones
            </h2>
            <p className="text-zinc-400 max-w-md">
                Selecciona una conversación de la lista de la izquierda para ver los detalles o para iniciar una nueva interacción.
            </p>
        </div>
    );
}