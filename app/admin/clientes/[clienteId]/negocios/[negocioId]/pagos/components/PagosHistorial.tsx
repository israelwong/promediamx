// app/admin/clientes/[clienteId]/negocios/[negocioId]/pagos/components/PagosHistorial.tsx
'use client';

import React, { useState, useEffect, useTransition, useCallback, useMemo } from 'react';
import { type NegocioTransaccion, type EstadoTransaccionEnum } from '@/app/admin/_lib/actions/negocioPagos/negocioTransaccion.schemas'; // Asumimos que el schema output tendrá la suma
import { getNegocioTransaccionesAction } from '@/app/admin/_lib/actions/negocioPagos/negocioTransaccion.actions'; // Asumimos que el input schema se actualizará
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/app/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/app/components/ui/table';
import { Badge } from '@/app/components/ui/badge';
import { Button } from '@/app/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/app/components/ui/select'; // Asumiendo Select
import { Input } from '@/app/components/ui/input'; // Para DatePickers nativos o inputs
import { ArrowLeft, ArrowRight, RefreshCw, AlertTriangle, Filter } from 'lucide-react';
import { format, startOfMonth, endOfMonth, subMonths, startOfYear, endOfYear } from 'date-fns';
import { es } from 'date-fns/locale';
import { Label } from '@/app/components/ui/label'; // Asumiendo que tienes un componente Label
import { GetNegocioTransaccionesInput } from '@/app/admin/_lib/actions/negocioPagos/negocioTransaccion.schemas'; // Importar el input schema

// --- Definiciones de Tipos para Filtros ---
type PeriodoPredefinido = "mesActual" | "quincenaActual" | "mesAnterior" | "anioActual";
type TipoFiltro = PeriodoPredefinido | "mesEspecifico" | "rangoFechas";

interface FiltroState {
    tipo: TipoFiltro;
    anio?: number; // Para mesEspecifico
    mes?: number;  // Para mesEspecifico (1-12)
    fechaInicio?: Date; // Para rangoFechas
    fechaFin?: Date;    // Para rangoFechas
}

interface PagosHistorialProps {
    negocioId: string;
    // initialTransactions ya no es tan útil si cargamos por defecto con filtro
    // initialTotalCount igual
    // initialSumaPeriodo y initialDescripcionPeriodo vendrían del server component
    initialData?: {
        transacciones: NegocioTransaccion[];
        totalCount: number;
        sumaPeriodo: number;
        descripcionPeriodo: string;
        page: number;
    }
}

const ITEMS_PER_PAGE = 10;

// --- Funciones Helper para Fechas ---
const getToday = () => new Date();
const getStartOfCurrentMonth = () => startOfMonth(getToday());
const getEndOfCurrentMonth = () => endOfMonth(getToday());
const getStartOfCurrentFortnight = () => {
    const today = getToday();
    const day = today.getDate();
    if (day <= 15) {
        return new Date(today.getFullYear(), today.getMonth(), 1);
    } else {
        return new Date(today.getFullYear(), today.getMonth(), 16);
    }
};
const getEndOfCurrentFortnight = () => {
    const today = getToday();
    const day = today.getDate();
    if (day <= 15) {
        return new Date(today.getFullYear(), today.getMonth(), 15, 23, 59, 59, 999);
    } else {
        return endOfMonth(today);
    }
};


export default function PagosHistorial({ negocioId, initialData }: PagosHistorialProps) {
    const [isPending, startTransition] = useTransition();
    const [transactions, setTransactions] = useState<NegocioTransaccion[]>(initialData?.transacciones || []);
    const [currentPage, setCurrentPage] = useState(initialData?.page || 1);
    const [currentTotalCount, setCurrentTotalCount] = useState(initialData?.totalCount || 0);
    const [error, setError] = useState<string | null>(null);

    // --- NUEVOS ESTADOS PARA FILTROS Y SUMATORIA ---
    const [filtroActivo, setFiltroActivo] = useState<FiltroState>({ tipo: 'mesActual' });
    const [sumaPeriodo, setSumaPeriodo] = useState<number | null>(initialData?.sumaPeriodo || null);
    const [descripcionPeriodo, setDescripcionPeriodo] = useState<string>(initialData?.descripcionPeriodo || "Mes Actual");

    // Estados para los inputs de los filtros
    const [selectedFilterType, setSelectedFilterType] = useState<TipoFiltro>('mesActual');
    const [specificAnio, setSpecificAnio] = useState<number>(new Date().getFullYear());
    const [specificMes, setSpecificMes] = useState<number>(new Date().getMonth() + 1);
    const [rangeFechaInicio, setRangeFechaInicio] = useState<string>('');
    const [rangeFechaFin, setRangeFechaFin] = useState<string>('');

    const totalPages = Math.ceil(currentTotalCount / ITEMS_PER_PAGE);

    const buildFilterPayload = useCallback((filtro: FiltroState): GetNegocioTransaccionesInput['filtros'] => {
        switch (filtro.tipo) {
            case 'mesActual':
                return { fechaInicio: getStartOfCurrentMonth(), fechaFin: getEndOfCurrentMonth() };
            case 'quincenaActual':
                return { fechaInicio: getStartOfCurrentFortnight(), fechaFin: getEndOfCurrentFortnight() };
            case 'mesAnterior':
                const primerDiaMesAnterior = startOfMonth(subMonths(getToday(), 1));
                const ultimoDiaMesAnterior = endOfMonth(subMonths(getToday(), 1));
                return { fechaInicio: primerDiaMesAnterior, fechaFin: ultimoDiaMesAnterior };
            case 'anioActual':
                return { fechaInicio: startOfYear(getToday()), fechaFin: endOfYear(getToday()) };
            case 'mesEspecifico':
                if (filtro.anio && filtro.mes) {
                    const inicio = new Date(filtro.anio, filtro.mes - 1, 1);
                    const fin = endOfMonth(inicio);
                    return { fechaInicio: inicio, fechaFin: fin };
                }
                return {};
            case 'rangoFechas':
                if (filtro.fechaInicio && filtro.fechaFin) {
                    return { fechaInicio: filtro.fechaInicio, fechaFin: endOfDay(filtro.fechaFin) }; // Asegurar que incluya todo el día final
                }
                return {};
            default:
                return {};
        }
    }, []);

    const endOfDay = (date: Date): Date => {
        const newDate = new Date(date);
        newDate.setHours(23, 59, 59, 999);
        return newDate;
    };

    const fetchTransactions = useCallback((page: number, filtroParaFetch: FiltroState) => {
        setError(null);
        startTransition(async () => {
            const filtrosPayload = buildFilterPayload(filtroParaFetch);
            const result = await getNegocioTransaccionesAction({
                negocioId,
                page,
                pageSize: ITEMS_PER_PAGE,
                filtros: filtrosPayload,
            });
            if (result.success && result.data) {
                setTransactions(result.data.transacciones);
                setCurrentTotalCount(result.data.totalCount);
                setCurrentPage(result.data.page);
                setSumaPeriodo(result.data.sumaPeriodo || 0); // Asumiendo que la action devuelve esto
                setDescripcionPeriodo(result.data.descripcionPeriodo || 'Periodo personalizado'); // Y esto
                setFiltroActivo(filtroParaFetch); // Guardar el filtro que se aplicó
            } else {
                setError(result.error || "No se pudo cargar el historial de transacciones.");
                setTransactions([]);
                setSumaPeriodo(null);
            }
        });
    }, [negocioId, buildFilterPayload]);

    // Carga inicial de datos
    useEffect(() => {
        if (!initialData) { // Solo si no hay datos iniciales (SSR podría haberlos cargado)
            fetchTransactions(1, { tipo: 'mesActual' });
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [negocioId, fetchTransactions]); // Quitar initialData para que no se ejecute si cambia


    const handleAplicarFiltro = () => {
        let nuevoFiltro: FiltroState = { tipo: selectedFilterType };
        if (selectedFilterType === 'mesEspecifico') {
            if (!specificAnio || !specificMes) {
                setError("Por favor, selecciona año y mes.");
                return;
            }
            nuevoFiltro = { tipo: 'mesEspecifico', anio: specificAnio, mes: specificMes };
        } else if (selectedFilterType === 'rangoFechas') {
            if (!rangeFechaInicio || !rangeFechaFin) {
                setError("Por favor, selecciona fecha de inicio y fin.");
                return;
            }
            const inicio = new Date(rangeFechaInicio);
            const fin = new Date(rangeFechaFin);
            if (fin < inicio) {
                setError("La fecha de fin no puede ser anterior a la fecha de inicio.");
                return;
            }
            nuevoFiltro = { tipo: 'rangoFechas', fechaInicio: inicio, fechaFin: fin };
        }
        fetchTransactions(1, nuevoFiltro); // Al aplicar filtro, volver a la página 1
    };

    const handlePreviousPage = () => {
        if (currentPage > 1) fetchTransactions(currentPage - 1, filtroActivo);
    };
    const handleNextPage = () => {
        if (currentPage < totalPages) fetchTransactions(currentPage + 1, filtroActivo);
    };
    const handleRefresh = () => fetchTransactions(currentPage, filtroActivo);


    const getBadgeVariant = (estado: EstadoTransaccionEnum): "default" | "destructive" | "secondary" | "outline" | "success" => { // Removido "warning" si no lo tienes
        switch (estado) {
            case 'COMPLETADA': return 'success';
            case 'PENDIENTE': return 'default';
            case 'EN_PROCESO': return 'default';
            case 'FALLIDA': return 'destructive';
            case 'CANCELADA': return 'destructive';
            case 'REEMBOLSADA': return 'secondary';
            case 'PARCIALMENTE_REEMBOLSADA': return 'outline';
            default: return 'default';
        }
    };

    // Generar años para el select de año (ej. últimos 5 años y el actual)
    const aniosDisponibles = useMemo(() => {
        const currentYear = new Date().getFullYear();
        return Array.from({ length: 5 }, (_, i) => currentYear - i);
    }, []);

    const mesesDelAnio = [
        { valor: 1, nombre: 'Enero' }, { valor: 2, nombre: 'Febrero' }, { valor: 3, nombre: 'Marzo' },
        { valor: 4, nombre: 'Abril' }, { valor: 5, nombre: 'Mayo' }, { valor: 6, nombre: 'Junio' },
        { valor: 7, nombre: 'Julio' }, { valor: 8, nombre: 'Agosto' }, { valor: 9, nombre: 'Septiembre' },
        { valor: 10, nombre: 'Octubre' }, { valor: 11, nombre: 'Noviembre' }, { valor: 12, nombre: 'Diciembre' },
    ];

    return (
        <Card>
            <CardHeader>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
                </div>

                {/* --- SECCIÓN DE FILTROS --- */}
                <div className="mt-6 p-4 border rounded-md bg-zinc-800/30 border-zinc-700 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-end">
                        <div>
                            <Label htmlFor="filtro-tipo" className="text-sm font-medium text-zinc-300">Filtrar por:</Label>
                            <Select
                                value={selectedFilterType}
                                onValueChange={(value) => setSelectedFilterType(value as TipoFiltro)}
                            >
                                <SelectTrigger id="filtro-tipo">
                                    <SelectValue placeholder="Seleccionar periodo" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="mesActual">Mes Actual</SelectItem>
                                    <SelectItem value="quincenaActual">Quincena Actual</SelectItem>
                                    <SelectItem value="mesAnterior">Mes Anterior</SelectItem>
                                    <SelectItem value="anioActual">Año Actual</SelectItem>
                                    <SelectItem value="mesEspecifico">Mes Específico</SelectItem>
                                    <SelectItem value="rangoFechas">Rango de Fechas</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>

                        {selectedFilterType === 'mesEspecifico' && (
                            <>
                                <div>
                                    <Label htmlFor="filtro-anio" className="text-sm font-medium text-zinc-300">Año:</Label>
                                    <Select value={specificAnio.toString()} onValueChange={(val) => setSpecificAnio(Number(val))}>
                                        <SelectTrigger id="filtro-anio"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {aniosDisponibles.map(year => <SelectItem key={year} value={year.toString()}>{year}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div>
                                    <Label htmlFor="filtro-mes" className="text-sm font-medium text-zinc-300">Mes:</Label>
                                    <Select value={specificMes.toString()} onValueChange={(val) => setSpecificMes(Number(val))}>
                                        <SelectTrigger id="filtro-mes"><SelectValue /></SelectTrigger>
                                        <SelectContent>
                                            {mesesDelAnio.map(m => <SelectItem key={m.valor} value={m.valor.toString()}>{m.nombre}</SelectItem>)}
                                        </SelectContent>
                                    </Select>
                                </div>
                            </>
                        )}

                        {selectedFilterType === 'rangoFechas' && (
                            <>
                                <div>
                                    <Label htmlFor="filtro-fecha-inicio" className="text-sm font-medium text-zinc-300">Desde:</Label>
                                    <Input type="date" id="filtro-fecha-inicio" value={rangeFechaInicio} onChange={e => setRangeFechaInicio(e.target.value)} />
                                </div>
                                <div>
                                    <Label htmlFor="filtro-fecha-fin" className="text-sm font-medium text-zinc-300">Hasta:</Label>
                                    <Input type="date" id="filtro-fecha-fin" value={rangeFechaFin} onChange={e => setRangeFechaFin(e.target.value)} />
                                </div>
                            </>
                        )}
                        <div className={selectedFilterType === 'mesEspecifico' || selectedFilterType === 'rangoFechas' ? 'col-span-1' : 'md:col-start-4'}>
                            <Button onClick={handleAplicarFiltro} disabled={isPending} className="w-full">
                                <Filter size={16} className="mr-2" />
                                Aplicar Filtro
                            </Button>
                        </div>
                    </div>
                </div>
                {/* --- FIN SECCIÓN DE FILTROS --- */}

                {/* --- SUMATORIA DEL PERIODO --- */}
                {sumaPeriodo !== null && (
                    <div className="mt-4 p-3 text-center rounded-md bg-blue-600/10 text-blue-300 border border-blue-500/30">
                        <p className="text-xs uppercase tracking-wider">{descripcionPeriodo}</p>
                        <p className="text-2xl font-bold">
                            {sumaPeriodo.toLocaleString('es-MX', { style: 'currency', currency: 'MXN' })}
                        </p>
                        <p className="text-xs">Total de ingresos brutos en el periodo</p>
                    </div>
                )}
                {/* --- FIN SUMATORIA DEL PERIODO --- */}

            </CardHeader>
            <CardContent>
                {error && ( /* ... (mensaje de error) ... */
                    <div className="flex items-center gap-2 p-3 mb-4 text-sm rounded-md bg-red-500/10 text-red-700 dark:text-red-300 border border-red-700/30">
                        <AlertTriangle size={18} /> {error}
                    </div>
                )}
                {isPending && transactions.length === 0 && !error && <p className="text-center py-4">Cargando transacciones...</p>}
                {!isPending && transactions.length === 0 && !error && (
                    <p className="text-center text-zinc-500 dark:text-zinc-400 py-4">
                        No hay transacciones registradas para el periodo seleccionado.
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
                                                {format(new Date(tx.fechaTransaccion), 'dd MMM yyyy, HH:mm', { locale: es })}
                                            </TableCell>
                                            <TableCell className="font-medium">{tx.concepto}</TableCell>
                                            <TableCell className="text-right">
                                                {tx.montoBruto.toLocaleString('es-MX', { style: 'currency', currency: tx.moneda || 'MXN' })}
                                            </TableCell>
                                            <TableCell className="capitalize">{tx.metodoPagoUtilizado.replace(/_/g, ' ').toLowerCase()}</TableCell>
                                            <TableCell>{tx.nombreComprador || tx.emailComprador || 'N/A'}</TableCell>
                                            <TableCell>
                                                <Badge variant={getBadgeVariant(tx.estado)}>
                                                    {tx.estado.replace(/_/g, ' ').toLowerCase()}
                                                </Badge>
                                            </TableCell>
                                            <TableCell className="text-xs text-zinc-400 truncate max-w-[100px]" title={tx.referenciaProcesador || undefined}>
                                                {tx.referenciaProcesador || '-'}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Paginación */}
                        {totalPages > 1 && ( /* ... (código de paginación sin cambios) ... */
                            <div className="flex items-center justify-between pt-4 mt-4 border-t border-zinc-700">
                                <Button variant="outline" size="sm" onClick={handlePreviousPage} disabled={currentPage === 1 || isPending}>
                                    <ArrowLeft size={16} className="mr-2" /> Anterior
                                </Button>
                                <span className="text-sm text-zinc-300">
                                    Página {currentPage} de {totalPages} (Total filtrado: {currentTotalCount} transacciones)
                                </span>
                                <Button variant="outline" size="sm" onClick={handleNextPage} disabled={currentPage === totalPages || isPending}>
                                    Siguiente <ArrowRight size={16} className="ml-2" />
                                </Button>
                            </div>
                        )}
                    </>
                )}
            </CardContent>
        </Card>
    );
}
