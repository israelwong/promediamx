// Interfaces for Sistema
export interface Usuario {
    id: string;
    rol: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    username: string;
    email: string;
    telefono: string;
    token?: string;
    password: string;
}

export interface Sesion {
    id: string;
    usuarioId: string;
    usuario: Usuario;
    token: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Cliente {
    id: string;
    nombre?: string | null;
    email: string;
    telefono: string;
    password: string;
    rfc?: string | null;
    curp?: string | null;
    razonSocial?: string | null;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

// Interfaces for Contrato
export interface Contrato {
    id: string;
    clienteId: string;
    cliente: Cliente;
    cotizacionId: string;
    cotizacion: Cotizacion;
    fechaInicio: Date;
    fechaFin: Date;
    status: string;
    suscripcion: boolean;
    recurrencia: string;
    monto: number;
    createdAt: Date;
    updatedAt: Date;
    Pago: Pago[];
    AsistenteVirtual: AsistenteVirtual[];
}

export interface Pago {
    id: string;
    contratoId?: string;
    contrato?: Contrato;
    metodoPagoId: string;
    metodoPago: metodoPago;
    montoPago: number;
    concepto: string;
    fechaPago: Date;
    stripeId?: string;
    stripe_session_id?: string;
    stripe_payment_id?: string;
    fechaDepositoStripe?: string;
    montoDepositoStripe?: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface metodoPago {
    id: string;
    orden?: number;
    nombre: string;
    comisionPorcentajeStripe?: number;
    comisionFijaStripe?: number;
    comisionPorcentajePromedia?: number;
    msi?: number;
    comisionMsi?: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    Pago: Pago[];
}

// Interfaces for Cotizacion
export interface Cotizacion {
    id: string;
    clienteId: string;
    cliente: Cliente;
    nombre: string;
    descripcion?: string;
    precio: number;
    descuento?: number;
    contratos: Contrato[];
    status: string;
    createdAt: Date;
    updatedAt: Date;
    CotizacionAsistenteVirtual: CotizacionAsistenteVirtual[];
}

export interface CotizacionAsistenteVirtual {
    id: string;
    cotizacionId: string;
    cotizacion: Cotizacion;
    asistenteVirtualId: string;
    asistenteVirtual: AsistenteVirtual;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

//! Interfaces Asistente Virtual
export interface AsistenteVirtual {
    id: string;
    contratoId?: string | null;
    contrato?: Contrato | null;
    tipo?: string | null; // plantilla, produccion
    urlImagen?: string | null;
    nombre: string;
    whatsappBusiness?: string | null; // Teléfono de WhatsApp Business.
    phoneNumberId?: string | null; // API de WhatsApp Business.
    token?: string | null; // Identificador de acceso a la API de WhatsApp Business.
    nombreHITL?: string | null; // Nombre del asistente virtual.
    whatsappHITL?: string | null; // Teléfono para consultas human in the loop.
    emailHITL?: string | null; // Email asociado al asistente virtual.
    emailCalendario?: string | null; // Email para agendar citas.
    version: number;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ConfiguracionAsistente {
    id: string;
    asistenteVirtualId: string | null;
    asistenteVirtual: AsistenteVirtual | null;
    habilidadId: string | null;
    habilidad: Habilidad | null;
    status: string;
    createdAt: Date | null;
    updatedAt: Date | null;
}
export interface Habilidad {
    id?: string;
    origen?: string | null; // sistema, cliente
    orden?: number | null; // número de orden
    nombre: string; // Unique identifier or name for the skill
    descripcion?: string | null;
    rol?: string | null; // admin, cliente, supervisor
    personalidad?: string | null; // introvertido, extrovertido, analitico, creativo
    precio?: number;
    palabraClave?: string | null; // palabra clave para activar la habilidad
    version: number;
    status: string;
    createdAt?: Date;
    updatedAt?: Date;
}

export interface Instruccion {
    id?: string;
    habilidadId: string;
    orden?: number | null;
    nombre: string;
    descripcion?: string | null;
    instruccion?: string;
    trigger?: string | null; // palabra clave para activar la instrucción
    automatizacion?: string | null; // JSON con la automatización
    version: number;
    status: string;
    createdAt?: Date | null;
    updatedAt?: Date | null;
}

export interface ParametroAsistenteInstruccion {
    id: string;
    ordenInstruccion?: number; // número de instrucción
    instruccionId: string;
    instruccion: Instruccion;
    configuracionAsistenteId: string;
    configuracionAsistente: ConfiguracionAsistente;
    formatoEntradaJSON?: string | null; // JSON con el formato de entrada
    formatoSalidaJSON?: string | null; // JSON con el formato de salida
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

// export interface MetricasAsistente {
// id: string;
// asistenteVirtualId: string;
// asistenteVirtual: AsistenteVirtual;
// tareaAsistenteVirtualId: string;
// tareaAsistenteVirtual: TareaAsistenteVirtual;
// fecha: Date;
// status: string;
// createdAt: Date;
// updatedAt: Date;
// }

// Interfaces for Negocio
export interface Negocio {
    id?: string;
    clienteId?: string;
    logo?: string;
    nombre: string;
    descripcion?: string; //texto libre
    telefonoLlamadas?: string;
    telefonoWhatsapp?: string;
    email?: string;
    direccion?: string;
    googleMaps?: string;
    paginaWeb?: string;
    redesSociales?: string;//texto libre
    horarioAtencion?: string;//texto libre
    garantias?: string;//texto libre
    politicas?: string;//texto libre
    avisoPrivacidad?: string;//texto libre
    compentencia?: string;//texto libre
    clienteIdeal?: string;//texto libre
    terminologia?: string;//texto libre
    preguntasFrecuentes?: string;//texto libre
    objeciones?: string;//texto libre
    catalogoDescriptivo?: string;
    promocionesDescriptivas?: string;
    descuentosDescriptivos?: string;
    status?: string;
    createdAt?: Date;
    updatedAt?: Date;
}

// Interfaces for Calálogo
export interface Catalogo {
    id: string;
    negocioId: string;
    negocio: Negocio;
    tipo: string;
    nombre: string;
    descripcion?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    ItemCatalogo: ItemCatalogo[];
}

export interface ItemCatalogo {
    id: string;
    catalogoId: string;
    catalogo: Catalogo;
    nombre: string;
    descripcion?: string;
    precio: number;
    imagen?: string;
    linkPago?: string;
    funcionPrincipal?: string;
    promocionActiva?: string;
    AquienVaDirigido?: string;
    nivelDePopularidad?: string;
    galeriaJSON?: string;
    video?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    ItemCatalogoPromocion: ItemCatalogoPromocion[];
    ItemCatalogoDescuento: ItemCatalogoDescuento[];
}

export interface Promocion {
    id: string;
    negocioId: string;
    negocio: Negocio;
    nombre: string;
    descripcion?: string;
    fechaInicio: Date;
    fechaFin: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    ItemCatalogoPromocion: ItemCatalogoPromocion[];
}

export interface Descuento {
    id: string;
    negocioId: string;
    negocio: Negocio;
    nombre: string;
    descripcion?: string;
    porcentaje: number;
    monto: number;
    fechaInicio: Date;
    fechaFin: Date;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    ItemCatalogoDescuento: ItemCatalogoDescuento[];
}

export interface ItemCatalogoPromocion {
    id: string;
    itemCatalogoId: string;
    itemCatalogo: ItemCatalogo;
    promocionId: string;
    promocion: Promocion;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface ItemCatalogoDescuento {
    id: string;
    itemCatalogoId: string;
    itemCatalogo: ItemCatalogo;
    descuentoId: string;
    descuento: Descuento;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

// Interfaces for CRM
export interface Canal {
    id: string;
    orden?: number;
    nombre: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    Lead: Lead[];
    Agente: Agente[];
    crmId: string;
    crm: CRM;
}

export interface CRM {
    id: string;
    negocioId: string;
    negocio: Negocio;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    Lead: Lead[];
    Agente: Agente[];
    Etiqueta: Etiqueta[];
    Conversacion: Conversacion[];
    Pipeline: Pipeline[];
    Canal: Canal[];
}

export interface Pipeline {
    id: string;
    crmId: string;
    crm: CRM;
    orden?: number;
    nombre: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    Lead: Lead[];
}

export interface Etiqueta {
    id: string;
    crmId: string;
    crm: CRM;
    orden?: number;
    nombre: string;
    Lead: Lead[];
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Lead {
    id: string;
    crmId?: string;
    crm?: CRM;
    agenteId?: string;
    agente?: Agente;
    canalId?: string;
    Canal?: Canal;
    nombre: string;
    email: string;
    telefono: string;
    jsonParams?: JSON;
    pilelineId?: string;
    Pipeline?: Pipeline;
    etiquetaId?: string;
    Etiqueta?: Etiqueta;
    status: string;
    createdAt: Date;
    updatedAt: Date;
    Bitacora: Bitacora[];
    Agenda: Agenda[];
}

export interface Agente {
    id: string;
    crmId: string;
    crm: CRM;
    username: string;
    email: string;
    telefono: string;
    password: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Bitacora {
    id: string;
    agenteId: string;
    agente: Agente;
    leadId: string;
    lead: Lead;
    descripcion: string;
    createdAt: Date;
    updatedAt: Date;
}

export interface Agenda {
    id: string;
    agenteId: string;
    leadId: string;
    lead: Lead;
    agente: Agente;
    fecha: Date;
    asunto: string;
    descripcion?: string;
    objetivo?: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
}

// Interfaces for Conversaciones
export interface Conversacion {
    id: string;
    whatsappId?: string | null;
    phoneNumberId: string;
    // numeroWhatsappBusinessId?: string | null;
    // numeroWhatsappBusiness?: NumeroWhatsappBusiness | null;
    // crmId?: string | null;
    // crm?: CRM | null;
    status: string; // abierta, cerrada, en espera, seguimiento
    createdAt: Date;
    updatedAt: Date;
    Interaccion: Interaccion[];
    intencion?: string | null; // intención de la conversación
    interes?: string | null; // nivel de interés
}

export interface Interaccion {
    id: string;
    conversacionId: string;
    conversacion: Conversacion;
    messageId?: string;
    role?: string;
    mensaje?: string;
    intencion?: string;
    entidad?: string;
    interes?: string;
    sentimiento?: string;
    mediaType?: string;
    createdAt: Date;
}

