// Ruta: app/admin/clientes/layout.tsx
import React from 'react';

export default function LayoutClientes({ children }: Readonly<{ children: React.ReactNode }>) {
    // CORRECCIÓN DEFINITIVA:
    // Este layout debe usar h-full para tomar la altura de su padre (el <main> de AdminLayout),
    // NO h-screen. Esto es crucial para que la cadena de alturas no se rompa.
    return (
        <div className='h-full'>
            {children}
        </div>
    );
}