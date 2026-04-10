'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangleIcon, CheckSquare, Save, Clock } from 'lucide-react';

// NUEVAS IMPORTS de Actions y Schemas/Types
import {
    obtenerHorariosAtencionAction,
    guardarHorariosAtencionAction,
} from '@/app/admin/_lib/actions/agendaHorarioSemanal/agendaHorarioSemanal.actions';
import type {
    HorarioAtencionData, // Tipo para los datos que vienen del backend
    GuardarHorariosAtencionInput, // El componente construirá este objeto
} from '@/app/admin/_lib/actions/agendaHorarioSemanal/agendaHorarioSemanal.schemas';

// Importar el enum DiaSemana de Prisma para usarlo en DIAS_MAP y el estado local
import { DiaSemana as DiaSemanaPrisma } from '@prisma/client';


interface HorarioSemanalSeccionProps {
    negocioId: string;
    isSavingGlobal: boolean;
    // Opcional: si el componente padre AgendaConfiguracion carga estos datos
    initialHorarios?: HorarioAtencionData[];
}

// Tipo para el estado de la UI, similar al HorarioSemanalUI que tenías
interface HorarioDiaUI {
    id?: string; // El ID de Prisma si existe
    diaSemanaNumero: number; // Para ordenamiento y lógica de UI
    diaSemanaEnumKey: DiaSemanaPrisma; // Para enviar al backend
    diaSemanaNombreDisplay: string; // Para mostrar en la UI
    estaAbierto: boolean;
    horaInicio: string;
    horaFin: string;
}


const DIAS_MAP: { numero: number; nombre: string; enumKey: DiaSemanaPrisma }[] = [
    { numero: 1, nombre: 'Lunes', enumKey: DiaSemanaPrisma.LUNES },
    { numero: 2, nombre: 'Martes', enumKey: DiaSemanaPrisma.MARTES },
    { numero: 3, nombre: 'Miércoles', enumKey: DiaSemanaPrisma.MIERCOLES },
    { numero: 4, nombre: 'Jueves', enumKey: DiaSemanaPrisma.JUEVES },
    { numero: 5, nombre: 'Viernes', enumKey: DiaSemanaPrisma.VIERNES },
    { numero: 6, nombre: 'Sábado', enumKey: DiaSemanaPrisma.SABADO },
    { numero: 0, nombre: 'Domingo', enumKey: DiaSemanaPrisma.DOMINGO } // Domingo es 0 en Date.getDay()
];

const generarOpcionesDeHora = (): string[] => {
    const horas = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) { // Intervalos de 30 min
            horas.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return horas;
};
const OPCIONES_HORA = generarOpcionesDeHora();

export default function HorarioSemanalSeccion({
    negocioId,
    isSavingGlobal,
    initialHorarios // Prop para datos iniciales
}: HorarioSemanalSeccionProps) {
    const [horariosUI, setHorariosUI] = useState<HorarioDiaUI[]>([]);
    const [loadingHorarios, setLoadingHorarios] = useState(true);
    const [errorHorarios, setErrorHorarios] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases UI (sin cambios)
    const dayCardClasses = "p-4 bg-zinc-900/50 border border-zinc-700 rounded-md space-y-3";
    const dayHeaderClasses = "flex items-center justify-between";
    const dayTitleClasses = "text-sm font-medium text-zinc-100";
    const toggleLabelClasses = "flex items-center gap-2 cursor-pointer text-xs text-zinc-300";
    const toggleClasses = "relative inline-flex items-center h-5 rounded-full w-9 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800";
    const toggleKnobClasses = "inline-block w-3.5 h-3.5 transform bg-white rounded-full transition-transform";
    const timeSelectClasses = "bg-zinc-800 border border-zinc-600 text-zinc-300 text-xs rounded-md p-1.5 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-50 disabled:bg-zinc-700 w-full appearance-none";
    const buttonPrimaryClasses = "bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-6 py-2.5 rounded-md flex items-center justify-center gap-2 disabled:opacity-50";
    const alertSectionErrorClasses = "text-sm text-red-400 bg-red-500/10 p-3 rounded-md border border-red-500/30 flex items-center gap-2 my-4";
    const alertSectionSuccessClasses = "text-sm text-green-400 bg-green-500/10 p-3 rounded-md border border-green-500/30 flex items-center gap-2 my-4";


    const inicializarHorariosUI = useCallback((horariosFromDB: HorarioAtencionData[]) => {
        const uiState = DIAS_MAP.map(diaInfo => {
            const horarioExistente = horariosFromDB.find(h => h.dia === diaInfo.enumKey);
            return {
                id: horarioExistente?.id,
                diaSemanaNumero: diaInfo.numero,
                diaSemanaEnumKey: diaInfo.enumKey,
                diaSemanaNombreDisplay: diaInfo.nombre, // Usar el nombre de DIAS_MAP
                estaAbierto: !!horarioExistente,
                horaInicio: horarioExistente?.horaInicio || '09:00',
                horaFin: horarioExistente?.horaFin || '17:00',
            };
        });
        setHorariosUI(uiState);
    }, []); // DIAS_MAP es constante, no necesita estar en dependencias

    const fetchHorariosLocal = useCallback(async (showLoading = true) => {
        if (showLoading) setLoadingHorarios(true);
        setErrorHorarios(null);
        setSuccessMessage(null);

        const result = await obtenerHorariosAtencionAction(negocioId); // Nueva action

        if (result.success && result.data) {
            inicializarHorariosUI(result.data);
        } else {
            setErrorHorarios(result.error || "Error cargando horarios.");
            inicializarHorariosUI([]); // Inicializar vacío en caso de error
        }
        if (showLoading) setLoadingHorarios(false);
    }, [negocioId, inicializarHorariosUI]);

    useEffect(() => {
        if (initialHorarios) {
            inicializarHorariosUI(initialHorarios);
            setLoadingHorarios(false);
        } else {
            fetchHorariosLocal();
        }
    }, [fetchHorariosLocal, initialHorarios, inicializarHorariosUI]);

    const handleToggleAbierto = (diaNumero: number) => {
        setHorariosUI(prev => {
            const lunesConfig = prev.find(h => h.diaSemanaEnumKey === DiaSemanaPrisma.LUNES && h.estaAbierto);
            const horaInicioPorDefecto = lunesConfig?.horaInicio || '09:00';
            const horaFinPorDefecto = lunesConfig?.horaFin || '17:00';

            return prev.map(h => {
                if (h.diaSemanaNumero === diaNumero) {
                    const ahoraEstaAbierto = !h.estaAbierto;
                    if (ahoraEstaAbierto && h.diaSemanaEnumKey !== DiaSemanaPrisma.LUNES) {
                        return { ...h, estaAbierto: ahoraEstaAbierto, horaInicio: horaInicioPorDefecto, horaFin: horaFinPorDefecto };
                    }
                    return { ...h, estaAbierto: ahoraEstaAbierto };
                }
                return h;
            });
        });
        setErrorHorarios(null); setSuccessMessage(null);
    };

    const handleTimeChange = (diaNumero: number, tipo: 'horaInicio' | 'horaFin', value: string) => {
        setHorariosUI(prev => prev.map(h =>
            h.diaSemanaNumero === diaNumero ? { ...h, [tipo]: value } : h
        ));
        setErrorHorarios(null); setSuccessMessage(null);
    };

    const handleGuardarHorarios = async () => {
        setIsSubmitting(true);
        setErrorHorarios(null);
        setSuccessMessage(null);

        const horariosParaGuardarPayload: { dia: DiaSemanaPrisma; horaInicio: string; horaFin: string }[] = [];
        let validacionFallidaLocal = false;

        for (const h of horariosUI) {
            if (h.estaAbierto) {
                if (!h.horaInicio || !h.horaFin) {
                    setErrorHorarios(`Completa las horas para ${h.diaSemanaNombreDisplay}.`);
                    validacionFallidaLocal = true;
                    break;
                }
                if (h.horaInicio >= h.horaFin) {
                    setErrorHorarios(`Hora de inicio debe ser menor que hora de fin para ${h.diaSemanaNombreDisplay}.`);
                    validacionFallidaLocal = true;
                    break;
                }
                horariosParaGuardarPayload.push({
                    dia: h.diaSemanaEnumKey,
                    horaInicio: h.horaInicio,
                    horaFin: h.horaFin,
                });
            }
        }

        if (validacionFallidaLocal) {
            setIsSubmitting(false);
            return;
        }

        const inputForAction: GuardarHorariosAtencionInput = {
            negocioId: negocioId,
            horarios: horariosParaGuardarPayload,
        };

        const result = await guardarHorariosAtencionAction(inputForAction); // Nueva action

        if (result.success) {
            setSuccessMessage("Horarios de atención guardados exitosamente.");
            if (result.data) inicializarHorariosUI(result.data); // Actualizar con los datos guardados (con IDs)
        } else {
            const errorMsg = result.errorDetails
                ? Object.entries(result.errorDetails).map(([key, val]) => `${key}: ${val.join(', ')}`).join('; ')
                : result.error || "Error al guardar los horarios.";
            setErrorHorarios(errorMsg);
        }
        setIsSubmitting(false);
    };

    if (loadingHorarios && !initialHorarios) {
        return <div className="py-8 flex items-center justify-center text-zinc-400"><Loader2 className="h-6 w-6 animate-spin mr-2" /> Cargando horarios...</div>;
    }

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-md font-semibold text-zinc-100 flex items-center gap-2">
                    <Clock size={18} className="text-blue-400" />
                    Horario de Atención Semanal
                </h3>
            </div>

            {errorHorarios && <p className={alertSectionErrorClasses}><AlertTriangleIcon size={16} className="mr-1" />{errorHorarios}</p>}
            {successMessage && <p className={alertSectionSuccessClasses}><CheckSquare size={16} className="mr-1" />{successMessage}</p>}

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {horariosUI
                    .slice() // Crear una copia para no mutar el estado original al ordenar
                    .sort((a, b) => { // Lunes (1) a Domingo (0 -> 7 para ordenar)
                        const diaAOrden = a.diaSemanaNumero === 0 ? 7 : a.diaSemanaNumero;
                        const diaBOrden = b.diaSemanaNumero === 0 ? 7 : b.diaSemanaNumero;
                        return diaAOrden - diaBOrden;
                    })
                    .map((horario) => (
                        <div key={horario.diaSemanaNumero} className={dayCardClasses}>
                            <div className={dayHeaderClasses}>
                                <span className={dayTitleClasses}>{horario.diaSemanaNombreDisplay}</span>
                                <label className={toggleLabelClasses}>
                                    <button
                                        type="button"
                                        onClick={() => handleToggleAbierto(horario.diaSemanaNumero)}
                                        className={`${toggleClasses} ${horario.estaAbierto ? 'bg-blue-600' : 'bg-zinc-700'}`}
                                        aria-pressed={horario.estaAbierto}
                                        disabled={isSubmitting || isSavingGlobal}
                                    >
                                        <span className={`${toggleKnobClasses} ${horario.estaAbierto ? 'translate-x-4' : 'translate-x-0.5'}`} />
                                    </button>
                                    <span className={horario.estaAbierto ? 'text-blue-400' : 'text-zinc-400'}>
                                        {horario.estaAbierto ? 'Abierto' : 'Cerrado'}
                                    </span>
                                </label>
                            </div>
                            {horario.estaAbierto && (
                                <div className="space-y-2 pt-2 border-t border-zinc-700/50">
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <label htmlFor={`inicio-${horario.diaSemanaNumero}`} className="text-xs text-zinc-400">Desde:</label>
                                        <select
                                            id={`inicio-${horario.diaSemanaNumero}`}
                                            value={horario.horaInicio}
                                            onChange={(e) => handleTimeChange(horario.diaSemanaNumero, 'horaInicio', e.target.value)}
                                            className={timeSelectClasses}
                                            disabled={isSubmitting || isSavingGlobal}
                                        >
                                            {OPCIONES_HORA.map(hora => <option key={`inicio-${horario.diaSemanaNumero}-${hora}`} value={hora}>{hora}</option>)}
                                        </select>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 items-center">
                                        <label htmlFor={`fin-${horario.diaSemanaNumero}`} className="text-xs text-zinc-400">Hasta:</label>
                                        <select
                                            id={`fin-${horario.diaSemanaNumero}`}
                                            value={horario.horaFin}
                                            onChange={(e) => handleTimeChange(horario.diaSemanaNumero, 'horaFin', e.target.value)}
                                            className={timeSelectClasses}
                                            disabled={isSubmitting || isSavingGlobal}
                                        >
                                            {OPCIONES_HORA.map(hora => <option key={`fin-${horario.diaSemanaNumero}-${hora}`} value={hora}>{hora}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}
            </div>

            <div className="pt-6 flex justify-end border-t border-zinc-700 mt-2">
                <button
                    type="button"
                    onClick={handleGuardarHorarios}
                    className={buttonPrimaryClasses}
                    disabled={isSubmitting || isSavingGlobal || loadingHorarios}
                >
                    {isSubmitting ? <Loader2 className="animate-spin" size={18} /> : <Save size={18} />}
                    Guardar Horarios
                </button>
            </div>
        </div>
    );
}