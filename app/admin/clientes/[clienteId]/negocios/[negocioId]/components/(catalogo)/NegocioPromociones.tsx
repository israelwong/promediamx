'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Image from 'next/image'; // Importar Image de next/image

// --- IMPORTACIONES DE ACCIONES Y TIPOS ACTUALIZADOS ---
import { obtenerPromocionesNegocio } from '@/app/admin/_lib/promocion.actions';
import { PromocionConPortada } from '@/app/admin/_lib/promocion.actions'; // Usar el nuevo tipo
import { Loader2, ListChecks, PlusIcon, Tag, CalendarDays, BadgeCheck, BadgeX, AlertTriangle, PencilIcon } from 'lucide-react'; // Iconos necesarios

interface Props {
  negocioId: string;
  clienteId?: string; // Añadir clienteId si está disponible en la ruta padre
}

export default function NegocioPromociones({ negocioId, clienteId }: Props) {
  const router = useRouter();
  const [promociones, setPromociones] = useState<PromocionConPortada[]>([]); // Usar el nuevo tipo
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Clases de Tailwind
  const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
  const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
  const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2"; // Contenedor de la lista con scroll
  // --- NUEVAS CLASES PARA LA TARJETA ---
  const cardClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-start gap-3 hover:bg-zinc-800/50 transition-colors duration-150 cursor-pointer group"; // Hacerla clickeable
  const imageContainerClasses = "w-16 h-16 rounded flex-shrink-0 bg-zinc-700 relative overflow-hidden"; // Tamaño fijo para imagen
  const contentContainerClasses = "flex-grow overflow-hidden"; // Para truncar texto
  const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
  const statusBadgeClasses = "px-1.5 py-0.5 rounded-full text-[0.65rem] font-semibold inline-flex items-center gap-1 leading-tight"; // Más pequeño
  const editButtonClasses = "text-zinc-500 hover:text-blue-400 p-1 rounded-md hover:bg-zinc-700 opacity-0 group-hover:opacity-100 transition-opacity duration-150 flex-shrink-0"; // Oculto hasta hover

  // --- Carga de datos ---
  const fetchPromociones = useCallback(async () => {
    if (!negocioId) return;
    setLoading(true);
    setError(null);
    try {
      const data = await obtenerPromocionesNegocio(negocioId);
      setPromociones(data || []);
    } catch (err) {
      console.error("Error al obtener las promociones:", err);
      setError("No se pudieron cargar las promociones.");
      setPromociones([]);
    } finally {
      setLoading(false);
    }
  }, [negocioId]);

  useEffect(() => {
    fetchPromociones();
  }, [fetchPromociones]);

  // --- Navegación ---
  const handleNavigateToCreate = () => {
    // Construir la ruta base. Asume que esta página está en /admin/...(negocioId)
    const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}`
    router.push(`${basePath}/promocion/nueva`); // Navegar a la ruta de creación
  };

  const handleNavigateToEdit = (promocionId: string) => {
    // Construir la ruta base.
    const basePath = `/admin/clientes/${clienteId}/negocios/${negocioId}`
    router.push(`${basePath}/promocion/${promocionId}`); // Navegar a la ruta de edición (deberás crearla)
  };


  // --- Helpers (sin cambios) ---
  const getStatusInfo = (status: PromocionConPortada['status']): { text: string; color: string; icon: React.ElementType } => {
    switch (status) {
      case 'activo': return { text: 'Activa', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
      case 'inactivo': return { text: 'Inactiva', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
      default: return { text: status || 'Desc.', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
    }
  };
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    try { return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return 'Inválida'; }
  };

  // --- Renderizado ---
  return (
    <div className={containerClasses}>
      {/* Cabecera */}
      <div className={headerClasses}>
        <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
          <Tag size={16} /> Promociones
        </h3>
        {/* Botón para navegar a la creación */}
        <button onClick={handleNavigateToCreate} className={buttonPrimaryClasses} title="Crear nueva promoción">
          <PlusIcon size={14} /> <span>Crear Promoción</span>
        </button>
      </div>

      {/* Errores generales */}
      {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}

      {/* Contenido Principal: Lista */}
      <div className={listContainerClasses}>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando...</span></div>
        ) : promociones.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay promociones definidas.</p></div>
        ) : (
          // Lista de Promociones como Tarjetas
          <ul className='space-y-2'>
            {promociones.map((promo) => {
              const statusInfo = getStatusInfo(promo.status);
              return (
                <li key={promo.id} className={cardClasses} onClick={() => promo.id && handleNavigateToEdit(promo.id)}>
                  {/* Columna Imagen */}
                  <div className={imageContainerClasses}>
                    {promo.imagenPortadaUrl ? (
                      <Image
                        src={promo.imagenPortadaUrl}
                        alt={`Imagen de ${promo.nombre}`}
                        fill
                        sizes="64px" // Tamaño fijo para la miniatura
                        className="object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex items-center justify-center h-full text-zinc-500">
                        <Tag size={24} /> {/* Placeholder */}
                      </div>
                    )}
                  </div>

                  {/* Columna Contenido */}
                  <div className={contentContainerClasses}>
                    <div className="flex items-center gap-2 mb-0.5">
                      <span className={`${statusBadgeClasses} ${statusInfo.color}`}>
                        <statusInfo.icon size={10} />{statusInfo.text}
                      </span>
                      <p className="text-sm font-medium text-zinc-200 truncate" title={promo.nombre || ''}>
                        {promo.nombre}
                      </p>
                    </div>
                    {promo.descripcion && (
                      <p className="text-xs text-zinc-400 line-clamp-1 mb-1" title={promo.descripcion}>
                        {promo.descripcion}
                      </p>
                    )}
                    <div className='text-xs text-zinc-500 flex items-center gap-1'>
                      <CalendarDays size={12} />
                      <span>{formatDate(promo.fechaInicio)}</span>
                      <span>-</span>
                      <span>{formatDate(promo.fechaFin)}</span>
                    </div>
                  </div>

                  {/* Botón Editar (aparece al hover) */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleNavigateToEdit(promo.id ?? ''); }}
                    className={editButtonClasses}
                    title="Editar Promoción"
                  >
                    <PencilIcon size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>
      {/* Eliminado el Modal */}
    </div>
  );
}
