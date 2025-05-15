'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
// Asumo que tendrás un componente de Tabs o similar, o lo implementaremos
// import Tabs, { Tab } from '@/app/components/ui/Tabs'; // Ejemplo
import { Loader2, AlertTriangleIcon, Settings, Clock, ListPlus, CalendarOff, Save } from 'lucide-react';

import {
    obtenerConfiguracionAgenda,
    actualizarPreferenciasAgendaNegocio
} from '@/app/admin/_lib/negocioAgenda.actions';

import {
    NegocioAgendaConfig,
    PreferenciasAgendaNegocioInput,
} from '@/app/admin/_lib/negocioAgenda.type';

interface AgendaConfigurarProps {
    negocioId: string;
    clienteId?: string; // No se usa directamente en las actions de agenda, pero puede ser útil para permisos
}

import TiposCitaSeccion from './components/TiposCitaSeccion';
import HorarioSemanalSeccion from './components/HorarioSemanalSeccion';
import ExcepcionesHorarioSeccion from './components/ExcepcionesHorarioSeccion';

// --- Definiciones de Secciones ---
const SECCIONES_AGENDA = {
    TIPOS_CITA: 'tipos_cita',
    HORARIO_SEMANAL: 'horario_semanal',
    EXCEPCIONES: 'excepciones',
    PREFERENCIAS: 'preferencias_generales'
};

// --- Componente Principal ---
export default function AgendaConfigurar({ clienteId, negocioId }: AgendaConfigurarProps) {
    const [config, setConfig] = useState<NegocioAgendaConfig | null>(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<string>(SECCIONES_AGENDA.TIPOS_CITA);
    const [savingSection, setSavingSection] = useState<string | null>(null); // Para indicar qué sección se está guardando

    // Clases de UI (Guía de Estilos)
    const mainContainerClasses = "bg-zinc-800 rounded-lg shadow-md"; // Contenedor principal sin padding, se aplica por sección
    const headerPageClasses = "px-4 sm:px-6 py-4 border-b border-zinc-700 flex items-center justify-between";
    const titlePageClasses = "text-xl font-semibold text-zinc-100 flex items-center gap-2.5";
    const tabsContainerClasses = "flex border-b border-zinc-700 px-2 sm:px-4";
    const tabButtonBaseClasses = "px-3 sm:px-4 py-3 text-sm font-medium border-b-2 focus:outline-none transition-colors duration-150";
    const tabButtonInactiveClasses = "border-transparent text-zinc-400 hover:text-zinc-100 hover:border-zinc-500";
    const tabButtonActiveClasses = "border-blue-500 text-blue-400";
    const sectionContentClasses = "p-4 sm:p-6"; // Padding para el contenido de cada sección


    const cargarConfiguracion = useCallback(async () => {
        setLoading(true);
        setError(null);
        const result = await obtenerConfiguracionAgenda(negocioId);
        if (result.success && result.data) {
            setConfig(result.data);
        } else {
            setError(result.error || "Error desconocido al cargar la configuración.");
            setConfig(null); // Asegurar que config es null si hay error
        }
        setLoading(false);
    }, [negocioId]);

    useEffect(() => {
        cargarConfiguracion();
    }, [cargarConfiguracion]);

    // --- Lógica para Preferencias Generales ---
    const [preferenciasForm, setPreferenciasForm] = useState<PreferenciasAgendaNegocioInput>({
        aceptaCitasPresenciales: false,
        aceptaCitasVirtuales: false,
        requiereTelefonoParaCita: false,
        requiereEmailParaCita: false,
        metodosPagoTexto: ''
    });

    useEffect(() => {
        if (config) {
            setPreferenciasForm({
                aceptaCitasPresenciales: config.aceptaCitasPresenciales,
                aceptaCitasVirtuales: config.aceptaCitasVirtuales,
                requiereTelefonoParaCita: config.requiereTelefonoParaCita,
                requiereEmailParaCita: config.requiereEmailParaCita,
                metodosPagoTexto: config.metodosPagoTexto || ''
            });
        }
    }, [config]);

    const handlePreferenciasChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const target = e.target as HTMLInputElement; // Para acceder a 'checked'
        const { name, value, type, checked } = target;
        setPreferenciasForm(prev => ({
            ...prev,
            [name]: type === 'checkbox' ? checked : value
        }));
    };

    const handleGuardarPreferencias = async () => {
        setSavingSection(SECCIONES_AGENDA.PREFERENCIAS);
        setError(null);
        const result = await actualizarPreferenciasAgendaNegocio(negocioId, preferenciasForm);
        if (!result.success) {
            setError(result.error || "Error al guardar preferencias.");
        } else {
            // Opcional: mostrar mensaje de éxito
            await cargarConfiguracion(); // Recargar para confirmar
        }
        setSavingSection(null);
    };

    const router = useRouter();

    const handleCerrar = () => {
        router.push(`/admin/clientes/${clienteId}/negocios/${negocioId}`);
    }


    if (loading) {
        return (
            <div className={`${mainContainerClasses} ${sectionContentClasses} flex items-center justify-center min-h-[300px]`}>
                <Loader2 className="h-8 w-8 animate-spin text-blue-500" />
                <span className="ml-3 text-zinc-300">Cargando configuración de agenda...</span>
            </div>
        );
    }

    if (error || !config) {
        return (
            <div className={`${mainContainerClasses} ${sectionContentClasses}`}>
                <div className="bg-red-500/10 text-red-400 p-4 rounded-md border border-red-500/30 flex items-center gap-2">
                    <AlertTriangleIcon size={20} />
                    <span>{error || "No se pudo cargar la configuración de la agenda."}</span>
                </div>
            </div>
        );
    }

    // Placeholder para las secciones, se implementarán después
    const renderTiposCita = () => <div className="text-zinc-400 italic">
        <TiposCitaSeccion
            negocioId={negocioId}
            isSavingGlobal={savingSection !== null && savingSection !== SECCIONES_AGENDA.TIPOS_CITA} // Prop: boolean
        />
    </div>;
    const renderHorarioSemanal = () => <div className="text-zinc-400 italic">
        <HorarioSemanalSeccion
            negocioId={negocioId}
            isSavingGlobal={savingSection !== null && savingSection !== SECCIONES_AGENDA.HORARIO_SEMANAL} // Prop: boolean
        />
    </div>;
    const renderExcepciones = () => <div className="text-zinc-400 italic">
        <ExcepcionesHorarioSeccion
            negocioId={negocioId}
            isSavingGlobal={savingSection !== null && savingSection !== SECCIONES_AGENDA.EXCEPCIONES} // Prop: boolean
        />
    </div>;

    const renderPreferenciasGenerales = () => (
        <div className="space-y-6">
            <div>
                <h3 className="text-md font-semibold text-zinc-100 mb-3">Modalidades de Cita</h3>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-700 rounded-md hover:bg-zinc-700/30 cursor-pointer">
                        <input type="checkbox" name="aceptaCitasPresenciales" checked={preferenciasForm.aceptaCitasPresenciales} onChange={handlePreferenciasChange} className="h-5 w-5 rounded text-blue-600 bg-zinc-800 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900/50" />
                        <span className="text-sm text-zinc-200">Aceptar citas presenciales</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-700 rounded-md hover:bg-zinc-700/30 cursor-pointer">
                        <input type="checkbox" name="aceptaCitasVirtuales" checked={preferenciasForm.aceptaCitasVirtuales} onChange={handlePreferenciasChange} className="h-5 w-5 rounded text-blue-600 bg-zinc-800 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900/50" />
                        <span className="text-sm text-zinc-200">Aceptar citas virtuales</span>
                    </label>
                </div>
            </div>
            <div>
                <h3 className="text-md font-semibold text-zinc-100 mb-3">Requisitos de Información para Citas</h3>
                <div className="space-y-3">
                    <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-700 rounded-md hover:bg-zinc-700/30 cursor-pointer">
                        <input type="checkbox" name="requiereTelefonoParaCita" checked={preferenciasForm.requiereTelefonoParaCita} onChange={handlePreferenciasChange} className="h-5 w-5 rounded text-blue-600 bg-zinc-800 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900/50" />
                        <span className="text-sm text-zinc-200">Requerir teléfono para agendar</span>
                    </label>
                    <label className="flex items-center gap-3 p-3 bg-zinc-900/50 border border-zinc-700 rounded-md hover:bg-zinc-700/30 cursor-pointer">
                        <input type="checkbox" name="requiereEmailParaCita" checked={preferenciasForm.requiereEmailParaCita} onChange={handlePreferenciasChange} className="h-5 w-5 rounded text-blue-600 bg-zinc-800 border-zinc-600 focus:ring-blue-500 focus:ring-offset-zinc-900/50" />
                        <span className="text-sm text-zinc-200">Requerir email para agendar</span>
                    </label>
                </div>
            </div>
            <div>
                <label htmlFor="metodosPagoTexto" className="block mb-1.5 text-sm font-medium text-zinc-300">
                    Métodos de Pago Aceptados (Texto descriptivo)
                </label>
                <textarea
                    id="metodosPagoTexto"
                    name="metodosPagoTexto"
                    value={preferenciasForm.metodosPagoTexto || ''}
                    onChange={handlePreferenciasChange}
                    rows={3}
                    className="bg-zinc-900 border border-zinc-700 text-zinc-300 placeholder:text-zinc-600 block w-full rounded-md p-2.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70 disabled:bg-zinc-950 resize-none"
                    placeholder="Ej: Efectivo, Tarjeta de Crédito/Débito, Transferencia Bancaria, PayPal..."
                />
                <p className="text-xs text-zinc-500 mt-1">Este texto se puede mostrar a los clientes al agendar.</p>
            </div>
            <div className="pt-4 flex justify-end">
                <button
                    type="button"
                    onClick={handleGuardarPreferencias}
                    className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50"
                    disabled={savingSection === SECCIONES_AGENDA.PREFERENCIAS}
                >
                    {savingSection === SECCIONES_AGENDA.PREFERENCIAS ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Guardar Preferencias
                </button>
            </div>
        </div>
    );


    return (
        <div className={mainContainerClasses}>
            <div className={headerPageClasses}>
                <h2 className={titlePageClasses}><Settings size={24} /> Configuración de Agenda del Negocio</h2>


                <button
                    className="bg-red-600 hover:bg-red-700 text-white text-sm font-medium px-4 py-2 rounded-md flex items-center justify-center gap-2 disabled:opacity-50"
                    disabled={savingSection !== null}
                    type="button" onClick={handleCerrar}>
                    Cerrar
                </button>

            </div>

            {/* Sistema de Pestañas */}
            <div className={tabsContainerClasses}>
                <button
                    className={`${tabButtonBaseClasses} ${activeTab === SECCIONES_AGENDA.TIPOS_CITA ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                    onClick={() => setActiveTab(SECCIONES_AGENDA.TIPOS_CITA)}
                >
                    <ListPlus size={16} className="inline mr-1.5 -mt-px" /> Tipos de Cita/Servicios
                </button>
                <button
                    className={`${tabButtonBaseClasses} ${activeTab === SECCIONES_AGENDA.HORARIO_SEMANAL ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                    onClick={() => setActiveTab(SECCIONES_AGENDA.HORARIO_SEMANAL)}
                >
                    <Clock size={16} className="inline mr-1.5 -mt-px" /> Horario Semanal
                </button>
                <button
                    className={`${tabButtonBaseClasses} ${activeTab === SECCIONES_AGENDA.EXCEPCIONES ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                    onClick={() => setActiveTab(SECCIONES_AGENDA.EXCEPCIONES)}
                >
                    <CalendarOff size={16} className="inline mr-1.5 -mt-px" /> Excepciones/Feriados
                </button>
                <button
                    className={`${tabButtonBaseClasses} ${activeTab === SECCIONES_AGENDA.PREFERENCIAS ? tabButtonActiveClasses : tabButtonInactiveClasses}`}
                    onClick={() => setActiveTab(SECCIONES_AGENDA.PREFERENCIAS)}
                >
                    <Settings size={16} className="inline mr-1.5 -mt-px" /> Preferencias Generales
                </button>
            </div>

            {/* Contenido de la Pestaña Activa */}
            <div className={sectionContentClasses}>
                {activeTab === SECCIONES_AGENDA.TIPOS_CITA && renderTiposCita()}
                {activeTab === SECCIONES_AGENDA.HORARIO_SEMANAL && renderHorarioSemanal()}
                {activeTab === SECCIONES_AGENDA.EXCEPCIONES && renderExcepciones()}
                {activeTab === SECCIONES_AGENDA.PREFERENCIAS && renderPreferenciasGenerales()}
            </div>
        </div>
    );
}