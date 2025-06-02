'use client';

import React from 'react';
import { useRouter } from 'next/navigation'; // Para redirigir a crear nuevo detalle
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { CheckSquare, Edit3, Link2 } from 'lucide-react'; // CheckSquare, Edit3
import { type PreguntaSinRespuestaOfertaListItemType } from '@/app/admin/_lib/actions/oferta/preguntaSinRespuestaOferta.schemas';

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

    const handleResolverCreandoNuevo = (preguntaOriginal: string, preguntaSinRespuestaId: string) => {
        // Redirigir a la página de nuevo detalle, pasando la pregunta y el ID de la pregunta sin respuesta
        const queryParams = new URLSearchParams({
            preguntaOriginal: preguntaOriginal,
            resolverPreguntaId: preguntaSinRespuestaId,
        });
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/oferta/${ofertaId}/detalle/nuevo?${queryParams.toString()}`);
    };

    const handleResolverVinculando = async (preguntaSinRespuestaId: string) => {
        // Aquí abrirías un modal para que el usuario seleccione un OfertaDetalle EXISTENTE
        // y luego llamarías a una action:
        // const detalleVinculadoId = await openModalParaSeleccionarDetalle();
        // if (detalleVinculadoId) {
        //   const result = await resolverPreguntaVinculandoDetalleExistenteAction(preguntaSinRespuestaId, detalleVinculadoId);
        //   if (result.success) onPreguntaResolved(); else alert(result.error);
        // }
        alert(`Conceptual: Abrir modal para vincular Pregunta ID: ${preguntaSinRespuestaId} a un OfertaDetalle existente. Luego llamar a onPreguntaResolved().`);
    };

    const handleMarcarComoNotificada = async (preguntaSinRespuestaId: string) => {
        alert(`Conceptual: Marcar Pregunta ID ${preguntaSinRespuestaId} como notificada al usuario (después de enviar WhatsApp).`);
        // const result = await notificarUsuarioRespuestaAction(preguntaSinRespuestaId);
        // if (result.success) onPreguntaResolved(); else alert(result.error);
    };


    const preguntasPendientes = initialPreguntas.filter(p => p.estado === 'PENDIENTE_REVISION');
    const preguntasRespondidasNoNotificadas = initialPreguntas.filter(p => p.estado === 'RESPONDIDA_LISTA_PARA_NOTIFICAR');

    return (
        <Card className="shadow-md">
            <CardHeader className="pb-3">
                <CardTitle className="text-lg">Preguntas Pendientes de Clientes</CardTitle>
                <CardDescription className="text-xs">Preguntas de prospectos sobre esta oferta que el asistente no pudo responder.</CardDescription>
            </CardHeader>
            <CardContent>
                {initialPreguntas.length === 0 && (
                    <p className="text-sm text-zinc-400 text-center py-4">
                        No hay preguntas pendientes para esta oferta.
                    </p>
                )}

                {preguntasPendientes.length > 0 && (
                    <>
                        <h4 className="text-sm font-medium text-amber-400 mb-2">Por Resolver ({preguntasPendientes.length})</h4>
                        <div className="space-y-3 mb-6">
                            {preguntasPendientes.map((pregunta) => (
                                <div key={pregunta.id} className="p-3 bg-amber-900/20 border border-amber-700/30 rounded-md">
                                    <p className="text-sm text-zinc-200 mb-1">&quot;{pregunta.preguntaUsuario}&quot;</p>
                                    <p className="text-xs text-zinc-400">Recibida: {new Date(pregunta.fechaCreacion).toLocaleDateString()}</p>
                                    <div className="mt-2 flex items-center gap-2">
                                        <Button onClick={() => handleResolverCreandoNuevo(pregunta.preguntaUsuario, pregunta.id)} size="sm" variant="outline" className="border-amber-500/50 hover:bg-amber-500/20 text-amber-300">
                                            <Edit3 size={14} className="mr-1.5" /> Crear Respuesta
                                        </Button>
                                        <Button onClick={() => handleResolverVinculando(pregunta.id)} size="sm" variant="outline" className="border-sky-500/50 hover:bg-sky-500/20 text-sky-300">
                                            <Link2 size={14} className="mr-1.5" /> Vincular a Existente
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}

                {preguntasRespondidasNoNotificadas.length > 0 && (
                    <>
                        <h4 className="text-sm font-medium text-green-400 mb-2">Listas para Notificar al Prospecto ({preguntasRespondidasNoNotificadas.length})</h4>
                        <div className="space-y-3">
                            {preguntasRespondidasNoNotificadas.map((pregunta) => (
                                <div key={pregunta.id} className="p-3 bg-green-900/20 border border-green-700/30 rounded-md">
                                    <p className="text-sm text-zinc-200 mb-1">P: &quot;{pregunta.preguntaUsuario}&quot;</p>
                                    <p className="text-xs text-green-300">R: &quot;{pregunta.ofertaDetalleRespuesta?.tituloDetalle || 'Respuesta vinculada'}&quot;</p>
                                    <div className="mt-2">
                                        <Button onClick={() => handleMarcarComoNotificada(pregunta.id)} size="sm" variant="default" className="bg-green-600 hover:bg-green-700">
                                            <CheckSquare size={14} className="mr-1.5" /> Enviar Respuesta / Marcar Notificada
                                        </Button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </>
                )}
                {preguntasPendientes.length === 0 && preguntasRespondidasNoNotificadas.length === 0 && initialPreguntas.length > 0 && (
                    <p className="text-sm text-zinc-400 text-center py-4">
                        Todas las preguntas han sido procesadas.
                    </p>
                )}
            </CardContent>
        </Card>
    );
}