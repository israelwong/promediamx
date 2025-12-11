
// Ruta: app/components/chat/rich_elements/ActionPromptComponent.tsx
'use client';

import React from 'react';
import { Button } from '@/app/components/ui/button'; // Asumiendo tu componente Button
import type { ActionPromptPayloadData, ActionButtonPayload } from '@/app/admin/_lib/ui-payloads.types'; // Ajusta la ruta

// Interfaz para las props del componente
interface ActionPromptComponentProps {
    data: ActionPromptPayloadData;
    // Necesitarás una forma de que este componente comunique la acción al panel de chat padre
    // para que pueda enviar un nuevo mensaje/intención al backend.
    onActionTrigger: (action: ActionButtonPayload) => void;
}

const ActionPromptComponent: React.FC<ActionPromptComponentProps> = ({ data, onActionTrigger }) => {
    if (!data || !data.actions || data.actions.length === 0) {
        return null; // No renderizar nada si no hay acciones
    }

    const handleButtonClick = (action: ActionButtonPayload) => {
        onActionTrigger(action);
    };

    return (
        <div className="action-prompt-component my-2 text-sm">
            {data.message && <p className="mb-2 text-zinc-100">{data.message}</p>}
            <div className="flex flex-col sm:flex-row gap-2 items-stretch"> {/* flex-wrap para que los botones se ajusten */}
                {data.actions.map((action, index) => (
                    <Button
                        key={index}
                        onClick={() => handleButtonClick(action)}
                        variant={action.style === 'primary' ? 'default' :
                            action.style === 'destructive' ? 'destructive' :
                                action.style === 'outline' ? 'outline' : 'secondary'}
                        size="sm" // O el tamaño que prefieras
                        className="w-full sm:w-auto justify-center" // Ajustar ancho
                    >
                        {action.label}
                    </Button>
                ))}
            </div>
        </div>
    );
};

export default React.memo(ActionPromptComponent);
