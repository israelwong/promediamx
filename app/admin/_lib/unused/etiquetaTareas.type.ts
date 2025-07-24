// Ruta: app/admin/_lib/etiquetaTareas.type.ts

// Importamos el tipo base EtiquetaTarea.
// Asumimos que este tipo ya existe en tu archivo global de tipos y
// será eventualmente el tipo generado por Prisma.
import { EtiquetaTarea as EtiquetaTareaBasePrisma } from '../types';

// Interfaz para el tipo EtiquetaTarea que usa la UI,
// asegurando que 'orden' no sea opcional y añadiendo conteo opcional.
export interface EtiquetaConOrden extends Omit<EtiquetaTareaBasePrisma, 'orden'> {
    orden: number; // orden es requerido en el estado local de la UI
    _count?: {
        tareas?: number; // Conteo de tareas que usan esta etiqueta
    };
}

// Tipo para los datos del formulario del modal.
export type EtiquetaFormData = Partial<Pick<EtiquetaTareaBasePrisma, 'nombre' | 'descripcion'>>;

// Tipo para los datos que el formulario del modal realmente envía a las acciones de crear/editar.
export type EtiquetaTareaInput = {
    nombre: string; // Nombre es requerido
    descripcion?: string | null; // Descripción es opcional
};
