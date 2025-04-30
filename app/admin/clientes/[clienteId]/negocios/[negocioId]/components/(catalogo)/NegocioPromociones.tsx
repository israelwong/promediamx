'use client';

import React, { useEffect, useState, useCallback, ChangeEvent, FormEvent } from 'react';
// Ajusta rutas según tu estructura
import {
  obtenerPromocionesNegocio,
  crearPromocion,
  editarPromocion,
  eliminarPromocion
} from '@/app/admin/_lib/promocion.actions'; // Asegúrate que las acciones estén aquí
import { Promocion } from '@/app/admin/_lib/types'; // Importar tipo
import { Loader2, ListChecks, PlusIcon, PencilIcon, Trash2, Save, XIcon, Tag, CalendarDays, BadgeCheck, BadgeX, AlertTriangle } from 'lucide-react'; // Iconos

interface Props {
  negocioId: string;
}

// Tipo para el formulario modal
type PromocionFormData = Partial<Pick<Promocion, 'nombre' | 'descripcion' | 'fechaInicio' | 'fechaFin' | 'status'>>;

export default function NegocioPromociones({ negocioId }: Props) {
  const [promociones, setPromociones] = useState<Promocion[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Estados para el Modal
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit' | null>(null);
  const [promoParaEditar, setPromoParaEditar] = useState<Promocion | null>(null);
  const [modalFormData, setModalFormData] = useState<PromocionFormData>({});
  const [isSubmittingModal, setIsSubmittingModal] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);

  // Clases de Tailwind
  const containerClasses = "p-4 bg-zinc-800/50 border border-zinc-700 rounded-lg shadow-md flex flex-col h-full";
  const headerClasses = "flex flex-row items-center justify-between gap-2 mb-3 border-b border-zinc-600 pb-2";
  const listContainerClasses = "flex-grow overflow-y-auto -mr-1 pr-1 space-y-2";
  const listItemClasses = "border border-zinc-700 rounded-md p-3 bg-zinc-900/60 flex items-center justify-between gap-3";
  const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium px-2.5 py-1 rounded-md flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50 transition duration-150 ease-in-out whitespace-nowrap";
  const buttonEditClasses = "text-zinc-400 hover:text-blue-400 p-1 flex-shrink-0 rounded-md hover:bg-zinc-700";
  const statusBadgeClasses = "px-2 py-0.5 rounded-full text-xs font-semibold inline-flex items-center gap-1";
  // Clases Modal
  const modalOverlayClasses = "fixed inset-0 z-40 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4";
  const modalContentClasses = "bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl w-full max-w-lg flex flex-col overflow-hidden"; // max-w-lg
  const modalHeaderClasses = "flex items-center justify-between p-4 border-b border-zinc-700";
  const modalBodyClasses = "p-4 space-y-4 overflow-y-auto max-h-[70vh]";
  const modalFooterClasses = "flex justify-end gap-3 p-4 border-t border-zinc-700 bg-zinc-800/50";
  const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
  const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
  const textareaBaseClasses = `${inputBaseClasses} min-h-[80px]`;
  const buttonBaseClassesModal = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50 flex items-center justify-center gap-2 text-sm";

  // --- Carga de datos ---
  const fetchPromociones = useCallback(async (isInitialLoad = false) => {
    if (!negocioId) return;
    if (isInitialLoad) setLoading(true);
    setError(null);
    try {
      const data = await obtenerPromocionesNegocio(negocioId);
      setPromociones(data || []);
    } catch (err) {
      console.error("Error al obtener las promociones:", err);
      setError("No se pudieron cargar las promociones.");
      setPromociones([]);
    } finally {
      if (isInitialLoad) setLoading(false);
    }
  }, [negocioId]);

  useEffect(() => {
    fetchPromociones(true);
  }, [fetchPromociones]);

  // --- Manejadores Modal ---
  const openModal = (mode: 'create' | 'edit', promo?: Promocion) => {
    setModalMode(mode);
    setPromoParaEditar(mode === 'edit' ? promo || null : null);

    // Formatear fechas para input type="date"
    // Removed unused function 'formatForInput'

    setModalFormData(mode === 'edit' && promo ?
      {
        nombre: promo.nombre,
        descripcion: promo.descripcion,
        fechaInicio: promo.fechaInicio ? new Date(promo.fechaInicio) : null,
        fechaFin: promo.fechaFin ? new Date(promo.fechaFin) : null,
        status: promo.status
      } :
      { // Valores por defecto para crear
        nombre: '',
        descripcion: '',
        fechaInicio: new Date(), // Hoy por defecto
        fechaFin: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // Una semana después por defecto
        status: 'activo'
      }
    );
    setIsModalOpen(true);
    setModalError(null);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setTimeout(() => {
      setModalMode(null); setPromoParaEditar(null); setModalFormData({}); setModalError(null); setIsSubmittingModal(false);
    }, 300);
  };

  const handleModalFormChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setModalFormData(prev => ({ ...prev, [name]: value }));
    setModalError(null);
  };

  const handleModalFormSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    // Validaciones
    if (!modalFormData.nombre?.trim()) { setModalError("Nombre es obligatorio."); return; }
    if (!modalFormData.fechaInicio) { setModalError("Fecha de inicio es obligatoria."); return; }
    if (!modalFormData.fechaFin) { setModalError("Fecha de fin es obligatoria."); return; }
    try {
      if (new Date(modalFormData.fechaInicio) >= new Date(modalFormData.fechaFin)) {
        setModalError("La fecha de fin debe ser posterior a la fecha de inicio."); return;
      }
    } catch {
      setModalError("Formato de fecha inválido."); return;
    }

    setIsSubmittingModal(true); setModalError(null);

    try {
      let result;
      // Asegurarse de enviar fechas como Date o string ISO si la acción lo espera así
      const dataToSend = {
        nombre: modalFormData.nombre.trim(),
        descripcion: modalFormData.descripcion?.trim() || null,
        fechaInicio: new Date(modalFormData.fechaInicio || ''), // Convertir a Date
        fechaFin: new Date(modalFormData.fechaFin || ''),       // Convertir a Date
        status: modalFormData.status || 'activo',
      };

      if (modalMode === 'create') {
        result = await crearPromocion({ negocioId: negocioId, ...dataToSend });
      } else if (modalMode === 'edit' && promoParaEditar?.id) {
        result = await editarPromocion(promoParaEditar.id, dataToSend);
      } else {
        throw new Error("Modo inválido o ID faltante.");
      }

      if (result?.success) {
        await fetchPromociones(); closeModal();
      } else { throw new Error(result?.error || "Error desconocido."); }

    } catch (err) {
      console.error(`Error al ${modalMode === 'create' ? 'crear' : 'editar'} promocion:`, err);
      setModalError(`Error: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
      setIsSubmittingModal(false);
    }
  };

  const handleModalDelete = async () => {
    if (!promoParaEditar?.id) return;
    if (confirm(`¿Estás seguro de eliminar la promoción "${promoParaEditar.nombre}"?`)) {
      setIsSubmittingModal(true); setModalError(null);
      try {
        const result = await eliminarPromocion(promoParaEditar.id);
        if (result?.success) { await fetchPromociones(); closeModal(); }
        else { throw new Error(result?.error || "Error desconocido."); }
      } catch (err) {
        console.error("Error eliminando promocion:", err);
        setModalError(`Error al eliminar: ${err instanceof Error ? err.message : "Ocurrió un error"}`);
        setIsSubmittingModal(false);
      }
    }
  };

  // --- Helper para Status ---
  const getStatusInfo = (status: Promocion['status']): { text: string; color: string; icon: React.ElementType } => {
    switch (status) {
      case 'activo': return { text: 'Activa', color: 'bg-green-500/20 text-green-400', icon: BadgeCheck };
      case 'inactivo': return { text: 'Inactiva', color: 'bg-zinc-600/30 text-zinc-400', icon: BadgeX };
      default: return { text: status || 'Desconocido', color: 'bg-gray-500/20 text-gray-400', icon: AlertTriangle };
    }
  };
  // --- Helper para Fechas ---
  const formatDate = (date: Date | string | null | undefined): string => {
    if (!date) return 'N/A';
    try { return new Date(date).toLocaleDateString('es-MX', { day: '2-digit', month: 'short', year: 'numeric' }); }
    catch { return 'Fecha inválida'; }
  };


  // --- Renderizado ---
  return (
    <div className={containerClasses}>
      {/* Cabecera */}
      <div className={headerClasses}>
        <h3 className="text-base font-semibold text-white whitespace-nowrap flex items-center gap-2">
          <Tag size={16} /> Promociones
        </h3>
        <button onClick={() => openModal('create')} className={buttonPrimaryClasses} title="Crear nueva promoción">
          <PlusIcon size={14} /> <span>Crear Promoción</span>
        </button>
      </div>

      {/* Errores generales */}
      {error && <p className="mb-2 text-center text-xs text-red-400">{error}</p>}

      {/* Contenido Principal: Lista */}
      <div className={listContainerClasses}>
        {loading ? (
          <div className="flex items-center justify-center py-10 text-zinc-400"><Loader2 className="h-5 w-5 animate-spin mr-2" /><span>Cargando promociones...</span></div>
        ) : promociones.length === 0 && !error ? (
          <div className="flex flex-col items-center justify-center text-center py-10"><ListChecks className="h-8 w-8 text-zinc-500 mb-2" /><p className='text-zinc-400 italic text-sm'>No hay promociones definidas.</p></div>
        ) : (
          // Lista de Promociones
          <ul className='space-y-2'>
            {promociones.map((promo) => {
              const statusInfo = getStatusInfo(promo.status);
              return (
                <li key={promo.id} className={listItemClasses}>
                  <div className="flex-grow mr-2 overflow-hidden space-y-0.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`${statusBadgeClasses} ${statusInfo.color}`}>
                        <statusInfo.icon size={12} />{statusInfo.text}
                      </span>
                      <p className="text-sm font-medium text-zinc-200 truncate" title={promo.nombre || ''}>
                        {promo.nombre}
                      </p>
                    </div>
                    <div className='text-xs text-zinc-400 flex items-center gap-1 pl-1'>
                      <CalendarDays size={12} />
                      <span>{formatDate(promo.fechaInicio)}</span>
                      <span>-</span>
                      <span>{formatDate(promo.fechaFin)}</span>
                    </div>
                    {promo.descripcion && (
                      <p className="text-xs text-zinc-500 line-clamp-1 pl-1" title={promo.descripcion}>
                        {promo.descripcion}
                      </p>
                    )}
                  </div>
                  <button onClick={() => openModal('edit', promo)} className={buttonEditClasses} title="Editar Promoción">
                    <PencilIcon size={16} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className={modalOverlayClasses} onClick={closeModal}>
          <div className={modalContentClasses} onClick={(e) => e.stopPropagation()}>
            <div className={modalHeaderClasses}>
              <h3 className="text-lg font-semibold text-white">{modalMode === 'create' ? 'Crear Nueva Promoción' : 'Editar Promoción'}</h3>
              <button onClick={closeModal} className="p-1 text-zinc-400 hover:text-white rounded-full hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-500" aria-label="Cerrar modal"><XIcon size={20} /></button>
            </div>
            <form onSubmit={handleModalFormSubmit}>
              <div className={modalBodyClasses}>
                {modalError && <p className="mb-3 text-center text-red-400 bg-red-900/30 p-2 rounded border border-red-600 text-sm">{modalError}</p>}
                <div>
                  <label htmlFor="modal-nombre" className={labelBaseClasses}>Nombre Promoción <span className="text-red-500">*</span></label>
                  <input type="text" id="modal-nombre" name="nombre" value={modalFormData.nombre || ''} onChange={handleModalFormChange} className={inputBaseClasses} required disabled={isSubmittingModal} maxLength={100} />
                </div>
                <div>
                  <label htmlFor="modal-descripcion" className={labelBaseClasses}>Descripción</label>
                  <textarea id="modal-descripcion" name="descripcion" value={modalFormData.descripcion || ''} onChange={handleModalFormChange} className={textareaBaseClasses} disabled={isSubmittingModal} rows={2} maxLength={200} />
                </div>
                <div className='grid grid-cols-1 sm:grid-cols-2 gap-4'>
                  <div>
                    <label htmlFor="modal-fechaInicio" className={labelBaseClasses}>
                      Fecha Inicio <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="modal-fechaInicio"
                      name="fechaInicio"
                      value={modalFormData.fechaInicio ? new Date(modalFormData.fechaInicio).toISOString().split('T')[0] : ''}
                      onChange={handleModalFormChange}
                      className={inputBaseClasses}
                      required
                      disabled={isSubmittingModal}
                    />
                  </div>
                  <div>
                    <label htmlFor="modal-fechaFin" className={labelBaseClasses}>
                      Fecha Fin <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="date"
                      id="modal-fechaFin"
                      name="fechaFin"
                      value={modalFormData.fechaFin ? new Date(modalFormData.fechaFin).toISOString().split('T')[0] : ''}
                      onChange={handleModalFormChange}
                      className={inputBaseClasses}
                      required
                      disabled={isSubmittingModal}
                    />
                  </div>
                </div>
                <div>
                  <label htmlFor="modal-status" className={labelBaseClasses}>Status</label>
                  <select id="modal-status" name="status" value={modalFormData.status || 'activo'} onChange={handleModalFormChange} className={`${inputBaseClasses} appearance-none`} disabled={isSubmittingModal}>
                    <option value="activo">Activa</option>
                    <option value="inactivo">Inactiva</option>
                  </select>
                </div>
              </div>
              <div className={modalFooterClasses}>
                {modalMode === 'edit' && (<button type="button" onClick={handleModalDelete} className={`${buttonBaseClassesModal} !w-auto bg-red-600 hover:bg-red-700 focus:ring-red-500 px-3 py-1.5 mr-auto`} disabled={isSubmittingModal}><Trash2 size={14} /> Eliminar</button>)}
                <button type="button" onClick={closeModal} className={`${buttonBaseClassesModal} !w-auto bg-gray-600 hover:bg-gray-700 focus:ring-gray-500`} disabled={isSubmittingModal}>Cancelar</button>
                <button type="submit" className={`${buttonBaseClassesModal} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500`} disabled={isSubmittingModal}>
                  {isSubmittingModal ? <Loader2 className='animate-spin' size={16} /> : <Save size={16} />}
                  {modalMode === 'create' ? 'Crear' : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
