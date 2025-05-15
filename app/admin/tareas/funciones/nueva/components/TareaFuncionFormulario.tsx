'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import {
    obtenerParametrosRequeridosDisponibles,
    crearFuncionTarea
} from '@/app/admin/_lib/tareaFuncion.actions';
import {
    TareaFuncionNuevaFormData,
    CrearTareaFuncionInput
} from '@/app/admin/_lib/tareaFuncion.type';

import { Loader2, Save, XIcon, AlertTriangleIcon, CheckSquare, Cog, SearchIcon } from 'lucide-react';

// Helper para generar nombre interno
const generarNombreInterno = (nombreVisible: string): string => {
    if (!nombreVisible) return '';
    return nombreVisible
        .replace(/(?:^\w|[A-Z]|\b\w|\s+)/g, (match, index) =>
            index === 0 ? match.toLowerCase() : match.toUpperCase()
        )
        .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
        .replace(/[^a-zA-Z0-9]+/g, '');
};

export default function TareaFuncionFormulario() {
    const router = useRouter();
    const [formData, setFormData] = useState<TareaFuncionNuevaFormData>({
        nombreInterno: '',
        nombreVisible: '',
        descripcion: '',
        parametros: []
    });
    const [loadingParametros, setLoadingParametros] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);
    const [searchTermParametros, setSearchTermParametros] = useState('');

    // Clases de UI de la Guía de Estilos
    const formContainerClasses = "bg-zinc-800 rounded-lg shadow-md";
    const sectionContainerClasses = "p-4 bg-zinc-900/30 rounded-md border border-zinc-700";
    const sectionTitleClasses = "text-base font-semibold text-zinc-100 mb-4";
    const labelBaseClasses = "block mb-1.5 text-sm font-medium text-zinc-300";
    const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950";
    // Textarea base ahora no define min-h, se aplicará específicamente
    const textareaBaseClasses = `${inputBaseClasses} resize-none`; // Añadido resize-none
    const helperTextClasses = "text-xs text-zinc-500 mt-1.5";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const buttonSecondaryClasses = "bg-zinc-600 hover:bg-zinc-500 text-zinc-100 text-sm font-medium px-6 py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const checkboxWrapperClasses = "flex items-center justify-between p-3 bg-zinc-800 border border-zinc-700 rounded-md hover:bg-zinc-700/50 transition-colors";
    const checkboxLabelClasses = "text-sm text-zinc-200";
    const checkboxClasses = "h-5 w-5 rounded text-blue-600 bg-zinc-900 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-800 flex-shrink-0";
    const alertErrorClasses = "col-span-full text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2"; // Eliminado my-4, se maneja con space-y
    const alertSuccessClasses = "col-span-full text-sm text-green-400 bg-green-500/10 p-3 rounded-md border border-green-500/30 flex items-center gap-2"; // Eliminado my-4
    const searchInputWrapperClasses = "relative mb-4";
    const searchInputClasses = `${inputBaseClasses} pl-10`;


    useEffect(() => {
        async function cargarParametros() {
            setLoadingParametros(true);
            try {
                const paramsDisponibles = await obtenerParametrosRequeridosDisponibles();
                setFormData(prev => ({
                    ...prev,
                    parametros: paramsDisponibles.map(p => ({
                        ...p,
                        seleccionado: false,
                        esObligatorio: false
                    }))
                }));
            } catch (err) {
                setError("Error al cargar los parámetros disponibles.");
                console.error(err);
            } finally {
                setLoadingParametros(false);
            }
        }
        cargarParametros();
    }, []);

    const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setFormData(prev => {
            const newData = { ...prev, [name]: value };
            if (name === 'nombreVisible') {
                newData.nombreInterno = generarNombreInterno(value);
            }
            return newData;
        });
        if (error) setError(null);
        if (successMessage) setSuccessMessage(null);
    };

    const handleParametroChange = (paramId: string) => {
        setFormData(prev => ({
            ...prev,
            parametros: prev.parametros.map(p =>
                p.id === paramId ? { ...p, seleccionado: !p.seleccionado, esObligatorio: !p.seleccionado ? p.esObligatorio : false } : p
            )
        }));
    };

    const handleEsObligatorioChange = (paramId: string) => {
        setFormData(prev => ({
            ...prev,
            parametros: prev.parametros.map(p =>
                p.id === paramId ? { ...p, esObligatorio: !p.esObligatorio } : p
            )
        }));
    };

    const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!formData.nombreVisible.trim()) { setError("El Nombre Visible es obligatorio."); return; }
        if (!formData.nombreInterno.trim()) { setError("El Nombre Interno es obligatorio y se genera del Nombre Visible."); return; }
        if (!/^[a-zA-Z][a-zA-Z0-9]*$/.test(formData.nombreInterno)) { setError("Nombre Interno inválido. Debe estar en formato Camel Case, comenzando con una letra y sin caracteres especiales."); return; }

        setIsSubmitting(true); setError(null); setSuccessMessage(null);

        const parametrosSeleccionados = formData.parametros
            .filter(p => p.seleccionado)
            .map(p => ({ parametroRequeridoId: p.id, esObligatorio: p.esObligatorio }));

        const dataParaCrear: CrearTareaFuncionInput = {
            nombreInterno: formData.nombreInterno,
            nombreVisible: formData.nombreVisible,
            descripcion: formData.descripcion.trim() || null,
            parametros: parametrosSeleccionados
        };

        try {
            const result = await crearFuncionTarea(dataParaCrear);
            if (result.success && result.data) {
                setSuccessMessage(`Función "${result.data.nombreVisible}" creada exitosamente!`);
                const paramsDisponibles = await obtenerParametrosRequeridosDisponibles();
                setFormData({
                    nombreInterno: '',
                    nombreVisible: '',
                    descripcion: '',
                    parametros: paramsDisponibles.map(p => ({ ...p, seleccionado: false, esObligatorio: false }))
                });
            } else {
                setError(result.error || "Ocurrió un error al crear la función.");
            }
        } catch (err) {
            console.error("Error en submit:", err);
            setError(err instanceof Error ? err.message : "Un error inesperado ocurrió.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const parametrosFiltrados = formData.parametros.filter(param =>
        param.nombreVisible?.toLowerCase().includes(searchTermParametros.toLowerCase()) ||
        param.nombreInterno?.toLowerCase().includes(searchTermParametros.toLowerCase()) ||
        param.descripcion?.toLowerCase().includes(searchTermParametros.toLowerCase())
    );

    return (
        <div className={formContainerClasses}>
            <form onSubmit={handleSubmit}>
                <div className="px-6 py-4 border-b border-zinc-700">
                    <h2 className="text-xl font-semibold text-zinc-100 flex items-center gap-2">
                        <Cog size={22} /> Crear Nueva Función Global
                    </h2>
                </div>

                {/* Contenido del Formulario en dos columnas */}
                {/* items-stretch hace que los hijos del grid tengan la misma altura */}
                <div className="p-6 grid grid-cols-1 lg:grid-cols-2 gap-6 items-stretch">
                    {/* Columna 1: Información de la Función */}
                    {/* flex flex-col para que esta columna pueda manejar el crecimiento interno */}
                    <div className="flex flex-col space-y-6">
                        {error && (
                            <div className={alertErrorClasses}>
                                <AlertTriangleIcon size={18} /> <span>{error}</span>
                            </div>
                        )}
                        {successMessage && (
                            <div className={alertSuccessClasses}>
                                <CheckSquare size={18} /> <span>{successMessage}</span>
                            </div>
                        )}
                        {/* sectionContainerClasses necesita flex-grow y flex-col para que su contenido se expanda */}
                        <div className={`${sectionContainerClasses} flex flex-col flex-grow`}>
                            <h3 className={sectionTitleClasses}>Información de la Función</h3>
                            {/* Este div también necesita flex-grow y flex-col para pasar la capacidad de crecimiento */}
                            <div className="space-y-4 flex flex-col flex-grow">
                                <div>
                                    <label htmlFor="nombreVisible" className={labelBaseClasses}>
                                        Nombre Visible <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text" id="nombreVisible" name="nombreVisible"
                                        value={formData.nombreVisible} onChange={handleInputChange}
                                        className={inputBaseClasses} placeholder="Ej: Agendar Cita Presencial"
                                        required disabled={isSubmitting}
                                    />
                                    <p className={helperTextClasses}>Nombre descriptivo que se mostrará en la UI.</p>
                                </div>
                                <div>
                                    <label htmlFor="nombreInterno" className={labelBaseClasses}>
                                        Nombre Interno (ID) <span className="text-red-500">*</span>
                                    </label>
                                    <input
                                        type="text" id="nombreInterno" name="nombreInterno"
                                        value={formData.nombreInterno} onChange={handleInputChange}
                                        className={`${inputBaseClasses} font-mono`} placeholder=""
                                        required disabled={isSubmitting}
                                    />
                                    <p className={helperTextClasses}>Identificador único. Se autogenera en formato Camel Case.</p>
                                </div>
                                {/* El wrapper de descripción necesita crecer */}
                                <div className="flex flex-col flex-grow">
                                    <label htmlFor="descripcion" className={labelBaseClasses}>
                                        Descripción (Opcional)
                                    </label>
                                    <textarea
                                        id="descripcion" name="descripcion" value={formData.descripcion}
                                        onChange={handleInputChange}
                                        // Aplicar flex-grow y un min-height más grande aquí
                                        className={`${textareaBaseClasses} flex-grow min-h-[150px] lg:min-h-[200px]`}
                                        placeholder="Describe brevemente qué hace esta función y cuándo se debería usar."
                                        disabled={isSubmitting}
                                    />
                                    <p className={helperTextClasses}>Ayuda a entender el propósito de la función.</p>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Columna 2: Parámetros Estándar */}
                    {/* Esta columna ya tiene flex flex-col en su sectionContainerClasses */}
                    <div className={`${sectionContainerClasses} flex flex-col`}>
                        <h3 className={sectionTitleClasses}>Parámetros Estándar para la Función</h3>

                        <div className={searchInputWrapperClasses}>
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <SearchIcon className="h-5 w-5 text-zinc-500" aria-hidden="true" />
                            </div>
                            <input
                                type="search" name="searchParametros" id="searchParametros"
                                value={searchTermParametros} onChange={(e) => setSearchTermParametros(e.target.value)}
                                className={searchInputClasses} placeholder="Buscar parámetro..."
                                disabled={loadingParametros || isSubmitting}
                            />
                        </div>

                        {loadingParametros ? (
                            <div className="flex-grow flex items-center justify-center py-6 text-zinc-400">
                                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                                <span>Cargando parámetros...</span>
                            </div>
                        ) : formData.parametros.length === 0 ? (
                            <p className="flex-grow text-sm text-zinc-400 italic text-center py-6">No hay parámetros estándar globales definidos.</p>
                        ) : parametrosFiltrados.length === 0 ? (
                            <p className="flex-grow text-sm text-zinc-400 italic text-center py-6">No se encontraron parámetros con &quot;{searchTermParametros}&quot;.</p>
                        ) : (
                            // Contenedor de la lista de parámetros con scroll y altura máxima
                            <div className="space-y-3 flex-grow overflow-y-auto max-h-[calc(100vh-450px)] min-h-[200px] pr-2">
                                {parametrosFiltrados.map((param) => (
                                    <div key={param.id} className={checkboxWrapperClasses}>
                                        <div className="flex items-center gap-3 flex-grow min-w-0">
                                            <input
                                                type="checkbox" id={`param-${param.id}`}
                                                checked={param.seleccionado} onChange={() => handleParametroChange(param.id)}
                                                className={checkboxClasses} disabled={isSubmitting}
                                            />
                                            <label htmlFor={`param-${param.id}`} className={`${checkboxLabelClasses} cursor-pointer flex flex-col overflow-hidden`}>
                                                <span className="font-medium text-zinc-100 truncate" title={param.nombreVisible}>{param.nombreVisible}</span>
                                                <span className="text-xs text-zinc-400 font-mono truncate" title={param.nombreInterno}>({param.nombreInterno}) - <span className="capitalize">{param.tipoDato}</span></span>
                                                {param.descripcion && <span className="text-xs text-zinc-500 mt-0.5 line-clamp-1" title={param.descripcion}>{param.descripcion}</span>}
                                            </label>
                                        </div>
                                        {param.seleccionado && (
                                            <div className="flex items-center gap-2 flex-shrink-0 ml-2">
                                                <input
                                                    type="checkbox" id={`obligatorio-${param.id}`}
                                                    checked={param.esObligatorio} onChange={() => handleEsObligatorioChange(param.id)}
                                                    className={checkboxClasses} disabled={isSubmitting}
                                                />
                                                <label htmlFor={`obligatorio-${param.id}`} className="text-xs text-zinc-300 cursor-pointer whitespace-nowrap">
                                                    Obligatorio
                                                </label>
                                            </div>
                                        )}
                                    </div>
                                ))}
                            </div>
                        )}
                        <p className={helperTextClasses + " mt-3"}>Selecciona los parámetros que esta función utilizará.</p>
                    </div>
                </div>

                <div className="px-6 pb-6 pt-4 flex justify-end gap-4 border-t border-zinc-700 mt-6">
                    <button
                        type="button"
                        onClick={() => router.back()}
                        className={buttonSecondaryClasses}
                        disabled={isSubmitting}
                    >
                        <XIcon size={18} /> Cerrar
                    </button>
                    <button
                        type="submit"
                        className={buttonPrimaryClasses}
                        disabled={isSubmitting || loadingParametros}
                    >
                        {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Crear Función
                    </button>
                </div>
            </form>
        </div>
    );
}
