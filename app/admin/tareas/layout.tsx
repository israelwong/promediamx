'use client';

import React from 'react';

// Definición estándar de props para un layout en Next.js App Router
interface LayoutProps {
    children: React.ReactNode;
}

export default function LayoutDashboard({ children }: LayoutProps) {
    return (
        <div className="flex flex-1 flex-col h-full overflow-auto min-h-0">
            <main className="flex-1 flex flex-col overflow-hidden overflow-y-auto">
                {children}
            </main>
        </div>
    );
}
