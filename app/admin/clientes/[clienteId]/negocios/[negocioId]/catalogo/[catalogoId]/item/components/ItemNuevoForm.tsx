'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
// Ajusta las rutas si es necesario
import { crearItemCatalogo } from '@/app/admin/_lib/itemCatalogo.actions'; // Acción para crear ítem
import { obtenerNegocioCategorias } from '@/app/admin/_lib/negocioCategoria.actions'; // Acción para obtener categorías
import { ItemCatalogo, NegocioCategoria } from '@/app/admin/_lib/types'; // Importar tipos necesarios
import { Loader2 } from 'lucide-react'; // Icono

interface Props {
    negocioId: string; // Necesario para cargar categorías/etiquetas del negocio
    catalogoId: string; // Necesario para asociar el nuevo item
}

// Tipo para los datos de este formulario
// Basado en los campos que maneja la acción crearItemCatalogo proporcionada
// + categoriaId para el selector (aunque no se guarde aún)
type ItemNuevaFormData = Pick<ItemCatalogo,
    'nombre' | 'descripcion' | 'precio' | 'status' | 'categoriaId'
>;

export default function ItemNuevoForm({ negocioId, catalogoId }: Props) {
    const router = useRouter();

    // Estado inicial del formulario
    const getInitialState = (): ItemNuevaFormData => ({
        nombre: '',
        descripcion: '',
        precio: 0, // Iniciar precio en 0 o null
        status: 'activo', // Default status
        categoriaId: '', // Sin categoría por defecto
    });

    const [formData, setFormData] = useState<ItemNuevaFormData>(getInitialState());
    const [categorias, setCategorias] = useState<NegocioCategoria[]>([]);
    const [loadingCategorias, setLoadingCategorias] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind reutilizables
    const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
    const textareaBaseClasses = `${inputBaseClasses} min-h-[100px]`;
    const containerClasses = "p-4 max-w-lg mx-auto bg-zinc-800 rounded-lg shadow-md";
    const buttonBaseClasses = "w-full text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2";

    // Efecto para cargar Categorías del Negocio al montar
    useEffect(() => {
        if (!negocioId) return; // No cargar si no hay negocioId

        setLoadingCategorias(true);
        obtenerNegocioCategorias(negocioId)
            .then(data => {
                setCategorias(data || []);
            })
            .catch(err => {
                console.error("Error fetching negocio categorias:", err);
                // Opcional: Mostrar error específico
                // setError("Error al cargar las categorías.");
            })
            .finally(() => {
                setLoadingCategorias(false);
            });
    }, [negocioId]);

    // Manejador de cambios genérico
    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value, type } = e.target;
        let finalValue: string | number | null;

        if (type === 'number') {
            finalValue = value === '' ? null : parseFloat(value);
            if (isNaN(finalValue as number)) {
                finalValue = null; // O 0 si prefieres
            }
        } else {
            finalValue = value;
        }

        setFormData(prevState => ({
            ...prevState,
            [name]: finalValue,
        }));
        setError(null);
        setSuccessMessage(null);
    };

    // Manejador de envío
    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();

        // Validación básica
        if (!formData.nombre?.trim() || formData.precio === null || typeof formData.precio !== 'number' || formData.precio < 0 || !formData.status) {
            setError("Nombre, Precio válido (>= 0) y Status son obligatorios.");
            return;
        }

        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        try {
            // Preparar datos para enviar según la acción actual
            const dataToSend = {
                nombre: formData.nombre.trim().charAt(0).toUpperCase() + formData.nombre.trim().slice(1),
                descripcion: formData.descripcion
                    ? formData.descripcion.trim().charAt(0).toUpperCase() + formData.descripcion.trim().slice(1)
                    : null,
                precio: formData.precio, // Ya es número o null (validado arriba)
                status: formData.status,
                catalogoId: catalogoId, // Asociar con el catálogo actual
                categoriaId: formData.categoriaId || null,
                // !! IMPORTANTE: La acción crearItemCatalogo actual NO guarda:
                // imagen, linkPago, y otros campos opcionales...
            };

            // Llamar a la acción
            await crearItemCatalogo(dataToSend as ItemCatalogo).then(() => {
                router.push(`/admin/negocios/${negocioId}/catalogo/${catalogoId}`); // Redirigir a la vista del catálogo
            });

        } catch (err) {
            console.error("Error creating item catalogo:", err);
            const errorMessage = err instanceof Error ? err.message : "Ocurrió un error desconocido";
            setError(`Error al crear el ítem: ${errorMessage}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    // Manejador para Cancelar
    const handleCancel = () => {
        router.back(); // Volver a la página anterior (probablemente gestión catálogo)
    };

    return (
        <div className={containerClasses}>
            <h2 className="text-xl font-semibold text-white mb-1">Crear Nuevo Ítem de Catálogo</h2>
            <p className="text-sm text-zinc-400 mb-4 border-b border-zinc-700 pb-2">
                Para Catálogo ID: <span className='font-mono text-zinc-300'>{catalogoId}</span>
            </p>

            {error && <p className="mb-4 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{error}</p>}
            {successMessage && <p className="mb-4 text-center text-green-400 bg-green-900/30 p-2 rounded border border-green-600 text-sm">{successMessage}</p>}

            <form onSubmit={handleSubmit} className="space-y-4" noValidate>

                {/* Campo Nombre (Obligatorio) */}
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>Nombre del Ítem <span className="text-red-500">*</span></label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        required
                        disabled={isSubmitting}
                        placeholder="Ej: Consulta Inicial, Producto X Modelo Y"
                    />
                </div>

                {/* Campo Descripción (Opcional) */}
                <div>
                    <label htmlFor="descripcion" className={labelBaseClasses}>Descripción</label>
                    <textarea
                        id="descripcion"
                        name="descripcion"
                        value={formData.descripcion || ''}
                        onChange={handleChange}
                        className={textareaBaseClasses}
                        disabled={isSubmitting}
                        rows={4}
                        placeholder="Detalles del producto o servicio..."
                    />
                </div>

                {/* Campo Precio (Obligatorio) */}
                <div>
                    <label htmlFor="precio" className={labelBaseClasses}>Precio <span className="text-red-500">*</span></label>
                    <input
                        type="number"
                        id="precio"
                        name="precio"
                        value={formData.precio ?? ''} // Mostrar vacío si es null
                        onChange={handleChange}
                        className={inputBaseClasses}
                        required
                        disabled={isSubmitting}
                        step="0.01"
                        min="0"
                        placeholder="Ej: 99.99"
                    />
                </div>

                {/* Campo Categoría (Opcional, Select) */}
                {/* Nota: La acción actual no guarda este campo */}
                <div>
                    <label htmlFor="categoriaId" className={labelBaseClasses}>Categoría (Opcional)</label>
                    <select
                        id="categoriaId"
                        name="categoriaId"
                        value={formData.categoriaId || ''}
                        onChange={handleChange}
                        className={`${inputBaseClasses} appearance-none`}
                        disabled={isSubmitting || loadingCategorias}
                    >
                        <option value="">
                            {loadingCategorias ? 'Cargando categorías...' : '-- Sin categoría --'}
                        </option>
                        {categorias.map(cat => (
                            <option key={cat.id} value={cat.id}>
                                {cat.nombre}
                            </option>
                        ))}
                    </select>
                    <p className="text-xs text-zinc-500 mt-1">Clasifica este ítem (la acción actual no lo guarda).</p>
                </div>

                {/* Campo Status (Obligatorio, Select) */}
                <div>
                    <label htmlFor="status" className={labelBaseClasses}>Status <span className="text-red-500">*</span></label>
                    <select
                        id="status"
                        name="status"
                        value={formData.status || 'activo'}
                        onChange={handleChange}
                        className={`${inputBaseClasses} appearance-none`}
                        required
                        disabled={isSubmitting}
                    >
                        <option value="activo">Activo</option>
                        <option value="inactivo">Inactivo</option>
                    </select>
                </div>

                {/* Aquí podrías añadir inputs para otros campos opcionales: */}
                {/* imagen, linkPago, funcionPrincipal, etc. */}
                {/* Pero recuerda actualizar la acción crearItemCatalogo para guardarlos */}


                {/* Botones de Acción */}
                <div className="pt-5 space-y-2 border-t border-zinc-700">
                    <button
                        type="submit"
                        className={`${buttonBaseClasses} bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`}
                        disabled={isSubmitting || loadingCategorias}
                    >
                        {isSubmitting ? (
                            <span className='flex items-center justify-center gap-2'><Loader2 className='animate-spin' size={18} /> Creando...</span>
                        ) : (
                            'Crear Ítem'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className={`${buttonBaseClasses} bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`}
                        disabled={isSubmitting}
                    >
                        Cancelar / Volver
                    </button>
                </div>
            </form>
        </div>
    );
}
