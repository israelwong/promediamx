// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/components/LeadLista.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/app/admin/_lib/hooks/useDebounce';

// Importar acciones y tipos
import { obtenerLeadsCRM, obtenerDatosParaFiltrosLead } from '@/app/admin/_lib/crmLead.actions';
import {
    LeadListaItem, FiltrosLeads, OpcionesSortLeads,
    DatosFiltros
} from '@/app/admin/_lib/types';

// Importar componentes UI
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
// --- DropdownMenu ya no se importa ---
// import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Loader2, Search, ArrowUpDown, Eye, PlusCircle, MessageSquare, X } from 'lucide-react'; // Añadido X para quitar filtro
import { Badge } from "../../components/ui/badge";

interface Props {
    negocioId: string;
    // Opcional: Pasar clienteId si lo necesitas para la navegación
    // clienteId: string;
}

const DEBOUNCE_DELAY = 300; // ms

export default function LeadLista({ negocioId }: Props) {
    const router = useRouter();
    const [leads, setLeads] = useState<LeadListaItem[]>([]);
    const [crmId, setCrmId] = useState<string | null>(null);
    const [datosFiltros, setDatosFiltros] = useState<DatosFiltros | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingFilters, setLoadingFilters] = useState(true); // Estado separado para carga de filtros
    const [error, setError] = useState<string | null>(null);

    // Estado para filtros
    const [filtros, setFiltros] = useState<FiltrosLeads>({
        searchTerm: '',
        pipelineId: 'all',
        canalId: 'all',
        etiquetaId: 'all',
        agenteId: 'all',
    });
    const debouncedSearchTerm = useDebounce(filtros.searchTerm, DEBOUNCE_DELAY);

    // Estado para ordenamiento
    const [sort, setSort] = useState<OpcionesSortLeads>({ campo: 'updatedAt', direccion: 'desc' });

    // --- Carga de Datos ---
    const fetchLeads = useCallback(async () => {
        // No iniciar carga si aún no tenemos crmId (evita llamadas innecesarias)
        // if (!crmId && crmId !== null) return; // Permitir carga si crmId es null (CRM no existe)

        setLoading(true);
        setError(null);
        try {
            const filtrosActivos: FiltrosLeads = { ...filtros, searchTerm: debouncedSearchTerm };
            const result = await obtenerLeadsCRM(negocioId, filtrosActivos, sort);
            if (result.success && result.data) {
                // Actualizar crmId solo si es la primera carga o cambió
                if (crmId === undefined) setCrmId(result.data.crmId);
                setLeads(result.data.leads);
                if (!result.data.crmId && result.data.leads.length === 0) { setError(null); }
            } else { throw new Error(result.error || "Error desconocido al cargar leads."); }
        } catch (err) {
            console.error("Error fetching leads:", err);
            setError(`No se pudieron cargar los leads: ${err instanceof Error ? err.message : "Error desconocido"}`);
            setLeads([]);
        } finally { setLoading(false); }
    }, [negocioId, debouncedSearchTerm, filtros, sort, crmId]); // Añadir crmId a dependencias? Revisar

    const fetchFilterData = useCallback(async () => {
        setLoadingFilters(true);
        try {
            const result = await obtenerDatosParaFiltrosLead(negocioId);
            if (result.success && result.data) {
                setDatosFiltros(result.data);
                // Obtener crmId de esta llamada también si es la primera vez
                if (crmId === undefined) {
                    const crmResult = result.data as (DatosFiltros & { crmId?: string | null }); // Asumir que la acción puede devolverlo
                    setCrmId(crmResult.crmId ?? null);
                }
            }
            else { console.warn("No se pudieron cargar los datos para filtros:", result.error); }
        } catch (err) { console.error("Error fetching filter data:", err); }
        finally { setLoadingFilters(false); }
    }, [negocioId, crmId]); // Depender de crmId aquí? Revisar

    // Carga inicial
    useEffect(() => {
        fetchFilterData();
    }, [fetchFilterData]);

    // Carga de leads cuando cambian filtros o sort (y crmId está definido o es null)
    useEffect(() => {
        // Ejecutar solo si crmId no es undefined (ya se intentó cargar)
        if (crmId !== undefined) {
            fetchLeads();
        }
    }, [debouncedSearchTerm, filtros, sort, crmId, fetchLeads]); // Depender de crmId


    // --- Manejadores de Eventos ---
    const handleFilterChange = (name: keyof FiltrosLeads, value: string) => {
        setFiltros(prev => ({ ...prev, [name]: value }));
        // La recarga se dispara por el useEffect que depende de 'filtros'
    };

    // --- NUEVO: Manejador para quitar un filtro desde el badge ---
    const handleRemoveFilter = (name: keyof FiltrosLeads) => {
        setFiltros(prev => ({ ...prev, [name]: 'all' }));
    };

    const handleSortChange = (campo: OpcionesSortLeads['campo']) => {
        setSort(prev => ({ campo, direccion: prev.campo === campo && prev.direccion === 'desc' ? 'asc' : 'desc' }));
    };
    const handleViewDetails = (leadId: string) => {
        router.push(`/admin/clientes/dummy/negocios/${negocioId}/crm/leads/${leadId}`);
    };

    // --- Renderizado ---
    interface TableColumn {
        key: string;
        label: string;
        sortable?: boolean;
    }

    const tableColumns: TableColumn[] = useMemo(() => [
        { key: 'nombre', label: 'Nombre', sortable: true },
        { key: 'pipeline', label: 'Etapa', sortable: true },
        { key: 'status', label: 'Estado', sortable: false },
        { key: 'etiquetas', label: 'Etiquetas', sortable: false },
        { key: 'agente', label: 'Agente', sortable: true },
        { key: 'valorEstimado', label: 'Valor Estimado', sortable: true },
        { key: 'ultimaConversacion', label: 'Última Conversación', sortable: false },
        { key: 'createdAt', label: 'Creado', sortable: true },
        { key: 'acciones', label: 'Acciones', sortable: false },
    ], []);
    const getStatusBadgeVariant = (status: string): "default" | "secondary" | "destructive" | "outline" => {
        switch (status) {
            case 'active':
                return 'default';
            case 'inactive':
                return 'destructive';
            default:
                return 'secondary';
        }
    };
    const getPipelineColor = (): string => { /* ... (sin cambios) ... */ return 'bg-zinc-600' };

    // --- NUEVO: Lógica para mostrar filtros activos ---
    const activeFilters = useMemo(() => {
        const active: { key: keyof FiltrosLeads; label: string; valueLabel: string }[] = [];
        if (filtros.pipelineId !== 'all') {
            const pipeline = datosFiltros?.pipelines.find(p => p.id === filtros.pipelineId);
            if (pipeline) active.push({ key: 'pipelineId', label: 'Etapa', valueLabel: pipeline.nombre });
        }
        if (filtros.canalId !== 'all') {
            const canal = datosFiltros?.canales.find(c => c.id === filtros.canalId);
            if (canal) active.push({ key: 'canalId', label: 'Canal', valueLabel: canal.nombre });
        }
        if (filtros.etiquetaId !== 'all') {
            const etiqueta = datosFiltros?.etiquetas.find(e => e.id === filtros.etiquetaId);
            if (etiqueta) active.push({ key: 'etiquetaId', label: 'Etiqueta', valueLabel: etiqueta.nombre });
        }
        if (filtros.agenteId !== 'all') {
            const agente = datosFiltros?.agentes.find(a => a.id === filtros.agenteId);
            if (agente) active.push({ key: 'agenteId', label: 'Agente', valueLabel: agente.nombre ?? '' });
        }
        return active;
    }, [filtros, datosFiltros]);
    // --- FIN Lógica Filtros Activos ---


    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Cabecera */}
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white flex-shrink-0">Leads</h2>
                {/* Botón Nuevo Lead (movido aquí para mejor flujo) */}
                <Button onClick={() => router.push(`/admin/clientes/dummy/negocios/${negocioId}/crm/leads/nuevo`)} className="bg-blue-600 hover:bg-blue-700 ml-auto">
                    <PlusCircle className="h-4 w-4 mr-2" /> Nuevo Lead
                </Button>
            </div>

            {/* --- Nueva Sección de Filtros Visibles --- */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 items-end pb-4 border-b border-zinc-700">
                {/* Input de Búsqueda */}
                <div className="lg:col-span-2">
                    <label htmlFor="search-leads" className="text-xs font-medium text-zinc-400 block mb-1">Buscar</label>
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input
                            id="search-leads"
                            type="search"
                            placeholder="Nombre, email, teléfono..."
                            value={filtros.searchTerm}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            className="pl-8 w-full bg-zinc-800 border-zinc-700 h-9" // Altura ajustada
                        />
                    </div>
                </div>
                {/* Filtro Pipeline */}
                <div>
                    <label htmlFor="filter-pipeline" className="text-xs font-medium text-zinc-400 block mb-1">Etapa</label>
                    <Select value={filtros.pipelineId} onValueChange={(v) => handleFilterChange('pipelineId', v)} disabled={loadingFilters}>
                        <SelectTrigger id="filter-pipeline" className="bg-zinc-800 border-zinc-700 h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {datosFiltros?.pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {/* Filtro Canal */}
                <div>
                    <label htmlFor="filter-canal" className="text-xs font-medium text-zinc-400 block mb-1">Canal</label>
                    <Select value={filtros.canalId} onValueChange={(v) => handleFilterChange('canalId', v)} disabled={loadingFilters}>
                        <SelectTrigger id="filter-canal" className="bg-zinc-800 border-zinc-700 h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {datosFiltros?.canales.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {/* Filtro Agente */}
                <div>
                    <label htmlFor="filter-agente" className="text-xs font-medium text-zinc-400 block mb-1">Agente</label>
                    <Select value={filtros.agenteId} onValueChange={(v) => handleFilterChange('agenteId', v)} disabled={loadingFilters}>
                        <SelectTrigger id="filter-agente" className="bg-zinc-800 border-zinc-700 h-9"><SelectValue placeholder="Todos" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todos</SelectItem>
                            {datosFiltros?.agentes.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}
                        </SelectContent>
                    </Select>
                </div>
                {/* Filtro Etiqueta (se mantiene en Select por simplicidad, podría ser MultiSelect si se arregla) */}
                {/* <div className="lg:col-start-4">
                    <label htmlFor="filter-etiqueta" className="text-xs font-medium text-zinc-400 block mb-1">Etiqueta</label>
                    <Select value={filtros.etiquetaId} onValueChange={(v) => handleFilterChange('etiquetaId', v)} disabled={loadingFilters}>
                        <SelectTrigger id="filter-etiqueta" className="bg-zinc-800 border-zinc-700 h-9"><SelectValue placeholder="Todas" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            {datosFiltros?.etiquetas.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}
                        </SelectContent>
                    </Select>
                 </div> */}
            </div>
            {/* --- Fin Nueva Sección Filtros --- */}

            {/* --- NUEVO: Mostrar Filtros Activos --- */}
            {activeFilters.length > 0 && (
                <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 mb-2">
                    <span>Filtros activos:</span>
                    {activeFilters.map(filter => (
                        <Badge key={filter.key} variant="secondary" className="pl-2 pr-1 py-0.5">
                            {filter.label}: {filter.valueLabel}
                            <button onClick={() => handleRemoveFilter(filter.key)} className="ml-1 p-0.5 rounded-full hover:bg-zinc-600" title={`Quitar filtro ${filter.label}`}>
                                <X size={10} />
                            </button>
                        </Badge>
                    ))}
                    <Button variant="ghost" size="sm" onClick={() => setFiltros({ searchTerm: '', pipelineId: 'all', canalId: 'all', etiquetaId: 'all', agenteId: 'all' })} className="h-auto p-1 text-xs text-red-400 hover:text-red-300">
                        Limpiar todo
                    </Button>
                </div>
            )}
            {/* --- FIN Filtros Activos --- */}


            {/* Tabla de Leads */}
            <div className="flex-1 overflow-auto border border-zinc-700 rounded-lg">
                <Table className="min-w-full">
                    <TableHeader className="bg-zinc-800 sticky top-0 z-10">
                        <TableRow>
                            {tableColumns.map((col) => (
                                <TableHead key={col.key} className="text-zinc-400 px-4 py-2 whitespace-nowrap">
                                    {col.sortable ? (
                                        <Button variant="ghost" onClick={() => handleSortChange(col.key as OpcionesSortLeads['campo'])} className="px-1 py-0 h-auto hover:bg-zinc-700">
                                            {col.label}
                                            <ArrowUpDown className={`ml-2 h-3 w-3 ${sort.campo === col.key ? 'text-white' : 'text-zinc-500'}`} />
                                        </Button>
                                    ) : (col.label)}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {/* ... (Renderizado de filas de la tabla sin cambios) ... */}
                        {loading ? (<TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-zinc-400"><Loader2 className="inline-block h-6 w-6 animate-spin mr-2" /> Cargando leads...</TableCell></TableRow>
                        ) : error ? (<TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-red-500">{error}</TableCell></TableRow>
                        ) : leads.length === 0 ? (<TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-zinc-500">No se encontraron leads.</TableCell></TableRow>
                        ) : (
                            leads.map((lead) => (
                                <TableRow key={lead.id} className="hover:bg-zinc-800/50">
                                    <TableCell className="font-medium text-zinc-100 px-4 py-2"><p className="truncate max-w-[200px]" title={lead.nombre}>{lead.nombre}</p><p className="text-xs text-zinc-400 truncate max-w-[200px]" title={lead.email || ''}>{lead.email || '-'}</p></TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-300 text-xs"><div className="flex items-center gap-2">
                                        <span className={`w-2 h-2 rounded-full ${getPipelineColor()} flex-shrink-0`}></span>
                                        <span>{lead.pipeline?.nombre || '-'}</span></div>
                                    </TableCell>
                                    <TableCell className="px-4 py-2 text-xs">
                                        <Badge
                                            variant={getStatusBadgeVariant(lead.status || '')}
                                            className="capitalize">{lead.status?.replace('_', ' ') || '-'}
                                        </Badge></TableCell>
                                    <TableCell className="px-4 py-2"><div className="flex flex-wrap gap-1 max-w-[150px]">{lead.etiquetas?.slice(0, 2).map(({ etiqueta }) => (<Badge key={etiqueta.id} variant="secondary" className="text-[10px]" style={{ backgroundColor: etiqueta.color ? `${etiqueta.color}20` : undefined, color: etiqueta.color || undefined, borderColor: etiqueta.color ? `${etiqueta.color}80` : undefined }}>{etiqueta.nombre}</Badge>))}{lead.etiquetas && lead.etiquetas.length > 2 && <Badge variant="secondary" className="text-[10px]">...</Badge>}</div></TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-300 text-xs">{lead.agente?.nombre || '-'}</TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-300 text-xs">{lead.valorEstimado ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(lead.valorEstimado) : '-'}</TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-400 text-xs"><div className="flex items-center gap-1.5">{lead.ultimaConversacion && (<MessageSquare size={12} className={lead.ultimaConversacion.status === 'abierta' ? 'text-green-400' : 'text-zinc-500'} />)}<span>
                                        {lead.ultimaConversacion?.updatedAt ? new Date(lead.ultimaConversacion.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : (lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : '-')}
                                    </span></div></TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-400 text-xs">{new Date(lead.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' })}</TableCell>
                                    <TableCell className="px-4 py-2 text-right"><Button variant="ghost" size="sm" onClick={() => handleViewDetails(lead.id)} className="h-7 px-2 hover:bg-zinc-700"><Eye className="h-4 w-4 text-zinc-400" /></Button></TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}
