'use client';
import React, { useEffect } from 'react'
import HeaderPage from '@/app/admin/_components/HeaderPage';
import PaqueteNuevoForm from './PaqueteNuevoForm';
import { Paquete, Servicio } from '@/app/admin/_lib/types';
import { crearPaquete } from '@/app/admin/_lib/paquete.actions';

import { obtenerServicios } from '@/app/admin/_lib/servicios.actions';

export default function PaqueteNuevo() {

    const [servicios, setServicios] = React.useState<Servicio[]>([]);
    const [loading, setLoading] = React.useState<boolean>(false);

    useEffect(() => {
        obtenerServicios().then((data) => {
            setServicios(data);
        });
        setLoading(false);
    }
        , []);

    const handleCrearPaquete = async (paquete: Paquete, listaServiciosId: string[]) => {
        const result = crearPaquete(paquete, listaServiciosId);
        return result;
    }

    return (
        <div>
            <HeaderPage titulo="Nuevo paquete" />
            {loading ? (
                <p>Cargando servicios...</p>
            ) : (
                <PaqueteNuevoForm
                    onGuardar={handleCrearPaquete}
                    servicios={servicios}
                />
            )}
        </div>
    )
}
