// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/item/nuevo/components/ItemNuevoForm.tsx
'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { crearItemCatalogo } from '@/app/admin/_lib/actions/catalogo/itemCatalogo.actions'; // Action actualizada
import { type CrearItemBasicoData } from '@/app/admin/_lib/actions/catalogo/itemCatalogo.schemas'; // Tipo Zod
import { obtenerNegocioCategorias } from '@/app/admin/_lib/actions/catalogo/negocioCategoria.actions';
import { type NegocioCategoriaType } from '@/app/admin/_lib/actions/catalogo/negocioCategoria.schemas';
import { ActionResult } from '@/app/admin/_lib/types';
import { Loader2, ArrowLeft, CheckCircle, AlertCircle, PackagePlus } from 'lucide-react';

interface Props {
    negocioId: string;
    catalogoId: string;
    clienteId: string;
}

// Modificar ItemFormState para que precio pueda ser string o number
type ItemFormState = Omit<CrearItemBasicoData, 'precio'> & {
    precio: string | number; // Permitir string para el input, Zod lo validará como número
};

export default function ItemNuevoForm({ negocioId, catalogoId, clienteId }: Props) {
    const router = useRouter();

    const getInitialState = (): ItemFormState => ({
        nombre: '',
        precio: '', // Inicializar precio como string vacío
        categoriaId: null,
    });

    const [formData, setFormData] = useState<ItemFormState>(getInitialState());
    const [categorias, setCategorias] = useState<NegocioCategoriaType[]>([]);
    const [loadingCategorias, setLoadingCategorias] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de Tailwind (sin cambios)
    const mainContainerClasses = "max-w-lg mx-auto bg-zinc-800 p-6 md:p-8 rounded-xl shadow-2xl border border-zinc-700";
    const labelBaseClasses = "block text-sm font-medium text-zinc-300 mb-1.5";
    const inputBaseClasses = "block w-full bg-zinc-900 border border-zinc-700 text-zinc-200 rounded-md p-2.5 shadow-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-60 placeholder:text-zinc-500 sm:text-sm";
    const selectClasses = `${inputBaseClasses} appearance-none`;
    const buttonBaseClasses = "inline-flex items-center justify-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-zinc-800 disabled:opacity-50 transition-colors duration-150 gap-2";
    const primaryButtonClasses = `${buttonBaseClasses} text-white bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`;
    const secondaryButtonClasses = `${buttonBaseClasses} text-zinc-200 bg-zinc-600 hover:bg-zinc-500 focus:ring-zinc-500`;
    const messageBoxBaseClasses = "p-3 rounded-md text-sm my-4 flex items-center gap-2";
    const errorBoxClasses = `${messageBoxBaseClasses} bg-red-500/10 border border-red-500/30 text-red-400`;
    const successBoxClasses = `${messageBoxBaseClasses} bg-green-500/10 border border-green-500/30 text-green-300`;

    const fetchCategorias = useCallback(async () => {
        if (!negocioId) {
            console.warn("ItemNuevoForm: negocioId no proporcionado, no se pueden cargar categorías.");
            setLoadingCategorias(false);
            return;
        }
        setLoadingCategorias(true);
        try {
            const data = await obtenerNegocioCategorias(negocioId);
            const processedData = (data || []).map(cat => ({
                ...cat,
                createdAt: new Date(cat.createdAt),
                updatedAt: new Date(cat.updatedAt),
                orden: cat.orden ?? 0,
            }));
            setCategorias(processedData as NegocioCategoriaType[]);
        } catch (err) {
            console.error("Error fetching negocio categorias:", err);
            setError("Error al cargar categorías disponibles.");
        } finally {
            setLoadingCategorias(false);
        }
    }, [negocioId]);

    useEffect(() => {
        fetchCategorias();
    }, [fetchCategorias]);

    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (successMessage) {
            timer = setTimeout(() => setSuccessMessage(null), 2500);
        }
        return () => clearTimeout(timer);
    }, [successMessage]);

    const handleChange = (e: ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        let finalValue: string | number | null = value;

        if (name === 'precio') {
            // Mantener como string si es vacío o si es un número válido (o parcialmente válido)
            // La validación final la hará Zod al convertir a número
            finalValue = value;
        } else if (name === 'categoriaId') {
            finalValue = value === '' ? null : value;
        }

        setFormData(prevState => ({
            ...prevState,
            [name]: finalValue,
        }));
        setError(null);
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        setError(null);
        setSuccessMessage(null);

        // Convertir precio a número antes de enviar a la acción.
        // Zod en la acción validará si es un número positivo.
        const precioNumerico = parseFloat(String(formData.precio));

        const dataToSend: CrearItemBasicoData = {
            nombre: formData.nombre.trim(),
            // Si precioNumerico es NaN (ej. si formData.precio era un string no numérico),
            // la validación de Zod en el backend fallará, lo cual es correcto.
            precio: isNaN(precioNumerico) ? 0 : precioNumerico, // Enviar 0 si es NaN para que Zod lo rechace si es .positive()
            categoriaId: formData.categoriaId || null,
        };

        try {
            const result: ActionResult<{ id: string }> = await crearItemCatalogo(
                catalogoId,
                negocioId,
                clienteId,
                dataToSend // Zod validará que dataToSend.precio sea un número positivo
            );

            if (result.success && result.data?.id) {
                setSuccessMessage("Ítem creado exitosamente. Redirigiendo a edición...");
                setFormData(getInitialState());
                setTimeout(() => {
                    router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}/item/${result.data!.id}`);
                }, 1500);
            } else {
                let errorMsg = result.error || "No se pudo crear el ítem.";
                if (result.errorDetails) {
                    errorMsg = Object.entries(result.errorDetails)
                        .map(([field, errors]) => {
                            const fieldDisplayName = field === 'precio' ? 'Precio' : field.charAt(0).toUpperCase() + field.slice(1);
                            return `${fieldDisplayName}: ${errors.join(', ')}`;
                        })
                        .join('; ');
                }
                setError(errorMsg);
            }
        } catch (err) {
            console.error("Error creando ítem de catálogo:", err);
            setError(err instanceof Error ? err.message : "Ocurrió un error desconocido.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleCancel = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}/catalogo/${catalogoId}`);
    };

    return (
        <div className={mainContainerClasses}>
            <button
                onClick={handleCancel}
                className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 mb-4 transition-colors"
                disabled={isSubmitting}
            >
                <ArrowLeft size={16} />
                Volver al Catálogo
            </button>

            <h1 className="text-2xl font-semibold text-zinc-100 mb-2 flex items-center gap-2">
                <PackagePlus size={24} className="text-blue-400" />
                Añadir Nuevo Ítem
            </h1>
            <p className="text-sm text-zinc-400 mb-6 border-b border-zinc-700 pb-4">
                Estás añadiendo un ítem al catálogo del negocio: <span className='font-medium text-zinc-300'>{negocioId}</span>
            </p>

            {error && <div className={errorBoxClasses}><AlertCircle size={18} /><span>{error}</span></div>}
            {successMessage && <div className={successBoxClasses}><CheckCircle size={18} /><span>{successMessage}</span></div>}

            <form onSubmit={handleSubmit} className="space-y-5" noValidate>
                <div>
                    <label htmlFor="nombre" className={labelBaseClasses}>
                        Nombre del Ítem <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="text"
                        id="nombre"
                        name="nombre"
                        value={formData.nombre}
                        onChange={handleChange}
                        className={inputBaseClasses}
                        disabled={isSubmitting}
                        placeholder="Ej: Corte de Caballero, Taza Personalizada"
                        required
                        autoFocus
                    />
                </div>

                <div>
                    <label htmlFor="precio" className={labelBaseClasses}>
                        Precio <span className="text-red-500">*</span>
                    </label>
                    <input
                        type="number" // El input sigue siendo number para el teclado numérico en móviles, etc.
                        id="precio"
                        name="precio"
                        value={formData.precio} // Ahora puede ser string o number
                        onChange={handleChange}
                        className={inputBaseClasses}
                        disabled={isSubmitting}
                        step="0.01" // step sigue siendo útil para las flechas del input
                        min="0" // min sigue siendo útil para validación del navegador
                        placeholder="0.00"
                        required
                    />
                    <p className="text-xs text-zinc-500 mt-1.5">Ingresa 0 si el ítem es gratuito o si el precio varía (será validado como positivo).</p>
                </div>

                <div>
                    <label htmlFor="categoriaId" className={labelBaseClasses}>
                        Categoría (Opcional)
                    </label>
                    <select
                        id="categoriaId"
                        name="categoriaId"
                        value={formData.categoriaId || ''}
                        onChange={handleChange}
                        className={selectClasses}
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
                </div>

                <div className="pt-5 space-y-3 border-t border-zinc-700">
                    <button
                        type="submit"
                        className={primaryButtonClasses + " w-full"}
                        disabled={isSubmitting || loadingCategorias || !formData.nombre.trim() || successMessage !== null}
                    >
                        {isSubmitting ? (
                            <> <Loader2 className='animate-spin' size={18} /> Creando Ítem... </>
                        ) : (
                            'Crear y Continuar Editando'
                        )}
                    </button>
                    <button
                        type="button"
                        onClick={handleCancel}
                        className={secondaryButtonClasses + " w-full"}
                        disabled={isSubmitting}
                    >
                        Cancelar
                    </button>
                </div>
            </form>
        </div>
    );
}
