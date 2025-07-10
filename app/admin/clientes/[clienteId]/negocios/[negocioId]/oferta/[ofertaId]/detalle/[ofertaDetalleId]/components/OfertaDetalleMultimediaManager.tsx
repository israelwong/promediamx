'use client';

import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/app/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/app/components/ui/card';
import { Image as ImageIcon, Video, FileText } from 'lucide-react';

import OfertaDetalleGaleria from './OfertaDetalleGaleria';
// import OfertaDetalleVideo from './OfertaDetalleVideos';
import OfertaDetalleDocumentos from './OfertaDetalleDocumentos';


interface OfertaDetalleMultimediaManagerProps {
    ofertaId: string; // Si es necesario, aunque no se usa directamente aquí
    ofertaDetalleId: string;
    negocioId: string;
    clienteId: string;
}

export default function OfertaDetalleMultimediaManager({
    ofertaId, // Aunque no se usa directamente aquí, puede ser útil para futuras expansiones
    ofertaDetalleId,
    negocioId,
    clienteId
}: OfertaDetalleMultimediaManagerProps) {
    const [activeTab, setActiveTab] = useState("galeria");

    // Aquí podrías tener lógica para recargar la multimedia específica si una acción dentro de una pestaña lo requiere,
    // o pasar callbacks a los sub-managers.

    return (
        <Card className="shadow-lg">
            <CardHeader>
                <CardTitle>Multimedia del Detalle</CardTitle>
                <CardDescription>Añade imágenes, un video o documentos de apoyo para este punto de conocimiento.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                    <TabsList className="grid w-full grid-cols-3 mb-4">
                        <TabsTrigger value="galeria" className="flex items-center gap-2"><ImageIcon size={16} /> Galería</TabsTrigger>
                        <TabsTrigger value="video" className="flex items-center gap-2"><Video size={16} /> Video</TabsTrigger>
                        <TabsTrigger value="archivos" className="flex items-center gap-2"><FileText size={16} /> Archivos</TabsTrigger>
                    </TabsList>

                    <TabsContent value="galeria">
                        <OfertaDetalleGaleria
                            ofertaId={ofertaId}
                            ofertaDetalleId={ofertaDetalleId}
                            negocioId={negocioId}
                            clienteId={clienteId}
                        />
                    </TabsContent>
                    <TabsContent value="video">
                        {/* <OfertaDetalleVideo
                            ofertaId={ofertaId}
                            ofertaDetalleId={ofertaDetalleId}
                            negocioId={negocioId}
                            clienteId={clienteId}
                        /> */}
                    </TabsContent>
                    <TabsContent value="archivos">
                        <OfertaDetalleDocumentos
                            ofertaId={ofertaId}
                            ofertaDetalleId={ofertaDetalleId}
                            negocioId={negocioId}
                            clienteId={clienteId}
                        />
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}