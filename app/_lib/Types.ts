export interface Usuario {
    id?: string;
    username: string;
    email: string;
    telefono: string | undefined;
    direccion: string | undefined;
    clabe: string | undefined;
    password: string;
    rol: string;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Sesion {
    id: string;
    usuarioId: string;
    token: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Servicio {
    id?: string
    nombre: string
    descripcion: string | null
    precio: number | null
    cuota_mensual: number | null
    cuota_anual: number | null
    order?: number | null
    status: string
    createdAt?: Date
    updatedAt?: Date
}