'use client'
import React, { useState } from 'react'
import { Image as ImageIcon, Video as VideoIcon } from 'lucide-react';
import ItemGaleria from './ItemGaleria';
import ItemVideo from './ItemVideo';

interface TabButtonProps {
    active: boolean;
    onClick: () => void;
    children: React.ReactNode;
    icon?: React.ReactNode;
}

const TabButton: React.FC<TabButtonProps> = ({ active, onClick, children, icon }) => (
    <button
        type="button"
        onClick={onClick}
        role="tab"
        aria-selected={active}
        className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 focus:outline-none transition-all duration-150 ease-in-out
      ${active
                ? 'border-blue-500 text-blue-400 bg-zinc-800'
                : 'border-transparent text-zinc-400 hover:text-zinc-100 hover:border-zinc-500'
            }`}
    >
        {icon}
        {children}
    </button>
);

interface TabContentProps {
    active: boolean;
    children: React.ReactNode;
}
const TabContent: React.FC<TabContentProps> = ({ active, children }) => (
    active ? <div className="pt-4">{children}</div> : null
);


export default function Multimedia({
    itemId,
    catalogoId,
    negocioId,
    clienteId,
}: {
    itemId: string
    catalogoId: string
    negocioId: string
    clienteId: string
}) {
    const [activeTab, setActiveTab] = useState<'imagenes' | 'video'>('imagenes');

    return (
        <div className="bg-zinc-800 rounded-lg border border-zinc-700 shadow-md">
            <div className="border-b border-zinc-700 flex">
                <TabButton
                    active={activeTab === 'imagenes'}
                    onClick={() => setActiveTab('imagenes')}
                    icon={<ImageIcon size={16} />}
                >
                    Imágenes
                </TabButton>
                <TabButton
                    active={activeTab === 'video'}
                    onClick={() => setActiveTab('video')}
                    icon={<VideoIcon size={16} />}
                >
                    Video
                </TabButton>
            </div>
            <div className="p-0"> {/* El padding lo manejan los componentes hijos si es necesario */}
                <TabContent active={activeTab === 'imagenes'}>

                    <ItemGaleria
                        itemId={itemId}
                        catalogoId={catalogoId}
                        negocioId={negocioId}
                        clienteId={clienteId}
                    />
                </TabContent>
                <TabContent active={activeTab === 'video'}>
                    <ItemVideo
                        itemId={itemId}
                        catalogoId={catalogoId}
                        negocioId={negocioId}
                        clienteId={clienteId}
                    />
                </TabContent>
            </div>
        </div>
    );
}



