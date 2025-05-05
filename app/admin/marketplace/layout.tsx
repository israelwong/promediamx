'use client';

import React from 'react';
interface LayoutProps {
    children: React.ReactNode;
}

// Este layout asume que un layout superior ya incluye el Navbar principal
export default function LayoutDashboard({ children }: LayoutProps) {
    return (
        <div>
            <div className="flex flex-1 overflow-hidden">
                <main className="flex-1  p-4 md:p-6 ">
                    {children}
                </main>

            </div>
        </div>
    );
}
