// app/admin/clientes/[clienteId]/negocios/[negocioId]/catalogo/[catalogoId]/item/[itemId]/components/ItemEditarForm.tsx
'use client';

import React, { useState, useEffect, ChangeEvent, FormEvent, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import {
    obtenerItemCatalogoPorId,
    actualizarItemCatalogo,
    eliminarItemCatalogo,
    // mejorarDescripcionItemIA,
} from '@/app/admin/_lib/actions/catalogo/itemCatalogo.actions';
import {
    type ActualizarItemData, // Tipo Zod para los datos del formulario
    // type MejorarDescripcionItemIAData,
    // type NivelCreatividadIA // Importar el tipo enum
} from '@/app/admin/_lib/actions/catalogo/itemCatalogo.schemas';

import { obtenerNegocioCategorias } from '@/app/admin/_lib/actions/catalogo/negocioCategoria.actions';
import { type NegocioCategoriaType } from '@/app/admin/_lib/actions/catalogo/negocioCategoria.schemas';
import { obtenerNegocioEtiquetas } from '@/app/admin/_lib/actions/catalogo/negocioEtiqueta.actions';
import { type NegocioEtiquetaType } from '@/app/admin/_lib/actions/catalogo/negocioEtiqueta.schemas';
// import { ActionResult } from '@/app/admin/_lib/types';
import { Button } from '@/app/components/ui/button';

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

    // const [nivelCreatividad, setNivelCreatividad] = useState<NivelCreatividadIA>('medio');
    // const [maxCaracteres, setMaxCaracteres] = useState<number>(250); // Aumentado un poco
    const [isImprovingDesc] = useState(false);
    // const [descripcionOriginalIA, setDescripcionOriginalIA] = useState<string | null | undefined>(null);


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

    // const aiButtonBaseClasses = "inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium rounded-md border focus:outline-none focus:ring-1 focus:ring-offset-1 focus:ring-offset-zinc-800 disabled:opacity-50";
    // const improveAiButtonClasses = `${aiButtonBaseClasses} text-purple-300 bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/40 focus:ring-purple-500`;
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
                // setDescripcionOriginalIA(itemData.descripcion); // Guardar para posible reversión de IA
            } else {
                setError(result.error || "Ítem no encontrado.");
            }
        } catch (err) {
            console.error("Error al cargar datos del ítem:", err);
            setError(err instanceof Error ? err.message : "Error al cargar datos del ítem.");
        } finally {
            setLoadi