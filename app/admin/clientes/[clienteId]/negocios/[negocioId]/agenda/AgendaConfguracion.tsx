'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, AlertTriangleIcon, Settings, Clock, ListPlus, CalendarOff, Save } from 'lucide-react';

// NUEVAS importaciones DIRECTAS para AgendaConfiguracion
import {
    obtenerAgendaConfiguracionAction,
    upsertAgendaConfiguracionAction
} from '@/app/admin/_lib/actions/agendaConfiguracion/agendaConfiguracion.actions';
import type {
    // AgendaConfiguracionData,
    UpsertAgendaConfiguracionFormInput,
} from '@/app/admin/_lib/actions/agendaConfiguracion/agendaConfiguracion.schemas';

import { SwitchControl } from '@/app/admin/components/SwitchControl';

// TODO: Importar acciones y tipos para TiposCita, HorarioSemanal, Excepciones
// Ejemplo:
// import { obtenerTiposCitaAction } from '@/app/admin/_lib/actions/agendaTipoCita/agendaTipoCita.actions';
// import type { AgendaTipoCitaData } from '@/app/admin/_lib/actions/agendaTipoCita/agendaTipoCita.schemas';

import TiposCitaSeccion from './components/TiposCitaSeccion';
import HorarioSemanalSeccion from './components/HorarioSemanalSeccion';
import ExcepcionesHorarioSeccion from './components/ExcepcionesHorarioSeccion';

interface AgendaConfigurarProps {
    negocioId: string;
    clienteId?: string;
}

const SECCIONES_AGENDA = {
    TIPOS_CITA: 'tipos_cita',
    HORARIO_SEMANAL: 'horario_semanal',
    EXCEPCIONES: 'excepciones',
    PREFERENCIAS: 'preferencias_generales'
};

const initialPreferenciasFormState: UpsertAgendaConfiguracionFormInput = {
    aceptaCitasPresenciales: false,
    aceptaCitasVirtuales: false,
    requiereTelefonoParaCita: false,
    requiereEmailParaCita: false,
    requiereNombreParaCita: true,
    bufferMinutos: null,
    metodosPagoTexto: null,
};

export default function AgendaConfiguracion({ clienteId, negocioId }: AgendaConfigurarProps) {
    const router = useRouter();

    // Estados para la pestaña de Preferencias Generales
    // const [preferenciasData, setPreferenciasData] = useState<AgendaConfiguracionData | null>(null);
    const [preferenciasForm, setPreferenciasForm] = useState<UpsertAgendaConfiguracionFormInput>(initialPreferenciasFormState);
    const [loadingPreferencias, setLoadingPreferencias] = useState(true);
    const [savingPreferencias, setSavingPreferencias] = useState(false);
    const [errorPreferencias, setErrorPreferencias] = useState<string | null>(null);

    // TODO: Estados similares para TiposCita, HorarioSemanal, Excepciones
    // const [tiposCitaData, setTiposCitaData] = useState<AgendaTipoCitaData[] | null>(null);
    // const [loadingTiposCita, setLoadingTiposCita] = useState(true);
    // ... y así sucesivamente

    const [activeTab, setActiveTab] = useState<string>(SECCIONES_AGENDA.PREFERENCIAS);

    // --- Lógica para Preferencias Generales ---
    const cargarPreferencias = useCallback(async () => {
        setLoadingPreferencias(true);
        setErrorPreferencias(null);
        const result = await obtenerAgendaConfiguracionAction(negocioId);
        if (result.success) {
            // setPreferenciasData(result.data ?? null); // result.data puede ser null si no hay config, nunca undefined
            if (result.data) {
                setPreferenciasForm({
                    aceptaCitasPresenciales: result.data.aceptaCitasPresenciales,
                    aceptaCitasVirtuales: result.data.aceptaCitasVirtuales,
                    requiereTelefonoParaCita: result.data.requiereTelefonoParaCita,
                    requiereEmailParaCita: result.data.requiereEmailParaCita,
                    requiereNombreParaCita: result.data.requiereNombreParaCita,
                    bufferMinutos: result.data.bufferMinutos,
                    metodosPagoTexto: result.data.metodosPagoTexto,
                });
            } else {
                setPreferenciasForm(initialPreferenciasFormState); // No hay config, usar defaults
            }
        } else {
            setErrorPreferencias(result.error || "Error cargando preferencias.");
            // setPreferenciasData(null);
            setPreferenciasForm(initialPreferenciasFormState);
        }
        setLoadingPreferencias(false);
    }, [negocioId]);

    useEffect(() => {
        if (activeTab === SECCIONES_AGENDA.PREFERENCIAS) {
            cargarPreferencias();
        }
        // TODO: Lógica similar para cargar datos de otras pestañas cuando se activan
        // else if (activeTab === SECCIONES_AGENDA.TIPOS_CITA) { cargarTiposCita(); }
    }, [activeTab, cargarPreferencias]); // Añadir otras funciones de carga aquí

    const handlePreferenciasChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const target = e.target as HTMLInputElement;
        const { name, value, type } = target;
        setPreferenciasForm(prev => {
            let newValue: boolean | number | string | null = value;
            if (type === 'checkbox') {
                newValue = target.checked;
            } else if (name === 'bufferMinutos') {
                newValue = value === '' ? null : parseInt(value, 10);
            } else if (name === 'metodosPagoTexto' && value.trim() === '') {
                newValue = null;
            }
            return { ...prev, [name]: newValue };
        });
    };

    const handleGuardarPreferencias = async () => {
        setSavingPreferencias(true);
        setErrorPreferencias(null);
        const result = await upsertAgendaConfiguracionAction(negocioId, preferenciasForm);
        if (!result.success) {
            const errorMsg = result.errorDetails
                ? Object.entries(result.errorDetails).map(([key, val]) => `${key}: ${val.join(', ')}`).join('; ')
                : result.error || "Error al guardar preferencias.";
            setErrorPreferencias(errorMsg);
        } else {
            // setPreferenciasData(result.data ?? null); // Actualizar con los datos guardados (incluye ID, timestamps)
            // Opcional: Mostrar toast de éxito
        }
        setSavingPreferencias(false);
    };

    const handleCerrar = () => {
        if (clienteId && negocioId) {
            router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}`);
        } else {
            router.push(`/admin/dashboard`);
        }
    }

    // Clases UI (sin cambios)
    const mainContainerClasses = "bg-zinc-800 rounded-lg shadow-md";
    const headerPageClasses = "px-4 sm:px-6 py-4 border-b border-zinc-700 flex items-center justify-between";
    const titlePageClasses = "text-xl font-semibold text-zinc-100 flex items-center gap-2.5";
    const tabsContainerClasses = "flex border-b border-zinc-700 px-2 sm:px-4";
    const tabButtonBaseClasses = "px-3 sm:px-4 py-3 text-sm font-medium border-b-2 focus:outline-none transition-colors duration-150";
    const tabButtonInactiveClasses = "border-transparent text-zinc-400 hover:text-zinc-100 hover:border-zinc-500";
    const tabButtonActiveClasses = "border-blue-500 text-blue-400";
    const sectionContentClasses = "p-4 sm:p-6";


    // Dentro de AgendaConfiguracion.tsx

    // ... (importaciones, componente SwitchControl y otros estados sin cambios) ...

    const renderPreferenciasGenerales = () => {
        if (loadingPreferencias) {
            return <div className="flex items-center justify-center min-h-[200px]"><Loader2 className="h-6 w-6 animate-spin text-blue-500" /> <span className='ml-2 text-zinc-300'>Cargando...</span></div>;
        }
        return (
            <div className="space-y-6"> {/* Espaciador general para el botón de guardar y el mensaje de error */}
                {errorPreferencias && (
                    <div className="bg-red-500/10 text-red-400 p-3 rounded-md border border-red-500/30 flex items-center gap-2 text-sm mb-4">
                        <AlertTriangleIcon size={18} />
                        <span>Error: {errorPreferencias}</span>
                    </div>
                )}

                {/* Grid principal para la distribución de las secciones de preferencias */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-8"> {/* gap-y-8 para más espacio vertical entre filas del grid en móvil */}

                    {/* Columna Izquierda */}
                    <div className="space-y-6"> {/* Espacio entre grupos dentro de esta columna */}
                        {/* Grupo: Modalidades de Cita */}
                        <div className="space-y-3">
                            <h3 className="text-md font-semibold text-zinc-100">Modalidades de Cita</h3>
                            <SwitchControl
                                id="aceptaCitasPresenciales"
                                name="aceptaCitasPresenciales"
                                checked={preferenciasForm.aceptaCitasPresenciales}
                                onChange={handlePreferenciasChange}
                                label="Aceptar citas presenciales"
                                disabled={savingPreferencias}
                            />
                            <SwitchControl
                                id="aceptaCitasVirtuales"
                                name="aceptaCitasVirtuales"
                                checked={preferenciasForm.aceptaCitasVirtuales}
                                onChange={handlePreferenciasChange}
                                label="Aceptar citas virtuales"
                                disabled={savingPreferencias}
                            />
                        </div>

                        {/* Grupo: Tiempo de Preparación (Buffer) */}
                        <div>
                            <label htmlFor="bufferMinutos" className="block text-sm font-medium text-zinc-300 mb-1.5">
                                Tiempo de Preparación entre Citas (Buffer)
                            </label>
                            <select
                                id="bufferMinutos"
                                name="bufferMinutos"
                                value={preferenciasForm.bufferMinutos ?? ''}
                                onChange={handlePreferenciasChange}
                                disabled={savingPreferencias}
                                className="bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2.5 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-70 disabled:bg-zinc-950"
                            >
                                <option value="">Sin buffer</option>
                                {[5, 10, 15, 20, 30, 45, 60].map(min => <option key={min} value={min}>{min} minutos</option>)}
                            </select>
                            <p className="text-xs text-zinc-500 mt-1.5">Intervalo entre el final de una cita y el inicio de la siguiente.</p>
                        </div>
                    </div>

                    {/* Columna Derecha */}
                    <div className="space-y-6"> {/* Espacio entre grupos dentro de esta columna */}
                        {/* Grupo: Información Requerida del Cliente */}
                        <div className="space-y-3">
                            <h3 className="text-md font-semibold text-zinc-100">Información Requerida del Cliente</h3>
                            <SwitchControl
                                id="requiereNombreParaCita"
                                name="requiereNombreParaCita"
                                checked={preferenciasForm.requiereNombreParaCita}
                                onChange={handlePreferenciasChange}
                                label="Requerir nombre del contacto"
                                disabled={savingPreferencias}
                            />
                            <SwitchControl
                                id="requiereTelefonoParaCita"
                                name="requiereTelefonoParaCita"
                                checked={preferenciasForm.requiereTelefonoParaCita}
                                onChange={handlePreferenciasChange}
                                label="Requerir teléfono del contacto"
                                disabled={savingPreferencias}
                            />
                            <SwitchControl
                                id="requiereEmailParaCita"
                                name="requiereEmailParaCita"
                                checked={preferenciasForm.requiereEmailParaCita}
                                onChange={handlePreferenciasChange}
                                label="Requerir email del contacto"
                                disabled={savingPreferencias}
                            />
                        </div>

                        {/* Grupo: Métodos de Pago Aceptados */}
                        <div>
                            <label htmlFor="metodosPagoTextos" className="block text-sm font-medium text-zinc-300 mb-1.5">
                                Métodos de Pago Aceptados (Texto)
                            </label>
                            <textarea
                                id="metodosPagoTextos"
                                name="metodosPagoTextos"
                                value={preferenciasForm.metodosPagoTexto || ''}
                                onChange={handlePreferenciasChange}
                                rows={3} // Puedes ajustar las filas si quieres que sea más o menos alto
                                disabled={savingPreferencias}
                                className="bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-500 block w-full rounded-md p-2.5 shadow-sm focus:ring-blue-500 focus:border-blue-500 sm:text-sm disabled:opacity-70 disabled:bg-zinc-950 resize-none"
                                placeholder="Ej: Efectivo, Tarjeta de Crédito/Débito..."
                            />
                            <p className="text-xs text-zinc-500 mt-1.5">Este texto se puede mostrar a los clientes al agendar.</p>
                        </div>
                    </div>
                </div>

                {/* Botón de Guardar */}
                <div className="pt-6 flex justify-end">
                    <button
                        type="button"
                        onClick={handleGuardarPreferencias}
                        className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-md flex items-center justify-center gap-2 shadow-md focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-500 disabled:opacity-60"
                        disabled={savingPreferencias || loadingPreferencias}
                    >
                        {savingPreferencias ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                        Guardar Preferencias
                    </button>
                </div>
            </div>
        );
    };

    // TODO: Implementar renderTiposCita, renderHorarioSemanal, renderExcepciones
    // de manera similar, cada uno con su propia carga de datos, estado y lógica.
    const renderTiposCita = () => <div className="text-zinc-300 p-4 italic">
        <TiposCitaSeccion
            negocioId={negocioId}
            // initialTiposCita={tiposCitaData || []} // Se pasaría cuando se implemente la carga
            isSavingGlobal={savingPreferencias} // Ejemplo, ajustar según necesidad
        />
        (Aquí se cargarán y gestionarán los Tipos de Cita/Servicios)
    </div>;
    const renderHorarioSemanal = () => <div className="text-zinc-300 p-4 italic">
        <HorarioSemanalSeccion
            negocioId={negocioId}
            // initialHorarios={horariosData || []}
            isSavingGlobal={savingPreferencias}
        />
        (Aquí se cargará y gestionará el Horario Semanal)
    </div>;
    const renderExcepciones = () => <div className="text-zinc-300 p-4 italic">
        <ExcepcionesHorarioSeccion
            negocioId={negocioId}
            // initialExcepciones={excepcionesData || []}
            isSavingGlobal={savingPreferencias}
        />
        (Aquí se cargarán y gestionarán las Excepciones/Feriados)
    </div>;


    // Renderizado Principal del Componente
    // Un loader general podría cubrir la carga inicial de la estructura de la página
    // mientras que cada pestaña maneja su propio loader para sus datos.
    // Por simplicidad, si alguna carga principal está activa, podrías mostrar un loader general.
    const isAnySectionSaving = savingPreferencias; // Ampliar con otros estados de guardado: || savingTiposCita ...

    return (
        <div className={mainContainerClasses}>
            <div className={headerPageClasses}>
                <h2 className={titlePageClasses}><Settings size={24} /> Configuración de Agenda del Negocio</h2>
                <button
                    className="bg-zinc-700 hover:bg-zinc-600 text-zinc-100 text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50"
                    disabled={isAnySectionSaving} // Deshabilitar si se está guardando algo
                    type="button" onClick={handleCerrar}>
                    Cerrar
                </button>
            </div>

            <div className={tabsContainerClasses}>
                <button
                    className={`${tabButtonBaseClasses} ${activeTab === SECCIONES_AGENDA.PREFERENCIAS ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                    onClick={() => setActiveTab(SECCIONES_AGENDA.PREFERENCIAS)} disabled={isAnySectionSaving}>
                    <Settings size={16} className="inline mr-1.5 -mt-px" /> Preferencias Generales
                </button>
                <button
                    className={`${tabButtonBaseClasses} ${activeTab === SECCIONES_AGENDA.TIPOS_CITA ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                    onClick={() => setActiveTab(SECCIONES_AGENDA.TIPOS_CITA)} disabled={isAnySectionSaving}>
                    <ListPlus size={16} className="inline mr-1.5 -mt-px" /> Tipos de Cita/Servicios
                </button>
                <button
                    className={`${tabButtonBaseClasses} ${activeTab === SECCIONES_AGENDA.HORARIO_SEMANAL ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                    onClick={() => setActiveTab(SECCIONES_AGENDA.HORARIO_SEMANAL)} disabled={isAnySectionSaving}>
                    <Clock size={16} className="inline mr-1.5 -mt-px" /> Horario Semanal
                </button>
                <button
                    className={`${tabButtonBaseClasses} ${activeTab === SECCIONES_AGENDA.EXCEPCIONES ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                    onClick={() => setActiveTab(SECCIONES_AGENDA.EXCEPCIONES)} disabled={isAnySectionSaving}>
                    <CalendarOff size={16} className="inline mr-1.5 -mt-px" /> Excepciones/Feriados
                </button>
            </div>

            <div className={sectionContentClasses}>
                {activeTab === SECCIONES_AGENDA.PREFERENCIAS && renderPreferenciasGenerales()}
                {activeTab === SECCIONES_AGENDA.TIPOS_CITA && renderTiposCita()}
                {activeTab === SECCIONES_AGENDA.HORARIO_SEMANAL && renderHorarioSemanal()}
                {activeTab === SECCIONES_AGENDA.EXCEPCIONES && renderExcepciones()}
            </div>
        </div>
    );
}