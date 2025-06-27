'use client';

import React, { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'react-hot-toast';

// Acciones y tipos
import {
    resolverPreguntaVinculandoDetalleAction,
    marcarPreguntaComoNotificadaAction
} from '@/app/admin/_lib/actions/oferta/preguntaSinRespuestaOferta.actions';
import { type PreguntaSinRespuestaOfertaListItemType } from '@/app/admin/_lib/actions/oferta/preguntaSinRespuestaOferta.schemas';

// Componentes UI
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { CheckSquare, Edit3, Link2, Loader2 } from 'lucide-react';

interface OfertaPreguntasPendientesListadoProps {
    ofertaId: string;
    negocioId: string;
    clienteId: string;
    initialPreguntas: PreguntaSinRespuestaOfertaListItemType[];
    onPreguntaResolved: () => void; // Para llamar a refreshData del manager
}

export default function OfertaPreguntasPendientesListado({
    ofertaId,
    negocioId,
    clienteId,
    initialPreguntas,
    onPreguntaResolved,
}: OfertaPreguntasPendientesListadoProps) {
    const router = useRouter();
    const [isPending, startTransition] = useTransition();

    const handleResolverCreandoNuevo = (preguntaOriginal: string, preguntaSinRespuestaId: string) => {
        const queryParams = new URLSearchParams({
            preguntaOriginal: preguntaOriginal,
            resolverPreguntaId: preguntaSinRespuestaId,
        });
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}/detalle/nuevo?${queryParams.toString()}`);
    };

    const handleResolverVinculando = (preguntaSinRespuestaId: string) => {
        // En una implementación real, aquí abrirías un modal.
        // Por ahora, simulamos obteniendo el ID de un detalle existente.
        const ofertaDetalleId = prompt("Pega el ID de un 'OfertaDetalle' existente para vincularlo:");
        if (!ofertaDetalleId) return;

        startTransition(async () => {
            const result = await resolverPreguntaVinculandoDetalleAction({ preguntaSinRespuestaId, ofertaDetalleId });
            if (result.success) {
                toast.success("Pregunta vinculada exitosamente.");
                onPreguntaResolved();
            } else {
                toast.error(result.error || "No se pudo vincular la pregunta.");
            }
        });
    };

    const handleMarcarComoNotificada = (preguntaSinRespuestaId: string) => {
        startTransition(async () => {
            const result = await marcarPreguntaComoNotificadaAction({ preguntaSinRespuestaId });
            if (result.success) {
                toast.success("Pregunta marcada como notificada.");
                onPreguntaResolved();
            } else {
                toast.error(result.error || "No se pudo actualizar el estado.");
            }
        });
    };

    const preguntasPendientes = initialPreguntas.filter(p => p.estado === 'PENDIENTE_REVISION');
    const preguntasRespondidasNoNotificadas = initialPreguntas.filter(p => p.estado === 'RESPONDIDA_LISTA_PARA_NOTIFICAR');

    return (
        <Card className="shadow-md">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Preguntas Pendientes de Clientes</CardTitle>
                <CardDescription className="text-xs">Preguntas de prospectos que el asistente no pudo responder.</CardDescription>
            </CardHeader>
            <CardContent>
                {isPending && <div className="flex justify-center p-4"><Loader2 className="animate-spin" /></div>}

                {!isPending && initialPreguntas.length === 0 && (
                    <p className="text-sm text-zinc-400 text-center py-4">No hay preguntas pendientes para esta oferta.</p>
                )}

                {!isPending && preguntasPendientes.length > 0 && (
                    <>
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Por Resolver ({preguntasPendientes.length})</h4>
                        <div className="space-y-3 mb-6">
                            {preguntasPendientes.map((pregunta) => (
                                <div key={pregunta.id} className="p-3 bg-zinc-800 border border-zinc-700 rounded-md">
                                    <p className="text-sm text-zinc-200 mb-1">&quot;{pregunta.preguntaUsuario}&quot;</p>
                                    <p className="text-xs text-zinc-400">Recibida: {new Date(pregunta.fechaCreacion).toLocaleDateString()}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <Button onClick={() => handleResolverCreandoNuevo(pregunta.preguntaUsuario, pregunta.id)} size="sm" variant="outline">
                                            <Edit3 size={14} className="mr-1.5" /> Crear Respuesta
                                        </Button>
                                        <Button onClick={() => handleResolverVinculando(pregunta.id)} size="sm" variant="outline">
                                            <Link2 size={14} className="mr-1.5" /> Vincular
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {!isPending && preguntasRespondidasNoNotificadas.length > 0 && (
                    <>
                        <h4 className="text-sm font-medium text-green-400 mb-2">Listas para Notificar ({preguntasRespondidasNoNotificadas.length})</h4>
                        <div className="space-y-3">
                            {preguntasRespondidasNoNotificadas.map((pregunta) => (
                                <div key={pregunta.id} className="p-3 bg-zinc-800 border border-zinc-700 rounded-md">
                                    <p className="text-sm text-zinc-200 mb-1">P: &quot;{pregunta.preguntaUsuario}&quot;</p>
                                    <p className="text-xs text-green-300">R: &quot;{pregunta.ofertaDetalleRespuesta?.tituloDetalle || 'Respuesta vinculada'}&quot;</p>
                                    <div className="mt-2">
                                        <Button onClick={() => handleMarcarComoNotificada(pregunta.id)} size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                                            <CheckSquare size={14} className="mr-1.5" /> Marcar Notificada
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
            </CardContent>
        </Card>
    );
}
