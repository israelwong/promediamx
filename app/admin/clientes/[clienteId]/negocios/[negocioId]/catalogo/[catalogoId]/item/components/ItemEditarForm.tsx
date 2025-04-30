'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta las rutas si es necesario
import {
    obtenerItemCatalogoPorId,
    actualizarItemCatalogo,
    eliminarItemCatalogo
} from '@/app/admin/_lib/itemCatalogo.actions'; // Acciones para obtener, actualizar y eliminar ítems
// Asegúrate que las acciones estén aquí
import { obtenerNegocioCategorias } from '@/app/admin/_lib/negocioCategoria.actions';
import { obtenerNegocioEtiquetas } from '@/app/admin/_lib/negocioEtiqueta.actions';
import { ItemCatalogo, NegocioCategoria, NegocioEtiqueta, ItemCatalogoEtiqueta } from '@/app/admin/_lib/types'; // Importar tipos necesarios
import { Loader2, Trash2, Save, Tags, AlertTriangle } from 'lucide-react'; // Iconos (añadido Tags, AlertTriangle)

interface Props {
    itemId: string;
    negocioId?: string; // Opcional, si necesitas el negocioId para cargar categorías/etiquetas
}

// Tipo para los datos editables en este formulario
// Excluimos campos no editables y relaciones complejas que se manejan por separado (etiquetas)
type ItemEditFormData = Partial<Omit<ItemCatalogo,
    'id' | 'catalogoId' | 'catalogo' | 'categoria' | 'createdAt' | 'updatedAt' |
    'ItemCatalogoPromocion' | 'ItemCatalogoDescuento' | 'itemEtiquetas'
>>;

export default function ItemEditarForm({ itemId }: Props) {
    const router = useRouter();

    const [itemOriginal, setItemOriginal] = useState<ItemCatalogo | null>(null);
    const [formData, setFormData] = useState<ItemEditFormData>({});
    const [categorias, setCategorias] = useState<NegocioCategoria[]>([]);
    const [etiquetasDisponibles, setEtiquetasDisponibles] = useState<NegocioEtiqueta[]>([]);
    // Estado para los IDs de las etiquetas seleccionadas
    const [selectedEtiquetaIds, setSelectedEtiquetaIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [loadingRelated, setLoadingRelated] = useState(true); // Carga para categorías/etiquetas
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [negocioIdContext, setNegocioIdContext] = useState<string | null>(null); // Para cargar cats/tags
    const [catalogoIdContext, setCatalogoIdContext] = useState<string | null>(null); // Para volver atrás

    // Clases de Tailwind
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "font-mono bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
    const containerClasses = "p-4 max-w-2xl mx-auto bg-zinc-800 rounded-lg shadow-md"; // Ancho ajustado
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";
    const checkboxLabelClasses = "text-sm font-medium text-zinc-300";
    const checkboxClasses = "h-4 w-4 rounded border-zinc-600 bg-zinc-700 text-blue-600 focus:ring-blue-500 disabled:opacity-50";

    const isCategoriaSelected = formData.categoriaId !== undefined && formData.categoriaId !== null && formData.categoriaId !== '';

    // --- Carga de Datos del Ítem ---
    useEffect(() => {
        if (!itemId) {
            setError("No se proporcionó un ID de ítem."); setLoading(false); setLoadingRelated(false); return;
        }
        setLoading(true); setError(null); setSuccessMessage(null);

        const fetchItem = async () => {
            try {
                // !! Asumiendo que esta acción incluye catalogo { select: { negocioId: true } } y itemEtiquetas { select: { etiquetaId: true } } !!
                const data = await obtenerItemCatalogoPorId(itemId);
                if (data) {
                    setItemOriginal(data as ItemCatalogo);
                    const negocioId = data.catalogo.negocioId; // Obtener negocioId via catálogoId
                    setNegocioIdContext(negocioId ?? null);
                    setCatalogoIdContext(data.catalogoId); // Guardar ID catálogo para volver

                    // Poblar formData
                    const { ...editableData } = data;
                    setFormData({
                        ...editableData,
                        categoriaId: data.categoriaId ?? '', // Default a '' si es null
                        status: data.status ?? 'inactivo',
                        // Convertir precio a string para el input si no es null
                        precio: data.precio !== null ? data.precio : undefined,
                    });

                    // Poblar etiquetas seleccionadas inicialmente
                    const initialEtiquetaIds = new Set((data as ItemCatalogo & { itemEtiquetas?: { etiquetaId: string }[] }).itemEtiquetas?.map(et => et.etiquetaId) || []);
                    setSelectedEtiquetaIds(initialEtiquetaIds);

                    // Si tenemos negocioId, cargar categorías y etiquetas
                    if (negocioId) {
                        setLoadingRelated(true);
                        Promise.all([
                            obtenerNegocioCategorias(negocioId),
                            obtenerNegocioEtiquetas(negocioId)
                        ]).then(([cats, tags]) => {


                            console.log("Categorías y etiquetas cargadas:", cats, tags);

                            setCategorias(cats || []);
                            setEtiquetasDisponibles(tags || []);
                        }).catch(err => {
                            console.error("Error fetching related data:", err);
                            setError("Error al cargar categorías o etiquetas.");
                        }).finally(() => {
                            setLoadingRelated(false);
                        });
                    } else {
                        setLoadingRelated(false); // No hay negocioId para cargar relacionados
                        setError("No se pudo determinar el negocio asociado a este ítem.");
                    }

                } else {
                    setError(`No se encontró el ítem con ID: ${itemId}`);
                    setItemOriginal(null); setFormData({}); setNegocioIdContext(null); setLoadingRelated(false);
                }
            } catch (err) {
                console.error("Error fetching item:", err);
                setError("No se pudo cargar la información del ítem.");
                setItemOriginal(null); setFormData({}); setNegocioIdContext(null); setLoadingRelated(false);
            } finally { setLoading(false); }
        };
        fetchItem();
    }, [itemId]);

    // --- Manejadores ---
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | null;

        if (type === 'number') {
            finalValue = value === '' ? null : parseFloat(value);
            if (isNaN(finalValue as number)) finalValue = null;
        } else {
            finalValue = value;
        }
        setFormData(prevState => ({ ...prevState, [name]: finalValue }));
        setError(null); setSuccessMessage(null);
    };

    // Manejador para checkboxes de etiquetas
    const handleEtiquetaChange = (e: ChangeEvent<HTMLInputElement>) => {
        const { value, checked } = e.target;
        setSelectedEtiquetaIds(prev => {
            const newSet = new Set(prev);
            if (checked) {
                newSet.add(value);
            } else {
                newSet.delete(value);
            }
            return newSet;
        });
        setError(null); setSuccessMessage(null);
    };


    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        // Validación
        if (!formData.nombre?.trim() || formData.precio === null || typeof formData.precio !== 'number' || formData.precio < 0 || !formData.status) {
            setError("Nombre, Precio válido (>= 0) y Status son obligatorios."); return;
        }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);
        try {
            // Construir objeto con datos a actualizar
            const dataToSend: Partial<ItemCatalogo> = {
                nombre: formData.nombre.trim(),
                descripcion: formData.descripcion?.trim() || null,
                precio: Number(formData.precio), // Asegurar número
                status: formData.status,
                categoriaId: formData.categoriaId || null,
                imagen: formData.imagen || null,
                linkPago: formData.linkPago || null,
                funcionPrincipal: formData.funcionPrincipal || null,
                promocionActiva: formData.promocionActiva || null,
                AquienVaDirigido: formData.AquienVaDirigido || null,
                nivelDePopularidad: formData.nivelDePopularidad || null,
                video: formData.video || null,
                // !! IMPORTANTE: Actualizar la relación de etiquetas !!
                // La acción 'actualizarItemCatalogo' debe poder manejar esto.
                // Se envía un array de objetos { id: 'etiquetaId' } para conectar.
                itemEtiquetas: Array.from(selectedEtiquetaIds).map(id => ({
                    etiquetaId: id,
                    id: '', // Provide a default or generated ID if required
                    itemCatalogoId: itemId, // Use the current itemId
                    itemCatalogo: null as unknown as ItemCatalogo, // Explicitly cast null to match the type
                    etiqueta: null as unknown as NegocioEtiqueta // Explicitly cast null to match the type
                })) as ItemCatalogoEtiqueta[], // Ensure all required properties are included
            };

            // !! NECESITAS ACTUALIZAR ESTA ACCIÓN !!
            await actualizarItemCatalogo(itemId, dataToSend);
            setSuccessMessage("Ítem actualizado correctamente.");
            // Opcional: Refrescar datos originales
            // fetchItem(); // Volver a cargar datos completos

        } catch (err) {
            console.error("Error updating item:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al actualizar: ${errorMessage}`);
        } finally { setIsSubmitting(false); }
    };

    const handleCancel = () => { router.back(); };

    const handleDelete = async () => {
        if (confirm("¿Estás seguro? Eliminar este ítem no se puede deshacer.")) {
            setIsSubmitting(true); setError(null); setSuccessMessage(null);
            try {
                await eliminarItemCatalogo(itemId);
                setSuccessMessage("Ítem eliminado.");
                // Redirigir (ej: a la gestión del catálogo del negocio)
                setTimeout(() => {
                    if (negocioIdContext) {
                        router.push(`/admin/negocios/${negocioIdContext}/catalogo`);
                    } else {
                        router.back(); // Fallback
                    }
                }, 1500);
            } catch (err) {
                console.error("Error deleting item:", err);
                const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
                setError(`Error al eliminar: ${errorMessage}`);
                setIsSubmitting(false);
            }
        }
    };

    // --- Renderizado ---
    if (loading) { return <div className={containerClasses}><p className="text-center text-zinc-300 flex items-center justify-center gap-2"><Loader2 className='animate-spin' size={18} /> Cargando ítem...</p></div>; }
    if (error && !itemOriginal) { return <div className={`${containerClasses} border border-red-500`}><p className="text-center text-red-400">{error}</p></div>; }
    if (!itemOriginal) { return <div className={containerClasses}><p className="text-center text-zinc-400">Ítem no encontrado.</p></div>; }

    return (
        <div className={containerClasses}>
            <div className='mb-4 border-b border-zinc-700  flex items-center justify-between'>

                <div>
                    <h2 className="text-xl font-semibold text-white mb-1">Editar Ítem de Catálogo</h2>
                    <p className="text-sm text-zinc-400  pb-2">
                        ID: <span className='font-mono text-zinc-300'>{itemId}</span>
                        {catalogoIdContext && <> | Catálogo ID: <span className='font-mono text-zinc-300'>{catalogoIdContext}</span></>}
                    </p>
                </div>

                {/* status */}
                <div className="flex items-center gap-2">
                    <label className="relative inline-flex items-center cursor-pointer">
                        <input
                            type="checkbox"
                            id="status"
                            name="status"
                            checked={formData.status === 'activo'}
                            onChange={(e) => handleChange({
                                target: {
                                    name: 'status',
                                    value: e.target.checked ? 'activo' : 'inactivo',
                                    type: 'checkbox',
                                },
                            } as ChangeEvent<HTMLInputElement>)}
                            className="sr-only peer"
                            disabled={isSubmitting}
                        />
                        <div className="w-11 h-6 bg-zinc-700 peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:bg-blue-600 transition-colors"></div>
                        <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-5 transition-transform"></div>
                    </label>
                </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>
                {/* Campos Editables */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre <span className="text-red-500">*</span></label>
                    <input type="text" id="nombre" name="nombre" value={formData.nombre || ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} />
                </div>
                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                    <textarea id="descripcion" name="descripcion" value={formData.descripcion || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={4} />
                </div>

                <div><label htmlFor="AquienVaDirigido" className={labelBaseClasses}>¿A Quién Va Dirigido?</label><textarea id="AquienVaDirigido" name="AquienVaDirigido" value={formData.AquienVaDirigido || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={2} /></div>
                {/* <div><label htmlFor="funcionPrincipal" className={labelBaseClasses}>¿Cómo funciona?</label><textarea id="funcionPrincipal" name="funcionPrincipal" value={formData.funcionPrincipal || ''} onChange={handleChange} className={textareaBaseClasses} disabled={isSubmitting} rows={2} /></div> */}

                <div>
                    <label htmlFor="precio" className={labelBaseClasses}>Precio <span className="text-red-500">*</span></label>
                    <input type="number" id="precio" name="precio" value={formData.precio ?? ''} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} step="0.01" min="0" />
                </div>

                {/* --- Sección de Clasificación (Categoría y Etiquetas) --- */}
                <fieldset className="border border-zinc-700 p-4 rounded-md">
                    <legend className="text-sm font-medium text-zinc-400">Clasificación</legend>
                    <div>
                        <label htmlFor="categoriaId" className={labelBaseClasses}>Categoría</label>
                        <select id="categoriaId" name="categoriaId" value={formData.categoriaId || ''} onChange={handleChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmitting || loadingRelated}>
                            <option value="">{loadingRelated ? 'Cargando categorías...' : '-- Sin categoría --'}</option>
                            {categorias.map(cat => <option key={cat.id} value={cat.id}>{cat.nombre}</option>)}
                        </select>
                    </div>

                    {/* **MODIFICACIÓN:** Renderizado Condicional de Etiquetas */}
                    {isCategoriaSelected ? (
                        <div>
                            <label className={`${labelBaseClasses} flex items-center gap-1.5`}><Tags size={14} /> Etiquetas</label>
                            {loadingRelated ? <p className='text-sm text-zinc-400 italic px-1'>Cargando etiquetas...</p> :
                                etiquetasDisponibles.length === 0 ? <p className='text-sm text-zinc-400 italic px-1'>No hay etiquetas definidas para este negocio.</p> :
                                    (
                                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-x-4 gap-y-2 p-3 border border-zinc-700 rounded-md bg-zinc-900/50 max-h-48 overflow-y-auto">
                                            {etiquetasDisponibles.map(etiqueta => (
                                                <label key={etiqueta.id} className="flex items-center space-x-2 cursor-pointer hover:text-white transition-colors">
                                                    <input
                                                        type="checkbox"
                                                        value={etiqueta.id}
                                                        checked={selectedEtiquetaIds.has(etiqueta.id)}
                                                        onChange={handleEtiquetaChange}
                                                        className={checkboxClasses}
                                                        disabled={isSubmitting}
                                                    />
                                                    <span className={checkboxLabelClasses}>{etiqueta.nombre}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                        </div>
                    ) : (
                        // Mensaje indicando por qué no se muestran las etiquetas
                        <div className="p-3 border border-dashed border-zinc-600 rounded-md bg-zinc-900/30 text-center">
                            <p className='text-sm text-zinc-400 flex items-center justify-center gap-2'>
                                <AlertTriangle size={16} className='text-amber-500' /> Selecciona una categoría para asignar etiquetas.
                            </p>
                        </div>
                    )}
                </fieldset>

                {/* Otros campos opcionales */}
                <div><label htmlFor="imagen" className={labelBaseClasses}>URL Imagen Principal</label><input type="url" id="imagen" name="imagen" value={formData.imagen || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="https://..." /></div>
                <div><label htmlFor="video" className={labelBaseClasses}>URL Video</label><input type="url" id="video" name="video" value={formData.video || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="https://youtube.com/..." /></div>
                {/* <div><label htmlFor="linkPago" className={labelBaseClasses}>Link de Pago</label><input type="url" id="linkPago" name="linkPago" value={formData.linkPago || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} placeholder="https://stripe.com/..." /></div> */}
                {/* <div><label htmlFor="promocionActiva" className={labelBaseClasses}>Promoción Activa (Texto)</label><input type="text" id="promocionActiva" name="promocionActiva" value={formData.promocionActiva || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div> */}
                {/* <div><label htmlFor="nivelDePopularidad" className={labelBaseClasses}>Nivel de Popularidad</label><input type="text" id="nivelDePopularidad" name="nivelDePopularidad" value={formData.nivelDePopularidad || ''} onChange={handleChange} className={inputBaseClasses} disabled={isSubmitting} /></div> */}

                {/* Botones de Acción */}
                <div className="pt-5 space-y-2 border-t border-zinc-700">

                    {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
                    {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

                    <button type="submit" className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmitting || loading || loadingRelated}>
                        {isSubmitting ? <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Guardando...</span> : <><Save size={16} /> Guardar Cambios</>}
                    </button>
                    <button type="button" onClick={handleCancel} className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmitting}>
                        Cancelar / Volver
                    </button>
                    <div className="flex justify-center pt-2">
                        <button type="button" onClick={handleDelete} className='text-red-500 hover:text-red-400 text-sm p-1 disabled:opacity-50' disabled={isSubmitting}>
                            <span className='flex items-center gap-1.5'><Trash2 size={14} /> Eliminar Ítem</span>
                        </button>
                    </div>
                </div>
            </form>
        </div>
    );
}
