'use client'
import React from 'react'

export default function LayoutDashboard({ children }: Readonly<{ children: React.ReactNode }>) {
    return (
        <div className='h-screen'>
            <div className="flex flex-grow">
                <div className="flex-1  mx-auto p-5">
                    {children}
                </div>
            </div>
        </div>
    );
}