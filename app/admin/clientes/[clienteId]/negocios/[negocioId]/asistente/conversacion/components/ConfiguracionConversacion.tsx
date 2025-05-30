// 'use client';

// import React, { useState, useEffect, ChangeEvent } from 'react';
// // import { useRouter } from 'next/navigation'; // Importar si se necesita para alguna navegación futura

// // Importar Acciones
// import {
//     obtenerAsistentesVirtuales,
//     obtenerSuscripcionesAsistenteTareas
// } from '@/app/admin/_lib/asistenteVirtual.actions'; // Corregido nombre de archivo si es necesario
// import { actualizarInstruccionTarea } from '@/app/admin/_lib/tareas.actions';

// // Importar Tipos
// import { AsistenteVirtual, AsistenteTareaSuscripcion, Tarea } from '@/app/admin/_lib/types'; // Asumiendo tipos aquí

// // Importar Componentes Hijos
// import ChatIA from './ChatIA'; // Asumiendo en la misma carpeta
// import ParametrosLista from './ParametrosLista'; // Ajusta la ruta según tu estructura

// // Importar Iconos
// import { Loader2, CheckCircle, Save } from 'lucide-react';

// export default function ConfiguracionConversacion() {
//     // const router = useRouter(); // Mantener por si se añade navegación

//     // Estados para Asistentes
//     const [asistentes, setAsistentes] = useState<AsistenteVirtual[]>([]);
//     const [asistenteSeleccionadoId, setAsistenteSeleccionadoId] = useState<string>(''); // ID del asistente seleccionado
//     const [loadingAsistentes, setLoadingAsistentes] = useState(true);
//     const [errorAsistentes, setErrorAsistentes] = useState<string | null>(null);

//     // Estados para Tareas del Asistente Seleccionado
//     const [tareasAsistente, setTareasAsistente] = useState<AsistenteTareaSuscripcion[]>([]);
//     const [loadingTareas, setLoadingTareas] = useState(false); // Inicia en false, se activa al seleccionar asistente
//     const [errorTareas, setErrorTareas] = useState<string | null>(null);

//     // Estados para la Tarea Específica Seleccionada
//     const [tareaSeleccionadaId, setTareaSeleccionadaId] = useState<string>(''); // ID de la tarea seleccionada (radio button)
//     const [tareaSeleccionadaData, setTareaSeleccionadaData] = useState<Tarea | null>(null); // Datos completos de la tarea seleccionada
//     const [instruccionEditada, setInstruccionEditada] = useState<string>(''); // Para el textarea editable

//     // Estados para Guardar Instrucción
//     const [isSavingInstruccion, setIsSavingInstruccion] = useState(false);
//     const [saveError, setSaveError] = useState<string | null>(null);
//     const [saveSuccess, setSaveSuccess] = useState<string | null>(null);

//     // Clases de Tailwind reutilizables
//     const labelBaseClasses = "text-zinc-300 block mb-1 text-sm font-medium";
//     const inputBaseClasses = "bg-zinc-900 border border-zinc-700 text-zinc-300 block w-full rounded-md p-2 focus:ring-blue-500 focus:border-blue-500 disabled:opacity-70";
//     const textareaBaseClasses = `${inputBaseClasses} min-h-[150px] font-mono text-xs`; // Textarea para instrucción
//     const containerClasses = "p-4 bg-zinc-800 rounded-lg shadow-md"; // Contenedor para secciones
//     const buttonBaseClasses = "text-white font-bold py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-opacity-50 transition duration-150 ease-in-out disabled:opacity-50";
//     const radioLabelClasses = "flex items-center gap-3 p-3 border border-zinc-700 rounded-lg cursor-pointer hover:bg-zinc-700 transition-colors";
//     const radioInputClasses = "h-4 w-4 text-blue-600 bg-zinc-700 border-zinc-600 focus:ring-blue-500";

//     // --- Efecto para cargar Asistentes ---
//     useEffect(() => {
//         setLoadingAsistentes(true);
//         setErrorAsistentes(null);
//         obtenerAsistentesVirtuales()
//             .then(data => setAsistentes(data))
//             .catch(err => {
//                 console.error('Error fetching asistentes:', err);
//                 setErrorAsistentes('Error al cargar los asistentes.');
//             })
//             .finally(() => setLoadingAsistentes(false));
//     }, []);

//     // --- Efecto para cargar Tareas cuando cambia el Asistente ---
//     useEffect(() => {
//         // Limpiar selección de tarea anterior si cambia el asistente
//         setTareaSeleccionadaId('');
//         setTareaSeleccionadaData(null);
//         setInstruccionEditada('');
//         setTareasAsistente([]); // Limpiar lista de tareas
//         setErrorTareas(null); // Limpiar error de tareas

//         if (asistenteSeleccionadoId) {
//             setLoadingTareas(true);
//             obtenerSuscripcionesAsistenteTareas(asistenteSeleccionadoId)
//                 .then(data => {
//                     // Ordenar tareas (opcional, por nombre o por orden si existe)
//                     const sortedData = data.sort((a, b) => a.tarea.nombre.localeCompare(b.tarea.nombre));
//                     setTareasAsistente(sortedData.map(item => ({
//                         ...item,
//                         tarea: {
//                             ...item.tarea,
//                             categoriaTareaId: item.tarea.categoriaTareaId ?? undefined,
//                             iconoUrl: item.tarea.iconoUrl ?? undefined, // Convert null to undefined
//                         },
//                     })));
//                 })
//                 .catch(err => {
//                     console.error('Error fetching tareas del asistente:', err);
//                     setErrorTareas('Error al cargar las tareas asociadas.');
//                 })
//                 .finally(() => setLoadingTareas(false));
//         }
//     }, [asistenteSeleccionadoId]); // Dependencia: ID del asistente seleccionado

//     // --- Efecto para actualizar datos cuando cambia la Tarea seleccionada ---
//     useEffect(() => {
//         if (tareaSeleccionadaId) {
//             // Encontrar la tarea completa en la lista ya cargada
//             const tareaEncontrada = tareasAsistente.find(t => t.tarea?.id === tareaSeleccionadaId)?.tarea;
//             setTareaSeleccionadaData(tareaEncontrada || null);
//             setInstruccionEditada(tareaEncontrada?.instruccion ?? ''); // Poblar textarea
//         } else {
//             setTareaSeleccionadaData(null); // Limpiar si no hay tarea seleccionada
//             setInstruccionEditada('');
//         }
//         // Limpiar mensajes de guardado al cambiar de tarea
//         setSaveError(null);
//         setSaveSuccess(null);
//     }, [tareaSeleccionadaId, tareasAsistente]);

//     // --- Manejadores ---
//     const handleAsistenteChange = (e: ChangeEvent<HTMLSelectElement>) => {
//         setAsistenteSeleccionadoId(e.target.value);
//     };

//     const handleTareaChange = (e: ChangeEvent<HTMLInputElement>) => {
//         setTareaSeleccionadaId(e.target.value);
//     };

//     const handleInstruccionChange = (e: ChangeEvent<HTMLTextAreaElement>) => {
//         setInstruccionEditada(e.target.value);
//         // Limpiar mensajes al empezar a editar
//         setSaveError(null);
//         setSaveSuccess(null);
//     };

//     const handleGuardarInstruccion = async () => {
//         if (!tareaSeleccionadaId || instruccionEditada === null) return; // Comprobar también instruccionEditada

//         setIsSavingInstruccion(true);
//         setSaveError(null);
//         setSaveSuccess(null);

//         try {
//             const tareaActualizada = await actualizarInstruccionTarea(tareaSeleccionadaId, instruccionEditada);
//             setSaveSuccess("Instrucción guardada.");
//             // Actualizar localmente para reflejar cambio sin recargar todo
//             setTareaSeleccionadaData(prev => prev ? { ...prev, instruccion: tareaActualizada.instruccion } : null);
//             // Limpiar mensaje después de un tiempo
//             setTimeout(() => setSaveSuccess(null), 2500);
//         } catch (err) {
//             console.error("Error guardando instrucción:", err);
//             const message = err instanceof Error ? err.message : "Error desconocido";
//             setSaveError(`Error al guardar: ${message}`);
//         } finally {
//             setIsSavingInstruccion(false);
//         }
//     };

//     // --- Renderizado ---
//     return (
//         // Usamos un grid principal para las 3 columnas
//         <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 p-4 md:p-6">

//             {/* --- Columna 1: Selección Asistente y Tarea --- */}
//             <div className={`${containerClasses} flex flex-col`}>
//                 <h3 className="text-lg font-semibold text-white mb-3">1. Selección</h3>
//                 {/* Selector de Asistente */}
//                 <div className="mb-4">
//                     <label htmlFor="asistente" className={labelBaseClasses}>Asistente Virtual</label>
//                     <select
//                         id="asistente"
//                         name="asistente"
//                         value={asistenteSeleccionadoId}
//                         onChange={handleAsistenteChange}
//                         className={`${inputBaseClasses} appearance-none`}
//                         disabled={loadingAsistentes}
//                     >
//                         <option value="" disabled>
//                             {loadingAsistentes ? 'Cargando asistentes...' : '-- Selecciona Asistente --'}
//                         </option>
//                         {asistentes.map(asistente => (
//                             <option key={asistente.id} value={asistente.id}>
//                                 {asistente.nombre} ({asistente.id})
//                             </option>
//                         ))}
//                     </select>
//                     {errorAsistentes && <p className="text-xs text-red-400 mt-1">{errorAsistentes}</p>}
//                 </div>

//                 {/* Lista de Tareas Asociadas (si hay asistente seleccionado) */}
//                 {asistenteSeleccionadoId && (
//                     <div className="flex-grow flex flex-col overflow-hidden">
//                         <label className={labelBaseClasses}>Tarea Asociada</label>
//                         {loadingTareas ? (
//                             <div className="flex-grow flex items-center justify-center text-zinc-400"> <Loader2 className="animate-spin h-5 w-5 mr-2" /> Cargando tareas...</div>
//                         ) : errorTareas ? (
//                             <div className="flex-grow flex items-center justify-center text-red-400">{errorTareas}</div>
//                         ) : tareasAsistente.length === 0 ? (
//                             <div className="flex-grow flex items-center justify-center text-zinc-400 italic text-sm">Este asistente no tiene tareas asociadas.</div>
//                         ) : (
//                             <div className="flex-grow overflow-y-auto space-y-2 pr-1">
//                                 {tareasAsistente.map(({ tarea }) => tarea && ( // Asegurar que tarea exista
//                                     <label key={tarea.id} className={`${radioLabelClasses} ${tareaSeleccionadaId === tarea.id ? 'bg-zinc-700 border-blue-500' : 'border-zinc-700'}`}>
//                                         <input
//                                             type="radio"
//                                             name="tareaSeleccionada"
//                                             value={tarea.id}
//                                             checked={tareaSeleccionadaId === tarea.id}
//                                             onChange={handleTareaChange}
//                                             className={radioInputClasses}
//                                         />
//                                         <span className="text-sm text-zinc-200">{tarea.nombre}</span>
//                                     </label>
//                                 ))}
//                             </div>
//                         )}
//                     </div>
//                 )}
//             </div>

//             {/* --- Columna 2: Detalles Tarea e Instrucción Editable --- */}
//             <div className={`${containerClasses} flex flex-col`}>
//                 <h3 className="text-lg font-semibold text-white mb-3">2. Configuración Tarea</h3>
//                 {tareaSeleccionadaData ? (
//                     <div className="flex-grow flex flex-col gap-4 overflow-hidden">
//                         {/* Detalles No Editables */}
//                         <div className="grid grid-cols-2 gap-3 text-xs border-b border-zinc-700 pb-3">
//                             {/* <div><strong className="text-zinc-400 block">Trigger:</strong> <span className="text-zinc-200 font-mono">{tareaSeleccionadaData.trigger || '-'}</span></div> */}
//                             <div><strong className="text-zinc-400 block">Automatización:</strong> <span className="text-zinc-200 font-mono">{tareaSeleccionadaData.automatizacion || '-'}</span></div>
//                         </div>

//                         {/* Parámetros (usando componente) */}
//                         <div className="min-h-[100px]"> {/* Contenedor para parámetros */}
//                             <ParametrosLista tareaId={tareaSeleccionadaId} />
//                         </div>

//                         {/* Instrucción Editable */}
//                         <div className="flex-grow flex flex-col mt-2">
//                             <label htmlFor="instruccionEditada" className={labelBaseClasses}>Instrucción / Prompt Base</label>
//                             <textarea
//                                 id="instruccionEditada"
//                                 name="instruccionEditada"
//                                 value={instruccionEditada}
//                                 onChange={handleInstruccionChange}
//                                 className={`${textareaBaseClasses} flex-grow`} // flex-grow para ocupar espacio
//                                 placeholder="Instrucciones detalladas para la IA..."
//                                 disabled={isSavingInstruccion}
//                             />
//                             {/* Mensajes de guardado */}
//                             <div className="h-5 mt-1 text-xs text-center">
//                                 {saveError && <span className="text-red-400">{saveError}</span>}
//                                 {saveSuccess && <span className="text-green-400 flex items-center justify-center gap-1"><CheckCircle size={14} /> {saveSuccess}</span>}
//                             </div>
//                             <button
//                                 onClick={handleGuardarInstruccion}
//                                 className={`${buttonBaseClasses} !w-auto bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 text-sm px-3 py-1.5 mt-2 self-end`} // Botón pequeño alineado a la derecha
//                                 disabled={isSavingInstruccion || instruccionEditada === (tareaSeleccionadaData?.instruccion ?? '')} // Deshabilitar si no hay cambios
//                             >
//                                 {isSavingInstruccion ? <Loader2 className="animate-spin h-4 w-4" /> : <Save size={16} />}
//                                 <span className="ml-1.5">Guardar Instrucción</span>
//                             </button>
//                         </div>
//                     </div>
//                 ) : (
//                     <div className="flex-grow flex items-center justify-center text-zinc-400 italic text-sm">
//                         {asistenteSeleccionadoId ? "Selecciona una tarea de la lista." : "Selecciona un asistente primero."}
//                     </div>
//                 )}
//             </div>

//             {/* --- Columna 3: ChatIA --- */}
//             <div className={`${containerClasses} flex flex-col`}>
//                 <h3 className="text-lg font-semibold text-white mb-3">3. Prueba Chat</h3>
//                 {asistenteSeleccionadoId ? (
//                     <div className="flex-grow overflow-hidden border border-zinc-700 rounded-md">
//                         {/* Asumiendo que ChatIA maneja su propio scroll y layout interno */}
//                         <ChatIA asistenteVirtualId={asistenteSeleccionadoId} />
//                     </div>
//                 ) : (
//                     <div className="flex-grow flex items-center justify-center text-zinc-400 italic text-sm">
//                         Selecciona un asistente para iniciar el chat.
//                     </div>
//                 )}
//             </div>

//         </div>
//     );
// }
