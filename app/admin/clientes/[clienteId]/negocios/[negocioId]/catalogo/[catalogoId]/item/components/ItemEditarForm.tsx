'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';

// --- IMPORTACIONES DE ACCIONES REALES ---
import {
    obtenerItemCatalogoPorId, // Acción para obtener el ítem
    actualizarItemCatalogo, // Acción para guardar cambios
    eliminarItemCatalogo,    // Acción para eliminar
    mejorarDescripcionItemIA,
    NivelCreatividadIA
} from '@/app/admin/_lib/itemCatalogo.actions';
import { obtenerNegocioCategorias } from '@/app/admin/_lib/negocioCategoria.actions';
import { obtenerNegocioEtiquetas } from '@/app/admin/_lib/negocioEtiqueta.actions';

import { ItemCatalogo, NegocioCategoria, NegocioEtiqueta } from '@/app/admin/_lib/types';

import {
    Loader2, Save, Trash2, Sparkles, Settings, Info, Link as LinkIcon,
    Package // Añadidos para el switch
} from 'lucide-react';

interface Props {
    itemId: string;
    catalogoId: string;
    negocioId: string;
    clienteId?: string; // Para navegación de vuelta
}

// Tipo para el estado del formulario (campos editables)
type ItemFormData = Partial<Omit<ItemCatalogo,
    'id' | 'catalogoId' | 'negocioId' | 'createdAt' | 'updatedAt' |
    'catalogo' | 'categoria' | 'negocio' |
    'ItemCatalogoPromocion' | 'ItemCatalogoDescuento' | 'itemEtiquetas' |
    'galeria' | 'interacciones' | 'orden'
>>;

// Tipo específico para los datos que se enviarán a la acción de actualización
type ActualizarItemInput = Partial<{
    nombre: string;
    descripcion: string | null;
    precio: number;
    tipoItem: string | null;
    sku: string | null;
    stock: number | null;
    stockMinimo: number | null;
    unidadMedida: string | null;
    linkPago: string | null;
    funcionPrincipal: string | null;
    esPromocionado: boolean;
    AquienVaDirigido: string | null;
    palabrasClave: string | null;
    videoUrl: string | null;
    status: string;
    categoriaId: string | null;
}>;


export default function ItemEditarForm({ itemId, catalogoId, negocioId, clienteId }: Props) {
    const router = useRouter();

    const [formData, setFormData] = useState<ItemFormData>({});
    const [categorias, setCategorias] = useState<NegocioCategoria[]>([]);
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState<NegocioEtiqueta[]>([]);
    const [selectedEtiquetas, setSelectedEtiquetas] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadingRelated, setLoadingRelated] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // --- ESTADOS PARA PARÁMETROS IA ---
    const [nivelCreatividad, setNivelCreatividad] = useState<NivelCreatividadIA>('medio');
    const [maxCaracteres, setMaxCaracteres] = useState<number>(200);
    const [isImprovingDesc, setIsImprovingDesc] = useState(false);


    // --- Clases de Tailwind reutilizables ---
    const containerClasses = "bg-zinc-800 rounded-lg shadow-md";
    const formPaddingClasses = "p-4 md:p-4";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder:text-zinc-500";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[70px]`; // Altura base
    const selectClasses = `${inputBaseClasses} appearance-none`;
    const checkboxLabelClasses = "text-xs font-medium text-zinc-300 ml-2 cursor-pointer";
    const checkboxClasses = "h-3.5 w-3.5 rounded border-zinc-500 bg-zinc-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50 cursor-pointer";
    const buttonBaseClasses = "inline-flex items-center justify-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50 transition-colors duration-150";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-700 hover:bg-zinc-600 focus:ring-zinc-500 border-zinc-600`;
    const dangerButtonClasses = `${buttonBaseClasses} text-red-500 hover:bg-red-900/30 focus:ring-red-500 border border-transparent hover:border-red-600/50`;
    const sectionContainerClasses = "p-4 bg-zinc-900/30 rounded-lg border border-zinc-700/50";
    const sectionTitleClasses = "text-sm font-semibold text-zinc-200 border-b border-zinc-600 pb-2 mb-4 flex items-center gap-2";
    const switchButtonClasses = "relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500 disabled:opacity-50 cursor-pointer";
    const switchKnobClasses = "inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform";
    const aiButtonBaseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium rounded-md border focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-900 disabled:opacity-50";
    const improveAiButtonClasses = `${aiButtonBaseClasses} text-purple-300 bg-purple-800/30 hover:bg-purple-800/60 border-purple-600/50 focus:ring-purple-500`;


    // --- Carga de Datos ---
    const loadData = useCallback(async () => {
        if (!itemId || !negocioId) {
            setError("Faltan IDs necesarios (item, negocio).");
            setLoading(false); setLoadingRelated(false);
            return;
        }
        setLoading(true); setLoadingRelated(true); setError(null); setSuccessMessage(null);
        console.log("Cargando datos para item:", itemId);
        try {
            const [itemDataResult, categoriasData, etiquetasData] = await Promise.all([
                obtenerItemCatalogoPorId(itemId),
                obtenerNegocioCategorias(negocioId),
                obtenerNegocioEtiquetas(negocioId)
            ]);

            if (!itemDataResult) throw new Error("Ítem no encontrado");

            const itemData = itemDataResult as ItemCatalogo & { itemEtiquetas?: { etiquetaId: string }[] };

            const {
                ...editableData
            } = itemData;

            setFormData({
                ...editableData,
                categoriaId: itemData.categoriaId ?? '',
                precio: itemData.precio,
                stock: itemData.stock ?? null,
                stockMinimo: itemData.stockMinimo ?? null,
                status: ['activo', 'inactivo', 'agotado', 'proximamente'].includes(itemData.status || '') ? itemData.status : 'inactivo',
                esPromocionado: !!itemData.esPromocionado,
            });

            setCategorias(categoriasData || []);
            setEtiquetasDisponibles(etiquetasData || []);
            const initialEtiquetas = new Set(itemData.itemEtiquetas?.map(et => et.etiquetaId) || []);
            setSelectedEtiquetas(initialEtiquetas);

        } catch (err) {
            console.error("Error al cargar datos:", err);
            setError(err instanceof Error ? err.message : "Error al cargar datos del ítem.");
            setFormData({}); setCategorias([]); setEtiquetasDisponibles([]); setSelectedEtiquetas(new Set());
        } finally {
            setLoading(false); setLoadingRelated(false);
        }
    }, [itemId, negocioId]);

    useEffect(() => { loadData(); }, [loadData]);

    // --- Handlers ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean | null;

        if (type === 'number') {
            finalValue = value === '' ? null : parseFloat(value);
            if (isNaN(finalValue as number)) finalValue = null;
            if ((name === 'precio' || name === 'stock' || name === 'stockMinimo') && finalValue !== null && finalValue < 0) {
                finalValue = 0;
            }
        } else if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (name === 'categoriaId' && value === '') {
            finalValue = null;
        } else {
            finalValue = value;
        }
        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null);
    };

    const handleStatusToggle = () => {
        const newStatus = formData.status === 'activo' ? 'inactivo' : 'activo';
        setFormData(prevState => ({ ...prevState, status: newStatus }));
        setError(null); setSuccessMessage(null);
    };

    const handlePromocionadoToggle = () => {
        setFormData(prevState => ({ ...prevState, esPromocionado: !prevState.esPromocionado }));
        setError(null); setSuccessMessage(null);
    };

    const handleEtiquetaChange = (etiquetaId: string, isChecked: boolean) => {
        setSelectedEtiquetas(prev => {
            const newSet = new Set(prev);
            if (isChecked) newSet.add(etiquetaId); else newSet.delete(etiquetaId);
            return newSet;
        });
        setError(null); setSuccessMessage(null);
    };

    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        if (!formData.nombre?.trim()) { setError("Nombre es obligatorio."); return; }
        if (formData.precio === null || typeof formData.precio !== 'number' || formData.precio < 0) {
            setError("Precio es obligatorio y debe ser 0 o mayor."); return;
        }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            const dataToSave: ActualizarItemInput = {
                nombre: formData.nombre,
                descripcion: formData.descripcion ?? null,
                precio: formData.precio,
                tipoItem: formData.tipoItem ?? null,
                sku: formData.sku ?? null,
                stock: formData.stock !== null && !isNaN(Number(formData.stock)) ? Number(formData.stock) : null,
                stockMinimo: formData.stockMinimo !== null && !isNaN(Number(formData.stockMinimo)) ? Number(formData.stockMinimo) : null,
                unidadMedida: formData.unidadMedida ?? null,
                linkPago: formData.linkPago ?? null,
                funcionPrincipal: formData.funcionPrincipal ?? null,
                esPromocionado: !!formData.esPromocionado,
                AquienVaDirigido: formData.AquienVaDirigido ?? null,
                palabrasClave: formData.palabrasClave ?? null,
                videoUrl: formData.videoUrl ?? null,
                status: ['activo', 'inactivo', 'agotado', 'proximamente'].includes(formData.status || '') ? formData.status : 'inactivo',
                categoriaId: formData.categoriaId || null,
            };

            await actualizarItemCatalogo(itemId, dataToSave, Array.from(selectedEtiquetas));

            setSuccessMessage("Ítem actualizado exitosamente.");
            setTimeout(() => setSuccessMessage(null), 3000);
            router.refresh();

        } catch (err) {
            console.error("Error updating item:", err);
            setError(`Error al actualizar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => router.back();

    const handleDelete = async () => {
        if (!confirm("¿Eliminar este ítem permanentemente? Esta acción no se puede deshacer.")) return;
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            await eliminarItemCatalogo(itemId);
            setSuccessMessage("Ítem eliminado.");
            setTimeout(() => {
                const backUrl = clienteId
                    ? `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}`
                    : `/admin/negocios/${negocioId}/catalogo/${catalogoId}`;
                router.push(backUrl);
            }, 1500);
        } catch (err) {
            console.error("Error deleting item:", err);
            setError(`Error al eliminar: ${err instanceof Error ? err.message : String(err)}`);
            setIsSubmitting(false);
        }
    };

    // --- Handler ACTUALIZADO para Mejorar Descripción con IA ---
    const handleMejorarConIA = async () => {
        if (!formData.descripcion?.trim()) {
            setError("Escribe una descripción primero para poder mejorarla.");
            return;
        }
        setIsImprovingDesc(true); setError(null); setSuccessMessage(null);
        try {
            // Llama a la acción pasando los nuevos parámetros
            const result = await mejorarDescripcionItemIA(
                itemId,
                formData.descripcion,
                nivelCreatividad, // <-- Pasar estado local
                maxCaracteres     // <-- Pasar estado local
            );

            if (result.success && result.data?.sugerencia) {
                if (result.data?.sugerencia) {
                    if (result.data?.sugerencia) {
                        if (result.data?.sugerencia) {
                            setFormData(prev => ({
                                ...prev,
                                descripcion: result.data?.sugerencia
                            }));
                        }
                    }
                }
                setSuccessMessage("Descripción mejorada con IA."); // <-- Mensaje de éxito

            } else {
                throw new Error(result.error || "No se pudo obtener la sugerencia de mejora.");
            }
        } catch (err) {
            console.error("Error llamando a mejorarDescripcionItemIA:", err);
            setError(err instanceof Error ? err.message : "Error al mejorar con IA.");
        } finally {
            setIsImprovingDesc(false);
        }
    };

    // --- Renderizado ---
    if (loading) return <div className="p-6 rounded-md text-center text-zinc-300 bg-zinc-800"><Loader2 className='animate-spin inline mr-2' size={18} /> Cargando Ítem...</div>;
    if (error && !formData.nombre) return <div className="p-6 border border-red-500 rounded-lg bg-red-900/20 text-center text-red-400">{error}</div>;
    if (!loading && !formData.nombre) return <div className="p-6 text-center text-zinc-400">Ítem no encontrado o error al cargar.</div>;

    const isActivo = formData.status === 'activo';
    const isPromocionado = formData.esPromocionado || false;
    const disableActions = isSubmitting || isImprovingDesc;

    return (
        <div className={containerClasses}>
            {/* Cabecera con Título, Switch y Botones */}
            <div className={`${formPaddingClasses} border-b border-zinc-700 flex items-center justify-between gap-4`}>
                <div className='flex items-center gap-3'>
                    <button
                        type="button"
                        onClick={handleStatusToggle}
                        className={`${switchButtonClasses} ${isActivo ? 'bg-green-500' : 'bg-zinc-600'}`}
                        aria-pressed={isActivo}
                        disabled={isSubmitting}
                    >
                        <span className="sr-only">Estado</span>
                        <span className={`${switchKnobClasses} ${isActivo ? 'translate-x-4' : 'translate-x-0.5'}`} />
                    </button>
                    <div>
                        <h2 className="text-lg font-semibold text-white">Editar Ítem</h2>
                        <p className="text-xs text-zinc-400 mt-0.5">ID: {itemId}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2">

                    <button
                        type="button"
                        onClick={handleDelete}
                        className={`${dangerButtonClasses} px-2`}
                        disabled={isSubmitting}
                        title="Eliminar Ítem"
                    >
                        <Trash2 size={14} />
                    </button>

                    <button
                        type="button"
                        onClick={() => handleSubmit()}
                        className={primaryButtonClasses}
                        disabled={isSubmitting || loading || loadingRelated}
                    >
                        {isSubmitting ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                        <span className="ml-1.5">Guardar</span>
                    </button>

                    <button
                        type="button"
                        onClick={handleCancel}
                        className={secondaryButtonClasses}
                        disabled={isSubmitting}
                    >
                        Cerrar ventana
                    </button>

                </div>
            </div>

            {/* Formulario Principal */}
            <div>
                {/* --- AJUSTE: Grid Principal ahora es de 2 Columnas --- */}
                <div className={`grid grid-cols-1 md:grid-cols-2 gap-4 lg:gap-4 ${formPaddingClasses}`}>

                    {/* Columna 1: Info Principal y Organización */}
                    <div className="md:col-span-1 flex flex-col gap-5">
                        {/* Sección: Datos Básicos */}
                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><Info size={14} /> Básico</h3>
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                                    <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} required className={inputBaseClasses} disabled={disableActions} />
                                </div>
                                <div>
                                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[150px] whitespace-pre-wrap`} disabled={disableActions} rows={8} />

                                    {/* --- Controles IA --- */}
                                    <div className="mt-2 grid grid-cols-3 gap-2 items-center mb-4">

                                        {/* Botón Mejorar */}
                                        <button type="button" onClick={handleMejorarConIA} className={improveAiButtonClasses} disabled={disableActions || !formData.descripcion?.trim()} title={!formData.descripcion?.trim() ? "Escribe una descripción primero" : "Mejorar descripción con IA"}>
                                            {isImprovingDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            <span>{isImprovingDesc ? 'Mejorando...' : 'Mejorar con IA'}</span>
                                        </button>
                                        {/* --- Controles de Parámetros --- */}
                                        <div className="flex items-center gap-2 col-span-2 justify-end">
                                            <div className="flex items-center">
                                                <label htmlFor="nivelCreatividad" className={`${labelBaseClasses} !mb-0 mr-1`}>Creatividad:</label>
                                                <select
                                                    id="nivelCreatividad"
                                                    value={nivelCreatividad}
                                                    onChange={(e) => setNivelCreatividad(e.target.value as NivelCreatividadIA)}
                                                    className={`${inputBaseClasses} !inline-block !w-auto !py-0.5 !text-xs`} // Estilo compacto
                                                    disabled={disableActions}
                                                >
                                                    <option value="bajo">Baja</option>
                                                    <option value="medio">Media</option>
                                                    <option value="alto">Alta</option>
                                                </select>
                                            </div>
                                            <div className="flex items-center">
                                                <label htmlFor="maxCaracteres" className={`${labelBaseClasses} !mb-0 mr-1`}>Máx. Chars:</label>
                                                <input
                                                    type="number"
                                                    id="maxCaracteres"
                                                    value={maxCaracteres}
                                                    onChange={(e) => setMaxCaracteres(Math.max(50, Math.min(parseInt(e.target.value) || 50, 500)))} // Limitar entre 50 y 500
                                                    className={`${inputBaseClasses} !inline-block !w-16 !py-0.5 !text-xs`} // Estilo compacto
                                                    disabled={disableActions}
                                                    min="50"
                                                    max="500"
                                                    step="10"
                                                />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div> <label htmlFor="precio" className={labelBaseClasses}>Precio <span className="text-red-500">*</span></label> <input type="number" id="precio" name="precio" value={formData.precio ?? ''} onChange={handleChange} required className={inputBaseClasses} disabled={disableActions} step="0.01" min="0" /> </div>
                                    <div> <label htmlFor="sku" className={labelBaseClasses}>SKU</label> <input type="text" id="sku" name="sku" value={formData.sku || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableActions} /> </div>
                                </div>
                                {formData.status !== 'activo' && formData.status !== 'inactivo' && (<div> <label htmlFor="status_select" className={labelBaseClasses}>Status Detallado</label> <select id="status_select" name="status" value={formData.status || 'agotado'} onChange={handleChange} className={selectClasses} disabled={disableActions}> <option value="agotado">Agotado</option> <option value="proximamente">Próximamente</option> </select> <p className="text-xs text-zinc-500 mt-1">Usa el switch para Activo/Inactivo.</p> </div>)}
                            </div>
                        </div>
                        {/* Sección: Organización */}
                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><Settings size={14} /> Organización</h3>
                            <div className="space-y-3">
                                <div> <label htmlFor="categoriaId" className={labelBaseClasses}>Categoría</label> <select id="categoriaId" name="categoriaId" value={formData.categoriaId || ''} onChange={handleChange} className={selectClasses} disabled={disableActions || loadingRelated}> <option value="">{loadingRelated ? 'Cargando...' : '-- Sin categoría --'}</option> {categorias.map((cat) => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))} </select> </div>
                                <div> <label className={labelBaseClasses}>Etiquetas</label> {loadingRelated ? <span className="text-xs text-zinc-400 italic">Cargando...</span> : etiquetasDisponibles.length === 0 ? <span className="text-xs text-zinc-500 italic">No hay etiquetas.</span> : <div className="max-h-28 overflow-y-auto space-y-1 border border-zinc-600 rounded-md p-2 bg-zinc-900/50"> {etiquetasDisponibles.map((et) => (<label key={et.id} htmlFor={`etiqueta-${et.id}`} className="flex items-center cursor-pointer"> <input type="checkbox" id={`etiqueta-${et.id}`} value={et.id} checked={selectedEtiquetas.has(et.id)} onChange={(e) => handleEtiquetaChange(et.id, e.target.checked)} className={checkboxClasses} disabled={disableActions} /> <span className={checkboxLabelClasses}>{et.nombre}</span> </label>))} </div>} </div>
                            </div>
                        </div>
                    </div>
                    {/* --- Fin Columna 1 --- */}

                    {/* --- Columna 2: Detalles, Marketing y Enlaces (Ahora ocupa 1/2) --- */}
                    <div className="md:col-span-1 flex flex-col gap-5">
                        {/* Sección: Detalles Adicionales */}
                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><Package size={14} /> Detalles Adicionales</h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="tipoItem" className={labelBaseClasses}>Tipo</label>
                                        <select id="tipoItem" name="tipoItem" value={formData.tipoItem || 'PRODUCTO'} onChange={handleChange} className={selectClasses} disabled={isSubmitting}>
                                            <option value="PRODUCTO">Producto</option>
                                            <option value="SERVICIO">Servicio</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label htmlFor="unidadMedida" className={labelBaseClasses}>Unidad Medida</label>
                                        <select id="unidadMedida" name="unidadMedida" value={formData.unidadMedida || ''} onChange={handleChange} className={selectClasses} disabled={isSubmitting}>
                                            <option value="">N/A</option>
                                            <option value="pieza">Pieza</option>
                                            <option value="unidad">Unidad</option>
                                            <option value="kg">Kilogramo (kg)</option>
                                            <option value="g">Gramo (g)</option>
                                            <option value="litro">Litro (L)</option>
                                            <option value="ml">Mililitro (ml)</option>
                                            <option value="metro">Metro (m)</option>
                                            <option value="cm">Centímetro (cm)</option>
                                            <option value="hora">Hora</option>
                                            <option value="sesion">Sesión</option>
                                            <option value="paquete">Paquete</option>
                                            <option value="otro">Otro</option>
                                        </select>
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="stock" className={labelBaseClasses}>Stock</label>
                                        <input type="number" id="stock" name="stock" value={formData.stock ?? ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} min="0" placeholder="N/A" />
                                    </div>
                                    <div>
                                        <label htmlFor="stockMinimo" className={labelBaseClasses}>Stock Mínimo</label>
                                        <input type="number" id="stockMinimo" name="stockMinimo" value={formData.stockMinimo ?? ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} min="0" placeholder="N/A" />
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Sección: Marketing y SEO */}
                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><Sparkles size={14} /> Marketing y SEO</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3 pt-1">
                                    <button
                                        type="button"
                                        onClick={handlePromocionadoToggle}
                                        className={`${switchButtonClasses} ${isPromocionado ? 'bg-blue-500' : 'bg-zinc-600'}`}
                                        aria-pressed={isPromocionado}
                                        disabled={isSubmitting}
                                    >
                                        <span className="sr-only">Promocionar</span>
                                        <span className={`${switchKnobClasses} ${isPromocionado ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </button>
                                    <label
                                        onClick={handlePromocionadoToggle}
                                        className={`${labelBaseClasses} !mb-0 cursor-pointer`}
                                    >
                                        Promocionar activamente (IA)
                                    </label>
                                </div>
                                <div>
                                    <label htmlFor="AquienVaDirigido" className={labelBaseClasses}>Público Objetivo</label>
                                    <textarea id="AquienVaDirigido" name="AquienVaDirigido" value={formData.AquienVaDirigido || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[90px]`} disabled={isSubmitting} rows={4} placeholder="Describe el cliente ideal..." />
                                </div>
                                <div>
                                    <label htmlFor="palabrasClave" className={labelBaseClasses}>Palabras Clave</label>
                                    <input
                                        type="text"
                                        id="palabrasClave"
                                        name="palabrasClave"
                                        value={formData.palabrasClave || ''}
                                        onChange={handleChange}
                                        className={inputBaseClasses}
                                        disabled={isSubmitting}
                                        placeholder="Separadas por coma: ej, spa, masaje"
                                    />
                                    <p className="text-xs text-zinc-500 mt-1">Separadas por coma.</p>
                                </div>
                                <div>
                                    <label htmlFor="funcionPrincipal" className={labelBaseClasses}>Para que sirve / como se usa</label>
                                    <textarea id="funcionPrincipal" name="funcionPrincipal" value={formData.funcionPrincipal || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[90px]`} disabled={isSubmitting} rows={4} placeholder="Breve descripción para la IA..." />
                                </div>
                            </div>
                        </div>

                        {/* Sección: Enlaces y Multimedia */}
                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><LinkIcon size={14} /> Enlaces y Multimedia</h3>
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="linkPago" className={labelBaseClasses}>Link de Pago (Stripe, etc.)</label>
                                    <input type="url" id="linkPago" name="linkPago" value={formData.linkPago || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="https://..." />
                                </div>
                                <div>
                                    <label htmlFor="videoUrl" className={labelBaseClasses}>URL Video (Youtube, Vimeo)</label>
                                    <input type="url" id="videoUrl" name="videoUrl" value={formData.videoUrl || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="https://..." />
                                </div>
                            </div>
                        </div>
                    </div>
                    {/* --- Fin Columna 2 --- */}

                    <div className="md:col-span-2 pt-5 space-y-3 border-t border-zinc-600 mt-4">
                        {error && <p className="text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
                        {successMessage && <p className="text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}
                    </div>
                    {/* --- Fin Mensajes --- */}

                </div>
                {/* --- Fin Grid Principal --- */}
            </div>
        </div>
    );
}

