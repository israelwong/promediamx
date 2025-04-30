'use client';

import React from 'react';
import Navbar from '@/app/admin/_components/Navbar'; // Navbar eliminado

// Definición estándar de props para un layout en Next.js App Router
interface LayoutProps {
    children: React.ReactNode;
}

export default function LayoutDashboard({ children }: LayoutProps) {

    return (
        <div>
            <Navbar />
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1  p-4 md:p-6 ">
                    {children}
                </main>

            </div>
        </div>
    );
}
