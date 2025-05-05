// app/admin/clientes/[clienteId]/negocios/[negocioId]/crm/configuracion/layout.tsx
import React from 'react';
import ConfiguracionSubmenu from './components/ConfiguracionSubmenu'; // Importa el submenú de configuración

export default async function ConfiguracionLayout({ children }: Readonly<{ children: React.ReactNode; }>) {

    return (
        <div className="flex flex-col flex-1 h-full"> {/* Ocupa todo el espacio disponible */}

            <div className="flex flex-1 gap-6 overflow-hidden">

                <aside className="w-64 flex-shrink-0 overflow-y-auto"> {/* Ancho consistente */}
                    <ConfiguracionSubmenu />
                </aside>

                {/* Columna del Contenido Principal (children) */}
                <main className="flex-1 overflow-auto pr-1 min-w-0"> {/* <-- AÑADIDO min-w-0 */}
                    {children} {/* Aquí se renderizarán las páginas hijas (pipeline/page, etiquetas/page, etc.) */}
                </main>

            </div>
        </div>
    );
}
