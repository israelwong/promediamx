// Ruta: app/admin/_lib/funciones/mostrarDetalleOferta.type.ts


export interface MostrarDetalleOfertaArgs {
    negocioId: string;
    nombre_de_la_oferta: string; // Nombre, ID o frase que identifique la oferta
    canalNombre?: string; // <-- NUEVO CAMPO para el nombre del canal

}

export interface ImagenOferta {
    imageUrl: string;
    altText?: string | null;
    descripcion?: string | null;
}


export interface OfertaDetallada {
    id: string;
    nombre: string;
    descripcion?: string | null;
    tipoOferta: string;
    valor?: number | null;
    codigo?: string | null;
    fechaInicio: Date;
    fechaFin: Date;
    condiciones?: string | null;
    imagenes: ImagenOferta[]; // Galería de imágenes de la oferta
}


export interface MostrarDetalleOfertaData {
    oferta?: OfertaDetallada | null; // La oferta detallada o null si no se encontró
    mensajeRespuesta: string;       // Mensaje formateado para enviar al usuario
}