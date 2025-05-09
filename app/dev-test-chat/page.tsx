// --- NUEVO ARCHIVO: @/app/dev-test-chat/page.tsx ---
import React from 'react';
import ChatTestPanel from './components/ChatTestPanel';

import { Metadata } from 'next';

export const metadata: Metadata = {
    title: 'Panel de Pruebas de Chat',
    description: 'Simulador para enviar mensajes como usuario final a una conversación existente.',
};

export default function DevTestChatPage() {
    return (
        <div className="min-h-screen bg-zinc-900 text-zinc-100 p-4 md:p-8 flex flex-col items-center overflow-hidden">
            <div className="w-full max-w-2xl bg-zinc-800 p-6 rounded-lg shadow-xl border border-zinc-700">
                <header className="mb-6 text-center">
                    <h1 className="text-2xl font-semibold text-white">Panel de Pruebas de Chat</h1>
                    <p className="text-sm text-zinc-400">
                        Simulador para enviar mensajes como usuario final a una conversación existente.
                    </p>
                </header>
                <ChatTestPanel />
                <footer className="mt-8 text-center text-xs text-zinc-500">
                    <p>Este panel es solo para fines de desarrollo y pruebas.</p>
                    <p>Asegúrate de tener IDs de conversación válidos de tu base de datos.</p>
                </footer>
            </div>
        </div>
    );
}