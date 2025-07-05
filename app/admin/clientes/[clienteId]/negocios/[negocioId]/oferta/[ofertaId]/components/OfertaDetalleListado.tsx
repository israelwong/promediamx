'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { PlusCircle, Edit, Trash2 } from 'lucide-react';
import { type OfertaDetalleListItemType } from '@/app/admin/_lib/actions/oferta/ofertaDetalle.schemas';

interface OfertaDetalleListadoProps {
    ofertaId: string;
    negocioId: string;
    clienteId: string;
    initialDetalles: OfertaDetalleListItemType[];
    onDetalleUpdated: () => void; // Para llamar a refreshData del manager
}

export default function OfertaDetalleListado({
    ofertaId,
    negocioId,
    clienteId,
    initialDetalles,
    // onDetalleUpdated,
}: OfertaDetalleListadoProps) {
    const router = useRouter();

    const handleAddNewDetalle = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}/detalle/nuevo`);
    };

    const handleEditDetalle = (detalleId: string) => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}/detalle/${detalleId}`);
    };

    const handleDeleteDetalle = async (detalleId: string) => {
        // Aquí llamarías a una action para eliminar el detalle
        // const result = await deleteOfertaDetalleAction(detalleId, ....);
        // if (result.success) onDetalleUpdated(); else alert(result.error);
        alert(`Conceptual: Eliminar detalle ID: ${detalleId}. Luego llamar a onDetalleUpdated().`);
        // Temporalmente, simular actualización para ver si refresca:
        // onDetalleUpdated(); 
    };


    return (
        <Card className="shadow-md">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
                <div>
                    <CardTitle className="text-lg">Detalles de la Oferta</CardTitle>
                    <CardDescription className="text-xs">Puntos de conocimiento, FAQs y argumentos para el asistente.</CardDescription>
                </div>
                <Button onClick={handleAddNewDetalle} size="sm">
                    <PlusCircle size={16} className="mr-2" /> Añadir detalles
                </Button>
            </CardHeader>
            <CardContent>
                {initialDetalles.length === 0 ? (
                    <p className="text-sm text-zinc-400 text-center py-4">
                        No hay detalles de conocimiento para esta oferta. ¡Añade el primero!
                    </p>
                ) : (
                    <div className="space-y-3">
                        {initialDetalles.map((detalle) => (
                            <div key={detalle.id} className="p-3 bg-zinc-800/60 border border-zinc-700 rounded-md flex justify-between items-start">
                                <div>
                                    <h4 className="font-semibold text-zinc-100 text-sm">{detalle.tituloDetalle}</h4>
                                    <p className="text-xs text-zinc-400 mt-0.5 leading-relaxed line-clamp-2" title={detalle.contenidoExtracto}>
                                        {detalle.contenidoExtracto || "Sin contenido previo."}
                                    </p>
                                    <p className="text-xs text-zinc-500 mt-1">
                                        Estado: {detalle.estadoContenido} | Últ. act: {new Date(detalle.updatedAt).toLocaleDateString()}
                                    </p>
                                </div>
                                <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-blue-400" onClick={() => handleEditDetalle(detalle.id)} title="Editar detalle">
                                        <Edit size={14} />
                                    </Button>
                                    <Button variant="ghost" size="icon" className="h-7 w-7 text-zinc-400 hover:text-red-400" onClick={() => handleDeleteDetalle(detalle.id)} title="Eliminar detalle">
                                        <Trash2 size={14} />
                                    </Button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </CardContent>
        </Card>
    );
}