export interface CheckoutObject {
    metodoPagoId: string;
    cotizacionId: string;
    condicionComercialId: string;
    msi: number
    total: number
    pagoMensual: number
}

export interface Usuario {
    id: string;
    username: string;
    email: string;
    telefono: string;
    direccion: string;
    clabe: string;
    password: string;
    rol: string;
    status: string;
    createdAt: string;
    updatedAt: string;
}