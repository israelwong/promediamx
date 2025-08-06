import Link from 'next/link';
import { Metadata } from 'next';
import { Button } from '@/app/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { obtenerTodosLosAgentes } from '@/app/admin/_lib/actions/agente/agente.actions';
import { Badge } from '@/app/components/ui/badge';
import { PlusCircle, Settings } from 'lucide-react';

export const metadata: Metadata = {
    title: "Gestión de Agentes - Promedia",
    description: "Lista de agentes registrados para este negocio.",
};

interface PaginaListaAgentesProps {
    clienteId: string;
    negocioId: string;

}

export default async function PaginaListaAgentes({ params }: { params: Promise<PaginaListaAgentesProps> }) {

    const { clienteId, negocioId } = await params;

    const result = await obtenerTodosLosAgentes({ negocioId: negocioId });

    if (!result.success || !result.data) {
        return <div className="p-8 text-red-500">Error al cargar agentes: {result.error}</div>;
    }

    const agentes = result.data;

    return (
        <div className="p-4 sm:p-6 md:p-8 space-y-6">
            <div className="flex items-center justify-between">
                <h1 className="text-3xl font-bold">Gestión de Agentes</h1>
                <Button asChild>
                    <Link href={`/admin/clientes/${clienteId}/negocios/${negocioId}/agentes/nuevo`}>
                        <PlusCircle className="mr-2 h-4 w-4" />
                        Crear Nuevo Agente
                    </Link>
                </Button>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Agentes Registrados</CardTitle>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Nombre</TableHead>
                                <TableHead>Email</TableHead>
                                {/* --- MEJORA: Nueva columna para las ofertas --- */}
                                <TableHead>Ofertas Asignadas</TableHead>
                                <TableHead>Estado</TableHead>
                                <TableHead className="text-right">Acciones</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {agentes.map((agente) => (
                                <TableRow key={agente.id}>
                                    <TableCell className="font-medium">{agente.nombre}</TableCell>
                                    <TableCell>{agente.email}</TableCell>

                                    {/* --- MEJORA: Celda que muestra las ofertas como Badges --- */}
                                    <TableCell>
                                        <div className="flex flex-wrap gap-1">
                                            {agente.ofertasAsignadas.map(({ oferta }) => (
                                                <Badge key={oferta.nombre} variant="secondary">{oferta.nombre}</Badge>
                                            ))}
                                            {agente.ofertasAsignadas.length === 0 && (
                                                <span className="text-xs text-muted-foreground">Ninguna</span>
                                            )}
                                        </div>
                                    </TableCell>

                                    <TableCell>
                                        <Badge variant={agente.status === 'activo' ? 'default' : 'destructive'}>
                                            {agente.status}
                                        </Badge>
                                    </TableCell>
                                    <TableCell className="text-right">
                                        <Button asChild variant="outline" size="sm">
                                            <Link href={`/admin/clientes/${clienteId}/negocios/${negocioId}/agentes/${agente.id}`}>
                                                <Settings className="mr-2 h-4 w-4" />
                                                Gestionar
                                            </Link>
                                        </Button>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                    {agentes.length === 0 && (
                        <p className="text-center text-muted-foreground py-8">No hay agentes registrados para este negocio.</p>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}