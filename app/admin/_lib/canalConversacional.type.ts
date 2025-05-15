// Ruta: app/admin/_lib/canalConversacional.type.ts

// Importamos el tipo base CanalConversacional.
// Eventualmente, este será el tipo generado por Prisma.
import { CanalConversacional as CanalConversacionalBasePrisma } from './types';

// Interfaz para el tipo CanalConversacional que usa la UI,
// asegurando que 'orden' no sea opcional y añadiendo conteo.
export interface CanalConDetalles extends Omit<CanalConversacionalBasePrisma, 'orden'> {
    orden: number; // orden es requerido en el estado local de la UI
    _count?: {
        tareasSoportadas?: number; // Conteo de tareas que usan este canal
        AsistenteVirtual?: number; // Conteo de asistentes que usan este canal
    };
}

// Tipo para los datos del formulario del modal.
// Usamos Partial porque en edición, el id ya existe y no se envía como parte del form data usualmente.
export type CanalFormData = Partial<Pick<CanalConversacionalBasePrisma, 'id' | 'nombre' | 'descripcion' | 'icono' | 'status'>>;

// Tipo para los datos de entrada de las acciones de crear/editar.
// 'id' no se incluye aquí ya que es para creación o se pasa por separado en edición.
// 'orden' se calcula en el backend al crear.
export type CanalConversacionalInput = Pick<CanalConversacionalBasePrisma, 'nombre'> &
    Partial<Pick<CanalConversacionalBasePrisma, 'descripcion' | 'icono' | 'status'>>;

// --- TIPO AÑADIDO PARA CORREGIR EL ERROR DE EXPORTACIÓN ---
// Tipo para los datos que el formulario del modal realmente envía a las acciones.
// 'nombre' es requerido, los demás son opcionales y pueden ser null si se limpian.
export type CanalModalSubmitData = {
    nombre: string;
    descripcion?: string | null;
    icono?: string | null;
    status?: string; // El backend usualmente asigna 'activo' por defecto si no se provee.
};
