// Ruta: app/admin/_lib/categoriaTarea.type.ts

// import { CategoriaTarea as CategoriaTareaBasePrisma } from './types'; // Asumiendo que Tarea también está en types

// Interfaz para el tipo CategoriaTarea que usa la UI.
// Omitimos 'nombre', 'orden', y 'color' de la base para redefinirlos explícitamente.
export interface CategoriaConOrden extends Omit<CategoriaTareaBasePrisma, 'nombre' | 'orden' | 'color'> {
    // Campos heredados de CategoriaTareaBasePrisma (excepto los omitidos)
    // id: string; (ya viene de CategoriaTareaBasePrisma a través de Omit)
    // descripcion?: string | null; (ya viene)
    // createdAt?: Date; (ya viene)
    // updatedAt?: Date; (ya viene)
    // Tarea?: Tarea[]; (ya viene)

    nombre: string; // 'nombre' ahora es explícitamente string y requerido.
    orden: number;  // 'orden' es requerido en el estado local de la UI.
    color?: string | null; // 'color' es opcional.
    _count?: {
        Tarea?: number; // Conteo de tareas en esta categoría.
    };
}

// Tipo para los datos del formulario del modal.
export type CategoriaFormData = Partial<Pick<CategoriaConOrden, 'nombre' | 'descripcion' | 'color'>>; // Basado en CategoriaConOrden

// Tipo para los datos que el formulario del modal realmente envía a las acciones de crear/editar.
export type CategoriaTareaInput = {
    nombre?: string;
    descripcion?: string | null;
    color?: string | null;
};


export interface CategoriaTareaBasePrisma {
    id: string;
    nombre?: string | null;
    descripcion?: string | null;
    createdAt: Date;
    updatedAt: Date;
    color?: string | null;
    orden?: number | null;
    _count?: {
        Tarea?: number;
    };
}