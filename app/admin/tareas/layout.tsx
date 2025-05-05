'use client';

import React from 'react';

// Definición estándar de props para un layout en Next.js App Router
interface LayoutProps {
    children: React.ReactNode;
}

export default function LayoutDashboard({ children }: LayoutProps) {
    return (
        <div>
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1 ">
                    {children}
                </main>

            </div>
        </div>
    );
}
