// Ruta: app/admin/_lib/tareaFuncion.type.ts

import {
    TareaFuncion as TareaFuncionBasePrisma,
    ParametroRequerido as ParametroRequeridoBasePrisma,
    TareaFuncionParametroRequerido as TareaFuncionParametroRequeridoBasePrisma
} from '../types'; // Asumiendo que estos tipos base vienen de tu archivo global

// Interfaz para mostrar los detalles de una función en la UI, incluyendo parámetros y conteo de uso.
export interface FuncionConDetalles extends Omit<TareaFuncionBasePrisma, 'parametrosRequeridos' | 'orden'> {
    orden?: number; // orden es requerido en el estado local de la UI para DnD
    parametrosRequeridos?: (Omit<TareaFuncionParametroRequeridoBasePrisma, 'parametroRequerido'> & {
        parametroRequerido?: Pick<ParametroRequeridoBasePrisma, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null | undefined;
    })[];
    _count?: {
        tareas?: number;
    };
}

// Tipo para los datos de un formulario de creación/edición de TareaFuncion (si se implementara un modal).
// Este tipo es más completo, pensando en un formulario.
export type TareaFuncionFormData = Partial<Pick<TareaFuncionBasePrisma, 'id' | 'nombreInterno' | 'nombreVisible' | 'descripcion'>> & {
    parametros?: Array<{
        parametroRequeridoId: string;
        esObligatorio: boolean;
        // Opcional: incluir nombreVisible del parámetro para mostrar en el form
        nombreVisibleParametro?: string;
    }>;
};


// Interfaz para mostrar los detalles de una función en la UI (usada en TareaFunciones.tsx)
export interface FuncionConDetalles extends Omit<TareaFuncionBasePrisma, 'parametrosRequeridos' | 'orden'> {
    orden?: number;
    parametrosRequeridos?: (Omit<TareaFuncionParametroRequeridoBasePrisma, 'parametroRequerido'> & {
        parametroRequerido?: Pick<ParametroRequeridoBasePrisma, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null | undefined;
    })[];
    _count?: {
        tareas?: number;
    };
}

// Tipo para el estado del formulario de TareaFuncionNuevaForm
export type TareaFuncionNuevaFormData = {
    nombreInterno: string;
    nombreVisible: string;
    descripcion: string; // En el schema es String?, pero en el form lo haremos string vacío por defecto
    parametros: ParametroSeleccionableEnForm[];
};

// Interfaz para mostrar los detalles de una función en la UI (usada en TareaFunciones.tsx)
export interface FuncionConDetalles extends Omit<TareaFuncionBasePrisma, 'parametrosRequeridos' | 'orden'> {
    orden?: number;
    parametrosRequeridos?: (Omit<TareaFuncionParametroRequeridoBasePrisma, 'parametroRequerido'> & {
        parametroRequerido?: Pick<ParametroRequeridoBasePrisma, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null;
    })[];
    _count?: {
        tareas?: number;
    };
}

// Tipo para representar un parámetro disponible en el formulario,
// con un flag para saber si está seleccionado y si es obligatorio para la función actual.
export interface ParametroSeleccionableEnForm extends ParametroRequeridoBasePrisma {
    seleccionado: boolean;
    esObligatorio: boolean;
}

// Tipo para el estado del formulario de TareaFuncion (Crear o Editar)
// Para edición, 'id' y 'nombreInterno' vendrán de la función cargada.
export interface TareaFuncionFormState {
    id?: string; // Presente en modo edición
    nombreInterno: string;
    nombreVisible: string;
    descripcion: string;
    // Lista de TODOS los parámetros disponibles, con sus estados de selección/obligatoriedad para ESTA función
    parametrosDisponibles: ParametroSeleccionableEnForm[];
}

// Interfaz para mostrar los detalles de una función en la UI (usada en TareaFunciones.tsx y TareaFuncionAsociada.tsx)
export interface FuncionConDetalles extends Omit<TareaFuncionBasePrisma, 'parametrosRequeridos' | 'orden'> {
    // Hereda la mayoría de las propiedades de TareaFuncionBasePrisma
    // Redefinimos 'orden' para ser explícitos y permitir 'null' si TareaFuncionBasePrisma lo hace.
    orden?: number | undefined; // <--- AJUSTE AQUÍ: Permitir number, null, o undefined
    parametrosRequeridos?: (Omit<TareaFuncionParametroRequeridoBasePrisma, 'parametroRequerido'> & {
        parametroRequerido?: Pick<ParametroRequeridoBasePrisma, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null;
    })[];
    _count?: {
        tareas?: number;
    };
}

// Tipo para representar un parámetro disponible en el formulario de nueva función,
// con un flag para saber si está seleccionado y si es obligatorio.
export interface ParametroSeleccionableEnForm extends ParametroRequeridoBasePrisma {
    seleccionado: boolean;
    esObligatorio: boolean;
}

// Tipo para el estado del formulario de TareaFuncion (Crear o Editar)
export interface TareaFuncionFormState {
    id?: string;
    nombreInterno: string;
    nombreVisible: string;
    descripcion: string;
    parametrosDisponibles: ParametroSeleccionableEnForm[];
}

export interface FuncionConDetalles extends Omit<TareaFuncionBasePrisma, 'parametrosRequeridos' | 'orden'> {
    orden?: number | undefined;
    parametrosRequeridos?: (Omit<TareaFuncionParametroRequeridoBasePrisma, 'parametroRequerido'> & {
        parametroRequerido?: Pick<ParametroRequeridoBasePrisma, 'id' | 'nombreVisible' | 'nombreInterno' | 'tipoDato'> | null | undefined;
    })[];
    _count?: {
        tareas?: number;
    };
}

export interface ParametroSeleccionableEnForm extends ParametroRequeridoBasePrisma {
    seleccionado: boolean;
    esObligatorio: boolean;
    // --- NUEVO: Conteo de funciones que usan este parámetro global ---
    // Este conteo debe ser proporcionado por la action obtenerParametrosRequeridosDisponibles
    _count?: {
        funciones?: number;
    };
}

export interface TareaFuncionFormState {
    id?: string;
    nombreInterno: string;
    nombreVisible: string;
    descripcion: string;
    parametrosDisponibles: ParametroSeleccionableEnForm[];
}

export type CrearTareaFuncionInput = Pick<TareaFuncionBasePrisma, 'nombreInterno' | 'nombreVisible'> &
    Partial<Pick<TareaFuncionBasePrisma, 'descripcion'>> & {
        parametros?: Array<{
            parametroRequeridoId: string;
            esObligatorio: boolean;
        }>;
    };

export type EditarTareaFuncionInput = Partial<Pick<TareaFuncionBasePrisma, 'nombreVisible' | 'descripcion'>> & {
    parametros?: Array<{
        parametroRequeridoId: string;
        esObligatorio: boolean;
    }>;
};
