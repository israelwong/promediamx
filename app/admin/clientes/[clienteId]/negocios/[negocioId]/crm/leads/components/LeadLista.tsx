// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/components/LeadLista.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/app/admin/_lib/hooks/useDebounce';

// --- NUEVAS IMPORTS ---
import {
    listarLeadsAction,
    obtenerDatosFiltrosLeadAction
} from '@/app/admin/_lib/actions/lead/lead.actions'; // Nueva ruta
import type {
    LeadListaItemData,
    FiltrosLeadsData, // Usar este tipo para el estado de filtros
    OpcionesSortLeadsData, // Usar este tipo para el estado de sort
    DatosParaFiltrosLeadData,
    ListarLeadsParams, // Para construir el input de listarLeadsAction
} from '@/app/admin/_lib/actions/lead/lead.schemas'; // Nuevos tipos/schemas

// Componentes UI (sin cambios en importación)
import { Input } from "@/app/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/app/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/app/components/ui/table";
import { Button } from "@/app/components/ui/button";
import { Loader2, Search, ArrowUpDown, PlusCircle, MessageSquare, X } from 'lucide-react';
import { Badge } from "@/app/components/ui/badge";

interface Props {
    negocioId: string;
    clienteId: string;
}

const DEBOUNCE_DELAY = 300;

export default function LeadLista({ clienteId, negocioId }: Props) {
    const router = useRouter();
    const [leads, setLeads] = useState<LeadListaItemData[]>([]);
    const [crmId, setCrmId] = useState<string | null | undefined>(undefined); // undefined para estado inicial de "no cargado"
    const [datosFiltros, setDatosFiltros] = useState<DatosParaFiltrosLeadData | null>(null);
    const [loading, setLoading] = useState(true);
    const [loadingFilters, setLoadingFilters] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [filtros, setFiltros] = useState<FiltrosLeadsData>({ // Usar el tipo de Zod
        searchTerm: '',
        pipelineId: 'all', // 'all' o un CUID
        canalId: 'all',
        etiquetaId: 'all',
        agenteId: 'all',
    });
    const debouncedSearchTerm = useDebounce(filtros.searchTerm || '', DEBOUNCE_DELAY); // Asegurar que sea string

    const [sort, setSort] = useState<OpcionesSortLeadsData>({ // Usar el tipo de Zod
        campo: 'updatedAt',
        direccion: 'desc'
    });

    const fetchLeads = useCallback(async () => {
        if (crmId === undefined) return; // No cargar si crmId aún no se ha determinado desde fetchFilterData

        setLoading(true);
        setError(null);
        try {
            const paramsForAction: ListarLeadsParams = {
                negocioId,
                filtros: {
                    ...filtros,
                    searchTerm: debouncedSearchTerm,
                    // Convertir 'all' a null para la action si es necesario, o la action lo maneja
                    pipelineId: filtros.pipelineId === 'all' ? null : filtros.pipelineId,
                    canalId: filtros.canalId === 'all' ? null : filtros.canalId,
                    etiquetaId: filtros.etiquetaId === 'all' ? null : filtros.etiquetaId,
                    agenteId: filtros.agenteId === 'all' ? null : filtros.agenteId,
                },
                sort,
            };
            const result = await listarLeadsAction(paramsForAction); // Nueva Action

            if (result.success && result.data) {
                setCrmId(result.data.crmId); // Actualizar crmId (puede ser null si no hay CRM)
                setLeads(result.data.leads);
                if (result.data.crmId === null && result.data.leads.length === 0) {
                    // setError("CRM no configurado para este negocio. No se pueden mostrar leads."); 
                    // O simplemente mostrar "No hay leads" como ya hace
                }
            } else {
                throw new Error(result.error || "Error desconocido al cargar leads.");
            }
        } catch (err) {
            console.error("Error fetching leads:", err);
            setError(`No se pudieron cargar los leads: ${err instanceof Error ? err.message : "Error desconocido"}`);
            setLeads([]);
        } finally {
            setLoading(false);
        }
    }, [negocioId, debouncedSearchTerm, filtros, sort, crmId]); // crmId como dependencia

    const fetchFilterData = useCallback(async () => {
        setLoadingFilters(true);
        try {
            const result = await obtenerDatosFiltrosLeadAction({ negocioId }); // Nueva Action
            if (result.success && result.data) {
                setDatosFiltros(result.data);
                setCrmId(result.data.crmId); // Establecer crmId (puede ser null)
            } else {
                console.warn("No se pudieron cargar los datos para filtros:", result.error);
                setCrmId(null); // Asumir que no hay CRM si falla la carga de filtros
                setDatosFiltros(null);
            }
        } catch (err) {
            console.error("Error fetching filter data:", err);
            setCrmId(null);
            setDatosFiltros(null);
        } finally {
            setLoadingFilters(false);
        }
    }, [negocioId]);

    useEffect(() => {
        if (negocioId) fetchFilterData();
    }, [fetchFilterData, negocioId]);

    useEffect(() => {
        if (crmId !== undefined && negocioId) { // Solo cargar leads si crmId ha sido determinado y hay negocioId
            fetchLeads();
        }
    }, [debouncedSearchTerm, filtros, sort, crmId, fetchLeads, negocioId]);



    // --- Manejadores de Eventos ---
    const handleFilterChange = (name: keyof FiltrosLeadsData, value: string) => {
        setFiltros(prev => ({ ...prev, [name]: value }));
        // La recarga se dispara por el useEffect que depende de 'filtros'
    };

    // --- NUEVO: Manejador para quitar un filtro desde el badge ---
    const handleRemoveFilter = (name: keyof FiltrosLeadsData) => {
        setFiltros(prev => ({ ...prev, [name]: 'all' }));
    };

    const handleSortChange = (campo: OpcionesSortLeadsData['campo']) => {
        setSort(prev => ({ campo, direccion: prev.campo === campo && prev.direccion === 'desc' ? 'asc' : 'desc' }));
    };
    const handleViewDetails = (leadId: string) => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads/${leadId}`);
    };

    const handleCrearNuevoLead = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/crm/leads/nuevo`);
    };

    const getStatusBadgeVariant = (status: string | null | undefined): "default" | "secondary" | "destructive" | "outline" => { /* ... (sin cambios, pero considera que status puede ser null) ... */
        switch (status?.toLowerCase()) {
            case 'nuevo': return 'default'; // Azul/primario
            case 'contactado': return 'secondary';
            case 'calificado': return 'default'; // Podría ser otro color
            case 'propuesta': return 'default';
            case 'negociacion': return 'default';
            case 'ganado': return 'default'; // Verde
            case 'perdido': return 'destructive'; // Rojo
            case 'descartado': return 'outline'; // Gris
            default: return 'secondary';
        }
    };

    // const getPipelineColor = (pipeline: LeadListaItemData['pipeline']): string => { /* ... */ return pipeline?.color || 'bg-zinc-600'; };

    const activeFilters = useMemo(() => { /* ... (lógica similar, pero usa datosFiltros con el nuevo tipo) ... */
        const active: { key: keyof FiltrosLeadsData; label: string; valueLabel: string }[] = [];
        if (filtros.pipelineId && filtros.pipelineId !== 'all') {
            const pipeline = datosFiltros?.pipelines.find(p => p.id === filtros.pipelineId);
            if (pipeline) active.push({ key: 'pipelineId', label: 'Etapa', valueLabel: pipeline.nombre });
        }
        // ... replicar para canalId, etiquetaId, agenteId usando datosFiltros ...
        if (filtros.canalId && filtros.canalId !== 'all') {
            const canal = datosFiltros?.canales.find(c => c.id === filtros.canalId);
            if (canal) active.push({ key: 'canalId', label: 'Canal', valueLabel: canal.nombre });
        }
        if (filtros.etiquetaId && filtros.etiquetaId !== 'all') {
            const etiqueta = datosFiltros?.etiquetas.find(e => e.id === filtros.etiquetaId);
            if (etiqueta) active.push({ key: 'etiquetaId', label: 'Etiqueta', valueLabel: etiqueta.nombre });
        }
        if (filtros.agenteId && filtros.agenteId !== 'all') {
            const agente = datosFiltros?.agentes.find(a => a.id === filtros.agenteId);
            if (agente) active.push({ key: 'agenteId', label: 'Agente', valueLabel: agente.nombre ?? 'N/A' });
        }
        return active;
    }, [filtros, datosFiltros]);

    // --- Renderizado ---
    interface TableColumn {
        key: string;
        label: string;
        sortable?: boolean;
    }


    const tableColumns: TableColumn[] = useMemo(() => [
        { key: 'nombre', label: 'Nombre', sortable: true },
        { key: 'pipeline', label: 'Etapa', sortable: false },
        { key: 'status', label: 'Estado', sortable: false },
        { key: 'etiquetas', label: 'Etiquetas', sortable: false },
        { key: 'agente', label: 'Agente', sortable: false },
        { key: 'valorEstimado', label: 'Valor Estimado', sortable: true },
        { key: 'ultimaConversacion', label: 'Última actualización', sortable: false },
        { key: 'createdAt', label: 'Creado', sortable: true },
        // { key: 'acciones', label: 'Acciones', sortable: false },
    ], []);

    // JSX de renderizado (la estructura es la misma, pero ahora los datos en `leads` y `datosFiltros`
    // son de los tipos inferidos por Zod: `LeadListaItemData` y `DatosParaFiltrosLeadData`)
    // Debes asegurarte que el acceso a propiedades (ej. `lead.pipeline?.nombre`) sea compatible.
    // El mapeo en la Server Action ya debería estar alineado con LeadListaItemData.

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Cabecera */}
            <div className="flex items-center justify-between gap-4">
                <h2 className="text-xl font-semibold text-white flex-shrink-0">Leads</h2>
                {/* Botón Nuevo Lead (movido aquí para mejor flujo) */}
                <Button onClick={() => handleCrearNuevoLead()} className="bg-blue-600 hover:bg-blue-700 ml-auto">
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
                            value={filtros.searchTerm ?? ''}
                            onChange={(e) => handleFilterChange('searchTerm', e.target.value)}
                            className="pl-8 w-full bg-zinc-800 border-zinc-700 h-9" // Altura ajustada
                        />
                    </div>
                </div>
                {/* Filtro Pipeline */}
                <div>
                    <label htmlFor="filter-pipeline" className="text-xs font-medium text-zinc-400 block mb-1">Etapa</label>
                    <Select value={filtros.pipelineId ?? 'all'} onValueChange={(v) => handleFilterChange('pipelineId', v)} disabled={loadingFilters}>
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
                    <Select value={filtros.canalId ?? 'all'} onValueChange={(v) => handleFilterChange('canalId', v)} disabled={loadingFilters}>
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
                    <Select value={filtros.agenteId ?? 'all'} onValueChange={(v) => handleFilterChange('agenteId', v)} disabled={loadingFilters}>
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

            {/* ... (sin cambios en JSX) ... */}

            {/* Tabla de Leads */}
            <div className="flex-1 overflow-auto border border-zinc-700 rounded-lg">
                <Table className="min-w-full">
                    <TableHeader className="bg-zinc-800 sticky top-0 z-10">
                        <TableRow>
                            {tableColumns.map((col) => (
                                <TableHead key={col.key} className="text-zinc-400 px-4 py-2 whitespace-nowrap">
                                    {col.sortable ? (
                                        <Button variant="ghost" onClick={() => handleSortChange(col.key as OpcionesSortLeadsData['campo'])} className="px-1 py-0 h-auto hover:bg-zinc-700">
                                            {col.label}
                                            <ArrowUpDown className={`ml-2 h-3 w-3 ${sort.campo === col.key ? 'text-white' : 'text-zinc-500'}`} />
                                        </Button>
                                    ) : (col.label)}
                                </TableHead>
                            ))}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {loading && crmId === undefined && ( /* Solo mostrar "Cargando filtros..." al inicio */
                            <TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-zinc-400"><Loader2 className="inline-block h-6 w-6 animate-spin mr-2" /> Cargando filtros y configuración...</TableCell></TableRow>
                        )}
                        {loading && crmId !== undefined && ( /* "Cargando leads..." una vez que los filtros cargaron */
                            <TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-zinc-400"><Loader2 className="inline-block h-6 w-6 animate-spin mr-2" /> Cargando leads...</TableCell></TableRow>
                        )}
                        {!loading && error && (
                            <TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-red-400 p-4">{error}</TableCell></TableRow>
                        )}
                        {!loading && !error && crmId === null && ( /* Si crmId es null, no hay CRM */
                            <TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-zinc-500 p-4">El CRM no está configurado para este negocio. No se pueden mostrar leads.</TableCell></TableRow>
                        )}
                        {!loading && !error && crmId !== null && leads.length === 0 && ( /* Hay CRM pero no leads */
                            <TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-zinc-500 p-4">No se encontraron leads que coincidan con los filtros.</TableCell></TableRow>
                        )}
                        {!loading && !error && crmId !== null && leads.length > 0 && (
                            leads.map((lead) => (
                                <TableRow key={lead.id} className="hover:bg-zinc-800/50 cursor-pointer"
                                    onClick={() => handleViewDetails(lead.id)}>
                                    {/* Asegúrate que las propiedades coincidan con LeadListaItemData */}
                                    <TableCell className="font-medium text-zinc-100 px-4 py-2">
                                        <p className="truncate max-w-[200px]" title={lead.nombre}>{lead.nombre}</p>
                                        <p className="text-xs text-zinc-400 truncate max-w-[200px]" title={lead.email || ''}>{lead.email || '-'}</p>
                                    </TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-300 text-xs">
                                        <div className="flex items-center gap-2">
                                            {lead.pipeline?.color && <span className={`w-2 h-2 rounded-full flex-shrink-0`} style={{ backgroundColor: lead.pipeline.color }}></span>}
                                            <span>{lead.pipeline?.nombre || '-'}</span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-2 text-xs">
                                        <Badge variant={getStatusBadgeVariant(lead.status)} className="capitalize">{lead.status?.replace('_', ' ') || '-'}</Badge>
                                    </TableCell>
                                    <TableCell className="px-4 py-2">
                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                            {lead.etiquetas?.slice(0, 2).map(item => ( // Acceder a item.etiqueta
                                                <Badge key={item.etiqueta.id} variant="secondary" className="text-[10px]" style={{ backgroundColor: item.etiqueta.color ? `${item.etiqueta.color}20` : undefined, color: item.etiqueta.color || undefined, borderColor: item.etiqueta.color ? `${item.etiqueta.color}80` : undefined }}>
                                                    {item.etiqueta.nombre}
                                                </Badge>
                                            ))}
                                            {lead.etiquetas && lead.etiquetas.length > 2 && <Badge variant="secondary" className="text-[10px]">...</Badge>}
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-300 text-xs">{lead.agente?.nombre || '-'}</TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-300 text-xs">{lead.valorEstimado ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(lead.valorEstimado) : '-'}</TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-400 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            {lead.ultimaConversacion && (<MessageSquare size={12} className={lead.ultimaConversacion.status === 'abierta' ? 'text-green-400' : 'text-zinc-500'} />)}
                                            <span>
                                                {lead.ultimaConversacion?.updatedAt
                                                    ? new Date(lead.ultimaConversacion.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })
                                                    : (lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }) : '-')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    <TableCell className="px-4 py-2 text-zinc-400 text-xs">
                                        {new Date(lead.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' })}
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    );
}