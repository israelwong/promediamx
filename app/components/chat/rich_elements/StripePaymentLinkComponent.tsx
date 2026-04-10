// Ruta: app/components/chat/rich_elements/StripePaymentLinkComponent.tsx
'use client';

import React from 'react';
import { Button } from '@/app/components/ui/button'; // Tu componente Button
import { CreditCard } from 'lucide-react'; // Icono opcional
import type { StripePaymentLinkPayloadData } from '@/app/admin/_lib/ui-payloads.types'; // Ajusta la ruta

interface StripePaymentLinkComponentProps {
    data: StripePaymentLinkPayloadData;
}

const StripePaymentLinkComponent: React.FC<StripePaymentLinkComponentProps> = ({ data }) => {
    if (!data || !data.checkoutUrl) {
        console.error("[StripePaymentLinkComponent] Datos inválidos o URL de checkout faltante.", data);
        return <div className="text-red-400 p-2 border border-red-500 rounded text-sm">Error: Enlace de pago no disponible.</div>;
    }

    const handlePaymentClick = () => {
        // Abrir el enlace de Stripe en una nueva pestaña
        window.open(data.checkoutUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="stripe-payment-link-component my-2 text-sm">
            {data.message && <p className="mb-2 text-zinc-100">{data.message}</p>}
            <Button
                onClick={handlePaymentClick}
                variant="default" // O 'primary' si tienes esa variante
                size="lg" // Botón más grande para una acción importante
                className="w-full sm:w-auto bg-green-600 hover:bg-green-700 text-white" // Estilo distintivo para pago
            >
                <CreditCard size={18} className="mr-2" />
                {data.buttonText || 'Proceder al Pago'}
            </Button>
            <p className="text-xs text-zinc-400 mt-1 text-center sm:text-left">
                (Serás redirigido a la plataforma segura de Stripe)
            </p>
        </div>
    );
};

export default React.memo(StripePaymentLinkComponent);
