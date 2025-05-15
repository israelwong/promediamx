'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { Loader2, AlertTriangleIcon, CheckSquare, Save, Clock } from 'lucide-react'; // CalendarX2 ya no se usa aquí

import {
    obtenerConfiguracionAgenda,
    guardarHorariosAtencion,
} from '@/app/admin/_lib/negocioAgenda.actions';

import {
    HorarioSemanalUI,
    HorarioAtencionBase,
    DiaSemana,
    // AgendaActionResult // No se usa directamente en este componente
} from '@/app/admin/_lib/negocioAgenda.type';

interface HorarioSemanalSeccionProps {
    negocioId: string;
    isSavingGlobal: boolean;
}

const DIAS_MAP: { numero: number; nombre: string; enumKey: DiaSemana }[] = [
    { numero: 1, nombre: 'Lunes', enumKey: DiaSemana.LUNES },
    { numero: 2, nombre: 'Martes', enumKey: DiaSemana.MARTES },
    { numero: 3, nombre: 'Miércoles', enumKey: DiaSemana.MIERCOLES },
    { numero: 4, nombre: 'Jueves', enumKey: DiaSemana.JUEVES },
    { numero: 5, nombre: 'Viernes', enumKey: DiaSemana.VIERNES },
    { numero: 6, nombre: 'Sábado', enumKey: DiaSemana.SABADO },
    { numero: 0, nombre: 'Domingo', enumKey: DiaSemana.DOMINGO }
];

const generarOpcionesDeHora = (): string[] => {
    const horas = [];
    for (let h = 0; h < 24; h++) {
        for (let m = 0; m < 60; m += 30) {
            horas.push(`${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`);
        }
    }
    return horas;
};
const OPCIONES_HORA = generarOpcionesDeHora();

export default function HorarioSemanalSeccion({
    negocioId,
    isSavingGlobal
}: HorarioSemanalSeccionProps) {
    const [horariosUI, setHorariosUI] = useState<HorarioSemanalUI[]>([]);
    const [loadingHorarios, setLoadingHorarios] = useState(true);
    const [errorHorarios, setErrorHorarios] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [successMessage, setSuccessMessage] = useState<string | null>(null);

    // Clases de UI (sin cambios respecto a la versión anterior del Canvas)
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

    const inicializarHorariosUI = useCallback((horariosFromDB: HorarioAtencionBase[]) => {
        const uiState = DIAS_MAP.map(diaInfo => {
            const horarioExistente = horariosFromDB.find(h => h.dia === diaInfo.enumKey);
            return {
                id: horarioExistente?.id,
                diaSemanaNumero: diaInfo.numero,
                diaSemanaNombre: diaInfo.enumKey,
                estaAbierto: !!horarioExistente,
                horaInicio: horarioExistente?.horaInicio || '09:00', // Default si no hay horario
                horaFin: horarioExistente?.horaFin || '17:00',     // Default si no hay horario
            };
        });
        setHorariosUI(uiState);
    }, []);

    const fetchHorarios = useCallback(async () => {
        setLoadingHorarios(true);
        setErrorHorarios(null);
        setSuccessMessage(null);
        try {
            const result = await obtenerConfiguracionAgenda(negocioId);
            if (result.success && result.data) {
                inicializarHorariosUI(result.data.horariosAtencion || []);
            } else {
                throw new Error(result.error || "Error cargando horarios.");
            }
        } catch (err) {
            setErrorHorarios(err instanceof Error ? err.message : "No se pudieron cargar los horarios.");
            inicializarHorariosUI([]);
        } finally {
            setLoadingHorarios(false);
        }
    }, [negocioId, inicializarHorariosUI]);

    useEffect(() => {
        fetchHorarios();
    }, [fetchHorarios]);

    const handleToggleAbierto = (diaNumero: number) => {
        setHorariosUI(prev => {
            // Buscar la configuración de Lunes si existe y está abierto
            const lunesConfig = prev.find(h => h.diaSemanaNombre === DiaSemana.LUNES && h.estaAbierto);
            const horaInicioPorDefecto = lunesConfig?.horaInicio || '09:00';
            const horaFinPorDefecto = lunesConfig?.horaFin || '17:00';

            return prev.map(h => {
                if (h.diaSemanaNumero === diaNumero) {
                    const ahoraEstaAbierto = !h.estaAbierto; // El nuevo estado de 'estaAbierto'

                    // Si se está activando el día (pasando a 'Abierto') y NO es Lunes
                    if (ahoraEstaAbierto && h.diaSemanaNombre !== DiaSemana.LUNES) {
                        return {
                            ...h,
                            estaAbierto: ahoraEstaAbierto,
                            // Heredar de Lunes si está configurado, sino usar los defaults generales
                            horaInicio: horaInicioPorDefecto,
                            horaFin: horaFinPorDefecto
                        };
                    }
                    // Si se está desactivando, o es Lunes, o Lunes no está configurado para heredar, solo cambiar 'estaAbierto'
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

        const horariosParaGuardar: HorarioAtencionBase[] = [];
        let validacionFallida = false;

        for (const h of horariosUI) {
            if (h.estaAbierto) {
                if (!h.horaInicio || !h.horaFin) {
                    setErrorHorarios(`Completa las horas para ${DIAS_MAP.find(d => d.enumKey === h.diaSemanaNombre)?.nombre}.`);
                    validacionFallida = true;
                    break;
                }
                if (h.horaInicio >= h.horaFin) {
                    setErrorHorarios(`Hora de inicio debe ser menor que hora de fin para ${DIAS_MAP.find(d => d.enumKey === h.diaSemanaNombre)?.nombre}.`);
                    validacionFallida = true;
                    break;
                }
                horariosParaGuardar.push({
                    negocioId: negocioId,
                    dia: h.diaSemanaNombre,
                    horaInicio: h.horaInicio,
                    horaFin: h.horaFin,
                });
            }
        }

        if (validacionFallida) {
            setIsSubmitting(false);
            return;
        }

        try {
            const result = await guardarHorariosAtencion(negocioId, horariosParaGuardar);
            if (result.success) {
                setSuccessMessage("Horarios de atención guardados exitosamente.");
                // Es buena práctica recargar para obtener IDs actualizados si la action los modificara,
                // aunque la action actual borra y recrea, por lo que los IDs cambiarían.
                // Si el usuario no ve los IDs, esta recarga podría ser opcional para una UI más rápida.
                await fetchHorarios();
            } else {
                setErrorHorarios(result.error || "Error al guardar los horarios.");
            }
        } catch (err) {
            setErrorHorarios(err instanceof Error ? err.message : "Un error inesperado ocurrió.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loadingHorarios) { /* ... (loader sin cambios) ... */ }

    return (
        <div className="space-y-6">
            {/* ... (Encabezado de la sección sin cambios) ... */}
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
                    .slice()
                    .sort((a, b) => {
                        const diaA = a.diaSemanaNumero === 0 ? 7 : a.diaSemanaNumero;
                        const diaB = b.diaSemanaNumero === 0 ? 7 : b.diaSemanaNumero;
                        return diaA - diaB;
                    })
                    .map((horario) => (
                        <div key={horario.diaSemanaNumero} className={dayCardClasses}>
                            {/* ... (Contenido de la tarjeta del día sin cambios, ya usa la lógica actualizada de handleToggleAbierto) ... */}
                            <div className={dayHeaderClasses}>
                                <span className={dayTitleClasses}>{DIAS_MAP.find(d => d.numero === horario.diaSemanaNumero)?.nombre}</span>
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
                                            value={horario.horaInicio || ''}
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
                                            value={horario.horaFin || ''}
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
                {/* ... (Botón Guardar Horarios sin cambios) ... */}
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
