// Ruta: app/admin/clientes/[clienteId]/negocios/[negocioId]/configuracion/components/manychat-config-card.tsx
import React from 'react';
import { Button } from '@/app/components/ui/button';
import { CheckCircle, XCircle, MessageCircle } from 'lucide-react';

// ✅ NOTA: Este componente es un "componente de presentación" o "componente tonto".
// Su única responsabilidad es mostrar la información que recibe a través de las props.
// No contiene lógica de estado ni de obtención de datos.
interface ManyChatConfigCardProps {
    isConfigured: boolean;
    onManageClick: () => void;
}

// ✅ NOTA: El problema que describes no está en este archivo. Este componente funciona
// correctamente. El error reside en que el componente padre no le está enviando
// un nuevo valor para `isConfigured` después de que la clave se guarda en el modal.
// La solución implica modificar los componentes padres para que gestionen y pasen el estado actualizado.
export default function ManyChatConfigCard({ isConfigured, onManageClick }: ManyChatConfigCardProps) {
    return (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg p-6 flex items-center justify-between">
            <div className="flex items-center gap-4">
                <div className="bg-blue-500/10 text-blue-400 p-3 rounded-full">
                    <MessageCircle className="h-6 w-6" />
                </div>
                <div>
                    <h3 className="font-semibold text-zinc-100">ManyChat</h3>
                    <p className="text-sm text-zinc-400">Automatiza conversaciones y flujos de mensajes.</p>
                </div>
            </div>
            <div className="flex items-center gap-4">
                {isConfigured ? (
                    <div className="flex items-center gap-2 text-sm text-green-400">
                        <CheckCircle className="h-4 w-4" />
                        <span>Conectado</span>
                    </div>
                ) : (
                    <div className="flex items-center gap-2 text-sm text-amber-400">
                        <XCircle className="h-4 w-4" />
                        <span>No conectado</span>
                    </div>
                )}
                <Button variant="outline" onClick={onManageClick}>
                    {isConfigured ? 'Gestionar' : 'Configurar'}
                </Button>
            </div>
        </div>
    );
}
