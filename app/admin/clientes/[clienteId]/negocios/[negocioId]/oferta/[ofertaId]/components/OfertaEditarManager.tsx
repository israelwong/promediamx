'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { obtenerOfertaPorIdFull } from '@/app/admin/_lib/actions/oferta/oferta.actions';
import { type OfertaCompletaParaManagerType } from '@/app/admin/_lib/actions/oferta/oferta.schemas';

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs"; // Asumiendo que tienes este componente
import { Card, CardContent } from '@/app/components/ui/card'; // Para la estructura general
import { Loader2, AlertTriangle, Info } from 'lucide-react';

import OfertaGaleria from './OfertaGaleria';
import OfertaVideos from './OfertaVideos';
import OfertaDocumentos from './OfertaDocumentos'; // Importar los managers de multimedia

// Importar el formulario principal y los placeholders para los managers de multimedia
import OfertaEditarForm from './OfertaEditarForm'; // El que ya creamos


interface OfertaEditarManagerProps {
    ofertaId: string;
    negocioId: string;
    clienteId: string; // OfertaEditarForm lo necesita
}

export default function OfertaEditarManager({ ofertaId, negocioId, clienteId }: OfertaEditarManagerProps) {
    const [ofertaData, setOfertaData] = useState<OfertaCompletaParaManagerType | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>("infoPrincipal");

    const fetchOfertaData = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const result = await obtenerOfertaPorIdFull(ofertaId, negocioId);
            if (result.success && result.data) {
                setOfertaData(result.data as OfertaCompletaParaManagerType); // Casteamos al tipo esperado
            } else {
                setError(result.error || "No se pudo cargar la información completa de la oferta.");
            }
        } catch (e) {
            console.error("Error al cargar datos para OfertaEditarManager:", e);
            setError(e instanceof Error ? e.message : "Error desconocido.");
        } finally {
            setLoading(false);
        }
    }, [ofertaId, negocioId]);

    useEffect(() => {
        fetchOfertaData();
    }, [fetchOfertaData]);

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center p-10 min-h-[400px] bg-zinc-800 rounded-xl shadow-xl">
                <Loader2 className='animate-spin h-10 w-10 text-blue-400' />
                <p className="mt-4 text-zinc-300">Cargando gestor de oferta...</p>
            </div>
        );
    }

    if (error) {
        return (
            <Card className="shadow-xl border-red-500/40 bg-red-900/10">
                <CardContent className="p-10 text-center">
                    <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
                    <p className="text-lg text-red-300 mb-2 font-semibold">Error al Cargar Datos</p>
                    <p className="text-sm text-zinc-300 mb-5">{error}</p>
                </CardContent>
            </Card>
        );
    }

    if (!ofertaData) {
        return (
            <Card className="shadow-xl">
                <CardContent className="p-10 text-center">
                    <Info size={48} className="text-zinc-500 mx-auto mb-4" />
                    <p className="text-xl text-zinc-200 mb-2">No se Encontró la Oferta</p>
                    <p className="text-sm text-zinc-400 mb-6">Los datos para esta oferta no pudieron ser cargados.</p>
                </CardContent>
            </Card>
        );
    }

    return (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 mb-4">
                <TabsTrigger value="infoPrincipal">Oferta</TabsTrigger>
                <TabsTrigger value="galeria">Galería</TabsTrigger>
                <TabsTrigger value="videos">Videos</TabsTrigger>
                <TabsTrigger value="archivos">Archivos</TabsTrigger>
            </TabsList>

            <TabsContent value="infoPrincipal" className="mt-2">
                {/* OfertaEditarForm ahora es independiente en su carga de datos 
                    o podrías pasarle initialData si ajustas OfertaEditarForm para aceptarlo */}
                <OfertaEditarForm
                    ofertaId={ofertaId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </TabsContent>

            <TabsContent value="galeria" className="mt-2">
                <OfertaGaleria
                    ofertaId={ofertaId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </TabsContent>

            <TabsContent value="videos" className="mt-2">
                <OfertaVideos
                    ofertaId={ofertaId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </TabsContent>

            <TabsContent value="archivos" className="mt-2">
                <OfertaDocumentos
                    ofertaId={ofertaId}
                    negocioId={negocioId}
                    clienteId={clienteId}
                />
            </TabsContent>
        </Tabs>
    );
}