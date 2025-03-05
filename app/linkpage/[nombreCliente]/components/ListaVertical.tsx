import React from 'react';
import Image from 'next/image';

interface Item {
    titulo: string;
    descripcion?: string;
    icon_type?: string;
    icon_content?: string;
}

interface Lista {
    titulo: string;
    items: Item[];
}

interface ListaVerticalProps {
    lista: Lista[];
}

const ListaVertical: React.FC<ListaVerticalProps> = ({ lista }) => {
    return (
        <div className=''>
            <div className='p-0'>
                {lista.map((listaItem, index) => (
                    <div key={index}>
                        <h2 className="text-primary-foreground text-pink-800 text-xl font-bold mb-4">{listaItem.titulo}</h2>
                        <ul className=' grid grid-cols-1 gap-1'>
                            {listaItem.items.map((item, idx) => (
                                <li key={idx} className="mb-4 bg-purple-400 p-3 rounded-md">
                                    {item.icon_content && (
                                        <Image width={200} height={200} src={item.icon_content} alt={item.titulo} className="w-12 h-12 mr-4" />
                                    )}
                                    <div>
                                        <h3 className="text-md font-semibold text-foreground">{item.titulo}</h3>
                                        {item.descripcion && <p className='text-sm text-foreground'>{item.descripcion}</p>}
                                    </div>
                                </li>
                            ))}
                        </ul>
                    </div>
                ))}
            </div>

        </div>
    );
};

export default ListaVertical;