// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/item/[itemId]/components/ItemEditarForm.tsx
'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    obtenerItemCatalogoPorId,
    actualizarItemCatalogo,
    // eliminarItemCatalogo, // La acción de eliminar se llama desde el page.tsx o un componente de layout si es un botón global
    mejorarDescripcionItemIA,
} from '@/app/admin/_lib/actions/catalogo/itemCatalogo.actions';
import {
    type ActualizarItemData, // Tipo Zod para los datos del formulario
    type MejorarDescripcionItemIAData,
    type NivelCreatividadIA // Importar el tipo enum
} from '@/app/admin/_lib/actions/catalogo/itemCatalogo.schemas';
import { obtenerNegocioCategorias } from '@/app/admin/_lib/actions/catalogo/negocioCategoria.actions';
import { type NegocioCategoriaType } from '@/app/admin/_lib/actions/catalogo/negocioCategoria.schemas';
import { obtenerNegocioEtiquetas } from '@/app/admin/_lib/actions/catalogo/negocioEtiqueta.actions';
import { type NegocioEtiquetaType } from '@/app/admin/_lib/actions/catalogo/negocioEtiqueta.schemas';
// import { ActionResult } from '@/app/admin/_lib/types';

import {
    Loader2, Save, /*Trash2,*/ Sparkles, Settings, Info,
    Package, AlertCircle, CheckCircle, ArrowLeft, HelpCircle,
} from 'lucide-react';

interface Props {
    itemId: string;
    catalogoId: string;
    negocioId: string;
    clienteId: string; // clienteId es necesario para la navegación y revalidación
}

// Usar el tipo Zod para el estado del formulario.
// ActualizarItemData ya es Partial, por lo que los campos son opcionales.
type ItemFormState = ActualizarItemData;

export default function ItemEditarForm({ itemId, catalogoId, negocioId, clienteId }: Props) {
    const router = useRouter();

    const [formData, setFormData] = useState<ItemFormState>({});
    const [categorias, setCategorias] = useState<NegocioCategoriaType[]>([]);
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState<NegocioEtiquetaType[]>([]);
    const [selectedEtiquetas, setSelectedEtiquetas] = useState<Set<string>>(new Set());

    const [loading, setLoading] = useState(true); // Carga principal del ítem
    const [loadingRelated, setLoadingRelated] = useState(true); // Carga de categorías y etiquetas
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    const [nivelCreatividad, setNivelCreatividad] = useState<NivelCreatividadIA>('medio');
    const [maxCaracteres, setMaxCaracteres] = useState<number>(250); // Aumentado un poco
    const [isImprovingDesc, setIsImprovingDesc] = useState(false);
    const [descripcionOriginalIA, setDescripcionOriginalIA] = useState<string | null | undefined>(null);


    // Clases de Tailwind
    const mainCardContainerClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl flex flex-col h-full";
    const headerCardClasses = "p-4 border-b border-zinc-700 flex items-center justify-between sticky top-0 bg-zinc-800 z-20"; // z-20 para estar sobre contenido scrollable
    const titleCardClasses = "text-lg font-semibold text-zinc-100 flex items-center gap-2";
    const formBodyClasses = "p-4 md:p-6 flex-grow overflow-y-auto space-y-6"; // Para scroll si el form es largo

    const labelBaseClasses = "block text-xs font-medium text-zinc-300 mb-1";
    const inputBaseClasses = "block w-full bg-zinc-900 border-zinc-700 text-zinc-200 rounded-md p-2 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 placeholder:text-zinc-500 sm:text-sm transition-colors";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[90px]`;
    const selectClasses = `${inputBaseClasses} appearance-none`;
    const checkboxLabelClasses = "text-xs font-medium text-zinc-300 ml-2 cursor-pointer select-none";
    const checkboxClasses = "h-4 w-4 rounded border-zinc-500 bg-zinc-700 text-blue-500 focus:ring-blue-500 disabled:opacity-50 cursor-pointer";

    const buttonBaseClasses = "inline-flex items-center justify-center px-3.5 py-2 border border-transparent text-xs font-semibold rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 transition-colors duration-150 gap-1.5";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-600 hover:bg-zinc-500 focus:ring-zinc-500 border-zinc-600`;
    // const dangerButtonClasses = `${buttonBaseClasses} text-red-400 hover:bg-red-700/20 focus:ring-red-500 border-transparent hover:border-red-600/40`;

    const sectionContainerClasses = "p-4 bg-zinc-800/50 rounded-lg border border-zinc-700/70";
    const sectionTitleClasses = "text-sm font-semibold text-zinc-100 border-b border-zinc-600/50 pb-2 mb-4 flex items-center gap-2";

    const switchButtonClasses = "relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 focus:ring-blue-500 disabled:opacity-50 cursor-pointer";
    const switchKnobClasses = "inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform";

    const aiButtonBaseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-zinc-800 disabled:opacity-50";
    const improveAiButtonClasses = `${aiButtonBaseClasses} text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 focus:ring-purple-500`;
    // const suggestionActionClasses = "px-2 py-0.5 text-[10px] font-medium rounded-md border flex items-center gap-1";

    const messageBoxBaseClasses = "p-3 rounded-md text-sm my-3 flex items-center gap-2";
    const errorBoxClasses = `${messageBoxBaseClasses} bg-red-500/10 border border-red-500/30 text-red-400`;
    const successBoxClasses = `${messageBoxBaseClasses} bg-green-500/10 border border-green-500/30 text-green-300`;


    const loadItemData = useCallback(async () => {
        if (!itemId || !catalogoId || !negocioId) {
            setError("Faltan IDs de contexto para cargar el ítem.");
            setLoading(false); setLoadingRelated(false);
            return;
        }
        setLoading(true); setError(null); setSuccessMessage(null);
        try {
            const result = await obtenerItemCatalogoPorId(itemId, catalogoId, negocioId);
            if (result.success && result.data) {
                const itemData = result.data;
                setFormData({
                    nombre: itemData.nombre,
                    descripcion: itemData.descripcion,
                    precio: itemData.precio,
                    tipoItem: itemData.tipoItem,
                    sku: itemData.sku,
                    stock: itemData.stock,
                    stockMinimo: itemData.stockMinimo,
                    unidadMedida: itemData.unidadMedida,
                    linkPago: itemData.linkPago,
                    funcionPrincipal: itemData.funcionPrincipal,
                    esPromocionado: itemData.esPromocionado,
                    AquienVaDirigido: itemData.AquienVaDirigido,
                    palabrasClave: itemData.palabrasClave,
                    status: itemData.status,
                    categoriaId: itemData.categoriaId,
                });
                const initialEtiquetas = new Set(itemData.itemEtiquetas?.map(et => et.etiquetaId) || []);
                setSelectedEtiquetas(initialEtiquetas);
                setDescripcionOriginalIA(itemData.descripcion); // Guardar para posible reversión de IA
            } else {
                setError(result.error || "Ítem no encontrado.");
            }
        } catch (err) {
            console.error("Error al cargar datos del ítem:", err);
            setError(err instanceof Error ? err.message : "Error al cargar datos del ítem.");
        } finally {
            setLoading(false);
        }
    }, [itemId, catalogoId, negocioId]);

    const loadRelatedData = useCallback(async () => {
        if (!negocioId) return;
        setLoadingRelated(true);
        try {
            const [categoriasData, etiquetasData] = await Promise.all([
                obtenerNegocioCategorias(negocioId),
                obtenerNegocioEtiquetas(negocioId)
            ]);
            setCategorias((categoriasData || []).map(c => ({ ...c, createdAt: new Date(c.createdAt), updatedAt: new Date(c.updatedAt) })) as NegocioCategoriaType[]);
            setEtiquetasDisponibles((etiquetasData || []).map(e => ({ ...e, createdAt: new Date(e.createdAt), updatedAt: new Date(e.updatedAt) })) as NegocioEtiquetaType[]);
        } catch (err) {
            console.error("Error cargando datos relacionados (categorías/etiquetas):", err);
            // Podrías setear un error específico para esto si es crítico
        } finally {
            setLoadingRelated(false);
        }
    }, [negocioId]);

    useEffect(() => {
        loadItemData();
        loadRelatedData();
    }, [loadItemData, loadRelatedData]);

    useEffect(() => { let timer: NodeJS.Timeout; if (successMessage) { timer = setTimeout(() => setSuccessMessage(null), 3000); } return () => clearTimeout(timer); }, [successMessage]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | boolean | null;

        if (type === 'number') {
            finalValue = value === '' ? null : parseFloat(value); // Permitir vaciar, Zod validará
            if (name === 'precio' && finalValue !== null && finalValue < 0) finalValue = 0;
            if ((name === 'stock' || name === 'stockMinimo') && finalValue !== null && finalValue < 0) finalValue = 0;
        } else if (type === 'checkbox') {
            finalValue = (e.target as HTMLInputElement).checked;
        } else if (name === 'categoriaId' && value === '') {
            finalValue = null; // Representa "sin categoría"
        } else {
            finalValue = value;
        }
        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null);
    };

    const handleStatusToggle = () => {
        const currentStatus = formData.status;
        let newStatus: string;
        if (currentStatus === 'activo') newStatus = 'inactivo';
        else if (currentStatus === 'inactivo') newStatus = 'activo';
        else newStatus = 'activo'; // Default a activo si es otro estado como 'agotado'
        setFormData(prevState => ({ ...prevState, status: newStatus }));
    };

    const handlePromocionadoToggle = () => setFormData(prevState => ({ ...prevState, esPromocionado: !prevState.esPromocionado }));
    const handleEtiquetaChange = (etiquetaId: string, isChecked: boolean) => {
        setSelectedEtiquetas(prev => {
            const newSet = new Set(prev);
            if (isChecked) newSet.add(etiquetaId); else newSet.delete(etiquetaId);
            return newSet;
        });
    };

    const handleSubmit = async (e?: FormEvent<HTMLFormElement>) => {
        e?.preventDefault();
        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            // formData ya debería coincidir con ActualizarItemData
            // Convertir precio, stock, stockMinimo a número si son strings del input type="number"
            const dataToSave: ActualizarItemData = {
                ...formData,
                precio: formData.precio !== undefined && formData.precio !== null ? Number(formData.precio) : undefined,
                stock: formData.stock !== undefined && formData.stock !== null ? Number(formData.stock) : null, // Convertir a null si es necesario
                stockMinimo: formData.stockMinimo !== undefined && formData.stockMinimo !== null ? Number(formData.stockMinimo) : null,
            };

            const result = await actualizarItemCatalogo(itemId, catalogoId, negocioId, clienteId, dataToSave, Array.from(selectedEtiquetas));
            if (result.success) {
                setSuccessMessage("Ítem actualizado exitosamente.");
                // Opcional: recargar datos para reflejar cambios si la action no devuelve el objeto completo
                // await loadItemData(); 
                router.refresh(); // Revalida datos del servidor
            } else {
                let errorMsg = result.error || "No se pudo actualizar el ítem.";
                if (result.errorDetails) {
                    errorMsg = Object.entries(result.errorDetails)
                        .map(([field, errors]) => `${field.charAt(0).toUpperCase() + field.slice(1)}: ${errors.join(', ')}`)
                        .join('; ');
                }
                setError(errorMsg);
            }
        } catch (err) {
            console.error("Error actualizando ítem:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error desconocido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMejorarConIA = async () => {
        if (!formData.descripcion?.trim() && !descripcionOriginalIA?.trim()) {
            setError("Escribe una descripción primero para poder mejorarla.");
            return;
        }
        setIsImprovingDesc(true); setError(null); setSuccessMessage(null);

        const descripcionParaMejorar = formData.descripcion?.trim() || descripcionOriginalIA?.trim();

        try {
            const dataForIA: MejorarDescripcionItemIAData = {
                itemId,
                descripcionActual: descripcionParaMejorar,
                nivelCreatividad,
                maxCaracteres
            };
            const result = await mejorarDescripcionItemIA(dataForIA);
            if (result.success && result.data?.sugerencia) {
                setFormData(prev => ({ ...prev, descripcion: result.data?.sugerencia }));
                setSuccessMessage("Descripción mejorada con IA.");
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

    const revertirDescripcionIA = () => {
        if (descripcionOriginalIA !== undefined) {
            setFormData(prev => ({ ...prev, descripcion: descripcionOriginalIA }));
            setSuccessMessage("Descripción revertida al original.");
        }
    };


    if (loading) {
        return (
            <div className={`${mainCardContainerClasses} items-center justify-center p-10`}>
                <Loader2 className='animate-spin h-8 w-8 text-blue-400' />
                <p className="mt-3 text-zinc-400">Cargando detalles del ítem...</p>
            </div>
        );
    }
    if (error && !formData.nombre) { // Si hay error y no se cargó nada
        return (
            <div className={`${mainCardContainerClasses} items-center justify-center p-10 border-red-500/30 bg-red-500/5`}>
                <AlertCircle className="h-10 w-10 text-red-400 mb-3" />
                <p className="text-red-400 text-center mb-1 font-medium">Error al Cargar Ítem</p>
                <p className="text-zinc-400 text-sm text-center mb-4">{error}</p>
                <button onClick={() => router.back()} className={secondaryButtonClasses + " w-auto"}>
                    <ArrowLeft size={16} /> Volver
                </button>
            </div>
        );
    }
    // Este caso es improbable si la página usa notFound() para IDs faltantes, pero por si acaso.
    if (!loading && !formData.nombre && !error) {
        return <div className={`${mainCardContainerClasses} p-10 text-center text-zinc-400`}>Ítem no encontrado.</div>;
    }

    const isActivo = formData.status === 'activo';
    const isPromocionado = formData.esPromocionado || false;
    const disableAllActions = isSubmitting || isImprovingDesc || loadingRelated;

    return (
        <div className={mainCardContainerClasses}>
            <div className={headerCardClasses}>
                <div className='flex items-center gap-3'>
                    <button
                        type="button"
                        onClick={handleStatusToggle}
                        className={`${switchButtonClasses} ${isActivo ? 'bg-green-500' : 'bg-zinc-600'}`}
                        aria-pressed={isActivo} disabled={disableAllActions}
                        title={isActivo ? 'Ítem Activo' : 'Ítem Inactivo (no visible para clientes/IA)'}
                    >
                        <span className="sr-only">Estado del Ítem</span>
                        <span className={`${switchKnobClasses} ${isActivo ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </button>
                    <h2 className={titleCardClasses}>Editar Ítem</h2>
                </div>
                <button
                    type="button"
                    onClick={() => handleSubmit()}
                    className={primaryButtonClasses}
                    disabled={disableAllActions}
                >
                    {isSubmitting ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                    <span>Guardar Cambios</span>
                </button>
            </div>

            {error && !successMessage && <div className={`${errorBoxClasses} mx-4 md:mx-6`}><AlertCircle size={18} /><span>{error}</span></div>}
            {successMessage && <div className={`${successBoxClasses} mx-4 md:mx-6`}><CheckCircle size={18} /><span>{successMessage}</span></div>}

            <form onSubmit={handleSubmit} className={formBodyClasses} noValidate>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-5">
                    {/* Columna Izquierda */}
                    <div className="space-y-5">
                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><Info size={15} /> Información Básica</h3>
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Ítem <span className="text-red-500">*</span></label>
                                    <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} required className={inputBaseClasses} disabled={disableAllActions} />
                                </div>
                                <div>
                                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                                    <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[120px] whitespace-pre-wrap`} disabled={disableAllActions} rows={5} />
                                    <div className="mt-2 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                                        <button type="button" onClick={handleMejorarConIA} className={improveAiButtonClasses} disabled={disableAllActions || !formData.descripcion?.trim()} title={!formData.descripcion?.trim() ? "Escribe una descripción primero" : "Mejorar descripción con IA"}>
                                            {isImprovingDesc ? <Loader2 size={12} className="animate-spin" /> : <Sparkles size={12} />}
                                            <span>{isImprovingDesc ? 'Mejorando...' : 'Mejorar con IA'}</span>
                                        </button>
                                        {descripcionOriginalIA !== formData.descripcion && formData.descripcion && (
                                            <button type="button" onClick={revertirDescripcionIA} className={`${aiButtonBaseClasses} text-yellow-300 bg-yellow-500/10 hover:bg-yellow-500/20 border-yellow-500/30 focus:ring-yellow-500`} disabled={disableAllActions}>
                                                Revertir a Original
                                            </button>
                                        )}
                                    </div>
                                    <div className="mt-2 grid grid-cols-2 gap-2 items-center">
                                        <div>
                                            <label htmlFor="nivelCreatividad" className={`${labelBaseClasses} !mb-0.5`}>Creatividad IA:</label>
                                            <select id="nivelCreatividad" value={nivelCreatividad} onChange={(e) => setNivelCreatividad(e.target.value as NivelCreatividadIA)} className={`${selectClasses} !py-1 !text-xs`} disabled={disableAllActions}>
                                                <option value="bajo">Baja</option><option value="medio">Media</option><option value="alto">Alta</option>
                                            </select>
                                        </div>
                                        <div>
                                            <label htmlFor="maxCaracteres" className={`${labelBaseClasses} !mb-0.5`}>Máx. Caracteres:</label>
                                            <input type="number" id="maxCaracteres" value={maxCaracteres} onChange={(e) => setMaxCaracteres(Math.max(50, Math.min(parseInt(e.target.value) || 50, 1000)))} className={`${inputBaseClasses} !py-1 !text-xs`} disabled={disableAllActions} min="50" max="1000" step="50" />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><Settings size={15} /> Organización y Tipo</h3>
                            <div className="space-y-3">
                                <div>
                                    <label htmlFor="categoriaId" className={labelBaseClasses}>Categoría</label>
                                    <select id="categoriaId" name="categoriaId" value={formData.categoriaId || ''} onChange={handleChange} className={selectClasses} disabled={disableAllActions || loadingRelated}>
                                        <option value="">{loadingRelated ? 'Cargando...' : '-- Sin categoría --'}</option>
                                        {categorias.map((cat) => (<option key={cat.id} value={cat.id}>{cat.nombre}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label className={labelBaseClasses}>Etiquetas</label>
                                    {loadingRelated ? <span className="text-xs text-zinc-400 italic">Cargando etiquetas...</span> : etiquetasDisponibles.length === 0 ? <span className="text-xs text-zinc-500 italic">No hay etiquetas creadas para este negocio.</span> :
                                        <div className="max-h-32 overflow-y-auto space-y-1.5 border border-zinc-700 rounded-md p-2.5 bg-zinc-900/50 custom-scrollbar">
                                            {etiquetasDisponibles.map((et) => (
                                                <label key={et.id} htmlFor={`etiqueta-${et.id}`} className="flex items-center cursor-pointer p-1 hover:bg-zinc-700/50 rounded-sm">
                                                    <input type="checkbox" id={`etiqueta-${et.id}`} value={et.id} checked={selectedEtiquetas.has(et.id)} onChange={(e) => handleEtiquetaChange(et.id, e.target.checked)} className={checkboxClasses} disabled={disableAllActions} />
                                                    <span className={checkboxLabelClasses}>{et.nombre}</span>
                                                </label>
                                            ))}
                                        </div>
                                    }
                                </div>
                                <div>
                                    <label htmlFor="tipoItem" className={labelBaseClasses}>Tipo de Ítem</label>
                                    <select id="tipoItem" name="tipoItem" value={formData.tipoItem || 'PRODUCTO'} onChange={handleChange} className={selectClasses} disabled={disableAllActions}>
                                        <option value="PRODUCTO">Producto (Bien tangible)</option>
                                        <option value="SERVICIO">Servicio (Intangible, cita, etc.)</option>
                                    </select>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna Derecha */}
                    <div className="space-y-5">
                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><Package size={15} /> Precio y Control</h3>
                            <div className="space-y-3">
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="precio" className={labelBaseClasses}>Precio <span className="text-red-500">*</span></label>
                                        <input type="number" id="precio" name="precio" value={formData.precio ?? ''} onChange={handleChange} required className={inputBaseClasses} disabled={disableAllActions} step="0.01" min="0" />
                                    </div>
                                    <div>
                                        <label htmlFor="linkPago" className={labelBaseClasses}>Link de Pago (Opcional)</label>
                                        <input type="url" id="linkPago" name="linkPago" value={formData.linkPago || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} placeholder="https://..." />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="sku" className={labelBaseClasses}>SKU / Código Interno</label>
                                    <input type="text" id="sku" name="sku" value={formData.sku || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label htmlFor="stock" className={labelBaseClasses}>Stock Disponible</label>
                                        <input type="number" id="stock" name="stock" value={formData.stock ?? ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} min="0" placeholder="N/A si no aplica" />
                                    </div>
                                    <div>
                                        <label htmlFor="stockMinimo" className={labelBaseClasses}>Alerta Stock Mínimo</label>
                                        <input type="number" id="stockMinimo" name="stockMinimo" value={formData.stockMinimo ?? ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} min="0" placeholder="N/A" />
                                    </div>
                                </div>
                                <div>
                                    <label htmlFor="unidadMedida" className={labelBaseClasses}>Unidad de Medida</label>
                                    <select id="unidadMedida" name="unidadMedida" value={formData.unidadMedida || ''} onChange={handleChange} className={selectClasses} disabled={disableAllActions}>
                                        <option value="">No especificado</option>
                                        <option value="pieza">Pieza</option><option value="unidad">Unidad</option><option value="kg">Kilogramo (kg)</option>
                                        <option value="g">Gramo (g)</option><option value="litro">Litro (L)</option><option value="ml">Mililitro (ml)</option>
                                        <option value="metro">Metro (m)</option><option value="cm">Centímetro (cm)</option><option value="hora">Hora</option>
                                        <option value="sesion">Sesión</option><option value="paquete">Paquete</option><option value="otro">Otro</option>
                                    </select>
                                </div>
                                <div className="flex items-center gap-3 pt-2">
                                    <label htmlFor="status_detailed" className={`${labelBaseClasses} !mb-0`}>Estado Detallado:</label>
                                    <select id="status_detailed" name="status" value={formData.status || 'inactivo'} onChange={handleChange} className={`${selectClasses} !w-auto`} disabled={disableAllActions}>
                                        <option value="activo">Activo</option>
                                        <option value="inactivo">Inactivo</option>
                                        <option value="agotado">Agotado</option>
                                        <option value="proximamente">Próximamente</option>
                                    </select>
                                </div>
                            </div>
                        </div>

                        <div className={sectionContainerClasses}>
                            <h3 className={sectionTitleClasses}><Sparkles size={15} /> Marketing y Presentación (IA)</h3>
                            <div className="space-y-3">
                                <div className="flex items-center gap-3">
                                    <button type="button" onClick={handlePromocionadoToggle} className={`${switchButtonClasses} ${isPromocionado ? 'bg-blue-500' : 'bg-zinc-600'}`} aria-pressed={isPromocionado} disabled={disableAllActions}>
                                        <span className="sr-only">Promocionar</span>
                                        <span className={`${switchKnobClasses} ${isPromocionado ? 'translate-x-5' : 'translate-x-0.5'}`} />
                                    </button>
                                    <label onClick={handlePromocionadoToggle} className={`${labelBaseClasses} !mb-0 cursor-pointer`}>
                                        Promocionar activamente (para IA)
                                    </label>
                                </div>
                                <div>
                                    <label htmlFor="AquienVaDirigido" className={labelBaseClasses}>Público Objetivo <HelpCircle size={12} className="inline text-zinc-500 ml-1" /></label>
                                    <textarea id="AquienVaDirigido" name="AquienVaDirigido" value={formData.AquienVaDirigido || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[70px]`} disabled={disableAllActions} rows={3} placeholder="Ej: Jóvenes adultos, profesionales, familias..." />
                                </div>
                                <div>
                                    <label htmlFor="palabrasClave" className={labelBaseClasses}>Palabras Clave (SEO/IA) <HelpCircle size={12} className="inline text-zinc-500 ml-1" /></label>
                                    <input type="text" id="palabrasClave" name="palabrasClave" value={formData.palabrasClave || ''} onChange={handleChange} className={inputBaseClasses} disabled={disableAllActions} placeholder="Ej: artesanal, hecho a mano, exclusivo" />
                                </div>
                                <div>
                                    <label htmlFor="funcionPrincipal" className={labelBaseClasses}>Función Principal (para IA) <HelpCircle size={12} className="inline text-zinc-500 ml-1" /></label>
                                    <textarea id="funcionPrincipal" name="funcionPrincipal" value={formData.funcionPrincipal || ''} onChange={handleChange} className={`${textareaBaseClasses} !min-h-[70px]`} disabled={disableAllActions} rows={3} placeholder="Ej: Aliviar el estrés, decorar el hogar, regalo especial..." />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </form>
        </div>
    );
}

