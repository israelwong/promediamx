import React from 'react';
import { Metadata } from 'next';
import { BarChart3 } from 'lucide-react';
import { obtenerEstadisticasAgenteAction } from '@/app/agente/_lib/actions/actions/estadisticas.actions';
import EstadisticasView from './components/EstadisticasView';
import RefreshButton from './components/RefreshButton'; // <-- Importamos el nuevo botón

export const metadata: Metadata = { title: 'Mis Estadísticas' };
export const dynamic = 'force-dynamic';

export default async function EstadisticasPage() {
    const estadisticasResult = await obtenerEstadisticasAgenteAction();

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-2xl font-semibold text-zinc-100 flex items-center gap-3">
                        <BarChart3 /> Mis Estadísticas
                    </h1>
                    <p className="text-sm text-zinc-400 mt-1">
                        Un resumen del rendimiento y distribución de tus prospectos.
                    </p>
                </div>
                {/* --- AÑADIMOS EL BOTÓN DE ACTUALIZAR AQUÍ --- */}
                <RefreshButton />
            </header>

            <main>
                {estadisticasResult.success ? (
                    <EstadisticasView initialData={estadisticasResult.data} />
                ) : (
                    <div className="bg-red-900/20 border border-red-500/30 text-red-300 p-4 rounded-lg">
                        <p className="font-bold">Error al cargar las estadísticas</p>
                        <p className="text-sm">{estadisticasResult.error}</p>
                    </div>
                )}
            </main>
        </div>
    );
}