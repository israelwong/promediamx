// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/leads/components/LeadLista.tsx
'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useDebounce } from '@/app/admin/_lib/hooks/useDebounce'; // Asume que tienes un hook de debounce

// Importar acciones y tipos
import { obtenerLeadsCRM, obtenerDatosParaFiltrosLead } from '@/app/admin/_lib/crmLead.actions'; // Ajusta ruta!
import {
    LeadListaItem, FiltrosLeads, OpcionesSortLeads,
    DatosFiltros
} from '@/app/admin/_lib/types'; // Ajusta ruta!

// Importar componentes UI
import { Input } from "../../components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "../../components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { Button } from "../../components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "../../components/ui/dropdown-menu";
import { Loader2, Search, Filter as FilterIcon, ArrowUpDown, Eye, PlusCircle, MessageSquare } from 'lucide-react'; // Añadido MessageSquare
import { Badge } from "../../components/ui/badge";

interface Props {
    negocioId: string;
}

const DEBOUNCE_DELAY = 300; // ms

export default function LeadLista({ negocioId }: Props) {
    const router = useRouter();
    const [leads, setLeads] = useState<LeadListaItem[]>([]);
    // const [crmId, setCrmId] = useState<string | null>(null);
    const [datosFiltros, setDatosFiltros] = useState<DatosFiltros | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [filtros, setFiltros] = useState<FiltrosLeads>({ /* ... */ });
    const debouncedSearchTerm = useDebounce(filtros.searchTerm, DEBOUNCE_DELAY);
    const [sort, setSort] = useState<OpcionesSortLeads>({ campo: 'updatedAt', direccion: 'desc' });

    // --- Carga de Datos (sin cambios) ---
    const fetchLeads = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const filtrosActivos: FiltrosLeads = { ...filtros, searchTerm: debouncedSearchTerm };
            const result = await obtenerLeadsCRM(negocioId, filtrosActivos, sort);
            if (result.success && result.data) {
                // setCrmId(result.data.crmId);
                setLeads(result.data.leads);
                if (!result.data.crmId && result.data.leads.length === 0) { setError(null); }
            } else { throw new Error(result.error || "Error desconocido al cargar leads."); }
        } catch (err) {
            console.error("Error fetching leads:", err);
            setError(`No se pudieron cargar los leads: ${err instanceof Error ? err.message : "Error desconocido"}`);
            setLeads([]);
        } finally { setLoading(false); }
    }, [negocioId, debouncedSearchTerm, filtros, sort]);

    const fetchFilterData = useCallback(async () => {
        try {
            const result = await obtenerDatosParaFiltrosLead(negocioId);
            if (result.success && result.data) { setDatosFiltros(result.data); }
            else { console.warn("No se pudieron cargar los datos para filtros:", result.error); }
        } catch (err) { console.error("Error fetching filter data:", err); }
    }, [negocioId]);

    useEffect(() => {
        fetchLeads();
        fetchFilterData();
    }, [fetchLeads, fetchFilterData]);

    useEffect(() => {
        if (debouncedSearchTerm !== filtros.searchTerm && filtros.searchTerm === '') { }
        else { fetchLeads(); }
    }, [debouncedSearchTerm, filtros.searchTerm, filtros.pipelineId, filtros.canalId, filtros.etiquetaId, filtros.agenteId, sort, fetchLeads]);

    // --- Manejadores de Eventos (sin cambios) ---
    const handleFilterChange = (name: keyof FiltrosLeads, value: string) => {
        setFiltros(prev => ({ ...prev, [name]: value }));
    };
    const handleSortChange = (campo: OpcionesSortLeads['campo']) => {
        setSort(prev => ({ campo, direccion: prev.campo === campo && prev.direccion === 'desc' ? 'asc' : 'desc' }));
    };
    const handleViewDetails = (leadId: string) => {
        // --- AJUSTE: Usar clienteId y negocioId reales si están disponibles ---
        // Esto requiere pasar clienteId como prop a LeadLista o encontrar otra forma de obtenerlo
        // Por ahora, mantenemos la ruta dummy
        router.push(`/admin/clientes/dummy/negocios/${negocioId}/crm/leads/${leadId}`);
    };

    // --- Renderizado ---
    const tableColumns = useMemo(() => [
        { key: 'nombre', label: 'Nombre', sortable: true },
        { key: 'pipeline', label: 'Etapa', sortable: false },
        { key: 'status', label: 'Status', sortable: false },
        { key: 'etiquetas', label: 'Etiquetas', sortable: false },
        { key: 'agente', label: 'Agente', sortable: false },
        { key: 'valorEstimado', label: 'Valor', sortable: true },
        { key: 'ultimaConversacion', label: 'Últ. Actividad', sortable: false }, // Se mantiene, pero se añade icono
        { key: 'createdAt', label: 'Creado', sortable: true },
        { key: 'acciones', label: 'Acciones', sortable: false },
    ], []);

    // Helper para estilo de status (sin cambios)
    const getStatusBadgeVariant = (status: string | undefined | null): "default" | "secondary" | "destructive" | "outline" => {
        switch (status?.toLowerCase()) {
            case 'nuevo': return 'default';
            case 'contactado': case 'seguimiento': case 'calificado': return 'secondary';
            case 'propuesta': case 'negociacion': return 'outline';
            case 'ganado': return 'default';
            case 'perdido': case 'no_calificado': return 'destructive';
            default: return 'secondary';
        }
    };

    // --- NUEVO: Helper para colores de Pipeline (Paleta Fija) ---
    const getPipelineColor = (pipelineName: string | undefined | null): string => {
        // Define tu paleta de colores aquí (clases de Tailwind para background)
        const colorMap: { [key: string]: string } = {
            'nuevo': 'bg-blue-500',
            'contactado': 'bg-cyan-500',
            'calificado': 'bg-teal-500',
            'propuesta': 'bg-indigo-500',
            'negociacion': 'bg-purple-500',
            'seguimiento': 'bg-yellow-500',
            'ganado': 'bg-green-500',
            'perdido': 'bg-red-500',
            'no_calificado': 'bg-slate-500',
            // Añade más etapas según sea necesario
        };
        // Normalizar nombre (quitar espacios, minúsculas) para buscar en el mapa
        const normalizedName = pipelineName?.toLowerCase().replace(/\s+/g, '') || '';
        return colorMap[normalizedName] || 'bg-zinc-600'; // Color por defecto
    };
    // --- FIN Helper Colores ---

    return (
        <div className="space-y-4 h-full flex flex-col">
            {/* Cabecera y Filtros (sin cambios) */}
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                <h2 className="text-xl font-semibold text-white">Leads</h2>
                <div className="flex flex-wrap items-center gap-2">
                    {/* ... (filtros y botón Nuevo Lead sin cambios) ... */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-zinc-500" />
                        <Input type="search" placeholder="Buscar..." value={filtros.searchTerm} onChange={(e) => handleFilterChange('searchTerm', e.target.value)} className="pl-8 w-full md:w-64 lg:w-80 bg-zinc-800 border-zinc-700" />
                    </div>
                    <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                            <Button variant="outline" className="bg-zinc-800 border-zinc-700 hover:bg-zinc-700"><FilterIcon className="h-4 w-4 mr-2" /> Filtrar</Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent className="w-64 bg-zinc-800 border-zinc-700 text-zinc-300 p-4 space-y-3">
                            {/* ... (Selects de filtros sin cambios) ... */}
                            <div><label className="text-xs font-medium text-zinc-400 block mb-1">Etapa Pipeline</label><Select value={filtros.pipelineId} onValueChange={(v) => handleFilterChange('pipelineId', v)}><SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{datosFiltros?.pipelines.map(p => <SelectItem key={p.id} value={p.id}>{p.nombre}</SelectItem>)}</SelectContent></Select></div>
                            <div><label className="text-xs font-medium text-zinc-400 block mb-1">Canal</label><Select value={filtros.canalId} onValueChange={(v) => handleFilterChange('canalId', v)}><SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{datosFiltros?.canales.map(c => <SelectItem key={c.id} value={c.id}>{c.nombre}</SelectItem>)}</SelectContent></Select></div>
                            <div><label className="text-xs font-medium text-zinc-400 block mb-1">Etiqueta</label><Select value={filtros.etiquetaId} onValueChange={(v) => handleFilterChange('etiquetaId', v)}><SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue placeholder="Todas" /></SelectTrigger><SelectContent><SelectItem value="all">Todas</SelectItem>{datosFiltros?.etiquetas.map(e => <SelectItem key={e.id} value={e.id}>{e.nombre}</SelectItem>)}</SelectContent></Select></div>
                            <div><label className="text-xs font-medium text-zinc-400 block mb-1">Agente</label><Select value={filtros.agenteId} onValueChange={(v) => handleFilterChange('agenteId', v)}><SelectTrigger className="bg-zinc-900 border-zinc-700"><SelectValue placeholder="Todos" /></SelectTrigger><SelectContent><SelectItem value="all">Todos</SelectItem>{datosFiltros?.agentes.map(a => <SelectItem key={a.id} value={a.id}>{a.nombre}</SelectItem>)}</SelectContent></Select></div>
                        </DropdownMenuContent>
                    </DropdownMenu>
                    <Button onClick={() => router.push(`/admin/clientes/dummy/negocios/${negocioId}/crm/leads/nuevo`)} className="bg-blue-600 hover:bg-blue-700"> <PlusCircle className="h-4 w-4 mr-2" /> Nuevo Lead </Button>
                </div>
            </div>

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
                        {loading ? (<TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-zinc-400"><Loader2 className="inline-block h-6 w-6 animate-spin mr-2" /> Cargando leads...</TableCell></TableRow>
                        ) : error ? (<TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-red-500">{error}</TableCell></TableRow>
                        ) : leads.length === 0 ? (<TableRow><TableCell colSpan={tableColumns.length} className="h-24 text-center text-zinc-500">No se encontraron leads.</TableCell></TableRow>
                        ) : (
                            leads.map((lead) => (
                                <TableRow key={lead.id} className="hover:bg-zinc-800/50">
                                    {/* Nombre */}
                                    <TableCell className="font-medium text-zinc-100 px-4 py-2">
                                        <p className="truncate max-w-[200px]" title={lead.nombre}>{lead.nombre}</p>
                                        <p className="text-xs text-zinc-400 truncate max-w-[200px]" title={lead.email || ''}>{lead.email || '-'}</p>
                                    </TableCell>
                                    {/* Etapa Pipeline con Color */}
                                    <TableCell className="px-4 py-2 text-zinc-300 text-xs">
                                        <div className="flex items-center gap-2">
                                            <span className={`w-2 h-2 rounded-full ${getPipelineColor(lead.pipeline?.nombre)} flex-shrink-0`}></span>
                                            <span>{lead.pipeline?.nombre || '-'}</span>
                                        </div>
                                    </TableCell>
                                    {/* Status */}
                                    <TableCell className="px-4 py-2 text-xs">
                                        <Badge variant={getStatusBadgeVariant(lead.status)} className="capitalize">
                                            {lead.status?.replace('_', ' ') || '-'}
                                        </Badge>
                                    </TableCell>
                                    {/* Etiquetas */}
                                    <TableCell className="px-4 py-2">
                                        <div className="flex flex-wrap gap-1 max-w-[150px]">
                                            {lead.etiquetas?.slice(0, 2).map(({ etiqueta }) => (
                                                <Badge key={etiqueta.id} variant="secondary" className="text-[10px]" style={{ backgroundColor: etiqueta.color ? `${etiqueta.color}20` : undefined, color: etiqueta.color || undefined, borderColor: etiqueta.color ? `${etiqueta.color}80` : undefined }}>
                                                    {etiqueta.nombre}
                                                </Badge>
                                            ))}
                                            {lead.etiquetas && lead.etiquetas.length > 2 && <Badge variant="secondary" className="text-[10px]">...</Badge>}
                                        </div>
                                    </TableCell>
                                    {/* Agente */}
                                    <TableCell className="px-4 py-2 text-zinc-300 text-xs">{lead.agente?.nombre || '-'}</TableCell>
                                    {/* Valor */}
                                    <TableCell className="px-4 py-2 text-zinc-300 text-xs">
                                        {lead.valorEstimado ? new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN' }).format(lead.valorEstimado) : '-'}
                                    </TableCell>
                                    {/* Últ. Actividad con Indicador Conversación */}
                                    <TableCell className="px-4 py-2 text-zinc-400 text-xs">
                                        <div className="flex items-center gap-1.5">
                                            {/* Icono si hay conversación */}
                                            {lead.ultimaConversacion && (
                                                <MessageSquare
                                                    size={12}
                                                    className={lead.ultimaConversacion.status === 'abierta' ? 'text-green-400' : 'text-zinc-500'}
                                                />
                                            )}
                                            <span>
                                                {lead.ultimaConversacion?.updatedAt ? new Date(lead.ultimaConversacion.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : (lead.updatedAt ? new Date(lead.updatedAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : '-')}
                                            </span>
                                        </div>
                                    </TableCell>
                                    {/* Creado */}
                                    <TableCell className="px-4 py-2 text-zinc-400 text-xs">
                                        {lead.createdAt ? new Date(lead.createdAt).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: '2-digit' }) : '-'}
                                    </TableCell>
                                    {/* Acciones */}
                                    <TableCell className="px-4 py-2 text-right">
                                        <Button variant="ghost" size="sm" onClick={() => handleViewDetails(lead.id)} className="h-7 px-2 hover:bg-zinc-700">
                                            <Eye className="h-4 w-4 text-zinc-400" />
                                        </Button>
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
