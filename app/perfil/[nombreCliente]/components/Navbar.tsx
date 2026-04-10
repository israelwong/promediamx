import React from 'react'
// import { Bell } from 'lucide-react';

interface Props {
    activeTab: string;
    setActiveTab: (tab: string) => void;
}

export default function Navbar({ activeTab, setActiveTab }: Props) {
    return (
        <nav className="border-t border-zinc-800">
            <div className="container mx-auto">
                <div className="flex items-center justify-around">
                    <div className="flex items-center justify-around">
                        <div className="items-baseline space-x-2 text-sm font-FunnelSans-Light">
                            <button onClick={() => setActiveTab('promo')} className={`text-zinc-300 hover:text-white px-3 py-2  ${activeTab === 'promo' ? 'border-t-2 border-zinc-500 text-white' : ''}`}>Promo</button>
                            <button onClick={() => setActiveTab('acerca')} className={`text-zinc-300 hover:text-white px-3 py-2  ${activeTab === 'acerca' ? 'border-t-2 border-zinc-500 text-white' : ''}`}>Acerca</button>
                            <button onClick={() => setActiveTab('catalogo')} className={`text-zinc-300 hover:text-white px-3 py-2  ${activeTab === 'catalogo' ? 'border-t-2 border-zinc-500 text-white' : ''}`}>Catálogo</button> {/* Botón "Catálogo" agregado */}
                            <button onClick={() => setActiveTab('contacto')} className={`text-zinc-300 hover:text-white px-3 py-2  ${activeTab === 'contacto' ? 'border-t-2 border-zinc-500 text-white' : ''}`}>Contacto</button>
                            {/* <button onClick={() => setActiveTab('promos')} className={`text-zinc-300 hover:text-white px-3 py-2  ${activeTab === 'promos' ? 'border-t-2 border-zinc-500 text-white' : ''}`}>
                                <Bell size={16} />
                            </button> */}
                        </div>
                    </div>
                </div>
            </div>
        </nav>
    )
}
