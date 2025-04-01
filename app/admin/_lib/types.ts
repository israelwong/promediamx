export interface Rol {
    id?: string;
    nombre: string;
    descripcion?: string | null;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Usuario {
    id?: string;
    username: string;
    email: string;
    telefono: string;
    password: string;
    rol?: string;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
    token?: string | null;
}

// !SERVICIOS

export interface TipoServicio {
    id?: string;
    nombre: string;
    descripcion?: string | null;
    status: string;
    createdAt?: Date | null;
    updatedAt?: Date | null;
}

export interface Servicio {
    id?: string;
    orden?: number | null;
    tipo: string;
    nombre: string;
    descripcion: string;
    costo?: number | null;
    precio: number;
    status: string;
    createdAt?: Date | null;
    updatedAt?: Date | null;
}


//! PAQUETES
export interface Paquete {
    id?: string;
    nombre: string;
    precio: number;
    descripcion?: string;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface PaqueteServicio {
    id?: string;
    paqueteId: string;
    paquete: Paquete;
    servicioId: string;
    servicio: Servicio;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
}