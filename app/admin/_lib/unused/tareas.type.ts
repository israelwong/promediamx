// Ruta: app/admin/_lib/types.ts
// import { EtiquetaTarea as PrismaEtiquetaTarea } from "@prisma/client";

// Define EtiquetaTarea if not already defined
export interface EtiquetaTarea {
    id: string;
    nombre: string;
    descripcion?: string | null;
    orden?: number | null;
}

// --- Tipo Detallado para la Lista de Tareas (ACTUALIZADO) ---
// Define la estructura que la UI necesita y que la acción debe devolver
export type TareaConDetalles = {
    // Campos base de Tarea
    id: string;
    nombre: string;
    status: string;
    precio: number | null;
    orden: number | null;
    iconoUrl: string | null;
    categoriaTareaId: string | null;
    tareaFuncionId: string | null;
    version: number; // Asegúrate que 'version' esté en tu tipo Tarea base o se seleccione en la action

    // Relaciones incluidas
    CategoriaTarea: {
        nombre: string;
        color: string | null;
    } | null;

    tareaFuncion: {
        id: string;
        nombreVisible: string;
    } | null;

    etiquetas: {
        etiquetaTarea: {
            id: string;
            nombre: string;
        } | null;
    }[];

    // Conteos incluidos
    _count: {
        TareaGaleria?: number;   // Galería ya no se mostrará, pero el tipo puede mantenerlo por ahora
        TareaEjecutada?: number;
        AsistenteTareaSuscripcion?: number; // <-- NUEVO CONTEO PARA ASISTENTES
    };
};

// ... (otros tipos como CategoriaTareaSimple, OrdenarTareasInput, etc., se mantienen)

export interface CategoriaTareaSimple {
    id: string;
    nombre: string;
    color?: string | null;
}

export type OrdenarTareasInput = {
    id: string;
    orden: number;
}[];

// Tipo de resultado estándar para acciones (si lo usas globalmente)
export interface ActionResult<T = null> {
    success: boolean;
    error?: string | null;
    data?: T;
}

// Tipos que ya tenías en tu archivo de actions, los muevo aquí para centralizar
export interface Tarea {
    id: string;
    categoriaTareaId?: string | null;
    orden?: number | null;
    nombre: string;
    descripcion?: string | null | undefined;
    descripcionTool?: string | null; // Añadido basado en tu action
    instruccion?: string | null;
    trigger?: string | null;
    tareaFuncionId?: string | null;
    precio?: number | null;
    rol?: string | null;
    personalidad?: string | null;
    version: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    iconoUrl?: string | null;
    CategoriaTarea?: CategoriaTarea; // Asumiendo que CategoriaTarea es otro tipo definido
    tareaFuncion?: TareaFuncion;     // Asumiendo que TareaFuncion es otro tipo definido
    etiquetas?: TareaEtiqueta[];     // Asumiendo que TareaEtiqueta es otro tipo definido
    canalesSoportados?: TareaCanal[];// Asumiendo que TareaCanal es otro tipo definido
    // ... y cualquier otro campo de tu modelo Tarea de Prisma
}

export interface TareaFuncion {
    id: string;
    nombreVisible: string;
    nombreInterno: string;
    // ...otros campos de TareaFuncion
}

export interface ParametroRequerido {
    id: string;
    nombreVisible: string;
    nombreInterno: string;
    tipoDato: string;
    descripcion?: string | null;
    orden?: number | null;
    // ...otros campos de ParametroRequerido
}

export interface TareaEtiqueta {
    etiquetaTarea: {
        id: string;
        nombre: string;
    }
    // ...otros campos si la tabla de unión los tiene
}

export interface TareaCanal {
    canalConversacional: {
        id: string;
        // ...otros campos de CanalConversacional
    }
    // ...otros campos si la tabla de unión los tiene
}

export interface CategoriaTarea {
    id: string;
    nombre: string;
    color?: string | null;
    // ...otros campos de CategoriaTarea
}


export type CrearTareaBasicaInput = Pick<Tarea, 'nombre' | 'categoriaTareaId'> & {
    canalConversacionalId: string;
};

export type ActualizarTareaConRelacionesInput = Partial<Pick<Tarea,
    'nombre' |
    'descripcion' |
    'descripcionTool' | // Añadido basado en tu action
    'instruccion' |
    // 'trigger' | // Trigger no estaba en tu tipo original de la action
    'precio' |
    'rol' |
    'personalidad' |
    'version' |
    'status' |
    'categoriaTareaId' |
    'tareaFuncionId' |
    'iconoUrl'
>> & {
    canalIds?: string[];
    etiquetaIds?: string[];
};

export type TareaParaEditar = Tarea & { // Asumiendo que Tarea ya tiene la mayoría de los campos
    _count?: { AsistenteTareaSuscripcion?: number };
    // tareaFuncion ya está en Tarea
    canalesSoportados?: (TareaCanal & { canalConversacional: Pick<CanalConversacionalSimple, 'id'> })[];
    etiquetas?: (TareaEtiqueta & { etiquetaTarea: Pick<EtiquetaTarea, 'id'> })[]; // Asumiendo que EtiquetaTarea es un tipo definido
};

export type TareaParaMarketplace = Pick<Tarea, 'id' | 'nombre' | 'descripcion' | 'precio' | 'categoriaTareaId'> & {
    CategoriaTarea?: (Pick<CategoriaTarea, 'nombre'> & { color?: string | null }) | null;
    etiquetas: { etiquetaTarea: Pick<EtiquetaTarea, 'id' | 'nombre'> }[]; // Asumiendo que EtiquetaTarea es un tipo definido
    _count: {
        AsistenteTareaSuscripcion: number;
        TareaGaleria: number; // Asumiendo TareaGaleria es un tipo definido
    };
    imagenPortadaUrl?: string | null;
};


export interface CanalConversacionalSimple {
    id: string;
    nombre: string;
    icono?: string | null;
}

// Tipos para TareaGaleria (usados en tu tareaGaleria.actions.ts)
export interface TareaGaleria {
    id: string;
    tareaId: string;
    imageUrl: string;
    altText?: string | null;
    descripcion?: string | null;
    orden?: number | null;
    tamañoBytes?: number | null;
    createdAt: Date;
}

export type CrearImagenGaleriaInput = Pick<TareaGaleria, 'tareaId' | 'imageUrl'> &
    Partial<Pick<TareaGaleria, 'altText' | 'descripcion' | 'tamañoBytes' | 'orden'>>;

export interface EtiquetaTareaPrisma {
    id: string;
    nombre: string;
    descripcion?: string | null;
    orden?: number | null;
    // color?: string | null; // No está en schema
    createdAt: Date;
    updatedAt: Date;

    // Relaciones (opcionales según la consulta)
    tareas?: TareaEtiqueta[];
}

// Note: The local interface name remains unchanged to avoid conflicts.