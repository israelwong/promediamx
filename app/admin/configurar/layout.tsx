'use client'
import React from 'react'
import Navbar from '@/app/admin/_components/Navbar'

export default function LayoutDashboard({ children }: Readonly<{ children: React.ReactNode }>) {


    return (
        <div className='h-screen'>
            <Navbar />
            <div className="flex flex-grow">
                <div className="flex-1 border-l border-l-zinc-800 mx-auto p-5">
                    {children}
                </div>
            </div>
        </div>
    );
}