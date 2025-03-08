'use client';
import React from 'react';
import { Phone, MessageCircle, Mail } from 'lucide-react';
import Link from 'next/link';

interface Props {
    telefono: string;
    leadFormUrl: string;
    mensajeWhatsapp: string;
}

export default function MenuFlotanteVertical({ telefono, mensajeWhatsapp, leadFormUrl }: Props) {
    return (
        <div className="fixed top-1/2 right-4 transform -translate-y-1/2 flex flex-col space-y-2 z-50">
            <a
                href={`https://wa.me/${telefono}?text=${encodeURIComponent(mensajeWhatsapp)}`} // Use environment variable
                target="_blank"
                rel="noopener noreferrer"
                className="bg-green-500 hover:bg-green-600 text-white p-3 rounded-full shadow-md border border-green-400"
            >
                <MessageCircle size={20} />
            </a>
            <a
                href={`tel:${telefono}`} // Use environment variable
                className="bg-blue-500 hover:bg-blue-600 text-white p-3 rounded-full shadow-md border border-blue-400"
            >
                <Phone size={20} />
            </a>
            <Link className="bg-gray-500 hover:bg-gray-600 text-white p-3 rounded-full shadow-md border border-gray-400"
                href={leadFormUrl}
            >
                <Mail size={20} />
            </Link>
        </div>
    );
}


