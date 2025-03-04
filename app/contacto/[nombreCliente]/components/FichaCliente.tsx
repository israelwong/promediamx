"use client";

import { useEffect } from "react";

interface FichaClienteProps {
    nombreCliente: string;
}

export default function FichaCliente({ nombreCliente }: FichaClienteProps) {
    useEffect(() => {
        document.title = `Ficha de ${nombreCliente} - Promedia`;
    }, [nombreCliente]);

    return <h1>Ficha de {nombreCliente}</h1>;
}
