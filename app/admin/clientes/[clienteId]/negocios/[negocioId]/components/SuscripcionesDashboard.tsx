// 'use client';

// import React, { useState } from 'react';
// // Importar los componentes hijos reales
// import SuscripcionesAsistentes from './(suscripciones)/SuscripcionesAsistentes';
// import SuscripcionesLandingpage from './(suscripciones)/SuscripcionesLandingpage';
// // Importar iconos para las pestañas
// import { Bot, Globe } from 'lucide-react';

// interface Props {
//     negocioId: string;
//     clienteId: string; // Añadir clienteId como prop opcional
// }

// // Definir los IDs posibles para las pestañas
// type TabId = 'asistentes' | 'landing';

// export default function SuscripcionesDashboard({ negocioId, clienteId }: Props) {
//     // Estado para controlar la pestaña activa, iniciar con 'asistentes'
//     const [activeTab, setActiveTab] = useState<TabId>('asistentes');

//     // Clases de Tailwind consistentes
//     const containerClasses = "p-0 bg-zinc-800 border border-zinc-700 rounded-lg shadow-md h-full flex flex-col"; // Sin padding inicial
//     const tabContainerClasses = "flex border-b border-zinc-700 bg-zinc-800 rounded-t-lg overflow-hidden";
//     const tabButtonBase = "px-4 py-2.5 text-sm font-medium focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 focus:ring-offset-zinc-800 flex items-center justify-center gap-2 transition-colors duration-150 ease-in-out flex-grow"; // flex-grow para ocupar espacio
//     const tabButtonActive = "bg-zinc-700 text-white border-b-2 border-blue-500";
//     const tabButtonInactive = "text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700/50 border-b-2 border-transparent";
//     const tabContentContainerClasses = "flex-grow p-0 overflow-y-auto"; // Sin padding aquí, el componente hijo lo maneja

//     // Mapeo de pestañas
//     const tabs: { id: TabId; label: string; icon: React.ElementType; component: React.ReactNode }[] = [
//         { id: 'asistentes', label: 'Asistentes', icon: Bot, component: <SuscripcionesAsistentes negocioId={negocioId} clienteId={clienteId} /> },
//         { id: 'landing', label: 'Landing Page', icon: Globe, component: <SuscripcionesLandingpage negocioId={negocioId} clienteId={clienteId} /> },
//     ];

//     return (
//         <div className={containerClasses}>
//             {/* Barra de Pestañas */}
//             <div className={tabContainerClasses} role="tablist">
//                 {tabs.map((tab) => (
//                     <button
//                         key={tab.id}
//                         className={`${tabButtonBase} ${activeTab === tab.id ? tabButtonActive : tabButtonInactive}`}
//                         onClick={() => setActiveTab(tab.id)}
//                         role="tab"
//                         aria-selected={activeTab === tab.id}
//                         aria-controls={`tabpanel-${tab.id}`}
//                         id={`tab-${tab.id}`} // Añadir ID para aria-labelledby
//                     >
//                         <tab.icon size={16} aria-hidden="true" />
//                         <span>{tab.label}</span>
//                     </button>
//                 ))}
//             </div>

//             {/* Contenedor del Contenido de las Pestañas */}
//             <div className={tabContentContainerClasses}>
//                 {tabs.map((tab) => (
//                     <div
//                         key={tab.id}
//                         id={`tabpanel-${tab.id}`}
//                         role="tabpanel"
//                         aria-labelledby={`tab-${tab.id}`}
//                         // Renderizar solo el contenido de la pestaña activa
//                         className={activeTab === tab.id ? 'block h-full' : 'hidden'} // h-full para que ocupe espacio si es necesario
//                     >
//                         {/* Renderizar el componente asociado a la pestaña activa */}
//                         {activeTab === tab.id && tab.component}
//                     </div>
//                 ))}
//             </div>
//         </div>
//     );
// }
