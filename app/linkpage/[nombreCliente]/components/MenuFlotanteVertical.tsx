import React from 'react';
import { Phone, Share2, MessageCircle } from 'lucide-react';

const MenuFlotanteVertical: React.FC = () => {
    return (
        <div className="fixed top-1/2 right-4 transform -translate-y-1/2 flex flex-col space-y-2 z-50">
            <a
                href="https://wa.me/TU_NUMERO_DE_TELEFONO" // Reemplaza con tu número
                target="_blank"
                rel="noopener noreferrer"
                className="
                bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-md
                border border-green-400
                "
            >
                <MessageCircle size={20} />
            </a>
            <a
                href="tel:TU_NUMERO_DE_TELEFONO" // Reemplaza con tu número
                className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-md border border-blue-400"
            >
                <Phone size={20} />
            </a>
            <button className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-md border border-gray-400">
                <Share2 size={20} />
            </button>
        </div>
    );
};

export default MenuFlotanteVertical