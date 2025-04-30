import React from 'react'
import PromocionNuevaForm from '../components/PromocionNuevaForm'
import { Metadata } from "next";

export const metadata: Metadata = {
    title: "Crear Nueva Promoción",
    description: "Formulario para crear una nueva promoción para un negocio específico.",
};

interface Props {
    negocioId: string;
}

export default function page({ params }: { params: Props }) {
    const negocioId = params.negocioId; // ¡Aquí está el ID!
    return <PromocionNuevaForm negocioId={negocioId} />
}
