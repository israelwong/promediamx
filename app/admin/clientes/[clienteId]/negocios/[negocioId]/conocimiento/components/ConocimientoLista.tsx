'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { PlusCircle, MessageSquare, Edit } from 'lucide-react';
import type { ConocimientoItemParaEditarType } from '@/app/admin/_lib/actions/conocimiento/conocimiento.schemas';

interface Props {
    initialItems: ConocimientoItemParaEditarType[];
    clienteId: string;
    negocioId: string;
}

export default function ConocimientoLista({ initialItems, clienteId, negocioId }: Props) {
    const router = useRouter();
    const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}/conocimiento`;

    return (
        <div>
            <div className="mb-4 text-right">
                <Button onClick={() => router.push(`${basePath}/nuevo`)}>
                    <PlusCircle size={16} className="mr-2" />
                    Crear Nuevo Ítem
                </Button>
            </div>

            {initialItems.length === 0 ? (
                <div className="text-center py-16 px-6 border-2 border-dashed border-zinc-700 rounded-lg">
                    <MessageSquare size={48} className="mx-auto text-zinc-500" />
                    <h3 className="mt-4 text-lg font-medium text-zinc-200">Aún no hay conocimiento</h3>
                    <p className="mt-1 text-sm text-zinc-400">
                        Empieza por crear tu primer ítem en la base de conocimiento.
                    </p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {initialItems.map((item) => (
                        <Card key={item.id} className="bg-zinc-800 border-zinc-700 flex flex-col hover:bg-zinc-700/50 transition-colors">
                            <CardHeader>
                                <CardTitle className="text-base font-semibold text-zinc-100 line-clamp-2" title={item.preguntaFormulada}>
                                    {item.preguntaFormulada}
                                </CardTitle>
                                <CardDescription className="text-xs text-zinc-500">
                                    {/* --- CAMPO ACTUALIZADO --- */}
                                    Última actualización: {new Date(item.updatedAt).toLocaleDateString('es-MX')}
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="flex-grow">
                                <p className="text-sm text-zinc-300 line-clamp-3">
                                    {item.respuesta}
                                </p>
                            </CardContent>
                            <div className="p-4 pt-0 mt-auto">
                                <Button
                                    variant="outline"
                                    className="w-full"
                                    onClick={() => router.push(`${basePath}/${item.id}`)}
                                >
                                    <Edit size={14} className="mr-2" />
                                    Editar
                                </Button>
                            </div>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
}
