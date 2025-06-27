import React from 'react';
import { getDashboardDataAction } from '@/app/admin/_lib/actions/dashboard/dashboard.actions';
import { AlertCircle } from 'lucide-react';
import RealtimeDashboard from './RealtimeDashboard'; // Importamos el nuevo componente

interface DashboardViewProps {
    negocioId: string;
}

export default async function DashboardView({ negocioId }: DashboardViewProps) {
    // 1. Llamamos a la Server Action para la carga inicial.
    const result = await getDashboardDataAction({ negocioId });

    // 2. Manejamos el error si la carga inicial falla.
    if (!result.success || !result.data) {
        return (
            <div className="flex flex-col items-center justify-center h-full text-center p-4 bg-zinc-800 rounded-lg border border-red-700/50">
                <AlertCircle size={48} className="text-red-500 mb-4" />
                <h2 className="text-xl font-semibold text-red-400 mb-2">Error al Cargar el Dashboard</h2>
                <p className="text-zinc-400 max-w-md">
                    No se pudieron obtener los datos iniciales.
                </p>
            </div>
        );
    }

    // 3. Pasamos los datos iniciales al componente de cliente, que se encargará del resto.
    return (
        <RealtimeDashboard initialData={result.data} negocioId={negocioId} />
    );
}