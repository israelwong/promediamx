// app/admin/clientes/[clienteId]/negocios/[negocioId]/pagos/components/PagosHistorial.tsx
'use client';

import React, { useState, useEffect, useTransition } from 'react';
// import { useRouter } from 'next/navigation';
import { type NegocioTransaccion, type EstadoTransaccionEnum } from '@/app/admin/_lib/actions/negocioPagos/negocioTransaccion.schemas';
import { getNegocioTransaccionesAction } from '@/app/admin/_lib/actions/negocioPagos/negocioTransaccion.actions';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { ArrowLeft, ArrowRight, RefreshCw, AlertTriangle } from 'lucide-react';

interface PagosHistorialProps {
    negocioId: string;
    initialTransactions: NegocioTransaccion[];
    totalCount: number;
    // Podríamos recibir pageSize y page actual desde el Server Component
    // initialPage?: number;
    // pageSize?: number;
}

const ITEMS_PER_PAGE = 10; // O el pageSize que definiste

export default function PagosHistorial({
    negocioId,
    initialTransactions,
    totalCount,
}: PagosHistorialProps) {
    // const router = useRouter();
    const [isPending, startTransition] = useTransition();
    const [transactions, setTransactions] = useState<NegocioTransaccion[]>(initialTransactions);
    const [currentPage, setCurrentPage] = useState(1);
    const [currentTotalCount, setCurrentTotalCount] = useState(totalCount);
    const [error, setError] = useState<string | null>(null);

    const totalPages = Math.ceil(currentTotalCount / ITEMS_PER_PAGE);

    // Efecto para actualizar transacciones si initialTransactions cambia (ej. por router.refresh() en el padre)
    useEffect(() => {
        setTransactions(initialTransactions);
        setCurrentTotalCount(totalCount);
        // Si la página actual queda fuera de rango después de una actualización, la ajustamos
        if (currentPage > Math.ceil(totalCount / ITEMS_PER_PAGE) && totalCount > 0) {
            setCurrentPage(Math.ceil(totalCount / ITEMS_PER_PAGE));
        } else if (totalCount === 0) {
            setCurrentPage(1);
        }
    }, [initialTransactions, totalCount, currentPage]);


    const fetchTransactions = (page: number) => {
        setError(null);
        startTransition(async () => {
            const result = await getNegocioTransaccionesAction({
                negocioId,
                page,
                pageSize: ITEMS_PER_PAGE,
            });
            if (result.success && result.data) {
                setTransactions(result.data.transacciones);
                setCurrentTotalCount(result.data.totalCount);
                setCurrentPage(result.data.page);
            } else {
                setError(result.error || "No se pudo cargar el historial de transacciones.");
                setTransactions([]); // Limpiar transacciones en caso de error
            }
        });
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) {
            fetchTransactions(currentPage - 1);
        }
    };

    const handleNextPage = () => {
        if (currentPage < totalPages) {
            fetchTransactions(currentPage + 1);
        }
    };

    const handleRefresh = () => {
        // Opción 1: Refrescar desde el servidor (más simple si el padre usa router.refresh)
        // router.refresh();
        // Opción 2: Volver a fetchear la página actual
        fetchTransactions(currentPage);
    }

    const getBadgeVariant = (estado: EstadoTransaccionEnum): "default" | "destructive" | "secondary" | "outline" | "warning" | "success" => {
        switch (estado) {
            case 'COMPLETADA': return 'success';
            case 'PENDIENTE': return 'default'; // O 'warning'
            case 'EN_PROCESO': return 'default';
            case 'FALLIDA': return 'destructive';
            case 'CANCELADA': return 'destructive';
            case 'REEMBOLSADA': return 'secondary';
            case 'PARCIALMENTE_REEMBOLSADA': return 'outline';
            default: return 'default';
        }
    };

    // Añade un componente Badge 'success' y 'warning' si no los tienes
    // export function Badge({ className, variant, ...props }: BadgeProps) {
    //   return (
    //     <div className={cn(badgeVariants({ variant }), className)} {...props} />
    //   )
    // }
    // y en badgeVariants:
    // success: "border-transparent bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-100",
    // warning: "border-transparent bg-amber-100 text-amber-800 dark:bg-amber-900 dark:text-amber-100",


    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <div>
                    <CardTitle>Historial de Transacciones</CardTitle>
                    <CardDescription>
                        Visualiza todos los pagos procesados para este negocio.
                    </CardDescription>
                </div>
                <Button onClick={handleRefresh} variant="outline" size="sm" disabled={isPending}>
                    <RefreshCw size={16} className={isPending ? "animate-spin mr-2" : "mr-2"} />
                    Actualizar
                </Button>
            </CardHeader>
            <CardContent>
                {error && (
                    <div className="flex items-center gap-2 p-3 mb-4 text-sm rounded-md bg-red-50 dark:bg-red-900/30 text-red-700 dark:text-red-300 border border-red-200 dark:border-red-700">
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}
                {isPending && transactions.length === 0 && !error && <p>Cargando transacciones...</p>}
                {!isPending && transactions.length === 0 && !error && (
                    <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                        Aún no hay transacciones registradas para este negocio.
                    </p>
                )}

                {transactions.length > 0 && (
                    <>
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow>
                                        <TableHead>Fecha</TableHead>
                                        <TableHead>Concepto</TableHead>
                                        <TableHead className="text-right">Monto Bruto</TableHead>
                                        <TableHead>Método</TableHead>
                                        <TableHead>Comprador</TableHead>
                                        <TableHead>Estado</TableHead>
                                        <TableHead>Ref. Procesador</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {transactions.map((tx) => (
                                        <TableRow key={tx.id}>
                                            <TableCell>
                                                {new Date(tx.fechaTransaccion).toLocaleDateString('es-MX', {
                                                    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
                                                })}
                                            </TableCell>
                                            <TableCell className="font-medium">{tx.concepto}</TableCell>
                                            <TableCell className="text-right">
                                                {tx.montoBruto.toLocaleString('es-MX', { style: 'currency', currency: tx.moneda || 'MXN' })}
                                            </TableCell>
                                            <TableCell>{tx.metodoPagoUtilizado.replace(/_/g, ' ').toLowerCase()}</TableCell>
                                            <TableCell>{tx.nombreComprador || tx.emailComprador || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant={getBadgeVariant(tx.estado)}>
                                                    {tx.estado.replace(/_/g, ' ').toLowerCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-zinc-500 dark:text-zinc-400 truncate max-w-[100px]" title={tx.referenciaProcesador || undefined}>
                                                {tx.referenciaProcesador || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && (
                            <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-200 dark:border-zinc-700">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handlePreviousPage}
                                    disabled={currentPage === 1 || isPending}
                                >
                                    <ArrowLeft size={16} className="mr-2" />
                                    Anterior
                                </Button>
                                <span className="text-sm text-zinc-700 dark:text-zinc-300">
                                    Página {currentPage} de {totalPages} (Total: {currentTotalCount} transacciones)
                                </span>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleNextPage}
                                    disabled={currentPage === totalPages || isPending}
                                >
                                    Siguiente
                                    <ArrowRight size={16} className="ml-2" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
