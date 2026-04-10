'use client';

import React, { useState, useEffect, useCallback } from 'react';
// Los subcomponentes que mostrarán la data. Usaremos los placeholders que ya definimos.
import OfertaDetalleListado from './OfertaDetalleListado';
import OfertaPreguntasPendientesListado from './OfertaPreguntasSinRespuestaListado';

// Actions para cargar los datos
import { obtenerDetallesDeOfertaAction } from '@/app/admin/_lib/actions/oferta/ofertaDetalle.actions';
import { type OfertaDetalleListItemType } from '@/app/admin/_lib/actions/oferta/ofertaDetalle.schemas';
import { obtenerPreguntasSinRespuestaAction } from '@/app/admin/_lib/actions/oferta/preguntaSinRespuestaOferta.actions';
import { type PreguntaSinRespuestaOfertaListItemType } from '@/app/admin/_lib/actions/oferta/preguntaSinRespuestaOferta.schemas';

// UI Components
import { Card, CardContent } from "@/app/components/ui/card"; // Un Card como contenedor general opcional
import { Loader2, AlertTriangle } from 'lucide-react';

interface OfertaDetalleManagerProps {
    ofertaId: string;
    negocioId: string;
    clienteId: string; // Para navegación y revalidación en subcomponentes
}

export default function OfertaDetalleManager({ ofertaId, negocioId, clienteId }: OfertaDetalleManagerProps) {
    const [detalles, setDetalles] = useState<OfertaDetalleListItemType[]>([]);
    const [preguntas, setPreguntas] = useState<PreguntaSinRespuestaOfertaListItemType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchData = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        try {
            // Cargar data para ambas secciones en paralelo
            const [detallesResult, preguntasResult] = await Promise.all([
                obtenerDetallesDeOfertaAction(ofertaId),
                obtenerPreguntasSinRespuestaAction(ofertaId)
            ]);

            let currentError = "";
            if (detallesResult.success && detallesResult.data) {
                setDetalles(detallesResult.data);
            } else {
                console.error("Error cargando detalles de oferta:", detallesResult.error);
                currentError += (detallesResult.error || "Error al cargar detalles de conocimiento.") + " ";
            }

            if (preguntasResult.success && preguntasResult.data) {
                setPreguntas(preguntasResult.data);
            } else {
                console.error("Error cargando preguntas pendientes:", preguntasResult.error);
                currentError += (preguntasResult.error || "Error al cargar preguntas pendientes.");
            }

            if (currentError.trim() !== "") {
                setError(currentError.trim());
            }

        } catch (e) {
            console.error("Error general fetching data for OfertaDetalleManager:", e);
            setError(e instanceof Error ? e.message : "Ocurrió un error desconocido al cargar los datos.");
        } finally {
            setIsLoading(false);
        }
    }, [ofertaId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    // Esta función se pasará a los subcomponentes para que puedan
    // solicitar una recarga de datos después de una acción (ej. resolver una pregunta).
    const handleDataRefreshNeeded = useCallback(() => {
        fetchData();
    }, [fetchData]);


    if (isLoading) {
        return (
            <Card className="shadow-lg col-span-1 md:col-span-2 lg:col-span-1"> {/* Ajusta el col-span según tu grid principal de página */}
                <CardContent className="flex flex-col items-center justify-center p-10 min-h-[300px]">
                    <Loader2 className='animate-spin h-8 w-8 text-blue-400' />
                    <p className="mt-3 text-zinc-400">Cargando detalles y preguntas de la oferta...</p>
                </CardContent>
            </Card>
        );
    }

    if (error) {
        return (
            <Card className="shadow-lg col-span-1 md:col-span-2 lg:col-span-1 border-red-500/30">
                <CardContent className="flex flex-col items-center justify-center p-10 min-h-[200px]">
                    <AlertTriangle className="h-10 w-10 text-red-400 mb-3" />
                    <p className="text-red-400 text-center mb-1 font-medium">Error al Cargar Datos</p>
                    <p className="text-zinc-400 text-sm text-center">{error}</p>
                </CardContent>
            </Card>
        );
    }

    // Layout interno de 2 columnas para las secciones.
    // Se apilarán en pantallas pequeñas (grid-cols-1) y estarán lado a lado en pantallas más grandes (lg:grid-cols-2).
    return (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Sección/Columna Interna A: Base de Conocimiento */}
            <div className="w-full">
                <OfertaDetalleListado
                    ofertaId={ofertaId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                    initialDetalles={detalles}
                    onDetalleUpdated={handleDataRefreshNeeded}
                />
            </div>

            {/* Sección/Columna Interna B: Preguntas Pendientes */}
            <div className="w-full">
                <OfertaPreguntasPendientesListado
                    ofertaId={ofertaId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                    initialPreguntas={preguntas}
                    onPreguntaResolved={handleDataRefreshNeeded}
                />
            </div>
        </div>
    );
}