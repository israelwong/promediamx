import { Metadata } from "next";

import React from "react";
import DescuentoEditarForm from "../components/DescuentoEditarForm";

export const metadata: Metadata = {
    title: "Editar descuento",
};

export default async function page({ params }: { params: Promise<{ descuentoId: string }> }) {
    const { descuentoId } = await params
    return (
        <div>
            <DescuentoEditarForm descuentoId={descuentoId} />
        </div>
    );
}