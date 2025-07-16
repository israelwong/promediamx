import { Button } from '@/app/components/ui/button';
import { PlusCircle } from 'lucide-react';

// --- Componente de Cabecera de Página (Reutilizable) ---
function HeaderPage({ title, children }: { title: string, children?: React.ReactNode }) {
    return (
        <header className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 border-b border-zinc-800 pb-5">
            <h1 className="text-2xl md:text-3xl font-bold text-zinc-100 tracking-tight">
                {title}
            </h1>
            <div className="flex items-center gap-2">
                {children}
            </div>
        </header>
    );
}

export default function AgenteDashboardPage() {
    return (
        <div>
            <HeaderPage title="Pipeline de Prospectos">
                <Button className="bg-blue-600 hover:bg-blue-700 text-white">
                    <PlusCircle className="mr-2 h-4 w-4" />
                    Agregar Prospecto
                </Button>
            </HeaderPage>

            <div className="flex items-center justify-center h-96 border-2 border-dashed border-zinc-800 rounded-xl bg-zinc-900/50">
                <div className="text-center">
                    <p className="text-zinc-400">El pipeline de prospectos se mostrará aquí.</p>
                    <p className="text-sm text-zinc-500">Próximamente: Tablero Kanban interactivo.</p>
                </div>
            </div>
        </div>
    );
}
