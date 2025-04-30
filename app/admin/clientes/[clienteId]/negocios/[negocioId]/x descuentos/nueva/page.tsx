import { Metadata } from "next";

import React from "react";
import PromocionNuevaForm from "../components/DescuentoNuevoForm";

export const metadata: Metadata = {
    title: "Crear Nueva Promoción",
    description: "Formulario para crear una nueva promoción para un negocio específico.",
};

interface Props {
    negocioId: string; // El nombre debe coincidir con el segmento [negocioId]
}

export default function NuevaPromocionPage({ params }: { params: Props }) {
    const negocioId = params.negocioId; // ¡Aquí está el ID!
    return (
        <div>
            <PromocionNuevaForm negocioId={negocioId} />
        </div>
    );
}