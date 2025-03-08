export interface Rol { //ok
    id?: string;
    nombre?: string | null;
    descripcion?: string | null;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Usuario {
    rol: string | null;
    id: string;
    status: string | null;
    createdAt: Date | null;
    updatedAt: Date | null;
    username: string | null;
    email: string | null;
    telefono: string | null;
    direccion: string;
    clabe: string | null;
    password: string;
}

export interface Evento {
    id?: string
    clienteId?: string
    eventoTipoId?: string | null //
    tipoEvento?: string // para mostrar en la lista de eventos
    nombre: string | null
    fecha_evento: Date
    status?: string
    createdAt?: Date
    updatedAt?: Date
    usuarioId?: string | null
    usuario?: Usuario | null
    eventoEtapaId?: string | null
    eventoTipo?: {
        nombre: string
    }
}

export interface EventoBitacora {
    id?: string
    eventoId: string
    comentario: string
    createdAt?: Date
    updatedAt?: Date
    status?: string | null
    importancia?: string | null
}

export interface EventosPorEtapa {
    total_pagado: number;
    Cliente: {
        nombre: string;
    };
    EventoTipo: {
        nombre: string;
    } | null;
    EventoEtapa: {
        nombre: string;
        posicion: number;
    } | null;
    Cotizacion: {
        Pago: {
            id: string;
            createdAt: Date;
            monto: number;
        }[];
        id: string;
        status: string;
        precio: number;
    }[];
    User: {
        username: string | null;
    } | null;
    id: string;
    nombre: string | null;
    createdAt: Date;
    updatedAt: Date;
    clienteId: string;
    eventoTipoId: string | null;
    fecha_evento: Date;
    sede: string | null;
    direccion: string | null;
    status: string;
    userId: string | null;
    eventoEtapaId: string | null;
}

export interface EventoConTotalPagado {
    total_pagado: number;
    Cliente: {
        nombre: string;
    };
    EventoTipo: {
        nombre: string;
    } | null;
    EventoEtapa: {
        nombre: string;
        posicion: number;
    } | null;
    Cotizacion: {
        Pago: {
            id: string;
            createdAt: Date;
            monto: number;
        }[];
        id: string;
        status: string;
        precio: number;
    }[];
    id: string;
    clienteId: string;
    eventoTipoId: string | null;
    nombre: string | null;
    fecha_evento: Date;
    sede: string | null;
    direccion: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    userId: string | null;
    eventoEtapaId: string | null;
}

export interface EventoTipo {
    id: string
    nombre: string
    posicion: number
}

export interface EventoEtapa {
    id?: string
    nombre: string
    posicion: number
    createdAt?: Date
    updatedAt?: Date
}

export interface ServicioCategoria {
    id: string
    nombre: string
    posicion: number,
}

export interface Servicio {
    id?: string
    servicioCategoriaId?: string
    nombre: string
    costo?: number
    gasto?: number
    utilidad?: number
    precio_publico?: number
    cantidad?: number
    posicion?: number
    visible_cliente?: boolean
    tipo_utilidad?: string
    gastos?: ServicioGasto[]
    status?: string
    createdAt?: Date
    updatedAt?: Date

    userId?: string | null
    statusCotizacionServicio?: string
    fechaAsignacion?: Date
    fechaEntrega?: Date
}

export interface ServicioGasto {
    id?: string;
    servicioId?: string;
    nombre: string;
    costo: number;
    createdAt?: Date | undefined;
    updatedAt?: Date | undefined;
}

export interface Configuracion {
    id?: string
    nombre: string
    utilidad_producto: number
    utilidad_servicio: number
    comision_venta: number
    sobreprecio: number
    status?: string | null
    claveAutorizacion?: string | null
    createdAt?: Date | undefined
    updatedAt?: Date | undefined
}

export interface Paquete {
    id?: string
    eventoTipoId: string
    nombre: string
    costo?: number | null
    gasto?: number | null
    utilidad?: number | null
    precio?: number | null
    servicios?: PaqueteServicio[]
    posicion?: number
    status?: string | null
    createdAt?: Date
    updatedAt?: Date
}

export interface PaqueteServicio {
    id?: string
    paqueteId: string
    servicioId: string
    servicioCategoriaId: string
    cantidad: number
    status?: string
    posicion?: number
    visible_cliente?: boolean
    createdAt?: Date
    updatedAt?: Date
}

export interface Canal {
    id?: string
    nombre: string
    posicion: number
    createdAt?: Date
    updatedAt?: Date
}

export interface Cliente {
    id?: string;
    nombre: string;
    email?: string | null;
    telefono: string | null;
    direccion?: string | null;
    // etapa: string; // prospecto, cliente
    status?: string; // 1 nuevo, 2 seguimiento, 3 archivado
    canalId?: string | null; // canal de adquisición
    canalNombre?: string | null; // canal de adquisición
    createdAt?: Date;
    updatedAt?: Date;
    userId?: string | null; // usuario asignado
    // para asociar a evento
    nombreEvento?: string;
    fechaCelebracion?: Date;
    eventoTipoId?: string;
    numero_eventos?: number;
}

export interface Cotizacion {
    id?: string
    eventoTipoId: string
    eventoId: string
    nombre: string
    precio: number
    condicionesComercialesId?: string | null
    condicionesComercialesMetodoPagoId?: string | null
    status?: string
    visible_cliente?: boolean | null
    servicios?: Servicio[];
    visitas?: number
    createdAt?: Date
    expiresAt?: Date | null
    updatedAt?: Date
    pagos?: Pago[]; // Add this line to include the pagos property   
    eventoStatus?: string | null
}

export interface CotizacionServicio {
    //extender con los campos de Servicio
    nombre?: string
    precio?: number
    costo?: number
    //extender con los campos de Servicio
    id?: string
    cotizacionId: string
    servicioId: string
    servicioCategoriaId?: string
    cantidad: number
    posicion: number
    createdAt?: Date | undefined
    updatedAt?: Date | undefined
    userId?: string | null
    status?: string
    fechaAsignacion?: Date | null
    fechaEntrega?: Date | null
}

export interface MetodoPago {
    id?: string
    metodo_pago?: string
    comision_porcentaje_base?: number | null
    comision_fija_monto?: number | null
    num_msi?: number | null
    comision_msi_porcentaje?: number | null
    orden?: number | null
    payment_method?: string | null
    status?: string
    createdAt?: Date
    updatedAt?: Date
    metodosPago?: MetodoPago[] | null
    nombre?: string
    //
    metodoPagoId?: string | null
}

export interface CondicionesComerciales {
    id?: string
    nombre?: string
    descripcion?: string | null
    descuento?: number | null
    porcentaje_anticipo?: number | null
    status?: string
    orden?: number | null // para mostrar la lista
    createdAt?: Date
    updatedAt?: Date
    metodosPago?: MetodoPago[] | null
    tipoEvento?: string | null
}

export interface CondicionesComercialesMetodoPago {
    id?: string
    condicionesComercialesId: string
    metodoPagoId: string
    status?: string
    createdAt?: Date
    updatedAt?: Date
    orden?: number | null
}

export interface CotizacionDetalleEvento {
    error?: string;
    evento?: {
        eventoTipoId: string | null;
        nombre: string;
        clienteId: string;
        fecha_evento: Date;
    };
    eventoTipo?: {
        nombre: string;
    } | null;
    cliente?: {
        nombre: string;
    };
}

export interface Pago {
    id?: string
    clienteId?: string | null
    cotizacionId?: string | null
    condicionesComercialesId?: string | null
    condicionesComercialesMetodoPagoId?: string | null
    metodoPagoId?: string | null
    metodo_pago: string
    monto: number | null
    concepto: string
    descripcion?: string | null
    stripe_session_id?: string | null
    stripe_payment_id?: string | null
    status?: string | null
    createdAt?: Date
    updatedAt?: Date
}

export interface CotizacionVisita {
    id?: string
    cotizacionId: string
    createdAt?: Date
}

export interface Agenda {
    id?: string | undefined
    userId?: string | null
    eventoId?: string | null
    concepto?: string | null
    descripcion?: string | null
    googleMapsUrl?: string | null
    direccion?: string | null
    fecha?: Date | null
    hora?: string | null
    status?: string | null
    createdAt?: Date | null
    updatedAt?: Date | null
    agendaTipo?: string | null;
}

export interface AgendaTipo {
    id?: string
    nombre: string
    createdAt?: Date
    updatedAt?: Date
}

export interface Campania {
    id?: string
    nombre: string
    status?: string
    createdAt?: Date
    updatedAt?: Date
    Anuncio?: Anuncio[]
}

export interface AnuncioPlataforma {
    id?: string
    nombre: string // facebook, instagram, google, youtube, impreso
    status?: string
    createdAt?: Date
    updatedAt?: Date
    Anuncio?: Anuncio[]
}

export interface AnuncioTipo {
    id?: string
    nombre: string // imagen, video, carousel
    status?: string
    createdAt?: Date
    updatedAt?: Date
    anuncio?: Anuncio[]
}

export interface Anuncio {
    id?: string
    campaniaId: string
    Campania?: Campania
    nombre: string
    anuncioTipoId: string
    AnuncioTipo?: AnuncioTipo
    anuncioCategoriaId: string
    anuncioPlataformaId: string
    AnuncioPlataforma?: AnuncioPlataforma
    imagen_url: string
    status: string
    createdAt?: Date
    updatedAt?: Date
}

export interface LeadForm {
    nombre: string
    email?: string
    telefono: string
    fecha_evento: Date
    eventoTipoId: string
    nombreEvento?: string
}

export interface Notificacion {
    id?: string
    userId: string
    titulo: string
    mensaje: string
    status: string
    cotizacionId?: string
    createdAt?: Date
    updatedAt?: Date
}