// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/conversaciones/[conversacionId]/components/ClientTime.tsx
'use client';

import React, { useState, useEffect, memo } from 'react';

interface ClientTimeProps {
    date: Date | string | undefined | null;
}

const ClientTime: React.FC<ClientTimeProps> = ({ date }) => {
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);

    if (!date) {
        return <>--:--</>;
    }

    let displayDate: Date;
    try {
        displayDate = new Date(date);
        if (isNaN(displayDate.getTime())) {
            // console.warn("[ClientTime] Fecha inválida recibida:", date);
            return <>--:--</>;
        }
    } catch {
        // console.error("[ClientTime] Error parseando fecha:", date, error);
        return <>--:--</>;
    }

    if (!mounted) {
        // SSR o primer render cliente antes de hidratación (formato 24h para evitar AM/PM en render inicial si hay desajuste)
        return <>{displayDate.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })}</>;
    }
    // Render del cliente después de hidratación (formato 12h AM/PM)
    return <>{displayDate.toLocaleTimeString('es-MX', { hour: 'numeric', minute: '2-digit', hour12: true })}</>;
};

export default memo(ClientTime);