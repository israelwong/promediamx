'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta las rutas si es necesario
import { crearItemCatalogo } from '@/app/admin/_lib/itemCatalogo.actions'; // Acción actualizada
// --- NUEVO: Importar acción para obtener categorías del negocio ---
import { obtenerNegocioCategorias } from '@/app/admin/_lib/negocioCategoria.actions'; // Asegúrate que esta acción exista y la ruta sea correcta
import { ItemCatalogo, NegocioCategoria } from '@/app/admin/_lib/types'; // Importar tipos necesarios
import { Loader2, ArrowLeft } from 'lucide-react'; // Iconos

interface Props {
    negocioId: string;
    catalogoId: string;
    clienteId: string;
}

// --- Tipo para el estado local: Añadir categoriaId ---
type ItemNuevaSimpleFormData = Pick<ItemCatalogo, 'nombre' | 'precio'> & {
    categoriaId?: string | null; // Hacerlo opcional o string
};

export default function ItemNuevoForm({ negocioId, catalogoId, clienteId }: Props) {
    const router = useRouter();

    // --- Estado inicial: Incluir categoriaId vacío ---
    const getInitialState = (): ItemNuevaSimpleFormData => ({
        nombre: '',
        precio: 0,
        categoriaId: '', // Inicializar como string vacío para el select
    });

    const [formData, setFormData] = useState<ItemNuevaSimpleFormData>(getInitialState());
    // --- NUEVO: Estado para categorías ---
    const [categorias, setCategorias] = useState<NegocioCategoria[]>([]);
    const [loadingCategorias, setLoadingCategorias] = useState(true);
    // ---------------------------------
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);

    // Clases de Tailwind
    const containerClasses = "p-4 max-w-md mx-auto bg-zinc-800 rounded-lg shadow-md border border-zinc-700";
    const labelBaseClasses = "text-zinc-300 block mb-1 text-xs font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-600 text-zinc-200 text-sm block w-full rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 placeholder:text-zinc-500";
    const selectClasses = `${inputBaseClasses} appearance-none`; // Clase específica para select
    const buttonBaseClasses = "w-full text-white font-medium px-4 py-2 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";

    // --- NUEVO: Efecto para cargar Categorías ---
    useEffect(() => {
        if (!negocioId) {
            console.warn("ItemNuevoForm: negocioId no proporcionado, no se pueden cargar categorías.");
            setLoadingCategorias(false);
            return;
        }
        setLoadingCategorias(true);
        obtenerNegocioCategorias(negocioId)
            .then(data => {
                setCategorias(data || []);
            })
            .catch(err => {
                console.error("Error fetching negocio categorias:", err);
                // Podrías mostrar un error específico para categorías si lo deseas
                // setError("Error al cargar categorías.");
            })
            .finally(() => {
                setLoadingCategorias(false);
            });
    }, [negocioId]);
    // ---------------------------------------

    // Manejador de cambios (ahora incluye select)
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => { // Añadido HTMLSelectElement
        const { name, value, type } = e.target;
        let finalValue: string | number | null;

        if (type === 'number') {
            finalValue = value === '' ? 0 : parseFloat(value);
            if (isNaN(finalValue as number) || finalValue < 0) {
                finalValue = 0;
            }
            // --- NUEVO: Manejar el select de categoría ---
        } else if (name === 'categoriaId') {
            finalValue = value === '' ? null : value; // Guardar null si seleccionan "-- Sin categoría --"
            // -----------------------------------------
        } else {
            finalValue = value;
        }

        setFormData(prevState => ({
            ...prevState,
            [name]: finalValue,
        }));
        setError(null);
    };

    // Manejador de envío (ahora envía categoriaId)
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validación básica (precio sigue siendo obligatorio aquí)
        if (!formData.nombre?.trim() || formData.precio === null || typeof formData.precio !== 'number') {
            setError("Nombre y Precio (>= 0) son obligatorios.");
            return;
        }
        if (!catalogoId || !negocioId) {
            setError("Error interno: Falta ID de catálogo o negocio.");
            return;
        }

        setIsSubmitting(true);
        setError(null);

        try {
            // Preparar datos incluyendo categoriaId
            const dataToSend = {
                nombre: formData.nombre.trim(),
                precio: formData.precio,
                catalogoId: catalogoId,
                negocioId: negocioId,
                categoriaId: formData.categoriaId || null, // Enviar null si está vacío
            };

            const nuevoItem = await crearItemCatalogo(
                catalogoId,
                negocioId,
                dataToSend
            );

            // Redirección a edición
            const editUrl = `/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}/item/${nuevoItem.data?.id ?? ''}`
            router.push(editUrl);

        } catch (err) {
            console.error("Error creating item catalogo:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear el ítem: ${errorMessage}`);
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => { router.back(); };

    return (
        <div className={containerClasses}>
            <h2 className="text-lg font-semibold text-white mb-4 border-b border-zinc-700 pb-2">
                Añadir Nuevo Ítem
            </h2>

            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* Campo Nombre */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Ítem <span className="text-red-500">*</span></label>
                    <input type="text" id="nombre" name="nombre" value={formData.nombre} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} placeholder="Nombre corto y descriptivo" autoFocus />
                </div>

                {/* Campo Precio */}
                <div>
                    <label htmlFor="precio" className={labelBaseClasses}>Precio <span className="text-red-500">*</span></label>
                    <input type="number" id="precio" name="precio" value={formData.precio} onChange={handleChange} className={inputBaseClasses} required disabled={isSubmitting} step="0.01" min="0" placeholder="0.00" />
                    <p className="text-xs text-zinc-500 mt-1">Ingresa 0 si es gratuito.</p>
                </div>

                {/* --- NUEVO: Campo Categoría (Opcional, Select) --- */}
                <div>
                    <label htmlFor="categoriaId" className={labelBaseClasses}>Categoría (Opcional)</label>
                    <select
                        id="categoriaId"
                        name="categoriaId"
                        value={formData.categoriaId || ''} // Controlar con estado
                        onChange={handleChange}
                        className={selectClasses} // Usar clase específica para select
                        disabled={isSubmitting || loadingCategorias} // Deshabilitar mientras carga
                    >
                        <option value="">
                            {loadingCategorias ? 'Cargando...' : '-- Sin categoría --'}
                        </option>
                        {/* Mapear categorías cargadas */}
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.nombre}
                            </option>
                        ))}
                    </select>
                </div>
                {/* ----------------------------------------- */}


                {/* Botones de Acción */}
                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button
                        type="submit"
                        className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
                        disabled={isSubmitting || loadingCategorias || !formData.nombre.trim()} // Deshabilitar si carga categorías
                    >
                        {isSubmitting ? (
                            <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={16} /> Creando...</span>
                        ) : (
                            'Crear y Continuar Editando'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className={`${buttonBaseClasses} bg-zinc-600 hover:bg-zinc-700 focus:ring-zinc-500`}
                        disabled={isSubmitting}
                    >
                        <ArrowLeft size={16} /> Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
