import React from 'react'
import Sidebar from './_components/Sidebar'

export default function DashboardConfigurarLayout({ children }: { children: React.ReactNode }) {
    return (

        <div className='flex h-screen'>
            <div className='p-5 border-r border-r-zinc-700 w-1/6'>
                <Sidebar />
            </div>
            <div className='flex-1'>
                {children}
            </div>
        </div>
    )
}

