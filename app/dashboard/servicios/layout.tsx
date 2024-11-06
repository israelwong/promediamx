import React from 'react'
import Sidebar from './components/Sidebar'

export default function DashboardConfigurarLayout({ children }: { children: React.ReactNode }) {
    return (

        <div className='flex'>
            <div className='p-5 border-r border-r-zinc-700 h-screen'>
                <Sidebar />
            </div>
            <div className='p-5'>
                {children}
            </div>
        </div>
    )
}

